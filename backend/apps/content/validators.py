from urllib.parse import urlparse

from django.core.exceptions import ValidationError


def validate_media_or_https_url(value: str):
    """Image / canonical URLs: https(s) or one of our own /media/ paths. Rejects javascript:, data: and friends."""
    if not value:
        return
    if value.startswith('/media/') and '..' not in value and '//' not in value[1:]:
        return
    parsed = urlparse(value)
    if parsed.scheme in ('http', 'https') and parsed.netloc and ' ' not in value:
        return
    raise ValidationError('Enter an https:// URL or an uploaded /media/ path.')


def validate_https_or_site_url(value: str):
    """Link targets for related services: https URL or a site-relative path."""
    if not value:
        return
    if value.startswith('/') and not value.startswith('//'):
        return
    validate_media_or_https_url(value)
