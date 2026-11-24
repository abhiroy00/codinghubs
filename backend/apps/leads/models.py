from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Q
from django.utils import timezone


class CampaignQuerySet(models.QuerySet):
    def live(self, now=None):
        """Published, started and not yet expired. Expiry uses the stored end time, so nothing cached can extend it."""
        now = now or timezone.now()
        return self.filter(status=Campaign.STATUS_PUBLISHED, starts_at__lte=now).filter(Q(ends_at__isnull=True) | Q(ends_at__gt=now))


class Campaign(models.Model):
    """An admin-managed course offer shown as a slim bar, a card or (optionally) a modal."""

    STATUS_DRAFT, STATUS_PUBLISHED, STATUS_PAUSED = 'draft', 'published', 'paused'
    STATUS_CHOICES = ((STATUS_DRAFT, 'Draft'), (STATUS_PUBLISHED, 'Published'), (STATUS_PAUSED, 'Paused'))
    SHOW_BAR, SHOW_CARD, SHOW_MODAL = 'bar', 'card', 'modal'
    SHOW_CHOICES = ((SHOW_BAR, 'Announcement bar'), (SHOW_CARD, 'Offer card'), (SHOW_MODAL, 'Modal'))
    TARGET_ALL, TARGET_COURSE, TARGET_CATEGORY, TARGET_PAGE = 'all', 'course', 'category', 'page'
    TARGET_CHOICES = ((TARGET_ALL, 'All pages'), (TARGET_COURSE, 'Courses'), (TARGET_CATEGORY, 'Course categories'), (TARGET_PAGE, 'Pages'))
    FREQ_ONCE, FREQ_DAILY, FREQ_SESSION = 'once', 'daily', 'session'
    FREQ_CHOICES = ((FREQ_ONCE, 'Hide for good once dismissed'), (FREQ_DAILY, 'Show again a day after dismissal'), (FREQ_SESSION, 'Show again in a new browser session'))

    title = models.CharField(max_length=90)
    offer_text = models.CharField(max_length=200, help_text='Short offer copy, one or two lines.')
    offer_label = models.CharField(max_length=40, blank=True, help_text='Discount amount or label, e.g. "₹2,000 off" or "Early-bird".')
    coupon_code = models.CharField(max_length=30, blank=True)
    terms = models.TextField(blank=True)
    cta_label = models.CharField(max_length=40, default='Book a free demo')
    cta_url = models.CharField(max_length=300, default='#demo', help_text='"#demo" opens the free-demo form; otherwise a site path or https URL.')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_DRAFT)
    starts_at = models.DateTimeField()
    ends_at = models.DateTimeField(null=True, blank=True)
    presentation = models.CharField(max_length=6, choices=SHOW_CHOICES, default=SHOW_BAR)
    target_type = models.CharField(max_length=10, choices=TARGET_CHOICES, default=TARGET_ALL)
    target_values = models.JSONField(default=list, blank=True, help_text='Course slugs, category names or page paths, depending on the target type.')
    priority = models.PositiveSmallIntegerField(default=0, help_text='Higher wins when several offers match one page.')
    frequency = models.CharField(max_length=8, choices=FREQ_CHOICES, default=FREQ_ONCE)
    show_countdown = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    objects = CampaignQuerySet.as_manager()

    class Meta:
        ordering = ['-priority', '-starts_at', '-id']

    def __str__(self):
        return self.title

    def clean(self):
        if self.ends_at and self.starts_at and self.ends_at <= self.starts_at:
            raise ValidationError({'ends_at': 'The end time must be after the start time.'})
        if self.show_countdown and not self.ends_at:
            raise ValidationError({'show_countdown': 'A countdown needs a real end time.'})
        if self.target_type != self.TARGET_ALL and not [v for v in self.target_values if str(v).strip()]:
            raise ValidationError({'target_values': 'Add at least one course, category or page to target.'})
        url = (self.cta_url or '').strip()
        if not (url == '#demo' or url.startswith('/') or url.startswith('https://')):
            raise ValidationError({'cta_url': 'Use "#demo", a site path starting with "/" or an https URL.'})

    def matches(self, path='', course='', category=''):
        values = [str(v).strip() for v in self.target_values if str(v).strip()]
        if self.target_type == self.TARGET_ALL:
            return True
        if self.target_type == self.TARGET_COURSE:
            return bool(course) and course in values
        if self.target_type == self.TARGET_CATEGORY:
            return bool(category) and category.lower() in {v.lower() for v in values}
        # Pages: an exact path, or a prefix written with a trailing '*' (e.g. "/blog/*").
        path = path or '/'
        return any(path == v or (v.endswith('*') and path.startswith(v[:-1])) for v in values)

    @classmethod
    def pick(cls, path='', course='', category='', now=None):
        """The single highest-priority live campaign for a page, or None."""
        for campaign in cls.objects.live(now):
            if campaign.matches(path, course, category):
                return campaign
        return None



class Lead(models.Model):
    MODE_DEMO = 'demo'
    MODE_EXPERT = 'expert'
    MODE_CHOICES = (
        (MODE_DEMO, 'Free demo class'),
        (MODE_EXPERT, 'Talk to an expert'),
    )

    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20)
    email = models.EmailField(max_length=120, blank=True)
    education = models.CharField(max_length=120, blank=True)
    whatsapp_consent = models.BooleanField(default=False)
    course = models.CharField(max_length=120, blank=True)
    mode = models.CharField(max_length=10, choices=MODE_CHOICES, default=MODE_EXPERT)
    STATUS_NEW = 'new'
    STATUS_CONTACTED = 'contacted'
    STATUS_INTERESTED = 'interested'
    STATUS_CONVERTED = 'converted'
    STATUS_CLOSED = 'closed'
    STATUS_CHOICES = (
        (STATUS_NEW, 'New'),
        (STATUS_CONTACTED, 'Contacted'),
        (STATUS_INTERESTED, 'Interested'),
        (STATUS_CONVERTED, 'Converted'),
        (STATUS_CLOSED, 'Closed'),
    )

    status = models.CharField(max_length=12, choices=STATUS_CHOICES, default=STATUS_NEW)
    notes = models.TextField(blank=True)
    source_page = models.CharField(max_length=200, blank=True)
    utm_source = models.CharField(max_length=100, blank=True)
    utm_medium = models.CharField(max_length=100, blank=True)
    utm_campaign = models.CharField(max_length=100, blank=True)
    campaign = models.ForeignKey(Campaign, null=True, blank=True, on_delete=models.SET_NULL, related_name='leads')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.name} ({self.phone}) — {self.course or "n/a"}'
