from decimal import Decimal

from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from apps.content import services as content_services
from apps.content.sanitize import add_heading_ids, sanitize_html
from apps.content.validators import validate_https_or_site_url, validate_media_or_https_url

from .models import (
    DIFFICULTIES, GUIDE_SECTION_KEYS, Coupon, Order, OrderItem, Product, ProductCategory, ProductImage, Project, ProjectGuide,
    StoreSettings, unique_slug_for,
)


def _strings(value, label, max_items, max_len):
    if not isinstance(value, list):
        raise serializers.ValidationError(f'{label} must be a list.')
    out = []
    for v in value[:max_items]:
        v = str(v).strip()
        if v and v.lower() not in {o.lower() for o in out}:
            out.append(v[:max_len])
    return out


def _dicts(value, keys, max_items, label, max_len=400):
    if not isinstance(value, list):
        raise serializers.ValidationError(f'{label} must be a list.')
    out = []
    for item in value[:max_items]:
        if not isinstance(item, dict):
            raise serializers.ValidationError(f'{label}: each entry must be an object.')
        out.append({k: str(item.get(k, '')).strip()[:max_len] for k in keys})
    return out


# ---------------- shared write logic ----------------
class SluggedWriteMixin:
    """slug generation, collision handling, scheduled-date validation, M2M by id."""

    M2M = {}  # serializer field -> (relation name, model)

    def validate(self, attrs):
        status = attrs.get('status', getattr(self.instance, 'status', 'draft'))
        when = attrs.get('published_at', getattr(self.instance, 'published_at', None))
        if status == 'scheduled' and (not when or when <= timezone.now()):
            raise serializers.ValidationError({'published_at': 'Choose a future date and time to schedule.'})
        return attrs

    def _persist(self, instance, validated):
        model = self.Meta.model
        m2m = {k: validated.pop(k) for k in list(self.M2M) if k in validated}
        extra = self._pop_extra(validated)
        wanted = validated.pop('slug', None) or None
        user = self.context['request'].user
        with transaction.atomic():
            if instance is None:
                obj = model(**validated, **({'created_by': user} if hasattr(model, 'created_by') else {}))
                obj.slug = unique_slug_for(model, wanted or validated.get('title', ''))
            else:
                obj = instance
                for k, v in validated.items():
                    setattr(obj, k, v)
                if wanted and wanted != obj.slug:
                    obj.slug = unique_slug_for(model, wanted, exclude_pk=obj.pk)
            try:
                obj.full_clean(exclude=['slug', 'sku', 'created_by', 'published_at'])
            except DjangoValidationError as exc:
                raise serializers.ValidationError(exc.message_dict if hasattr(exc, 'error_dict') else {'detail': exc.messages})
            obj.save()
            for field, ids in m2m.items():
                getattr(obj, self.M2M[field][0]).set(self.M2M[field][1].objects.filter(pk__in=ids)[:12])
            self._apply_extra(obj, extra)
        return obj

    def _pop_extra(self, validated):
        return {}

    def _apply_extra(self, obj, extra):
        pass

    def create(self, validated):
        return self._persist(None, validated)

    def update(self, instance, validated):
        return self._persist(instance, validated)


# ---------------- products ----------------
class ProductImageSerializer(serializers.ModelSerializer):
    class Meta:
        model = ProductImage
        fields = ('src', 'alt')


class AssetBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()
    size = serializers.IntegerField()
    content_type = serializers.CharField()
    original_name = serializers.CharField()


