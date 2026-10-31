import uuid
from decimal import Decimal

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.validators import MinValueValidator
from django.db import models
from django.db.models import Q
from django.utils import timezone
from django.utils.text import slugify

from apps.content.models import PublicQuerySet, PublishMixin, SeoMixin, STATUS_PUBLISHED  # noqa: F401 (re-exported)
from apps.content.sanitize import reading_minutes, sanitize_html
from apps.content.validators import validate_https_or_site_url, validate_media_or_https_url

from .storage import private_storage

MONEY = {'max_digits': 12, 'decimal_places': 2}
ZERO = Decimal('0.00')

DIFFICULTIES = (('beginner', 'Beginner'), ('intermediate', 'Intermediate'), ('advanced', 'Advanced'))


def unique_slug_for(model, wanted: str, exclude_pk=None, max_length=180) -> str:
    base = (slugify(wanted) or 'untitled')[: max_length - 6].strip('-') or 'untitled'
    slug, n = base, 2
    while model.objects.filter(slug=slug).exclude(pk=exclude_pk).exists():
        slug, n = f'{base}-{n}', n + 1
    return slug


# ======================= projects & guides =======================
class Product(SeoMixin, PublishMixin):
    """A sellable item. Free items (price 0) are claimed through the same checkout, so downloads always have an owner."""

    TYPE_PHYSICAL, TYPE_DIGITAL, TYPE_MIXED = 'physical', 'digital', 'mixed'
    TYPE_CHOICES = ((TYPE_PHYSICAL, 'Physical'), (TYPE_DIGITAL, 'Digital'), (TYPE_MIXED, 'Physical + digital'))
    KIND_CHOICES = (
        ('programming_notes', 'Programming notes'), ('interview_notes', 'Interview preparation notes'), ('book', 'Technical book'),
        ('printed_material', 'Printed study material'), ('pdf_notes', 'PDF notes'), ('ebook', 'E-book'),
        ('source_code', 'Project source code'), ('project_report', 'Project report'), ('project_guide', 'Project guide'),
        ('lab_manual', 'Practical lab manual'), ('question_bank', 'Question bank'), ('mock_test', 'Mock test material'),
        ('course_material', 'Course study material'), ('other', 'Other'),
    )

    title = models.CharField(max_length=200)
    slug = models.SlugField(max_length=180, unique=True)
    sku = models.CharField(max_length=40, unique=True)
    product_type = models.CharField(max_length=10, choices=TYPE_CHOICES, default=TYPE_DIGITAL)
    item_kind = models.CharField(max_length=24, choices=KIND_CHOICES, default='other')
    category = models.ForeignKey('ProductCategory', null=True, blank=True, on_delete=models.SET_NULL, related_name='products')
    short_description = models.CharField(max_length=400, blank=True)
    description = models.TextField(blank=True)
    included_materials = models.JSONField(default=list, blank=True)  # ["120-page PDF", "Source code ZIP"]
    author = models.CharField(max_length=120, blank=True)
    publisher = models.CharField(max_length=120, blank=True)
    isbn = models.CharField(max_length=20, blank=True)
    language = models.CharField(max_length=40, blank=True)
    edition = models.CharField(max_length=40, blank=True)
    publication_year = models.PositiveSmallIntegerField(null=True, blank=True)
    pages = models.PositiveIntegerField(null=True, blank=True)
    format = models.CharField(max_length=40, blank=True)  # PDF, EPUB, Paperback ...
    topics = models.JSONField(default=list, blank=True)
    original_price = models.DecimalField(**MONEY, null=True, blank=True, validators=[MinValueValidator(ZERO)])
    price = models.DecimalField(**MONEY, default=ZERO, validators=[MinValueValidator(ZERO)])
    currency = models.CharField(max_length=3, default='INR')
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True, validators=[MinValueValidator(ZERO)],
                                   help_text='Percent. Empty = use the store default.')
    track_stock = models.BooleanField(default=True, help_text='Physical items only.')
    stock_quantity = models.IntegerField(default=0)  # available to sell (already net of unpaid reservations)
    low_stock_threshold = models.PositiveIntegerField(default=5)
    weight_grams = models.PositiveIntegerField(null=True, blank=True)
    dimensions = models.CharField(max_length=60, blank=True)
    download_limit = models.PositiveSmallIntegerField(null=True, blank=True, help_text='Downloads allowed per file per purchase; empty = unlimited.')
    is_featured = models.BooleanField(default=False)
    related_products = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='+')

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [models.Index(fields=['status', '-published_at']), models.Index(fields=['product_type', 'status'])]

    def __str__(self):
        return self.title

    @property
    def is_physical(self):
        return self.product_type in (self.TYPE_PHYSICAL, self.TYPE_MIXED)

    @property
    def is_digital(self):
        return self.product_type in (self.TYPE_DIGITAL, self.TYPE_MIXED)

    @property
    def tracks_stock(self):
        return self.is_physical and self.track_stock

    @property
    def in_stock(self):
        return (not self.tracks_stock) or self.stock_quantity > 0

    def clean(self):
        if self.original_price is not None and self.original_price < self.price:
            raise ValidationError({'original_price': 'Original price cannot be lower than the selling price.'})
        if self.isbn and not _valid_isbn(self.isbn):
            raise ValidationError({'isbn': 'Enter a valid ISBN-10 or ISBN-13.'})
        if self.status == 'scheduled' and (not self.published_at or self.published_at <= timezone.now()):
            raise ValidationError({'published_at': 'Choose a future date and time to schedule.'})

    def save(self, *args, **kwargs):
        self.description = sanitize_html(self.description)
        if not self.sku:
            self.sku = f'CH-{uuid.uuid4().hex[:8].upper()}'
        self.sku = self.sku.strip().upper()
        if self.status == 'published' and not self.published_at:
            self.published_at = timezone.now()
        if self.category_id and self.category.slug in FREE_CATEGORY_SLUGS:
            # Business rule: notes and books are free (T-shirts are sold). Keeps the shop honest even if a price is typed in.
            self.price = ZERO
            self.original_price = None
        super().save(*args, **kwargs)


