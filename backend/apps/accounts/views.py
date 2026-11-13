import re
from urllib.parse import urlsplit

from django.conf import settings
from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.db import IntegrityError, transaction
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
from rest_framework_simplejwt.serializers import TokenObtainSerializer
from .sessions import browser_request, login_response, restore_session, end_session

from .emails import send_password_reset
from .google import GoogleTokenError, GoogleUnavailableError, verify_google_token
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
        return login_response(user, request, status_code=201)


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get_authenticate_header(self, request):
        return 'Bearer realm="api"'

    def post(self, request):
        serializer = TokenObtainSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        return login_response(serializer.user, request)


class SessionView(APIView):
    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def post(self, request):
        browser_request(request)
        return restore_session(request)



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
            'profile': {**UserSerializer(user).data, 'google_account_id': user.google_sub},
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
    authentication_classes = []

    def post(self, request):
        if request.COOKIES.get('ch_session'):
            browser_request(request)
        refresh = str(request.data.get('refresh', '')).strip()
        if refresh:
            try:
                RefreshToken(refresh).blacklist()
            except TokenError:
                pass
        return end_session(request)


def _google_token_info(credential: str) -> dict:
    return verify_google_token(credential)


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
    credential = serializers.CharField(max_length=8192)
    password = serializers.CharField(required=False, write_only=True, trim_whitespace=False, max_length=1024)


class GoogleLoginView(APIView):
    """Exchange a Google Identity Services credential for site tokens."""

    permission_classes = [permissions.AllowAny]
    throttle_classes = [GoogleLoginThrottle]
    authentication_classes = []

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
        except GoogleUnavailableError:
            return Response({'detail': 'Google sign-in is temporarily unavailable. Please try again.'}, status=503)
        except GoogleTokenError:
            return Response({'detail': 'Google sign-in could not be verified.'}, status=status.HTTP_400_BAD_REQUEST)
        if info.get('aud') not in allowed:
            return Response({'detail': 'This Google client is not allowed for this site.'}, status=status.HTTP_400_BAD_REQUEST)
        if str(info.get('email_verified', '')).lower() not in ('true', '1'):
            return Response({'detail': 'Your Google email is not verified.'}, status=status.HTTP_400_BAD_REQUEST)
        email = (info.get('email') or '').strip().lower()
        if not email:
            return Response({'detail': 'Google did not share an email address.'}, status=status.HTTP_400_BAD_REQUEST)
        subject = info.get('sub')
        if not isinstance(subject, str) or not subject.strip() or len(subject) > 255:
            return Response({'detail': 'Google did not provide a valid account identity.'}, status=400)
        try:
            with transaction.atomic():
                user = User.objects.select_for_update().filter(google_sub=subject).first()
                if user is None:
                    matches = list(User.objects.select_for_update().filter(email__iexact=email)[:2])
                    if len(matches) > 1:
                        return Response({'detail': 'Please sign in with your existing username and contact support to link Google.'}, status=409)
                    user = matches[0] if matches else None
                    if user is not None:
                        if not user.is_active:
                            return Response({'detail': 'This account is disabled.'}, status=403)
                        if user.google_sub and user.google_sub != subject:
                            return Response({'detail': 'This email is already linked to another Google account.'}, status=409)
                        google_owns_email = email.endswith('@gmail.com') or bool(info.get('hd'))
                        password = serializer.validated_data.get('password')
                        if not google_owns_email and not password:
                            return Response({
                                'code': 'account_link_required', 'email': email,
                                'detail': 'Enter your existing Coding Hubs password once to connect this Google account.',
                            }, status=409)
                        if not google_owns_email and not user.check_password(password):
                            return Response({'code': 'account_link_failed', 'detail': 'The existing account password is incorrect.'}, status=400)
                        user.google_sub = subject
                        user.save(update_fields=['google_sub'])
                    else:
                        user, _ = User.objects.get_or_create(google_sub=subject, defaults={
                            'username': _username_from_email(email), 'email': email,
                            'first_name': str(info.get('given_name') or '')[:150],
                            'last_name': str(info.get('family_name') or '')[:150],
                            'password': make_password(None),
                        })
        except IntegrityError:
            return Response({'detail': 'Please try Google sign-in again.'}, status=409)
        if not user.is_active:
            return Response({'detail': 'This account is disabled.'}, status=status.HTTP_403_FORBIDDEN)
        picture = info.get('picture') or ''
        try:
            parsed = urlsplit(picture)
            safe_picture = parsed.scheme == 'https' and (parsed.hostname or '').endswith('.googleusercontent.com') and not parsed.username and not parsed.password and parsed.port in (None, 443)
        except (ValueError, TypeError):
            safe_picture = False
        user.avatar_url = picture if safe_picture and len(picture) <= 2048 else ''
        user.save(update_fields=['avatar_url'])
        return login_response(user, request)
