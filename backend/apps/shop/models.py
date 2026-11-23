import uuid
from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify
from apps.content.models import PublicQuerySet, PublishMixin, SeoMixin
from apps.content.sanitize import reading_minutes, sanitize_html
from apps.content.validators import validate_https_or_site_url, validate_media_or_https_url
from .storage import private_storage


DIFFICULTIES = (('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced'))


def unique_slug_for(model, wanted: str, exclude_pk=None, max_length=180) -> str:
    base = (slugify(wanted) or 'untitled')[: max_length - 6].strip('-') or 'untitled'
    slug, n = base, 2
    while model.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
        slug, n = f'{base}-{n}', n + 1
    return slug


class Project(SeoMixin, PublishMixin):
    KIND = 'project'
    files_restricted = models.BooleanField(default=False, help_text='Keep legacy restricted files private after store retirement.')

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=180, unique=True)
    summary = models.CharField(max_length=400, blank=True)
    overview = models.TextField(blank=True)
    category = models.CharField(max_length=80, blank=True, db_index=True)
    difficulty = models.CharField(max_length=14, choices=DIFFICULTIES, default='beginner', db_index=True)
    technologies = models.JSONField(default=list, blank=True)
    languages = models.JSONField(default=list, blank=True)
    tools = models.JSONField(default=list, blank=True)
    problem_statement = models.TextField(blank=True)
    objectives = models.TextField(blank=True)
    features = models.JSONField(default=list, blank=True)  # [{"title": "...", "description": "..."}] any number
    system_requirements = models.TextField(blank=True)
    prerequisites = models.TextField(blank=True)
    learning_outcomes = models.JSONField(default=list, blank=True)
    architecture = models.TextField(blank=True)
    database_requirements = models.TextField(blank=True)
    setup_overview = models.TextField(blank=True)
    screenshots = models.JSONField(default=list, blank=True)  # [{"src","alt","caption"}]
    featured_image = models.CharField(max_length=300, blank=True, validators=[validate_media_or_https_url])
    featured_image_alt = models.CharField(max_length=200, blank=True)
    demo_url = models.URLField(max_length=300, blank=True)
    repo_url = models.URLField(max_length=300, blank=True)
    repo_public = models.BooleanField(default=False, help_text='Show the repository link publicly. Leave off for private code.')
    estimated_time = models.CharField(max_length=60, blank=True)
    author_name = models.CharField(max_length=100, blank=True)
    author_title = models.CharField(max_length=120, blank=True)
    is_featured = models.BooleanField(default=False)
    related_projects = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='+')
    related_blogs = models.ManyToManyField('content.Blog', blank=True, related_name='+')
    related_courses = models.ManyToManyField('courses.Course', blank=True, related_name='+')

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [models.Index(fields=['status', '-published_at'])]

    def __str__(self):
        return self.title

    def clean(self):
        for f in self.features or []:
            if not isinstance(f, dict):
                raise ValidationError({'features': 'Each feature needs a title and description.'})
        for url in (self.demo_url,):
            validate_https_or_site_url(url)

    def save(self, *args, **kwargs):
        for f in ('overview', 'problem_statement', 'objectives', 'system_requirements', 'prerequisites', 'architecture', 'database_requirements', 'setup_overview'):
            setattr(self, f, sanitize_html(getattr(self, f)))
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


GUIDE_SECTION_KEYS = (
    ('introduction', 'Introduction'), ('overview', 'Project overview'), ('prerequisites', 'Prerequisites'),
    ('tools', 'Tools and technologies'), ('setup', 'Environment setup'), ('implementation', 'Step-by-step implementation'),
    ('code', 'Code explanation'), ('database', 'Database design'), ('api', 'API development'), ('frontend', 'Frontend development'),
    ('testing', 'Testing'), ('deployment', 'Deployment'), ('errors', 'Common errors'), ('result', 'Final result'),
    ('improvements', 'Further improvements'),
)


class ProjectQuestion(models.Model):
    project = models.ForeignKey(Project, on_delete=models.CASCADE, related_name='questions')
    name = models.CharField(max_length=100)
    email = models.EmailField()
    question = models.TextField(max_length=2000)
    answer = models.TextField(blank=True, max_length=5000)
    created_at = models.DateTimeField(auto_now_add=True)
    answered_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.project.title}: {self.question[:80]}'


