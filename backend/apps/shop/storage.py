"""Private file storage: outside MEDIA_ROOT and never served by nginx. Downloads go through authorised, expiring links
(see downloads.py). On AWS replace with a private S3 storage backend (django-storages) and presigned URLs."""
from django.conf import settings
from django.core.files.storage import FileSystemStorage
from django.utils.deconstruct import deconstructible


@deconstructible
class PrivateStorage(FileSystemStorage):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)

    @property
    def base_location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def location(self):
        return str(settings.PRIVATE_MEDIA_ROOT)

    @property
    def base_url(self):  # never expose a URL
        return None

    def url(self, name):
        raise ValueError('Private files have no public URL.')


private_storage = PrivateStorage()
