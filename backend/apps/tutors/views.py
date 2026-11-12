import uuid
from io import BytesIO

from django.conf import settings
from django.core.files.base import ContentFile
from django.core.files.storage import default_storage
from django.utils import timezone
from PIL import Image, UnidentifiedImageError
from rest_framework import generics, permissions, status
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView

from .models import Tutor
from .serializers import TutorAdminSerializer, TutorBookingCreateSerializer, TutorSerializer


class TutorAdminPage(PageNumberPagination):
    page_size = 25
    page_size_query_param = 'page_size'
    max_page_size = 100


class IsActiveStaff(permissions.BasePermission):
    """Staff only, plus the matching Django model permission when the view declares one.

    Views without `model_class` keep the old staff-only behaviour (e.g. shared upload helpers);
    views that manage a model require view/add/change/delete on it, so a content editor cannot
    publish jobs or tutors by accident. Superusers always pass.
    """

    ACTION_FOR = {'GET': 'view', 'HEAD': 'view', 'OPTIONS': 'view', 'POST': 'add', 'PUT': 'change', 'PATCH': 'change', 'DELETE': 'delete'}

    def has_permission(self, request, view):
        user = request.user
        if not (user and user.is_authenticated and user.is_active and user.is_staff):
            return False
        model = getattr(view, 'model_class', None)
        if model is None:
            return True
        action = self.ACTION_FOR.get(request.method, 'change')
        return user.has_perm(f'{model._meta.app_label}.{action}_{model._meta.model_name}')


class TutorListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TutorSerializer
    queryset = Tutor.objects.filter(is_active=True)


class BookingThrottle(AnonRateThrottle):
    rate = '5/min'


class TutorBookingCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [BookingThrottle]
    serializer_class = TutorBookingCreateSerializer


class TutorAdminListView(generics.ListCreateAPIView):
    permission_classes = [IsActiveStaff]
    model_class = Tutor
    serializer_class = TutorAdminSerializer
    pagination_class = TutorAdminPage

    def get_queryset(self):
        queryset = Tutor.objects.all()
        if query := self.request.query_params.get('q', '').strip():
            queryset = queryset.filter(full_name__icontains=query)
        if active := self.request.query_params.get('is_active'):
            if active in ('true', 'false'):
                queryset = queryset.filter(is_active=(active == 'true'))
        return queryset


class TutorAdminDetailView(generics.RetrieveUpdateAPIView):
    permission_classes = [IsActiveStaff]
    model_class = Tutor
    serializer_class = TutorAdminSerializer
    queryset = Tutor.objects.all()
    http_method_names = ['get', 'put', 'patch', 'options']


class TutorImageUploadView(APIView):
    permission_classes = [IsActiveStaff]
    model_class = Tutor
    throttle_classes = [UserRateThrottle]
    MAX_UPLOAD = 5 * 1024 * 1024
    FORMATS = {'JPEG': 'jpg', 'PNG': 'png', 'WEBP': 'webp'}
    MAX_PIXELS = 40_000_000
    UPLOAD_DIR = 'tutors'

    def post(self, request):
        uploaded = request.FILES.get('file')
        if not uploaded:
            return Response({'detail': 'No file uploaded.'}, status=status.HTTP_400_BAD_REQUEST)
        if uploaded.size > self.MAX_UPLOAD:
            return Response({'detail': 'Image is larger than 5 MB.'}, status=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE)
        try:
            image = Image.open(uploaded)
            image_format = image.format
            if image_format not in self.FORMATS or image.width * image.height > self.MAX_PIXELS:
                raise ValueError
            image.load()
        except (UnidentifiedImageError, ValueError, OSError, Image.DecompressionBombError):
            return Response(
                {'detail': 'Upload a JPEG, PNG or WebP image (max 5 MB).'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        output = BytesIO()
        if image_format == 'JPEG':
            image.convert('RGB').save(output, 'JPEG', quality=88, optimize=True)
        else:
            image.save(output, image_format)
        now = timezone.now()
        filename = f'{self.UPLOAD_DIR}/{now:%Y/%m}/{uuid.uuid4().hex}.{self.FORMATS[image_format]}'
        saved = default_storage.save(filename, ContentFile(output.getvalue()))
        return Response(
            {'url': f'{settings.MEDIA_URL}{saved}'},
            status=status.HTTP_201_CREATED,
        )
