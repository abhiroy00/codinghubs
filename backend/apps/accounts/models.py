from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    phone = models.CharField(max_length=20, blank=True)
    google_sub = models.CharField(max_length=255, unique=True, null=True, blank=True, editable=False)

    def __str__(self):
        return self.username
