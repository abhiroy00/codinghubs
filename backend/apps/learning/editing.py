"""Shared, transactional mutations for the React CMS and Django admin."""
from copy import deepcopy
from django.core.exceptions import ValidationError
from django.db import transaction
from django.utils import timezone
from .models import Concept, DraftRevision, EditConflict
from .quality import validate_content

EDITABLE = ('title', 'slug', 'chapter_id', 'position', 'difficulty', 'outcomes', 'references', 'content', 'seo_description', 'status', 'code_verified', 'reviewed_by_id')


def snapshot(concept):
    return {**{key: deepcopy(getattr(concept, key)) for key in EDITABLE},
            'prerequisites': list(concept.prerequisites.values_list('pk', flat=True))}


def archive_current(concept, editor, reason):
    DraftRevision.objects.create(concept=concept, edit_version=concept.edit_version,
                                 snapshot=snapshot(concept), editor=editor, reason=reason)


@transaction.atomic
def save_draft(pk, expected, editor, changes, reason='save'):
    current = Concept.objects.select_for_update().get(pk=pk)
    if type(expected) is not int or current.edit_version != expected:
        raise EditConflict('Another editor changed this lesson. Your changes were not saved. Reload or export your text before merging.')
    previous = snapshot(current)
    prerequisite_ids = changes.get('prerequisites', previous['prerequisites'])
    if current.pk in prerequisite_ids:
        raise ValidationError('A concept cannot be its own prerequisite.')
    if len(set(prerequisite_ids)) != len(prerequisite_ids) or Concept.objects.filter(pk__in=prerequisite_ids).count() != len(prerequisite_ids):
        raise ValidationError('Choose valid, distinct prerequisite concepts.')
    # Any dependency that reaches this concept would create a cycle.
    graph = {}
    for source, target in Concept.prerequisites.through.objects.values_list('from_concept_id', 'to_concept_id'):
        graph.setdefault(source, []).append(target)
    seen, pending = set(), list(prerequisite_ids)
    while pending:
        node = pending.pop()
        if node == current.pk:
            raise ValidationError('Prerequisites must not contain a cycle.')
        if node not in seen:
            seen.add(node)
            pending.extend(graph.get(node, []))
    for key in EDITABLE:
        if key in changes:
            setattr(current, key, deepcopy(changes[key]))
    if reason == 'restore':
        current.status, current.code_verified, current.reviewed_by_id = 'draft', False, None
    if current.content != previous['content'] or any(getattr(current, k) != previous[k] for k in ('title', 'difficulty', 'outcomes', 'references', 'seo_description')) or prerequisite_ids != previous['prerequisites']:
        current.code_verified, current.reviewed_by_id = False, None
        if current.status in ('approved', 'published'):
            current.status = 'draft'
    current.full_clean()
    archive_current(Concept.objects.get(pk=pk), editor, reason)
    updated = {key: getattr(current, key) for key in EDITABLE}
    updated.update(edit_version=expected + 1, updated_at=timezone.now())
    if not Concept.objects.filter(pk=pk, edit_version=expected).update(**updated):
        raise EditConflict('This lesson changed during saving. Reload and merge your changes.')
    current.prerequisites.set(prerequisite_ids)
    current.refresh_from_db()
    return current


@transaction.atomic
def restore_draft(pk, revision_id, expected, editor):
    revision = DraftRevision.objects.get(pk=revision_id, concept_id=pk)
    return save_draft(pk, expected, editor, revision.snapshot, reason='restore')


@transaction.atomic
def approve_draft(pk, expected, reviewer, code_verified):
    if not code_verified:
        raise ValidationError('Execute and verify the examples before approving.')
    current = Concept.objects.select_for_update().get(pk=pk)
    if current.edit_version != expected:
        raise EditConflict('This lesson changed. Reload before approving.')
    validate_content(current.content, publishing=True)
    if not current.references or not current.outcomes or not current.seo_description:
        raise ValidationError('References, outcomes and SEO description are required.')
    return save_draft(pk, expected, reviewer, {'status': 'approved', 'code_verified': True, 'reviewed_by_id': reviewer.pk}, reason='approve')
