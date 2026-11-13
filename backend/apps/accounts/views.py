import json
import re
import urllib.error
import urllib.parse
import urllib.request

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


class GoogleTokenError(Exception):
    pass


def _google_token_info(credential: str) -> dict:
    """Verify a Google ID token with Google and return its claims."""
    url = 'https://oauth2.googleapis.com/tokeninfo?id_token=' + urllib.parse.quote(credential, safe='')
    try:
        with urllib.request.urlopen(url, timeout=6) as response:  # noqa: S310 - fixed Google endpoint
            return json.loads(response.read().decode('utf-8'))
    except (urllib.error.URLError, TimeoutError, ValueError) as exc:
        raise GoogleTokenError(str(exc)) from exc


def _username_from_email(email: str) -> str:
    base = re.sub(r'[^a-zA-Z0-9._-]', '', email.split('@')[0])[:140] or 'learner'
    candidate, n = base, 1
    while User.objects.filter(username__iexact=candidate).exists():
        n += 1
        candidate = f'{base}{n}'
    return candidate


class GoogleLoginThrottle(AnonRateThrottle):
    rate = '30/hour'


class GoogleLoginSerializer(serializers.Serializer):
    credential = serializers.CharField()


class GoogleLoginView(APIView):
    """Exchange a Google Identity Services credential for site tokens."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [GoogleLoginThrottle]

    def get(self, request):
        """Public config: which Google client id the page should render."""
        clients = [client.strip() for client in getattr(settings, 'GOOGLE_CLIENT_IDS', '').split(',') if client.strip()]
        return Response({'client_id': clients[0] if clients else ''})

    def post(self, request):
        serializer = GoogleLoginSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        allowed = [client.strip() for client in getattr(settings, 'GOOGLE_CLIENT_IDS', '').split(',') if client.strip()]
        if not allowed:
            return Response({'detail': 'Google sign-in is not configured yet.'}, status=status.HTTP_503_SERVICE_UNAVAILABLE)
        try:
            info = _google_token_info(serializer.validated_data['credential'])
        except GoogleTokenError:
            return Response({'detail': 'Google sign-in could not be verified.'}, status=status.HTTP_400_BAD_REQUEST)
        if info.get('aud') not in allowed:
            return Response({'detail': 'This Google client is not allowed for this site.'}, status=status.HTTP_400_BAD_REQUEST)
        if str(info.get('email_verified', '')).lower() not in ('true', '1'):
            return Response({'detail': 'Your Google email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)
        email = (info.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Google did not share an email address.'}, status=status.HTTP_400_BAD_REQUEST)
        user = User.objects.filter(email__iexact=email).first()
        if user is None:
            user = User(
                username=_username_from_email(email),
                email=email,
                first_name=(info.get('given_name') or '')[:150],
                last_name=(info.get('family_name') or '')[:150],
            )
            user.set_unusable_password()
            user.save()
        if not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        refresh = RefreshToken.for_user(user)
        return Response({'user': UserSerializer(user).data, 'access': str(refresh.access_token), 'refresh': str(refresh)})
