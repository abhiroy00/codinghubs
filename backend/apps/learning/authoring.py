from django.core.exceptions import ValidationError
from django.db import transaction
from django.shortcuts import get_object_or_404
from rest_framework import permissions, serializers
from rest_framework.exceptions import PermissionDenied
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response
from rest_framework.views import APIView
from .editing import approve_draft, restore_draft, save_draft, snapshot
from .models import Concept, DraftRevision, EditConflict, Module
from .quality import MIN_WORDS, PARTS, validate_content


def require(user, permission):
    if not user.has_perm(f'learning.{permission}_concept'):
        raise PermissionDenied('Your account does not have permission for this learning-content action.')


def quality(concept):
    errors = []
    try:
        validate_content(concept.content, publishing=True)
    except ValidationError as error:
        errors.extend(error.messages)
    for field in ('outcomes', 'references', 'seo_description'):
        if not getattr(concept, field):
            errors.append(f'{field} is required before approval.')
    counts = {part: sum(len(b['body'].split()) for b in concept.content[part]['blocks'] if b['type'] == 'text') for part in PARTS}
    return {'words': counts, 'minimum_words': dict(zip(PARTS, MIN_WORDS)), 'issues': errors,
            'ready_for_review': not errors, 'code_verified': concept.code_verified,
            'reviewed': bool(concept.reviewed_by_id)}


def payload(concept, user):
    return {**snapshot(concept), 'id': concept.pk, 'edit_version': concept.edit_version,
            'published_version': concept.version, 'updated_at': concept.updated_at,
            'public_url': f'/learn/{concept.chapter.module.course.slug if concept.chapter.module.course_id else "ai-engineering"}/{concept.slug}/',
            'quality': quality(concept), 'can_edit': user.has_perm('learning.change_concept'),
            'can_publish': user.has_perm('learning.publish_concept') and user.has_perm('learning.change_concept')}


class ContentInput(serializers.Serializer):
    edit_version = serializers.IntegerField(min_value=0)
    title = serializers.CharField(max_length=180, required=False)
    seo_description = serializers.CharField(max_length=300, allow_blank=True, required=False)
    difficulty = serializers.ChoiceField(choices=['beginner', 'intermediate', 'advanced'], required=False)
    outcomes = serializers.ListField(child=serializers.CharField(max_length=2000), max_length=50, required=False)
    references = serializers.ListField(child=serializers.DictField(), max_length=100, required=False)
    prerequisites = serializers.ListField(child=serializers.IntegerField(min_value=1), max_length=270, required=False)
    content = serializers.JSONField(required=False)
    status = serializers.ChoiceField(choices=['not_started', 'draft', 'in_review'], required=False)

    def to_internal_value(self, data):
        if not isinstance(data, dict):
            raise serializers.ValidationError('Submit an object with the changed lesson fields.')
        unknown = set(data) - set(self.fields)
        if unknown:
            raise serializers.ValidationError({key: 'This field cannot be changed through draft saving.' for key in unknown})
        return super().to_internal_value(data)

    def validate_references(self, refs):
        url = serializers.URLField()
        for ref in refs:
            if set(ref) != {'title', 'url'} or not isinstance(ref['title'], str) or not ref['title'].strip():
                raise serializers.ValidationError('Each reference requires a title and HTTPS URL.')
            url.run_validation(ref['url'])
            if not ref['url'].startswith('https://'):
                raise serializers.ValidationError('Reference URLs must use HTTPS.')
        return refs

    def validate_content(self, value):
        try:
            validate_content(value)
        except ValidationError as error:
            raise serializers.ValidationError(error.messages)
        return value


class VersionInput(serializers.Serializer):
    edit_version = serializers.IntegerField(min_value=0)
    code_verified = serializers.BooleanField(required=False)
    revision_id = serializers.IntegerField(min_value=1, required=False)


