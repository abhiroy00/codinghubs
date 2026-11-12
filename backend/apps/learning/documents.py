"""Private reference uploads. Parsing is an explicit offline worker operation."""
import hashlib
import uuid
from urllib.parse import quote
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils.deconstruct import deconstructible
from rest_framework import permissions, serializers
from rest_framework.response import Response
from rest_framework.views import APIView


@deconstructible
class ReferenceStorage(FileSystemStorage):
    def __init__(self):
        super().__init__(location=settings.PRIVATE_MEDIA_ROOT)

    def url(self, name):
        return '/api/learning/documents/download/?file=' + quote(name, safe='')


def reference_path(instance, filename):
    return f'learning-references/{uuid.uuid4().hex}.pdf'


class DocumentPermissions(permissions.BasePermission):
    def has_permission(self, request, view):
        user = request.user
        action = 'add' if request.method == 'POST' else 'view'
        return bool(user and user.is_authenticated and user.is_active and user.is_staff and user.has_perm(f'learning.{action}_referencedocument'))


def document_payload(doc):
    return {key: getattr(doc, key) for key in ('id', 'title', 'author', 'sha256', 'status', 'page_count', 'metadata', 'toc', 'error', 'created_at')}


class PrivateDocumentView(APIView):
    def finalize_response(self, request, response, *args, **kwargs):
        response = super().finalize_response(request, response, *args, **kwargs)
        response['Cache-Control'] = 'private, no-store'
        return response


class DocumentsView(PrivateDocumentView):
    permission_classes = [DocumentPermissions]

    def get(self, request):
        from .models import ReferenceDocument
        return Response([document_payload(d) for d in ReferenceDocument.objects.order_by('-created_at')[:100]])

    def post(self, request):
        from .models import ReferenceDocument
        upload = request.FILES.get('file')
        if not upload or upload.size > 10 * 1024 * 1024:
            raise serializers.ValidationError({'file': 'Upload a PDF no larger than 10 MB.'})
        if upload.read(5) != b'%PDF-':
            raise serializers.ValidationError({'file': 'A PDF signature is required.'})
        upload.seek(0)
        rights = serializers.BooleanField().run_validation(request.data.get('rights_confirmed', False))
        if not rights:
            raise serializers.ValidationError({'rights_confirmed': 'Confirm permission to use this reference.'})
        title = str(request.data.get('title', '')).strip()
        if not title or len(title) > 250:
            raise serializers.ValidationError({'title': 'Provide a title of at most 250 characters.'})
        digest = hashlib.sha256()
        for chunk in upload.chunks():
            digest.update(chunk)
        upload.seek(0)
        if existing := ReferenceDocument.objects.filter(sha256=digest.hexdigest()).first():
            return Response(document_payload(existing), status=200)
        doc = ReferenceDocument.objects.create(title=title, file=upload, sha256=digest.hexdigest(), rights_confirmed=True, uploaded_by=request.user)
        return Response(document_payload(doc), status=201)


class DocumentDetailView(PrivateDocumentView):
    permission_classes = [DocumentPermissions]

    def get(self, request, pk):
        from .models import ReferenceDocument
        doc = get_object_or_404(ReferenceDocument, pk=pk)
        try:
            number = max(1, int(request.query_params.get('page', 1)))
        except ValueError:
            raise serializers.ValidationError({'page': 'Choose a positive page number.'})
        page = doc.pages.filter(number=number).first()
        return Response({**document_payload(doc), 'page': None if not page else {'number': page.number, 'text': page.text, 'status': page.status, 'notes': page.notes},
                         'concepts': list(doc.extracted_concepts.values('id', 'chapter', 'page_number', 'concept', 'extraction_status', 'verification_status', 'lesson_id'))})


class DocumentDownloadView(PrivateDocumentView):
    permission_classes = [DocumentPermissions]

    def get(self, request):
        from .models import ReferenceDocument
        doc = get_object_or_404(ReferenceDocument, file=request.query_params.get('file', ''))
        response = FileResponse(doc.file.open('rb'), as_attachment=True, filename='reference.pdf')
        response['Cache-Control'] = 'private, no-store'
        response['X-Content-Type-Options'] = 'nosniff'
        return response
