from django.db import transaction
from django.utils import timezone
from rest_framework import serializers

from . import services
from .models import (
    STATUS_SCHEDULED,
    Blog,
    BlogCategory,
    BlogTag,
    CaseStudy,
    unique_slug,
)
from .sanitize import sanitize_html
from .validators import validate_https_or_site_url


def _strings(value, label, max_items, max_len):
    if not isinstance(value, list):
        raise serializers.ValidationError(f'{label} must be a list.')
    out = []
    for v in value[:max_items]:
        v = str(v).strip()
        if v and v.lower() not in {o.lower() for o in out}:
            out.append(v[:max_len])
    return out


class CategorySerializer(serializers.ModelSerializer):
    blog_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = BlogCategory
        fields = ('id', 'name', 'slug', 'description', 'blog_count')
        extra_kwargs = {'slug': {'required': False}}

    def validate_name(self, v):
        v = v.strip()
        qs = BlogCategory.objects.filter(name__iexact=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A category with this name already exists.')
        return v


class TagSerializer(serializers.ModelSerializer):
    blog_count = serializers.IntegerField(read_only=True, default=0)

    class Meta:
        model = BlogTag
        fields = ('id', 'name', 'slug', 'blog_count')
        extra_kwargs = {'slug': {'required': False}}

    def validate_name(self, v):
        v = v.strip()
        qs = BlogTag.objects.filter(name__iexact=v)
        if self.instance:
            qs = qs.exclude(pk=self.instance.pk)
        if qs.exists():
            raise serializers.ValidationError('A tag with this name already exists.')
        return v


class ContentWriteMixin:
    """Shared create/update logic: slug generation, revision snapshot, redirects, atomic M2M writes."""

    def validate(self, attrs):
        status = attrs.get('status', getattr(self.instance, 'status', 'draft'))
        published_at = attrs.get('published_at', getattr(self.instance, 'published_at', None))
        if status == STATUS_SCHEDULED and (not published_at or published_at <= timezone.now()):
            raise serializers.ValidationError({'published_at': 'Choose a future date and time to schedule.'})
        for key in ('secondary_keywords',):
            if key in attrs:
                attrs[key] = _strings(attrs[key], key, 10, 80)
        return attrs

    def _save(self, instance, validated, user):
        model = self.Meta.model
        extra = {k: validated.pop(k) for k in self.M2M if k in validated}
        wanted_slug = validated.pop('slug', None) or None
        with transaction.atomic():
            if instance is None:
                obj = model(**validated, created_by=user)
                obj.slug = unique_slug(model, wanted_slug or validated.get('title', ''))
                if obj.status == 'published' and not obj.published_at:
                    obj.published_at = timezone.now()
                obj.save()
            else:
                obj = instance
                services.save_revision(obj, user)
                old_slug = obj.slug
                for k, v in validated.items():
                    setattr(obj, k, v)
                if wanted_slug is not None and wanted_slug != old_slug:
                    obj.slug = unique_slug(model, wanted_slug, exclude_pk=obj.pk)
                if obj.status == 'published' and not obj.published_at:
                    obj.published_at = timezone.now()
                obj.save()
                services.record_slug_change(obj, old_slug)
            self._apply_m2m(obj, extra)
        return obj

    def create(self, validated):
        return self._save(None, validated, self.context['request'].user)

    def update(self, instance, validated):
        return self._save(instance, validated, self.context['request'].user)


class BlogAdminSerializer(ContentWriteMixin, serializers.ModelSerializer):
    M2M = ('tag_names', 'related_ids')
    tag_names = serializers.ListField(child=serializers.CharField(max_length=50), required=False, write_only=True)
    related_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')
    related = serializers.SerializerMethodField()
    category_name = serializers.CharField(source='category.name', read_only=True, default=None)
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)

    class Meta:
        model = Blog
        fields = (
            'id', 'title', 'slug', 'excerpt', 'content', 'featured_image', 'featured_image_alt', 'author_name', 'author_title',
            'category', 'category_name', 'tags', 'tag_names', 'related', 'related_ids', 'is_featured', 'status', 'published_at',
            'reading_time', 'seo_title', 'meta_description', 'focus_keyword', 'secondary_keywords', 'canonical_url', 'og_title',
            'og_description', 'og_image', 'search_intent', 'faq', 'created_at', 'updated_at',
        )
        read_only_fields = ('reading_time', 'created_at', 'updated_at')

    def get_related(self, obj):
        return [{'id': r.id, 'title': r.title} for r in obj.related.all()]

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('Title is required.')
        return v.strip()

    def validate_content(self, v):
        return sanitize_html(v)

    def validate_faq(self, v):
        if not isinstance(v, list):
            raise serializers.ValidationError('FAQ must be a list.')
        return [{'q': str(i.get('q', '')).strip()[:250], 'a': sanitize_html(str(i.get('a', ''))[:2000])} for i in v[:15] if i.get('q') and i.get('a')]

    def _apply_m2m(self, obj, extra):
        if 'tag_names' in extra:
            tags = []
            for name in _strings(extra['tag_names'], 'tags', 15, 50):
                tag = BlogTag.objects.filter(name__iexact=name).first() or BlogTag.objects.create(name=name)
                tags.append(tag)
            obj.tags.set(tags)
        if 'related_ids' in extra:
            obj.related.set(Blog.objects.filter(pk__in=extra['related_ids']).exclude(pk=obj.pk)[:6])