class ProjectGuide(SeoMixin, PublishMixin):
    KIND = 'guide'
    ACCESS_FREE, ACCESS_ACCOUNT, ACCESS_RESTRICTED, ACCESS_INCLUDED = 'free', 'account', 'restricted', 'included'
    ACCESS_CHOICES = (
        (ACCESS_FREE, 'Free for everyone'), (ACCESS_ACCOUNT, 'Free with an account'), (ACCESS_RESTRICTED, 'Restricted'),
        (ACCESS_INCLUDED, 'Included with a course'),
    )

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=180, unique=True)
    summary = models.CharField(max_length=400, blank=True)
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.SET_NULL, related_name='guides')
    category = models.CharField(max_length=80, blank=True, db_index=True)
    difficulty = models.CharField(max_length=14, choices=DIFFICULTIES, default='beginner', db_index=True)
    author_name = models.CharField(max_length=100, blank=True)
    author_title = models.CharField(max_length=120, blank=True)
    technologies = models.JSONField(default=list, blank=True)
    estimated_time = models.CharField(max_length=60, blank=True)
    prerequisites = models.TextField(blank=True)
    objectives = models.JSONField(default=list, blank=True)
    required_software = models.JSONField(default=list, blank=True)
    # configurable sections: [{"key","title","html","enabled","preview"}]
    sections = models.JSONField(default=list, blank=True)
    faq = models.JSONField(default=list, blank=True)
    related_resources = models.JSONField(default=list, blank=True)  # [{"label","url"}]
    related_projects = models.ManyToManyField(Project, blank=True, related_name='+')
    related_blogs = models.ManyToManyField('content.Blog', blank=True, related_name='+')
    featured_image = models.CharField(max_length=300, blank=True, validators=[validate_media_or_https_url])
    featured_image_alt = models.CharField(max_length=200, blank=True)
    access_type = models.CharField(max_length=10, choices=ACCESS_CHOICES, default=ACCESS_FREE, db_index=True)
    included_courses = models.ManyToManyField('courses.Course', blank=True, related_name='+')
    is_featured = models.BooleanField(default=False)
    reading_time = models.PositiveSmallIntegerField(default=1)

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [models.Index(fields=['status', '-published_at']), models.Index(fields=['access_type', 'status'])]

    def __str__(self):
        return self.title

    def clean(self):
        for r in self.related_resources or []:
            validate_https_or_site_url(str(r.get('url', '')))

    def save(self, *args, **kwargs):
        self.prerequisites = sanitize_html(self.prerequisites)
        clean_sections = []
        for s in self.sections or []:
            if isinstance(s, dict):
                clean_sections.append({
                    'key': str(s.get('key', ''))[:40], 'title': str(s.get('title', ''))[:120],
                    'html': sanitize_html(str(s.get('html', ''))), 'enabled': bool(s.get('enabled', True)), 'preview': bool(s.get('preview', False)),
                })
        self.sections = clean_sections
        self.reading_time = reading_minutes(*(s['html'] for s in clean_sections if s['enabled']))
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        super().save(*args, **kwargs)


def asset_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'assets/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.{ext}'


class DigitalAsset(models.Model):
    """A private file attached to a guide or project. Never has a public URL."""

    guide = models.ForeignKey(ProjectGuide, null=True, blank=True, on_delete=models.CASCADE, related_name='assets')
    project = models.ForeignKey(Project, null=True, blank=True, on_delete=models.CASCADE, related_name='assets')
    file = models.FileField(storage=private_storage, upload_to=asset_path, max_length=200)
    label = models.CharField(max_length=160)
    original_name = models.CharField(max_length=200)
    content_type = models.CharField(max_length=100, blank=True)
    size = models.PositiveBigIntegerField(default=0)
    sha256 = models.CharField(max_length=64, blank=True)
    position = models.PositiveSmallIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['position', 'id']
        constraints = [
            models.CheckConstraint(
                condition=(Q(guide__isnull=False, project__isnull=True)
                           | Q(guide__isnull=True, project__isnull=False)),
                name='asset_has_exactly_one_owner',
            )
        ]

    def __str__(self):
        return self.label


class DownloadEvent(models.Model):
    asset = models.ForeignKey(DigitalAsset, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    source = models.CharField(max_length=12)  # guide | project
    ip_prefix = models.CharField(max_length=45, blank=True)  # truncated, not the full address
    created_at = models.DateTimeField(auto_now_add=True)


class AuditLog(models.Model):
    actor = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    action = models.CharField(max_length=60, db_index=True)
    object_type = models.CharField(max_length=40)
    object_id = models.CharField(max_length=40)
    detail = models.JSONField(default=dict, blank=True)
    ip_prefix = models.CharField(max_length=45, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at', '-id']
