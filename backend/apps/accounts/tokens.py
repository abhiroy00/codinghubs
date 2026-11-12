"""Helpers for revoking issued refresh tokens (SimpleJWT blacklist)."""
from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken


def revoke_all_tokens(user) -> int:
    """Blacklist every refresh token still recorded for this user.

    Access tokens already issued stay valid until they expire (30 minutes); this prevents the
    much longer-lived refresh token from minting new ones after logout or a password change.
    """
    if user is None or not getattr(user, 'pk', None):
        return 0
    count = 0
    for token in OutstandingToken.objects.filter(user=user):
        _, created = BlacklistedToken.objects.get_or_create(token=token)
        count += int(created)
    return count