def _validate_list_of_dicts(v, keys, max_items, label):
    if not isinstance(v, list):
        raise serializers.ValidationError(f'{label} must be a list.')
    out = []
    for item in v[:max_items]:
        if not isinstance(item, dict):
            raise serializers.ValidationError(f'{label}: each item must be an object.')
        out.append({k: str(item.get(k, '')).strip()[:300] for k in keys})
    return out


class CaseStudyAdminSerializer(ContentWriteMixin, serializers.ModelSerializer):
    M2M = ('related_ids',)
    related_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related = serializers.SerializerMethodField()
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)

    class Meta:
        model = CaseStudy
        fields = (
            'id', 'title', 'slug', 'summary', 'client_name', 'client_permission', 'client_descriptor', 'industry', 'duration',
            'overview', 'background', 'challenge', 'objectives', 'solution', 'implementation', 'results', 'lessons',
            'hidden_sections', 'technologies', 'metrics', 'related_services', 'related', 'related_ids', 'featured_image',
            'featured_image_alt', 'gallery', 'author_name', 'author_title', 'is_featured', 'status', 'published_at',
            'reading_time', 'seo_title', 'meta_description', 'focus_keyword', 'secondary_keywords', 'canonical_url', 'og_title',
            'og_description', 'og_image', 'created_at', 'updated_at',
        )
        read_only_fields = ('reading_time', 'created_at', 'updated_at')

    def get_related(self, obj):
        return [{'id': r.id, 'title': r.title} for r in obj.related.all()]

    def validate_title(self, v):
        if not v.strip():
            raise serializers.ValidationError('Title is required.')
        return v.strip()

    def validate_technologies(self, v):
        return _strings(v, 'technologies', 30, 40)

    def validate_hidden_sections(self, v):
        allowed = set(CaseStudy.SECTIONS) | {'objectives', 'technologies', 'services', 'gallery'}
        return [s for s in _strings(v, 'hidden_sections', 12, 30) if s in allowed]

    def validate_metrics(self, v):
        return _validate_list_of_dicts(v, ('label', 'value', 'note'), 8, 'Metrics')

    def validate_related_services(self, v):
        items = _validate_list_of_dicts(v, ('label', 'url'), 8, 'Related services')
        for i in items:
            try:
                validate_https_or_site_url(i['url'])
            except Exception:
                raise serializers.ValidationError('Service links must be https:// URLs or site paths like /program/ai-for-all.')
        return items

    def validate_gallery(self, v):
        from .validators import validate_media_or_https_url

        items = _validate_list_of_dicts(v, ('src', 'alt'), 8, 'Gallery')
        for i in items:
            try:
                validate_media_or_https_url(i['src'])
            except Exception:
                raise serializers.ValidationError('Gallery images must be uploaded images or https:// URLs.')
        return items

    def validate(self, attrs):
        attrs = super().validate(attrs)
        for f in CaseStudy.SECTIONS + ('objectives',):
            if f in attrs:
                attrs[f] = sanitize_html(attrs[f])
        return attrs

    def _apply_m2m(self, obj, extra):
        if 'related_ids' in extra:
            obj.related.set(CaseStudy.objects.filter(pk__in=extra['related_ids']).exclude(pk=obj.pk)[:6])


# ---------------- public ----------------
class BlogCardSerializer(serializers.ModelSerializer):
    category = serializers.SerializerMethodField()
    tags = serializers.SlugRelatedField(many=True, read_only=True, slug_field='name')

    class Meta:
        model = Blog
        fields = ('title', 'slug', 'excerpt', 'featured_image', 'featured_image_alt', 'author_name', 'category', 'tags',
                  'published_at', 'reading_time', 'is_featured')

    def get_category(self, obj):
        return {'name': obj.category.name, 'slug': obj.category.slug} if obj.category else None


class CaseCardSerializer(serializers.ModelSerializer):
    client = serializers.SerializerMethodField()
    highlights = serializers.SerializerMethodField()

    class Meta:
        model = CaseStudy
        fields = ('title', 'slug', 'summary', 'industry', 'technologies', 'featured_image', 'featured_image_alt', 'client',
                  'highlights', 'published_at', 'is_featured')

    def get_client(self, obj):
        return public_client(obj)

    def get_highlights(self, obj):
        return [m for m in (obj.metrics or []) if m.get('label') and m.get('value')][:2]


def public_client(obj):
    """Client is named only with permission; otherwise the anonymised descriptor."""
    if obj.client_permission and obj.client_name:
        return obj.client_name
    return obj.client_descriptor or ''
