from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from .sanitize import reading_minutes, sanitize_html
from .validators import validate_https_or_site_url, validate_media_or_https_url

STATUS_DRAFT = 'draft'
STATUS_SCHEDULED = 'scheduled'
STATUS_PUBLISHED = 'published'
STATUS_ARCHIVED = 'archived'
STATUS_CHOICES = (
    (STATUS_DRAFT, 'Draft'),
    (STATUS_SCHEDULED, 'Scheduled'),
    (STATUS_PUBLISHED, 'Published'),
    (STATUS_ARCHIVED, 'Archived'),
)


def unique_slug(model, wanted: str, exclude_pk=None, max_length=180) -> str:
    """Readable lowercase slug; appends -2, -3 … when it collides with another row (or a recorded redirect)."""
    base = (slugify(wanted) or 'untitled')[:max_length - 6].strip('-') or 'untitled'
    slug, n = base, 2
    kind = model.KIND
    while (
        model.objects.filter(slug=slug).exclude(pk=exclude_pk).exists()
        or SlugRedirect.objects.filter(kind=kind, old_slug=slug).exists()
    ):
        slug, n = f'{base}-{n}', n + 1
    return slug


class PublicQuerySet(models.QuerySet):
    def public(self):
        """Visible on the website: published, or scheduled and its time has come. Evaluated per request, so
        scheduled posts go live without any worker or timer."""
        now = timezone.now()
        return self.filter(
            Q(status=STATUS_PUBLISHED) | Q(status=STATUS_SCHEDULED),
            published_at__isnull=False,
            published_at__lte=now,
        )


class SlugRedirect(models.Model):
    """Old public slug -> current slug, so renamed URLs keep working (301)."""

    kind = models.CharField(max_length=12)
    old_slug = models.CharField(max_length=180)
    new_slug = models.CharField(max_length=180)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['kind', 'old_slug'], name='uniq_slug_redirect')]


class BlogCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'blog categories'

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        if not self.slug:
            self.slug = slugify(self.name)[:90]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class BlogTag(models.Model):
    name = models.CharField(max_length=50, unique=True)
    slug = models.SlugField(max_length=60, unique=True)

    class Meta:
        ordering = ['name']

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        if not self.slug:
            self.slug = slugify(self.name)[:60]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class SeoMixin(models.Model):
    seo_title = models.CharField(max_length=120, blank=True)
    meta_description = models.CharField(max_length=320, blank=True)
    focus_keyword = models.CharField(max_length=120, blank=True)
    secondary_keywords = models.JSONField(default=list, blank=True)
    canonical_url = models.URLField(max_length=300, blank=True)
    og_title = models.CharField(max_length=120, blank=True)
    og_description = models.CharField(max_length=320, blank=True)
    og_image = models.CharField(max_length=300, blank=True, validators=[validate_media_or_https_url])

    class Meta:
        abstract = True


class PublishMixin(models.Model):
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+'
    )

    class Meta:
        abstract = True

    @property
    def is_public(self) -> bool:
        return (
            self.status in (STATUS_PUBLISHED, STATUS_SCHEDULED)
            and self.published_at is not None
            and self.published_at <= timezone.now()
        )


class Blog(SeoMixin, PublishMixin):
    KIND = 'blog'

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=180, unique=True)
    excerpt = models.CharField(max_length=400, blank=True)
    content = models.TextField(blank=True)
    featured_image = models.CharField(max_length=300, blank=True, validators=[validate_media_or_https_url])
    featured_image_alt = models.CharField(max_length=200, blank=True)
    author_name = models.CharField(max_length=100, blank=True)
    author_title = models.CharField(max_length=120, blank=True)
    category = models.ForeignKey(BlogCategory, null=True, blank=True, on_delete=models.SET_NULL, related_name='blogs')
    tags = models.ManyToManyField(BlogTag, blank=True, related_name='blogs')
    related = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='+')
    is_featured = models.BooleanField(default=False)
    reading_time = models.PositiveSmallIntegerField(default=1)
    # authoring aids (not shown publicly)
    search_intent = models.CharField(max_length=200, blank=True)
    faq = models.JSONField(default=list, blank=True)  # [{"q": "...", "a": "..."}], shown + FAQPage JSON-LD when present

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [
            models.Index(fields=['status', '-published_at']),
            models.Index(fields=['is_featured', '-published_at']),
        ]

    def __str__(self):
        return self.title

    def clean(self):
        _clean_publish(self)

    def save(self, *args, **kwargs):
        self.content = sanitize_html(self.content)
        self.reading_time = reading_minutes(self.content)
        super().save(*args, **kwargs)


