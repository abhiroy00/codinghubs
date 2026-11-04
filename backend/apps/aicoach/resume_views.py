import hashlib
import json
import re

from django.db import IntegrityError
from django.http import HttpResponse
from rest_framework import permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView

from apps.shop.downloads import safe_name

from . import resume as engine
from .ai_services.errors import AIError
from .models import Resume, ResumeAnalysis
from .views import AIBurstThrottle, ai_error_response


class ResumeUploadThrottle(UserRateThrottle):
    scope = 'resume_upload'


class AnalyzeSerializer(serializers.Serializer):
    resume_id = serializers.IntegerField(min_value=1)
    target_role = serializers.CharField(required=False, allow_blank=True, max_length=80, trim_whitespace=True)
    force = serializers.BooleanField(required=False, default=False)
    consent = serializers.BooleanField(
        help_text='The user agrees that their resume text (without email, phone and links) is sent to an AI provider.')

    def validate_consent(self, value):
        if not value:
            raise serializers.ValidationError('Please confirm that your resume text may be sent to an AI service for analysis.')
        return value


def resume_payload(resume, with_preview=False):
    latest = resume.analyses.first()
    data = {'id': resume.id, 'original_name': resume.original_name, 'size': resume.size, 'page_count': resume.page_count,
            'text_chars': len(resume.text), 'created_at': resume.created_at,
            'analyses': resume.analyses.count(), 'latest_analysis_id': latest.id if latest else None,
            'latest_analyzed_at': latest.created_at if latest else None}
    if with_preview:
        data['text_preview'] = resume.text[:400]
    return data


def analysis_payload(analysis, **extra):
    return {'id': analysis.id, 'resume_id': analysis.resume_id, 'target_role': analysis.target_role, 'created_at': analysis.created_at,
            'analysis': analysis.result, **extra}


def own_resume(request, pk):
    """The user's own resume; someone else's id is indistinguishable from a missing one."""
    return Resume.objects.filter(user=request.user, pk=pk).first()


def not_found():
    return Response({'detail': 'Resume not found.'}, status=status.HTTP_404_NOT_FOUND)


class ResumeUploadView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [ResumeUploadThrottle]

    def post(self, request):
        uploaded = request.FILES.get('file')
        if uploaded is None:
            return Response({'detail': 'Send the PDF in a form field named "file".', 'code': 'no_file'}, status=status.HTTP_400_BAD_REQUEST)
        try:
            engine.validate_pdf(uploaded)
            digest = hashlib.sha256()
            for chunk in uploaded.chunks():
                digest.update(chunk)
            existing = Resume.objects.filter(user=request.user, sha256=digest.hexdigest()).first()
            if existing:  # the same file again: reuse it instead of storing a duplicate
                return Response({**resume_payload(existing, with_preview=True), 'already_uploaded': True})
            if Resume.objects.filter(user=request.user).count() >= engine.MAX_RESUMES_PER_USER:
                return Response({'detail': f'You can keep {engine.MAX_RESUMES_PER_USER} resumes. Delete one to upload another.', 'code': 'resume_limit'},
                                status=status.HTTP_409_CONFLICT)
            uploaded.seek(0)
            text, pages = engine.extract_text(uploaded)
        except engine.ResumeError as error:
            return Response({'detail': error.message, 'code': error.code}, status=status.HTTP_400_BAD_REQUEST)
        uploaded.seek(0)
        resume = Resume(user=request.user, original_name=safe_name(uploaded.name), size=uploaded.size, sha256=digest.hexdigest(), page_count=pages, text=text)
        try:
            resume.file.save('resume.pdf', uploaded, save=False)  # stored under a random name in private storage
            resume.save()
        except IntegrityError:  # two identical uploads at once: keep the first
            resume.file.delete(save=False)
            return Response({**resume_payload(Resume.objects.get(user=request.user, sha256=resume.sha256), with_preview=True), 'already_uploaded': True})
        return Response({**resume_payload(resume, with_preview=True), 'already_uploaded': False}, status=status.HTTP_201_CREATED)


class ResumeAnalyzeView(APIView):
    permission_classes = [permissions.IsAuthenticated]
    throttle_classes = [AIBurstThrottle]

    def post(self, request):
        serializer = AnalyzeSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        resume = own_resume(request, data['resume_id'])
        if resume is None:
            return not_found()
        role = data.get('target_role', '')
        if not data['force']:
            cached = resume.analyses.filter(target_role=role).first()
            if cached:  # an unchanged resume and role need no new AI call
                return Response(analysis_payload(cached, cached=True))
        try:
            result, response = engine.analyze_resume(request.user, resume, role)
        except AIError as error:
            return ai_error_response(error)
        analysis = ResumeAnalysis.objects.create(resume=resume, target_role=role, result=result, provider=response.provider, model=response.model)
        return Response(analysis_payload(analysis, cached=False), status=status.HTTP_201_CREATED)


class ResumeHistoryView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response([resume_payload(r) for r in Resume.objects.filter(user=request.user)])


class ResumeDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        resume = own_resume(request, pk)
        if resume is None:
            return not_found()
        latest = resume.analyses.first()
        return Response({**resume_payload(resume, with_preview=True), 'latest_analysis': analysis_payload(latest) if latest else None})

    def delete(self, request, pk):
        """Remove the resume, its stored file and every analysis of it."""
        resume = own_resume(request, pk)
        if resume is None:
            return not_found()
        resume.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class ResumeDownloadView(APIView):
    """The latest analysis of a resume as a file: Markdown (default) or JSON (?format=json)."""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, pk):
        resume = own_resume(request, pk)
        analysis = resume.analyses.first() if resume else None
        if analysis is None:
            return Response({'detail': 'There is no analysis to download yet.'}, status=status.HTTP_404_NOT_FOUND)
        stem = re.sub(r'\.pdf$', '', resume.original_name, flags=re.IGNORECASE) or 'resume'
        if request.query_params.get('format') == 'json':
            body, kind, ext = json.dumps(analysis.result, indent=2), 'application/json', 'json'
        else:
            body, kind, ext = engine.build_markdown(resume, analysis), 'text/markdown; charset=utf-8', 'md'
        response = HttpResponse(body, content_type=kind)
        response['Content-Disposition'] = f'attachment; filename="{safe_name(stem)}-analysis.{ext}"'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
