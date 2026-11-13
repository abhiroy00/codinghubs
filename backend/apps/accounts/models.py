from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    avatar_url = models.URLField(max_length=2048, blank=True, editable=False)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True, editable=False)

    def __str__(self):
        return self.username


class LoginSession(models.Model):
    """Revocable browser session. Only the digest of its random secret is stored."""
    token_hash = models.CharField(max_length=64, primary_key=True, editable=False)
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='login_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