class AuthoringView(APIView):
    permission_classes = [permissions.IsAdminUser]

    def initial(self, request, *args, **kwargs):
        super().initial(request, *args, **kwargs)
        if not request.user.is_active:
            raise PermissionDenied()
        if not (request.user.has_perm('learning.view_concept') or request.user.has_perm('learning.change_concept')):
            raise PermissionDenied('Learning-content access is required.')

    def handle_exception(self, exc):
        if isinstance(exc, EditConflict):
            return Response({'detail': str(exc)}, status=409)
        if isinstance(exc, ValidationError):
            return Response({'detail': exc.messages}, status=400)
        return super().handle_exception(exc)


class ConceptList(AuthoringView):
    def get(self, request):
        qs = Concept.objects.select_related('chapter__module').order_by('chapter__module__number', 'chapter__position', 'position', 'pk')
        if q := request.query_params.get('q', '').strip()[:200]:
            qs = qs.filter(title__icontains=q)
        if status := request.query_params.get('status'):
            qs = qs.filter(status=status)
        if module := request.query_params.get('module'):
            if not module.isdigit():
                raise serializers.ValidationError({'module': 'Use a module ID.'})
            qs = qs.filter(chapter__module_id=int(module))
        page = PageNumberPagination()
        page.page_size = 30
        rows = page.paginate_queryset(qs, request)
        return page.get_paginated_response([{'id': c.pk, 'title': c.title, 'slug': c.slug,
                    'module': c.chapter.module.title, 'status': c.status, 'edit_version': c.edit_version,
                    'published_version': c.version} for c in rows])


class Metadata(AuthoringView):
    def get(self, request):
        return Response({'modules': list(Module.objects.values('id', 'number', 'title')),
                         'concepts': list(Concept.objects.values('id', 'title', 'slug'))})


class ConceptDetail(AuthoringView):
    def get(self, request, pk):
        return Response(payload(get_object_or_404(Concept, pk=pk), request.user))

    def patch(self, request, pk):
        require(request.user, 'change')
        get_object_or_404(Concept, pk=pk)
        data = ContentInput(data=request.data)
        data.is_valid(raise_exception=True)
        changes = dict(data.validated_data)
        expected = changes.pop('edit_version')
        return Response(payload(save_draft(pk, expected, request.user, changes), request.user))


class History(AuthoringView):
    def get(self, request, pk):
        get_object_or_404(Concept, pk=pk)
        qs = DraftRevision.objects.filter(concept_id=pk).select_related('editor')
        page = PageNumberPagination()
        page.page_size = 20
        rows = page.paginate_queryset(qs, request)
        return page.get_paginated_response([{'id': r.pk, 'edit_version': r.edit_version,
                 'reason': r.reason, 'created_at': r.created_at, 'editor': r.editor.get_username() if r.editor else 'Deleted account'} for r in rows])


class HistoryDetail(AuthoringView):
    def get(self, request, pk, revision_id):
        revision = get_object_or_404(DraftRevision, pk=revision_id, concept_id=pk)
        return Response({'id': revision.pk, 'edit_version': revision.edit_version, 'snapshot': revision.snapshot})


class Action(AuthoringView):
    @transaction.atomic
    def post(self, request, pk, action):
        require(request.user, 'change')
        current = get_object_or_404(Concept.objects.select_for_update(), pk=pk)
        data = VersionInput(data=request.data)
        data.is_valid(raise_exception=True)
        expected = data.validated_data['edit_version']
        if current.edit_version != expected:
            raise EditConflict('Another editor changed this lesson. Reload before continuing.')
        if action == 'restore':
            revision = get_object_or_404(DraftRevision, pk=data.validated_data.get('revision_id'), concept_id=pk)
            current = restore_draft(pk, revision.pk, expected, request.user)
        elif action == 'approve':
            require(request.user, 'publish')
            current = approve_draft(pk, expected, request.user, data.validated_data.get('code_verified', False))
        elif action == 'publish':
            require(request.user, 'publish')
            current.publish(request.user, expected_edit_version=expected)
            current.refresh_from_db()
        else:
            return Response({'detail': 'Unknown action.'}, status=404)
        return Response(payload(current, request.user))
