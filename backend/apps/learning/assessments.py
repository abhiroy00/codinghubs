"""Assignments are human reviewed. Submitted code is stored as text and never executed."""
from copy import deepcopy
from django.db import IntegrityError, transaction
from django.db.models import F, Max
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import UserRateThrottle
from rest_framework.views import APIView
from .models import AssignmentReview, AssignmentSubmission, Concept, Module, Progress, QuizAttempt


class StrictInput(serializers.Serializer):
    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError('Submit a JSON object.')
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: 'This field cannot be submitted.' for key in unknown})
        return super().to_internal_value(data)


class SubmissionInput(StrictInput):
    request_key = serializers.UUIDField()
    version = serializers.IntegerField(min_value=1)
    response = serializers.CharField(max_length=50000, min_length=20)
    repository_url = serializers.URLField(max_length=500, allow_blank=True, required=False, default='')

    def validate_repository_url(self, value):
        if value and not value.startswith('https://'):
            raise serializers.ValidationError('Use an HTTPS repository URL. The server will not fetch it.')
        return value


class GradeInput(StrictInput):
    review_version = serializers.IntegerField(min_value=0)
    score = serializers.IntegerField(min_value=0, max_value=100)
    acceptance_confirmed = serializers.BooleanField()
    feedback = serializers.CharField(max_length=20000, min_length=20)

    def validate(self, data):
        if data['score'] >= 80 and not data['acceptance_confirmed']:
            raise serializers.ValidationError('A passing score requires confirmation of all required acceptance checks.')
        return data


def submission_payload(s, include_response=True):
    result = {'id': str(s.pk), 'concept': s.concept.slug, 'title': s.assignment_snapshot['title'],
              'concept_version': s.concept_version, 'is_current_version': s.concept_version == s.concept.version,
              'status': s.status, 'score': s.score, 'acceptance_confirmed': s.acceptance_confirmed,
              'passed': s.status == 'reviewed' and s.score >= 80 and s.acceptance_confirmed,
              'feedback': s.feedback, 'reviewer': s.reviewer.get_username() if s.reviewer else None,
              'review_version': s.review_version, 'submitted_at': s.submitted_at, 'reviewed_at': s.reviewed_at}
    if include_response:
        result.update(response=s.response, repository_url=s.repository_url, assignment_snapshot=s.assignment_snapshot)
    return result


def passed_assignments(user, concept_ids=None):
    qs = AssignmentSubmission.objects.filter(user=user, concept_version=F('concept__version'), status='reviewed', score__gte=80, acceptance_confirmed=True)
    if concept_ids is not None:
        qs = qs.filter(concept_id__in=concept_ids)
    return {(concept_id, version): score for concept_id, version, score in
            qs.values('concept_id', 'concept_version').annotate(best=Max('score')).values_list('concept_id', 'concept_version', 'best')}


class SubmissionThrottle(UserRateThrottle):
    rate = '10/hour'


class PrivateAssessmentView(APIView):
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        return response


