from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.contrib.auth.tokens import default_token_generator
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils.encoding import force_bytes, force_str
from django.utils.http import urlsafe_base64_decode, urlsafe_base64_encode
from django.utils import timezone
from rest_framework import generics, permissions, serializers, status
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.tokens import RefreshToken

from .emails import send_password_reset
from .serializers import RegisterSerializer, UserSerializer
from .tokens import revoke_all_tokens

User = get_user_model()


class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        refresh = RefreshToken.for_user(user)
        return Response(
            {
                'user': UserSerializer(user).data,
                'access': str(refresh.access_token),
                'refresh': str(refresh),
            },
            status=201,
        )


class MeView(APIView):
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        return Response(UserSerializer(request.user).data)


class PasswordResetThrottle(AnonRateThrottle):
    rate = '5/hour'


class PasswordResetRequestSerializer(serializers.Serializer):
    email = serializers.EmailField()


class PasswordResetConfirmSerializer(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    password = serializers.CharField(write_only=True)


class PasswordResetRequestView(APIView):
    """Email a one-time reset link. The same response is returned for every address."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = PasswordResetRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.filter(email__iexact=serializer.validated_data['email'], is_active=True).first()
        if user and user.has_usable_password():
            uid = urlsafe_base64_encode(force_bytes(user.pk))
            token = default_token_generator.make_token(user)
            link = f'{settings.SITE_URL}/reset-password?uid={uid}&token={token}'
            send_password_reset(user.email, link)
        return Response({'detail': 'If an account exists for that address, a reset link has been sent.'})


class PasswordResetConfirmView(APIView):
    """Set a new password from a valid, unexpired token and revoke existing sessions."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [PasswordResetThrottle]

    def post(self, request):
        serializer = PasswordResetConfirmSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        try:
            user_id = force_str(urlsafe_base64_decode(data['uid']))
            user = User.objects.filter(pk=user_id, is_active=True).first()
        except (TypeError, ValueError, OverflowError, DjangoValidationError):
            user = None
        if user is None or not default_token_generator.check_token(user, data['token']):
            return Response(
                {'detail': 'This reset link is invalid or has expired. Request a new one.'},
                status=status.HTTP_400_BAD_REQUEST,
            )
        try:
            validate_password(data['password'], user)
        except DjangoValidationError as exc:
            return Response({'password': list(exc.messages)}, status=status.HTTP_400_BAD_REQUEST)
        user.set_password(data['password'])
        user.save(update_fields=['password'])
        revoke_all_tokens(user)
        return Response({'detail': 'Your password has been changed. You can sign in now.'})


class AccountExportView(APIView):
    """A copy of the personal data this account holds, for the account owner."""

    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        from apps.courses.models import CourseCertificate, LearningProgress
        from apps.enrollments.models import Enrollment
        from apps.shop.models import Order as StoreOrder

        user = request.user
        return Response({
            'exported_at': timezone.now().isoformat(),
            'profile': UserSerializer(user).data,
            'enrollments': [
                {'course': e.course.name, 'slug': e.course.slug, 'enrolled_at': e.enrolled_at}
                for e in Enrollment.objects.filter(user=user).select_related('course')
            ],
            'learning_progress': [
                {'course_slug': p.course_slug, 'current_day': p.current_day, 'completed_days': p.completed_days}
                for p in LearningProgress.objects.filter(user=user)
            ],
            'certificates': [
                {'course_slug': c.course_slug, 'certificate_id': str(c.certificate_id), 'completed_at': c.completed_at}
                for c in CourseCertificate.objects.filter(user=user)
            ],
            'store_orders': [
                {
                    'number': o.number, 'created_at': o.created_at, 'status': o.status, 'payment_status': o.payment_status,
                    'total': str(o.total), 'items': [{'title': i.title, 'quantity': i.quantity} for i in o.items.all()],
                }
                for o in StoreOrder.objects.filter(user=user).prefetch_related('items')
            ],
        })


class AccountDeleteView(APIView):
    """Delete the signed-in account after confirming the password.

    Orders are retained with the customer details they were placed with (tax/accounting),
    but they are detached from the account. Resumes and their files are deleted with it.
    """

    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        password = str(request.data.get('password', ''))
        if not request.user.check_password(password):
            return Response({'password': ['Your password is not correct.']}, status=status.HTTP_400_BAD_REQUEST)
        user = request.user
        revoke_all_tokens(user)
        user.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)


class LogoutView(APIView):
    """Invalidate the refresh token supplied by the client.

    Always answers 204: whether the token was already expired, already blacklisted or simply
    unknown is not disclosed. The client clears its local tokens either way.
    """

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        refresh = str(request.data.get('refresh', '')).strip()
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        return Response(status=status.HTTP_204_NO_CONTENT)
