"""Persistent browser sessions, separate from the backwards-compatible JWT API.

Cookie secrets never reach JavaScript or the database. A session has no server-side
idle expiry; logout, password reset, disabled users and account deletion revoke it.
"""
import hashlib
import secrets

from django.conf import settings
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import AccessToken, RefreshToken

from .models import LoginSession
from .serializers import UserSerializer

COOKIE = 'ch_session'
COOKIE_PATH = '/api/auth/'
# Browser cookies have a finite lifetime; renew on every restore (Chromium caps at 400 days).
COOKIE_AGE = 400 * 24 * 60 * 60


def browser_request(request):
    # This non-simple header requires a successful CORS preflight from other origins.
    # Explicitly check Origin too, including same-site sibling subdomains.
    allowed = {request.build_absolute_uri('/').rstrip('/'), settings.SITE_URL.rstrip('/'), *settings.CORS_ALLOWED_ORIGINS}
    origin = request.headers.get('Origin')
    if request.headers.get('X-Requested-With') != 'XMLHttpRequest' or (origin and origin not in allowed):
        raise PermissionDenied('This session request must come from Coding Hubs.')


def digest(secret):
    return hashlib.sha256(secret.encode()).hexdigest()


def set_cookie(response, secret):
    response.set_cookie(COOKIE, secret, max_age=COOKIE_AGE, path=COOKIE_PATH,
                        httponly=True, secure=not settings.DEBUG, samesite='Lax')
    response['Cache-Control'] = 'no-store'
    return response


def login_response(user, request, status_code=200):
    data = {'user': UserSerializer(user).data}
    if request.data.get('persistent') is True:
        browser_request(request)
        secret = secrets.token_urlsafe(48)
        # A new sign-in in the same browser replaces its previous session.
        old = request.COOKIES.get(COOKIE, '')
        if old:
            LoginSession.objects.filter(token_hash=digest(old)).delete()
        LoginSession.objects.create(token_hash=digest(secret), user=user)
        data.update(access=str(AccessToken.for_user(user)), persistent=True)
        return set_cookie(Response(data, status=status_code), secret)
    refresh = RefreshToken.for_user(user)
    data.update(access=str(refresh.access_token), refresh=str(refresh))
    response = Response(data, status=status_code)
    response['Cache-Control'] = 'no-store'
    return response


def restore_session(request):
    secret = request.COOKIES.get(COOKIE, '')
    session = LoginSession.objects.select_related('user').filter(token_hash=digest(secret)).first() if secret else None
    if not session or not session.user.is_active:
        response = Response({'detail': 'Please sign in again.'}, status=401)
        response.delete_cookie(COOKIE, path=COOKIE_PATH, samesite='Lax')
        response['Cache-Control'] = 'no-store'
        return response
    data = {'user': UserSerializer(session.user).data, 'access': str(AccessToken.for_user(session.user)), 'persistent': True}
    return set_cookie(Response(data), secret)


def end_session(request):
    secret = request.COOKIES.get(COOKIE, '')
    if secret:
        LoginSession.objects.filter(token_hash=digest(secret)).delete()
    response = Response(status=204)
    response.delete_cookie(COOKIE, path=COOKIE_PATH, samesite='Lax')
    response['Cache-Control'] = 'no-store'
    return response