class ProductAdminSerializer(SluggedWriteMixin, serializers.ModelSerializer):
    M2M = {'related_ids': ('related_products', Product)}
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    sku = serializers.CharField(max_length=40, required=False, allow_blank=True)
    related_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    images = ProductImageSerializer(many=True, required=False)
    assets = AssetBriefSerializer(many=True, read_only=True)
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    related = serializers.SerializerMethodField()

    class Meta:
        model = Product
        fields = (
            'id', 'title', 'slug', 'sku', 'product_type', 'item_kind', 'category', 'category_name', 'short_description', 'description',
            'included_materials', 'author', 'publisher', 'isbn', 'language', 'edition', 'publication_year', 'pages', 'format', 'topics',
            'original_price', 'price', 'currency', 'tax_rate', 'track_stock', 'stock_quantity', 'low_stock_threshold', 'weight_grams',
            'dimensions', 'download_limit', 'is_featured', 'related', 'related_ids', 'images', 'assets', 'status', 'published_at',
            'seo_title', 'meta_description', 'focus_keyword', 'secondary_keywords', 'canonical_url', 'og_title', 'og_description',
            'og_image', 'created_at', 'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def get_related(self, obj):
        return [{'id': r.id, 'title': r.title} for r in obj.related_products.all()]

    def validate_sku(self, v):
        v = v.strip().upper()
        qs = Product.objects.filter(sku=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if v and qs.exists():
            raise serializers.ValidationError('This SKU is already used by another product.')
        return v

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('Product name is required.')
        return v.strip()

    def validate_currency(self, v):
        if len(v) != 3 or not v.isalpha():
            raise serializers.ValidationError('Use a 3-letter currency code such as INR.')
        return v.upper()

    def validate_included_materials(self, v):
        return _strings(v, 'Included materials', 20, 160)

    def validate_topics(self, v):
        return _strings(v, 'Topics', 20, 60)

    def validate_stock_quantity(self, v):
        if v < 0:
            raise serializers.ValidationError('Stock cannot be negative.')
        return v

    def validate(self, attrs):
        attrs = super().validate(attrs)
        price = attrs.get('price', getattr(self.instance, 'price', Decimal('0')))
        orig = attrs.get('original_price', getattr(self.instance, 'original_price', None))
        if orig is not None and orig < price:
            raise serializers.ValidationError({'original_price': 'Original price cannot be lower than the selling price.'})
        return attrs

    def _pop_extra(self, validated):
        return {'images': validated.pop('images', None)}

    def _apply_extra(self, obj, extra):
        if extra['images'] is not None:
            obj.images.all().delete()
            for i, img in enumerate(extra['images'][:10]):
                ProductImage.objects.create(product=obj, src=img['src'], alt=img.get('alt', ''), position=i)


class CategoryAdminSerializer(serializers.ModelSerializer):
    product_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = ProductCategory
        fields = ('id', 'name', 'slug', 'description', 'product_count')
        extra_kwargs = {'slug': {'required': False}}

    def validate_name(self, v):
        v = v.strip()
        qs = ProductCategory.objects.filter(name__iexact=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return v


# ---------------- projects ----------------
class ProjectAdminSerializer(SluggedWriteMixin, serializers.ModelSerializer):
    M2M = {'related_project_ids': ('related_projects', Project)}
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    related_project_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_blog_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_course_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related = serializers.SerializerMethodField()
    product_title = serializers.CharField(source='product.title', read_only=True, default=None)
    assets = AssetBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            'id', 'title', 'slug', 'summary', 'overview', 'category', 'difficulty', 'technologies', 'languages', 'tools', 'problem_statement',
            'objectives', 'features', 'system_requirements', 'prerequisites', 'learning_outcomes', 'architecture', 'database_requirements',
            'setup_overview', 'screenshots', 'featured_image', 'featured_image_alt', 'demo_url', 'repo_url', 'repo_public', 'estimated_time',
            'author_name', 'author_title', 'is_featured', 'product', 'product_title', 'related', 'related_project_ids', 'related_blog_ids',
            'related_course_ids', 'assets', 'status', 'published_at', 'seo_title', 'meta_description', 'focus_keyword', 'secondary_keywords',
            'canonical_url', 'og_title', 'og_description', 'og_image', 'created_at', 'updated_at',
        )
        read_only_fields = ('created_at', 'updated_at')

    def get_related(self, obj):
        return {
            'projects': [{'id': r.id, 'title': r.title} for r in obj.related_projects.all()],
            'blogs': list(obj.related_blogs.values('id', 'title')),
            'courses': list(obj.related_courses.values('id', 'name')),
        }

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('Title is required.')
        return v.strip()

    def validate_technologies(self, v):
        return _strings(v, 'Technologies', 30, 40)

    def validate_languages(self, v):
        return _strings(v, 'Languages', 20, 40)

    def validate_tools(self, v):
        return _strings(v, 'Tools', 30, 40)

    def validate_learning_outcomes(self, v):
        return _strings(v, 'Learning outcomes', 30, 200)

    def validate_features(self, v):
        return _dicts(v, ('title', 'description'), 60, 'Features')

    def validate_screenshots(self, v):
        items = _dicts(v, ('src', 'alt', 'caption'), 12, 'Screenshots')
        for i in items:
            try:
                validate_media_or_https_url(i['src'])
            except Exception:
                raise serializers.ValidationError('Screenshots must be uploaded images or https:// URLs.')
        return items

    def validate_repo_url(self, v):
        if v and not v.startswith('https://'):
            raise serializers.ValidationError('Use an https:// repository link.')
        return v

    def validate(self, attrs):
        attrs = super().validate(attrs)
        for f in ('overview', 'problem_statement', 'objectives', 'system_requirements', 'prerequisites', 'architecture', 'database_requirements', 'setup_overview'):
            if f in attrs:
                attrs[f] = sanitize_html(attrs[f])
        return attrs

    def _pop_extra(self, validated):
        return {k: validated.pop(k) for k in ('related_blog_ids', 'related_course_ids') if k in validated}

    def _apply_extra(self, obj, extra):
        from apps.content.models import Blog
        from apps.courses.models import Course

        if 'related_blog_ids' in extra:
            obj.related_blogs.set(Blog.objects.filter(pk__in=extra['related_blog_ids'])[:6])
        if 'related_course_ids' in extra:
            obj.related_courses.set(Course.objects.filter(pk__in=extra['related_course_ids'])[:6])


# ---------------- guides ----------------
DEFAULT_SECTIONS = [{'key': k, 'title': t, 'html': '', 'enabled': False, 'preview': False} for k, t in GUIDE_SECTION_KEYS]


class GuideAdminSerializer(SluggedWriteMixin, serializers.ModelSerializer):
    M2M = {'related_project_ids': ('related_projects', Project)}
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    related_project_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_blog_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    included_course_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related = serializers.SerializerMethodField()
    project_title = serializers.CharField(source='project.title', read_only=True, default=None)
    product_title = serializers.CharField(source='product.title', read_only=True, default=None)
    assets = AssetBriefSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectGuide
        fields = (
            'id', 'title', 'slug', 'summary', 'project', 'project_title', 'category', 'difficulty', 'author_name', 'author_title',
            'technologies', 'estimated_time', 'prerequisites', 'objectives', 'required_software', 'sections', 'faq', 'related_resources',
            'featured_image', 'featured_image_alt', 'access_type', 'product', 'product_title', 'is_featured', 'reading_time', 'related',
            'related_project_ids', 'related_blog_ids', 'included_course_ids', 'assets', 'status', 'published_at', 'seo_title',
            'meta_description', 'focus_keyword', 'secondary_keywords', 'canonical_url', 'og_title', 'og_description', 'og_image',
            'created_at', 'updated_at',
        )
        read_only_fields = ('reading_time', 'created_at', 'updated_at')

    def get_related(self, obj):
        return {
            'projects': [{'id': r.id, 'title': r.title} for r in obj.related_projects.all()],
            'blogs': list(obj.related_blogs.values('id', 'title')),
            'courses': list(obj.included_courses.values('id', 'name')),
        }

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('Title is required.')
        return v.strip()

    def validate_technologies(self, v):
        return _strings(v, 'Technologies', 30, 40)

    def validate_objectives(self, v):
        return _strings(v, 'Objectives', 20, 250)

    def validate_required_software(self, v):
        return _strings(v, 'Required software', 30, 80)

    def validate_sections(self, v):
        if not isinstance(v, list):
            raise serializers.ValidationError('Sections must be a list.')
        return [s for s in v[:30] if isinstance(s, dict)]

    def validate_faq(self, v):
        items = _dicts(v, ('q', 'a'), 15, 'FAQ', 2000)
        return [{'q': i['q'][:250], 'a': sanitize_html(i['a'])} for i in items if i['q'] and i['a']]

    def validate_related_resources(self, v):
        items = _dicts(v, ('label', 'url'), 12, 'Resources')
        for i in items:
            try:
                validate_https_or_site_url(i['url'])
            except Exception:
                raise serializers.ValidationError('Resource links must be https:// URLs or site paths.')
        return items

    def validate(self, attrs):
        attrs = super().validate(attrs)
        access = attrs.get('access_type', getattr(self.instance, 'access_type', 'free'))
        product = attrs.get('product', getattr(self.instance, 'product', None))
        if access == ProjectGuide.ACCESS_PAID and not product:
            raise serializers.ValidationError({'product': 'A paid guide needs the product that unlocks it.'})
        if 'prerequisites' in attrs:
            attrs['prerequisites'] = sanitize_html(attrs['prerequisites'])
        return attrs

    def _pop_extra(self, validated):
        return {k: validated.pop(k) for k in ('related_blog_ids', 'included_course_ids') if k in validated}

    def _apply_extra(self, obj, extra):
        from apps.content.models import Blog
        from apps.courses.models import Course

        if 'related_blog_ids' in extra:
            obj.related_blogs.set(Blog.objects.filter(pk__in=extra['related_blog_ids'])[:6])
        if 'included_course_ids' in extra:
            obj.included_courses.set(Course.objects.filter(pk__in=extra['included_course_ids'])[:10])


# ---------------- coupons / settings ----------------
class CouponSerializer(serializers.ModelSerializer):
    product_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    category_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    eligible_product_ids = serializers.SerializerMethodField()
    eligible_category_ids = serializers.SerializerMethodField()
    used = serializers.SerializerMethodField()

    class Meta:
        model = Coupon
        fields = ('id', 'code', 'discount_type', 'value', 'max_discount', 'min_purchase', 'valid_from', 'valid_until', 'usage_limit',
                  'per_customer_limit', 'is_active', 'product_ids', 'category_ids', 'eligible_product_ids', 'eligible_category_ids', 'used', 'created_at')
        read_only_fields = ('created_at',)

    def get_eligible_product_ids(self, o):
        return list(o.eligible_products.values_list('id', flat=True))

    def get_eligible_category_ids(self, o):
        return list(o.eligible_categories.values_list('id', flat=True))

    def get_used(self, o):
        from .pricing import coupon_usage

        return coupon_usage(o)[0]

    def validate_code(self, v):
        v = v.strip().upper()
        if not v.replace('-', '').replace('_', '').isalnum():
            raise serializers.ValidationError('Use letters, numbers, - or _ only.')
        qs = Coupon.objects.filter(code=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('This code already exists.')
        return v

    def validate(self, attrs):
        kind = attrs.get('discount_type', getattr(self.instance, 'discount_type', 'percent'))
        value = attrs.get('value', getattr(self.instance, 'value', 0))
        if kind == 'percent' and value > 100:
            raise serializers.ValidationError({'value': 'A percentage cannot exceed 100.'})
        a, b = attrs.get('valid_from'), attrs.get('valid_until')
        if a and b and b <= a:
            raise serializers.ValidationError({'valid_until': 'The end must be after the start.'})
        return attrs

    def _save(self, instance, validated):
        pids, cids = validated.pop('product_ids', None), validated.pop('category_ids', None)
        obj = instance or Coupon()
        for k, v in validated.items():
            setattr(obj, k, v)
        obj.save()
        if pids is not None:
            obj.eligible_products.set(Product.objects.filter(pk__in=pids))
        if cids is not None:
            obj.eligible_categories.set(ProductCategory.objects.filter(pk__in=cids))
        return obj

    def create(self, validated):
        return self._save(None, validated)

    def update(self, instance, validated):
        return self._save(instance, validated)


class StoreSettingsSerializer(serializers.ModelSerializer):
    class Meta:
        model = StoreSettings
        exclude = ('id',)

    def validate_currency(self, v):
        if len(v) != 3 or not v.isalpha():
            raise serializers.ValidationError('Use a 3-letter currency code such as INR.')
        return v.upper()


# ---------------- orders (admin & customer) ----------------
class OrderItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = OrderItem
        fields = ('id', 'title', 'sku', 'product_type', 'unit_price', 'quantity', 'discount', 'tax', 'line_total')


class OrderSerializer(serializers.ModelSerializer):
    items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = (
            'number', 'status', 'payment_status', 'fulfilment_status', 'currency', 'subtotal', 'discount', 'tax', 'shipping', 'total',
            'refunded_amount', 'coupon_code', 'tax_mode', 'has_physical', 'has_digital', 'name', 'email', 'phone', 'shipping_address',
            'billing_address', 'carrier', 'tracking_number', 'shipped_at', 'delivered_at', 'paid_at', 'customer_note', 'created_at', 'items',
        )


class AdminOrderSerializer(OrderSerializer):
    refunds = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()
    customer = serializers.SerializerMethodField()

    class Meta(OrderSerializer.Meta):
        fields = OrderSerializer.Meta.fields + ('id', 'admin_note', 'refunds', 'payments', 'customer', 'updated_at')

    def get_refunds(self, o):
        return [{'amount': str(r.amount), 'reason': r.reason, 'created_at': r.created_at, 'provider_refund_id': r.provider_refund_id} for r in o.refunds.all()]

    def get_payments(self, o):
        return [{'provider': p.provider, 'status': p.status, 'amount': str(p.amount), 'provider_order_id': p.provider_order_id,
                 'provider_payment_id': p.provider_payment_id, 'signature_verified': p.signature_verified, 'created_at': p.created_at} for p in o.payments.all()]

    def get_customer(self, o):
        return {'id': o.user_id, 'username': o.user.username if o.user_id else None}