class CaseStudy(SeoMixin, PublishMixin):
    KIND = 'case'

    SECTIONS = ('overview', 'background', 'challenge', 'solution', 'implementation', 'results', 'lessons')

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=180, unique=True)
    summary = models.CharField(max_length=400, blank=True)
    client_name = models.CharField(max_length=120, blank=True)
    client_permission = models.BooleanField(
        default=False, help_text='Client agreed to be named publicly. When off, only client_descriptor is shown.'
    )
    client_descriptor = models.CharField(max_length=160, blank=True)  # e.g. "A mid-sized logistics company in NCR"
    industry = models.CharField(max_length=80, blank=True, db_index=True)
    duration = models.CharField(max_length=60, blank=True)
    # structured sections (sanitised HTML). Empty or listed in hidden_sections => not shown.
    overview = models.TextField(blank=True)
    background = models.TextField(blank=True)
    challenge = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    solution = models.TextField(blank=True)
    implementation = models.TextField(blank=True)
    results = models.TextField(blank=True)
    lessons = models.TextField(blank=True)
    hidden_sections = models.JSONField(default=list, blank=True)
    technologies = models.JSONField(default=list, blank=True)  # ["Python", "Django"]
    # only figures the administrator verified: [{"label": "...", "value": "...", "note": "..."}]
    metrics = models.JSONField(default=list, blank=True)
    related_services = models.JSONField(default=list, blank=True)  # [{"label": "...", "url": "/program/..."}]
    related = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='+')
    featured_image = models.CharField(max_length=300, blank=True, validators=[validate_media_or_https_url])
    featured_image_alt = models.CharField(max_length=200, blank=True)
    gallery = models.JSONField(default=list, blank=True)  # [{"src": "...", "alt": "..."}]
    author_name = models.CharField(max_length=100, blank=True)
    author_title = models.CharField(max_length=120, blank=True)
    is_featured = models.BooleanField(default=False)
    reading_time = models.PositiveSmallIntegerField(default=1)

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        verbose_name_plural = 'case studies'
        indexes = [models.Index(fields=['status', '-published_at'])]

    def __str__(self):
        return self.title

    def clean(self):
        _clean_publish(self)
        for item in self.related_services or []:
            validate_https_or_site_url(str(item.get('url', '')))

    def save(self, *args, **kwargs):
        for f in self.SECTIONS + ('objectives',):
            setattr(self, f, sanitize_html(getattr(self, f)))
        self.reading_time = reading_minutes(*(getattr(self, f) for f in self.SECTIONS + ('objectives',)))
        super().save(*args, **kwargs)


def _clean_publish(obj):
    if obj.status == STATUS_SCHEDULED and (not obj.published_at or obj.published_at <= timezone.now()):
        raise ValidationError({'published_at': 'Choose a future date and time to schedule.'})
    if obj.status == STATUS_PUBLISHED and not obj.published_at:
        obj.published_at = timezone.now()


class ContentRevision(models.Model):
    """Snapshot of the previous state of a post, kept before each admin edit (last 20 per post)."""

    kind = models.CharField(max_length=12)
    object_id = models.PositiveBigIntegerField()
    snapshot = models.JSONField()
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']
        indexes = [models.Index(fields=['kind', 'object_id', '-created_at'])]