def _valid_isbn(value: str) -> bool:
    s = value.replace('-', '').replace(' ', '').upper()
    if len(s) == 10 and s[:9].isdigit() and (s[9].isdigit() or s[9] == 'X'):
        return sum((10 - i) * (10 if c == 'X' else int(c)) for i, c in enumerate(s)) % 11 == 0
    if len(s) == 13 and s.isdigit():
        return sum(int(c) * (1 if i % 2 == 0 else 3) for i, c in enumerate(s)) % 10 == 0
    return False


FREE_CATEGORY_SLUGS = ('notes', 'books')


class ProductCategory(models.Model):
    name = models.CharField(max_length=80, unique=True)
    slug = models.SlugField(max_length=90, unique=True)
    description = models.CharField(max_length=300, blank=True)

    class Meta:
        ordering = ['name']
        verbose_name_plural = 'product categories'

    def save(self, *args, **kwargs):
        self.name = self.name.strip()
        if not self.slug:
            self.slug = slugify(self.name)[:90]
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


class ProductImage(models.Model):
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='images')
    src = models.CharField(max_length=300, validators=[validate_media_or_https_url])
    alt = models.CharField(max_length=200, blank=True)
    position = models.PositiveSmallIntegerField(default=0)

    class Meta:
        ordering = ['position', 'id']


class Project(SeoMixin, PublishMixin):
    KIND = 'project'

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
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name='projects',
                                help_text='If set, the project is paid and this product unlocks its files.')
    related_projects = models.ManyToManyField('self', blank=True, symmetrical=False, related_name='+')
    related_blogs = models.ManyToManyField('content.Blog', blank=True, related_name='+')
    related_courses = models.ManyToManyField('courses.Course', blank=True, related_name='+')

    objects = PublicQuerySet.as_manager()

    class Meta:
        ordering = ['-published_at', '-created_at']
        indexes = [models.Index(fields=['status', '-published_at'])]

    def __str__(self):
        return self.title

    @property
    def is_paid(self):
        return bool(self.product_id and self.product.price > 0)

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
    ACCESS_FREE, ACCESS_ACCOUNT, ACCESS_PAID, ACCESS_INCLUDED = 'free', 'account', 'paid', 'included'
    ACCESS_CHOICES = (
        (ACCESS_FREE, 'Free for everyone'), (ACCESS_ACCOUNT, 'Free with an account'), (ACCESS_PAID, 'Paid'),
        (ACCESS_INCLUDED, 'Included with a product or course'),
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
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name='guides',
                                help_text='Buying this product unlocks the guide (paid / included).')
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
        if self.access_type == self.ACCESS_PAID and not self.product_id:
            raise ValidationError({'product': 'A paid guide needs the product that unlocks it.'})
        if self.access_type == self.ACCESS_INCLUDED and not self.product_id and not self.pk:
            pass  # included courses are set after the first save
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


