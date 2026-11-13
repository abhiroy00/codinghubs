"""Google Identity Services token verification; credentials never go in URLs or logs."""
from functools import partial

from django.conf import settings
from google.auth import exceptions
from google.auth.transport.requests import Request
from google.oauth2 import id_token


class GoogleTokenError(Exception):
    pass


class GoogleUnavailableError(GoogleTokenError):
    pass


def verify_google_token(credential: str) -> dict:
    audiences = [value.strip() for value in settings.GOOGLE_CLIENT_IDS.split(',') if value.strip()]
    if not audiences:
        raise GoogleTokenError('Google sign-in is not configured.')
    try:
        # The official verifier checks Google's signature, issuer, expiry and audience.
        request = partial(Request(), timeout=6)
        return dict(id_token.verify_oauth2_token(credential, request, audience=audiences))
    except exceptions.TransportError as exc:
        raise GoogleUnavailableError('Google verification is temporarily unavailable.') from exc
    except (exceptions.GoogleAuthError, ValueError, TypeError) as exc:
        raise GoogleTokenError('Invalid Google credential.') from exc
