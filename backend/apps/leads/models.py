from django.db import models


class Lead(models.Model):
    MODE_DEMO = 'demo'
    MODE_EXPERT = 'expert'
    MODE_CHOICES = (
        (MODE_DEMO, 'Free demo class'),
        (MODE_EXPERT, 'Talk to an expert'),
    )

    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    course = models.CharField(max_length=120, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default=MODE_EXPERT)
    source_page = models.CharField(max_length=200, blank=True)
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=100, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone}) — {self.course or "n/a"}'