# ======================= private files =======================
def asset_path(instance, filename):
    ext = filename.rsplit('.', 1)[-1].lower() if '.' in filename else 'bin'
    return f'assets/{timezone.now():%Y/%m}/{uuid.uuid4().hex}.{ext}'


class DigitalAsset(models.Model):
    """A private file attached to a product, guide or project. Never has a public URL."""

    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.CASCADE, related_name='assets')
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
                condition=(Q(product__isnull=False, guide__isnull=True, project__isnull=True)
                           | Q(product__isnull=True, guide__isnull=False, project__isnull=True)
                           | Q(product__isnull=True, guide__isnull=True, project__isnull=False)),
                name='asset_has_exactly_one_owner',
            )
        ]

    def __str__(self):
        return self.label


# ======================= store settings & coupons =======================
class StoreSettings(models.Model):
    TAX_NONE, TAX_EXCLUSIVE, TAX_INCLUSIVE = 'none', 'exclusive', 'inclusive'
    TAX_CHOICES = ((TAX_NONE, 'No tax charged'), (TAX_EXCLUSIVE, 'Tax added on top of prices'), (TAX_INCLUSIVE, 'Prices include tax'))

    currency = models.CharField(max_length=3, default='INR')
    tax_mode = models.CharField(max_length=10, choices=TAX_CHOICES, default=TAX_NONE)
    default_tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=ZERO, help_text='Percent; set only the rate your accountant confirms.')
    shipping_flat = models.DecimalField(**MONEY, default=ZERO)
    free_shipping_over = models.DecimalField(**MONEY, null=True, blank=True)
    allow_guest_checkout = models.BooleanField(default=True)
    contact_email = models.EmailField(blank=True)
    contact_phone = models.CharField(max_length=30, blank=True)
    notify_email = models.EmailField(blank=True, help_text='Gets a message for every paid order.')
    refund_policy = models.TextField(blank=True)
    return_policy = models.TextField(blank=True)
    digital_delivery_policy = models.TextField(blank=True)
    shipping_policy = models.TextField(blank=True)
    email_orders = models.BooleanField(default=True)

    class Meta:
        verbose_name_plural = 'store settings'

    @classmethod
    def load(cls):
        obj, _ = cls.objects.get_or_create(pk=1)
        return obj

    def save(self, *args, **kwargs):
        self.pk = 1
        for f in ('refund_policy', 'return_policy', 'digital_delivery_policy', 'shipping_policy'):
            setattr(self, f, sanitize_html(getattr(self, f)))
        super().save(*args, **kwargs)


class Coupon(models.Model):
    PERCENT, FIXED = 'percent', 'fixed'
    TYPE_CHOICES = ((PERCENT, 'Percentage'), (FIXED, 'Fixed amount'))

    code = models.CharField(max_length=40, unique=True)
    discount_type = models.CharField(max_length=8, choices=TYPE_CHOICES, default=PERCENT)
    value = models.DecimalField(max_digits=10, decimal_places=2, validators=[MinValueValidator(Decimal('0.01'))])
    max_discount = models.DecimalField(**MONEY, null=True, blank=True)
    min_purchase = models.DecimalField(**MONEY, default=ZERO)
    valid_from = models.DateTimeField(null=True, blank=True)
    valid_until = models.DateTimeField(null=True, blank=True)
    usage_limit = models.PositiveIntegerField(null=True, blank=True)
    per_customer_limit = models.PositiveIntegerField(null=True, blank=True)
    eligible_products = models.ManyToManyField(Product, blank=True, related_name='coupons')
    eligible_categories = models.ManyToManyField(ProductCategory, blank=True, related_name='coupons')
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def clean(self):
        if self.discount_type == self.PERCENT and self.value > 100:
            raise ValidationError({'value': 'A percentage discount cannot exceed 100.'})

    def save(self, *args, **kwargs):
        self.code = self.code.strip().upper()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.code


# ======================= cart =======================
class Cart(models.Model):
    token = models.UUIDField(default=uuid.uuid4, unique=True, editable=False)
    user = models.OneToOneField(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.CASCADE, related_name='shop_cart')
    coupon_code = models.CharField(max_length=40, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)


