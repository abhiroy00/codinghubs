import logging
import math
import uuid
from pathlib import PurePosixPath
from django.conf import settings
from django.db import transaction
from django.http import FileResponse, Http404
from django.shortcuts import get_object_or_404
from rest_framework import generics, permissions, serializers
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.response import Response
from rest_framework.views import APIView
from apps.adminpanel.views import IsStaff
from apps.shop.storage import private_storage
from apps.shop.downloads import safe_name
from .models import Course, CourseBrochure

logger = logging.getLogger(__name__)


def size_label(size):
    """Same format as Brochures.tsx: one decimal in MB from 1 MB up, whole KB (rounded up) below."""
    return f'{size / 1024 / 1024:.1f} MB' if size >= 1024 * 1024 else f'{math.ceil(size / 1024)} KB'


def remove_file(key):
    if key:
        try:
            private_storage.delete(key)
        except OSError:
            logger.warning('Brochure storage cleanup failed; run cleanup_brochures after checking storage health.')


def validate_pdf(upload):
    if upload.size <= 0 or upload.size > settings.BROCHURE_MAX_BYTES:
        raise serializers.ValidationError({'file': f'Choose a PDF no larger than {settings.BROCHURE_MAX_BYTES // 1024 // 1024} MB.'})
    if PurePosixPath(upload.name).suffix.lower() != '.pdf' or upload.content_type != 'application/pdf':
        raise serializers.ValidationError({'file': 'Only application/pdf files with a .pdf extension are accepted.'})
    upload.seek(0)
    signature = upload.read(5)
    upload.seek(0)
    if signature != b'%PDF-':
        raise serializers.ValidationError({'file': 'The file does not have a valid PDF signature.'})


class Metadata(serializers.ModelSerializer):
    course_id = serializers.IntegerField(read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)
    course_name = serializers.CharField(source='course.name', read_only=True)
    download_url = serializers.SerializerMethodField()
    view_url = serializers.SerializerMethodField()

    class Meta:
        model = CourseBrochure
        fields = ['id', 'course_id', 'course_slug', 'course_name', 'title', 'description', 'download_name', 'size', 'is_published', 'updated_at', 'download_url', 'view_url']
        read_only_fields = fields

    def get_download_url(self, obj):
        return f'/api/courses/brochures/{obj.course.slug}/download/'

    def get_view_url(self, obj):
        return f'/api/courses/brochures/{obj.course.slug}/view/'


class AdminMetadata(Metadata):
    class Meta(Metadata.Meta):
        fields = [name for name in Metadata.Meta.fields if name != 'view_url'] + ['original_name']

    def get_download_url(self, obj):
        return f'/api/admin/courses/{obj.course_id}/brochure/download/'


class PublicBrochures(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = Metadata
    queryset = CourseBrochure.objects.select_related('course').filter(is_published=True, course__is_active=True).exclude(storage_key='').order_by('course__order', 'course__name')


class PublicBrochure(generics.RetrieveAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = Metadata
    lookup_field = 'course__slug'
    lookup_url_kwarg = 'slug'
    queryset = PublicBrochures.queryset


def download(row, inline=False):
    try:
        stream = private_storage.open(row.storage_key, 'rb')
    except (OSError, ValueError) as error:
        raise Http404('Brochure temporarily unavailable.') from error
    response = FileResponse(stream, as_attachment=not inline, filename=row.download_name, content_type='application/pdf')
    response['X-Content-Type-Options'] = 'nosniff'
    # Browsers' built-in PDF viewers do not run inside a CSP-sandboxed document, so the inline "View" response only
    # forbids framing; the download keeps the full sandbox.
    response['Content-Security-Policy'] = "frame-ancestors 'none'" if inline else "sandbox; default-src 'none'"
    response['X-Frame-Options'] = 'DENY'
    response['Cache-Control'] = 'private, no-store'
    return response


class PublicDownload(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        row = get_object_or_404(PublicBrochures.queryset, course__slug=slug)
        return download(row)


class PublicView(APIView):
    """Opens a published brochure in the browser's PDF viewer (inline) instead of saving it."""
    permission_classes = [permissions.AllowAny]

    def get(self, request, slug):
        row = get_object_or_404(PublicBrochures.queryset, course__slug=slug)
        return download(row, inline=True)


class AdminDownload(APIView):
    permission_classes = [IsStaff]

    def get(self, request, pk):
        return download(get_object_or_404(CourseBrochure, course_id=pk))


class EditSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=180, required=False)
    description = serializers.CharField(max_length=500, allow_blank=True, required=False)
    download_name = serializers.CharField(max_length=120, required=False)
    is_published = serializers.BooleanField(required=False)

    def validate_download_name(self, value):
        value = safe_name(value)
        return value if value.lower().endswith('.pdf') else value[:116] + '.pdf'


class AdminBrochure(APIView):
    permission_classes = [IsStaff]
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request, pk):
        row = get_object_or_404(CourseBrochure.objects.select_related('course'), course_id=pk)
        response = Response(AdminMetadata(row).data)
        response['Cache-Control'] = 'private, no-store'
        return response

    def put(self, request, pk):
        course = get_object_or_404(Course, pk=pk)
        upload = request.FILES.get('file')
        if not upload:
            raise serializers.ValidationError({'file': 'Choose a PDF brochure.'})
        validate_pdf(upload)
        form = EditSerializer(data=request.data)
        form.is_valid(raise_exception=True)
        new_key = private_storage.save(f'brochures/{uuid.uuid4().hex}.pdf', upload)
        try:
            with transaction.atomic():
                # Lock the stable parent too, including the first upload before a brochure row exists.
                Course.objects.select_for_update().get(pk=course.pk)
                row, _ = CourseBrochure.objects.get_or_create(course=course, defaults={'title': course.name, 'download_name': course.slug + '-brochure.pdf', 'original_name': safe_name(upload.name)})
                old_key = row.storage_key
                for key, value in form.validated_data.items():
                    setattr(row, key, value)
                row.storage_key = new_key
                row.original_name = safe_name(upload.name)
                row.size = upload.size
                row.save()
                transaction.on_commit(lambda: remove_file(old_key), robust=True)
        except Exception:
            remove_file(new_key)
            raise
        return Response(AdminMetadata(row).data)

    def patch(self, request, pk):
        with transaction.atomic():
            row = get_object_or_404(CourseBrochure.objects.select_for_update().select_related('course'), course_id=pk)
            form = EditSerializer(data=request.data)
            form.is_valid(raise_exception=True)
            for key, value in form.validated_data.items():
                setattr(row, key, value)
            row.save()
        return Response(AdminMetadata(row).data)

    def delete(self, request, pk):
        with transaction.atomic():
            row = get_object_or_404(CourseBrochure.objects.select_for_update(), course_id=pk)
            key = row.storage_key
            row.delete()
            transaction.on_commit(lambda: remove_file(key), robust=True)
        return Response(status=204)
