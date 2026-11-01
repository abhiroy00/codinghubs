from django.db import models
from django.utils import timezone
from django.utils.text import slugify


class Job(models.Model):
    MODE_REMOTE = 'remote'
    MODE_HYBRID = 'hybrid'
    MODE_ONSITE = 'onsite'
    WORK_MODE_CHOICES = (
        (MODE_REMOTE, 'Remote'),
        (MODE_HYBRID, 'Hybrid'),
        (MODE_ONSITE, 'On-site'),
    )

    TYPE_FULL_TIME = 'full_time'
    TYPE_PART_TIME = 'part_time'
    TYPE_INTERNSHIP = 'internship'
    TYPE_CONTRACT = 'contract'
    JOB_TYPE_CHOICES = (
        (TYPE_FULL_TIME, 'Full-time'),
        (TYPE_PART_TIME, 'Part-time'),
        (TYPE_INTERNSHIP, 'Internship'),
        (TYPE_CONTRACT, 'Contract'),
    )

    LEVEL_CHOICES = (
        ('fresher', 'Fresher (0–1 years)'),
        ('junior', 'Junior (1–3 years)'),
        ('mid', 'Mid-level (3–5 years)'),
        ('senior', 'Senior (5+ years)'),
    )

    slug = models.SlugField(max_length=220, unique=True, editable=False)
    title = models.CharField(max_length=160)
    company_name = models.CharField(max_length=160)
    company_logo = models.CharField(max_length=500, blank=True)
    company_about = models.TextField(blank=True)
    location = models.CharField(max_length=160)
    work_mode = models.CharField(max_length=10, choices=WORK_MODE_CHOICES, default=MODE_ONSITE)
    job_type = models.CharField(max_length=12, choices=JOB_TYPE_CHOICES, default=TYPE_FULL_TIME)
    experience_level = models.CharField(max_length=10, choices=LEVEL_CHOICES, default='fresher')
    experience = models.CharField(max_length=100, blank=True, help_text='Shown as written, e.g. "0–2 years".')
    salary = models.CharField(max_length=100, blank=True, help_text='Salary or stipend, e.g. "₹4–6 LPA".')
    description = models.TextField()
    responsibilities = models.JSONField(default=list, blank=True)
    skills = models.JSONField(default=list, blank=True)
    qualifications = models.JSONField(default=list, blank=True)
    benefits = models.JSONField(default=list, blank=True)
    how_to_apply = models.TextField(blank=True)
    application_url = models.URLField(max_length=500, blank=True)
    application_email = models.EmailField(blank=True)
    application_deadline = models.DateField(null=True, blank=True)
    is_published = models.BooleanField(default=False)
    is_expired = models.BooleanField(default=False)
    published_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-published_at', '-created_at']

    def __str__(self):
        return f'{self.title} — {self.company_name}'

    @property
    def is_open(self):
        """Accepting applications: not marked expired and the deadline (if any) has not passed."""
        deadline_ok = self.application_deadline is None or self.application_deadline >= timezone.localdate()
        return not self.is_expired and deadline_ok

    def save(self, *args, **kwargs):
        if not self.slug:
            base = slugify(f'{self.title} {self.company_name}')[:200] or 'job'
            slug, n = base, 2
            while Job.objects.filter(slug=slug).exists():
                slug, n = f'{base}-{n}', n + 1
            self.slug = slug
        if self.is_published and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)

    @classmethod
    def open_listings(cls):
        today = timezone.localdate()
        return cls.objects.filter(is_published=True, is_expired=False).filter(
            models.Q(application_deadline__isnull=True) | models.Q(application_deadline__gte=today)
        )