class CartItem(models.Model):
    cart = models.ForeignKey(Cart, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='+')
    quantity = models.PositiveSmallIntegerField(default=1)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['cart', 'product'], name='uniq_cart_product')]


# ======================= orders =======================
class Order(models.Model):
    ST_PENDING, ST_PAID, ST_PROCESSING, ST_SHIPPED, ST_DELIVERED = 'pending_payment', 'paid', 'processing', 'shipped', 'delivered'
    ST_CANCELLED, ST_EXPIRED, ST_REFUND_REQ, ST_PART_REFUNDED, ST_REFUNDED = 'cancelled', 'expired', 'refund_requested', 'partially_refunded', 'refunded'
    STATUS_CHOICES = tuple((s, s.replace('_', ' ').capitalize()) for s in (ST_PENDING, ST_PAID, ST_PROCESSING, ST_SHIPPED, ST_DELIVERED, ST_CANCELLED, ST_EXPIRED, ST_REFUND_REQ, ST_PART_REFUNDED, ST_REFUNDED))
    PAY_UNPAID, PAY_PENDING, PAY_PAID, PAY_FAILED, PAY_PART, PAY_REFUNDED = 'unpaid', 'pending', 'paid', 'failed', 'partially_refunded', 'refunded'
    PAYMENT_CHOICES = tuple((s, s.replace('_', ' ').capitalize()) for s in (PAY_UNPAID, PAY_PENDING, PAY_PAID, PAY_FAILED, PAY_PART, PAY_REFUNDED))
    FUL_NA, FUL_UNFULFILLED, FUL_PROCESSING, FUL_SHIPPED, FUL_DELIVERED, FUL_CANCELLED = 'not_required', 'unfulfilled', 'processing', 'shipped', 'delivered', 'cancelled'
    FULFILMENT_CHOICES = tuple((s, s.replace('_', ' ').capitalize()) for s in (FUL_NA, FUL_UNFULFILLED, FUL_PROCESSING, FUL_SHIPPED, FUL_DELIVERED, FUL_CANCELLED))
    PAID_STATES = (ST_PAID, ST_PROCESSING, ST_SHIPPED, ST_DELIVERED, ST_REFUND_REQ, ST_PART_REFUNDED)

    number = models.CharField(max_length=24, unique=True)
    public_token = models.CharField(max_length=64, unique=True, default='')  # lets a guest view/download their own order
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='shop_orders')
    email = models.EmailField()
    name = models.CharField(max_length=120)
    phone = models.CharField(max_length=20, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default=ST_PENDING, db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_CHOICES, default=PAY_UNPAID, db_index=True)
    fulfilment_status = models.CharField(max_length=14, choices=FULFILMENT_CHOICES, default=FUL_NA)
    currency = models.CharField(max_length=3, default='INR')
    subtotal = models.DecimalField(**MONEY, default=ZERO)
    discount = models.DecimalField(**MONEY, default=ZERO)
    tax = models.DecimalField(**MONEY, default=ZERO)
    shipping = models.DecimalField(**MONEY, default=ZERO)
    total = models.DecimalField(**MONEY, default=ZERO)
    refunded_amount = models.DecimalField(**MONEY, default=ZERO)
    tax_mode = models.CharField(max_length=10, default='none')
    coupon_code = models.CharField(max_length=40, blank=True)
    has_physical = models.BooleanField(default=False)
    has_digital = models.BooleanField(default=False)
    billing_address = models.JSONField(default=dict, blank=True)
    shipping_address = models.JSONField(default=dict, blank=True)
    carrier = models.CharField(max_length=60, blank=True)
    tracking_number = models.CharField(max_length=80, blank=True)
    shipped_at = models.DateTimeField(null=True, blank=True)
    delivered_at = models.DateTimeField(null=True, blank=True)
    paid_at = models.DateTimeField(null=True, blank=True)
    customer_note = models.CharField(max_length=300, blank=True)
    admin_note = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [models.Index(fields=['status', '-created_at']), models.Index(fields=['payment_status', '-created_at'])]

    def __str__(self):
        return self.number

    def save(self, *args, **kwargs):
        if not self.public_token:
            self.public_token = uuid.uuid4().hex + uuid.uuid4().hex[:16]
        super().save(*args, **kwargs)

    @property
    def is_paid(self):
        return self.payment_status in (self.PAY_PAID, self.PAY_PART)