class SubmissionsView(PrivateAssessmentView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        concept = get_object_or_404(Concept, slug=slug)
        qs = AssignmentSubmission.objects.filter(user=request.user, concept=concept).select_related('concept', 'reviewer')
        page = PageNumberPagination()
        page.page_size = 10
        response = page.get_paginated_response([submission_payload(s) for s in page.paginate_queryset(qs, request)])
        response.data['pending_current'] = qs.filter(concept_version=concept.version, status='submitted').exists()
        return response

    def get_throttles(self):
        return [SubmissionThrottle()] if self.request.method == 'POST' else super().get_throttles()

    @transaction.atomic
    def post(self, request, slug):
        data = SubmissionInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        # Serializes submissions against publication of this same concept.
        concept = get_object_or_404(Concept.objects.select_for_update(), slug=slug, version__gt=0)
        existing = AssignmentSubmission.objects.filter(user=request.user, request_key=values['request_key']).select_related('concept', 'reviewer').first()
        if existing:
            same = (existing.concept_id == concept.pk and existing.concept_version == values['version']
                    and existing.response == values['response'] and existing.repository_url == values['repository_url'])
            if not same:
                return Response({'detail': 'This request key already belongs to a different submission.'}, status=409)
            return Response(submission_payload(existing), status=200)
        if values['version'] != concept.version:
            return Response({'detail': 'Lesson updated. Reload its assignment before submitting.'}, status=409)
        assignment = concept.published['content']['assessment'].get('assignment')
        if not assignment:
            return Response({'detail': 'This published lesson has no assignment.'}, status=400)
        if AssignmentSubmission.objects.filter(user=request.user, concept=concept, concept_version=concept.version, status='submitted').exists():
            return Response({'detail': 'An assignment for this version is already awaiting review.'}, status=409)
        try:
            with transaction.atomic():
                submission = AssignmentSubmission.objects.create(user=request.user, concept=concept,
                    concept_version=concept.version, request_key=values['request_key'], response=values['response'],
                    repository_url=values['repository_url'], assignment_snapshot={'title': concept.published['title'], 'assignment': deepcopy(assignment)})
        except IntegrityError:
            return Response({'detail': 'Another submission was saved. Reload your assignment history before retrying.'}, status=409)
        return Response(submission_payload(submission), status=201)


class QuizHistoryView(PrivateAssessmentView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request, slug):
        concept = get_object_or_404(Concept, slug=slug)
        qs = QuizAttempt.objects.filter(user=request.user, concept=concept)
        page = PageNumberPagination()
        page.page_size = 10
        return page.get_paginated_response([{'id': a.pk, 'version': a.concept_version,
                'is_current_version': a.concept_version == concept.version, 'score': a.score,
                'correct_count': a.correct_count, 'question_count': a.question_count, 'created_at': a.created_at}
                for a in page.paginate_queryset(qs, request)])


class ReviewPermissions(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        if not user.is_authenticated or not user.is_active or not user.is_staff:
            return False
        if request.method == 'GET':
            return user.has_perm('learning.view_assignmentsubmission') or user.has_perm('learning.grade_assignmentsubmission')
        return user.has_perm('learning.grade_assignmentsubmission')


class ReviewQueueView(PrivateAssessmentView):
    permission_classes = [ReviewPermissions]

    def get(self, request):
        qs = AssignmentSubmission.objects.select_related('concept', 'reviewer', 'user')
        if status := request.query_params.get('status'):
            if status not in ('submitted', 'reviewed'):
                raise serializers.ValidationError({'status': 'Choose submitted or reviewed.'})
            qs = qs.filter(status=status)
        if concept := request.query_params.get('concept'):
            qs = qs.filter(concept__slug=concept)
        page = PageNumberPagination()
        page.page_size = 25
        rows = page.paginate_queryset(qs, request)
        return page.get_paginated_response([{**submission_payload(s, False), 'learner': s.user.get_username()} for s in rows])


class ReviewDetailView(PrivateAssessmentView):
    permission_classes = [ReviewPermissions]

    def get(self, request, pk):
        s = get_object_or_404(AssignmentSubmission.objects.select_related('concept', 'reviewer', 'user'), pk=pk)
        return Response({**submission_payload(s), 'learner': s.user.get_username(),
            'can_grade': request.user.has_perm('learning.grade_assignmentsubmission') and s.user_id != request.user.pk,
            'reviews': [{'version': r.version, 'score': r.score, 'acceptance_confirmed': r.acceptance_confirmed,
                         'feedback': r.feedback, 'reviewer': r.reviewer.get_username() if r.reviewer else None,
                         'created_at': r.created_at} for r in s.reviews.select_related('reviewer')]})

    @transaction.atomic
    def post(self, request, pk):
        s = get_object_or_404(AssignmentSubmission.objects.select_for_update().select_related('concept', 'reviewer'), pk=pk)
        if s.user_id == request.user.pk:
            raise PermissionDenied('You cannot grade your own submission.')
        data = GradeInput(data=request.data)
        data.is_valid(raise_exception=True)
        values = data.validated_data
        expected = values.pop('review_version')
        if expected != s.review_version:
            return Response({'detail': 'Another reviewer changed this grade. Reload before reviewing again.'}, status=409)
        now = timezone.now()
        changed = AssignmentSubmission.objects.filter(pk=s.pk, review_version=expected).update(
            **values, status='reviewed', reviewer=request.user, reviewed_at=now, review_version=expected + 1)
        if not changed:
            return Response({'detail': 'Grade changed during saving. Reload before reviewing again.'}, status=409)
        AssignmentReview.objects.create(submission=s, version=expected + 1, reviewer=request.user, created_at=now, **values)
        s.refresh_from_db()
        return Response(submission_payload(s))


class LearningSummaryView(PrivateAssessmentView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        progress = {p.concept_id: p for p in Progress.objects.filter(user=request.user)}
        passed = passed_assignments(request.user)
        modules = []
        qs = Module.objects.prefetch_related('chapters__concepts')
        if request.query_params.get('course'):
            qs = qs.filter(course__slug=request.query_params['course'])
        for index, m in enumerate(qs, 1):
            concepts = [c for ch in m.chapters.all() for c in ch.concepts.all()]
            published = [c for c in concepts if c.version]
            complete = [c for c in published if (p := progress.get(c.pk)) and p.version == c.version and len(set(p.parts)) == 4 and p.best_score >= 80]
            mastered = [c for c in complete if (c.pk, c.version) in passed]
            modules.append({'number': index if request.query_params.get('course') else m.number, 'title': m.title, 'slug': m.slug, 'total_concepts': len(concepts),
                'published_concepts': len(published), 'reading_and_quiz_complete': len(complete),
                'assignments_passed': sum((c.pk, c.version) in passed for c in published), 'mastered_concepts': len(mastered)})
        total = sum(m['total_concepts'] for m in modules)
        mastered = sum(m['mastered_concepts'] for m in modules)
        return Response({'modules': modules, 'total_concepts': total, 'published_concepts': sum(m['published_concepts'] for m in modules),
            'mastered_concepts': mastered, 'percent_mastered': round(100 * mastered / total, 1) if total else 0,
            'certificate_eligible': False,
            'certificate_blockers': ['Course-wide module/final assessments and capstone requirements are not yet configured; certificates cannot be issued.']})
