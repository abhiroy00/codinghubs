from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from apps.content.sanitize import sanitize_html
from apps.content.validators import validate_https_or_site_url, validate_media_or_https_url
from .models import (
    GUIDE_SECTION_KEYS, Project, ProjectGuide, ProjectQuestion, unique_slug_for,
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


class AssetBriefSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    label = serializers.CharField()
    size = serializers.IntegerField()
    content_type = serializers.CharField()
    original_name = serializers.CharField()


class ProjectQuestionSubmissionSerializer(serializers.ModelSerializer):
    name = serializers.CharField(max_length=100, trim_whitespace=True)
    question = serializers.CharField(max_length=2000, trim_whitespace=True)

    class Meta:
        model = ProjectQuestion
        fields = ('name', 'email', 'question')

    def create(self, validated_data):
        return ProjectQuestion.objects.create(project=self.context['project'], **validated_data)


class ProjectAdminSerializer(SluggedWriteMixin, serializers.ModelSerializer):
    M2M = {'related_project_ids': ('related_projects', Project)}
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    category = serializers.CharField(max_length=80, required=False, allow_blank=True, allow_null=True)
    related_project_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_blog_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_course_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related = serializers.SerializerMethodField()
    assets = AssetBriefSerializer(many=True, read_only=True)

    class Meta:
        model = Project
        fields = (
            'id', 'title', 'slug', 'summary', 'overview', 'category', 'difficulty', 'technologies', 'languages', 'tools', 'problem_statement',
            'objectives', 'features', 'system_requirements', 'prerequisites', 'learning_outcomes', 'architecture', 'database_requirements',
            'setup_overview', 'screenshots', 'featured_image', 'featured_image_alt', 'demo_url', 'repo_url', 'repo_public', 'estimated_time',
            'author_name', 'author_title', 'is_featured', 'files_restricted', 'related', 'related_project_ids', 'related_blog_ids',
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
        if attrs.get('category') is None:
            attrs['category'] = ''
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


DEFAULT_SECTIONS = [{'key': k, 'title': t, 'html': '', 'enabled': False, 'preview': False} for k, t in GUIDE_SECTION_KEYS]


class GuideAdminSerializer(SluggedWriteMixin, serializers.ModelSerializer):
    M2M = {'related_project_ids': ('related_projects', Project)}
    slug = serializers.SlugField(max_length=180, required=False, allow_blank=True)
    category = serializers.CharField(max_length=80, required=False, allow_blank=True, allow_null=True)
    related_project_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related_blog_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    included_course_ids = serializers.ListField(child=serializers.IntegerField(), required=False, write_only=True)
    related = serializers.SerializerMethodField()
    project_title = serializers.CharField(source='project.title', read_only=True, default=None)
    assets = AssetBriefSerializer(many=True, read_only=True)

    class Meta:
        model = ProjectGuide
        fields = (
            'id', 'title', 'slug', 'summary', 'project', 'project_title', 'category', 'difficulty', 'author_name', 'author_title',
            'technologies', 'estimated_time', 'prerequisites', 'objectives', 'required_software', 'sections', 'faq', 'related_resources',
            'featured_image', 'featured_image_alt', 'access_type', 'is_featured', 'reading_time', 'related',
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
        if attrs.get('category') is None:
            attrs['category'] = ''
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