class OrderItem(models.Model):
    """Snapshot of what was bought: later edits or deletion of the product never change an old order."""

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, null=True, blank=True, on_delete=models.SET_NULL, related_name='order_items')
    title = models.CharField(max_length=200)
    sku = models.CharField(max_length=40)
    product_type = models.CharField(max_length=10)
    unit_price = models.DecimalField(**MONEY)
    quantity = models.PositiveSmallIntegerField()
    discount = models.DecimalField(**MONEY, default=ZERO)
    tax = models.DecimalField(**MONEY, default=ZERO)
    line_total = models.DecimalField(**MONEY)
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=ZERO)

    @property
    def is_digital(self):
        return self.product_type in ('digital', 'mixed')

    @property
    def is_physical(self):
        return self.product_type in ('physical', 'mixed')


class CouponRedemption(models.Model):
    order = models.OneToOneField(Order, on_delete=models.CASCADE, related_name='redemption')
    coupon = models.ForeignKey(Coupon, on_delete=models.CASCADE, related_name='redemptions')
    email = models.EmailField()
    amount = models.DecimalField(**MONEY)


class Payment(models.Model):
    S_CREATED, S_AUTHORIZED, S_CAPTURED, S_FAILED, S_PART_REFUNDED, S_REFUNDED = 'created', 'authorized', 'captured', 'failed', 'partially_refunded', 'refunded'
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    provider = models.CharField(max_length=20, default='razorpay')
    provider_order_id = models.CharField(max_length=64, blank=True, db_index=True)
    provider_payment_id = models.CharField(max_length=64, blank=True, db_index=True)
    amount = models.DecimalField(**MONEY)
    currency = models.CharField(max_length=3, default='INR')
    status = models.CharField(max_length=20, default=S_CREATED)
    signature_verified = models.BooleanField(default=False)
    failure_reason = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']
        constraints = [
            models.UniqueConstraint(fields=['provider_payment_id'], condition=~Q(provider_payment_id=''), name='uniq_provider_payment'),
        ]


class PaymentEvent(models.Model):
    """One row per webhook delivery; the unique event id makes processing idempotent."""

    event_id = models.CharField(max_length=100, unique=True)
    event_type = models.CharField(max_length=60)
    payload = models.JSONField(default=dict)
    processed = models.BooleanField(default=False)
    error = models.CharField(max_length=300, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)


class Refund(models.Model):
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='refunds')
    payment = models.ForeignKey(Payment, null=True, blank=True, on_delete=models.SET_NULL, related_name='refunds')
    provider_refund_id = models.CharField(max_length=64, blank=True)
    amount = models.DecimalField(**MONEY)
    reason = models.CharField(max_length=300, blank=True)
    status = models.CharField(max_length=20, default='processed')
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)


class InventoryMovement(models.Model):
    REASONS = (('reserve', 'Reserved for an order'), ('release', 'Released (unpaid / cancelled)'), ('adjustment', 'Manual adjustment'),
               ('restock', 'Restock'), ('return', 'Customer return'))
    product = models.ForeignKey(Product, on_delete=models.CASCADE, related_name='movements')
    delta = models.IntegerField()
    balance_after = models.IntegerField()
    reason = models.CharField(max_length=12, choices=REASONS)
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name='movements')
    note = models.CharField(max_length=200, blank=True)
    created_by = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at', '-id']


class DownloadPermission(models.Model):
    order_item = models.ForeignKey(OrderItem, on_delete=models.CASCADE, related_name='permissions')
    asset = models.ForeignKey(DigitalAsset, on_delete=models.CASCADE, related_name='permissions')
    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='permissions')
    max_downloads = models.PositiveSmallIntegerField(null=True, blank=True)
    download_count = models.PositiveIntegerField(default=0)
    granted_at = models.DateTimeField(auto_now_add=True)
    revoked_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        constraints = [models.UniqueConstraint(fields=['order_item', 'asset'], name='uniq_permission')]

    @property
    def active(self):
        return self.revoked_at is None and (self.max_downloads is None or self.download_count < self.max_downloads)


class DownloadEvent(models.Model):
    asset = models.ForeignKey(DigitalAsset, on_delete=models.CASCADE, related_name='events')
    user = models.ForeignKey(settings.AUTH_USER_MODEL, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    order = models.ForeignKey(Order, null=True, blank=True, on_delete=models.SET_NULL, related_name='+')
    source = models.CharField(max_length=12)  # order | guide | project
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
