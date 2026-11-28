"""Conservative updates for existing seeded articles; never publish, create, delete or rename a post."""
import hashlib
import json
from pathlib import Path

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction

from apps.content import services
from apps.content.models import Blog, ContentRevision
from apps.content.sanitize import reading_minutes, sanitize_html


class Command(BaseCommand):
    help = 'Preview the reviewed SEO content pack; --apply updates only unchanged public seed articles and saves restore points.'

    def add_arguments(self, parser):
        parser.add_argument('--apply', action='store_true', help='Write approved changes. The default is a read-only dry run.')
        parser.add_argument('--slug', help='Limit to one existing article slug.')

    def handle(self, *args, **options):
        pack = Path(__file__).resolve().parents[2] / 'seed_data' / 'seo_updates_20261128.json'
        entries = json.loads(pack.read_text(encoding='utf-8'))['updates']
        if options['slug']:
            entries = [entry for entry in entries if entry['slug'] == options['slug']]
            if not entries:
                raise CommandError('Slug is not in the reviewed SEO update pack.')
        for entry in entries:
            with transaction.atomic():
                post = Blog.objects.public().select_for_update().filter(slug=entry['slug']).first()
                if not post:
                    self.emit(entry, 'not_public_or_missing')
                    continue
                digest = hashlib.sha256(post.content.encode()).hexdigest()
                if digest == entry['updated_body_sha256']:
                    self.emit(entry, 'already_applied')
                    continue
                if digest != entry['expected_body_sha256']:
                    self.emit(entry, 'editorial_content_changed')
                    continue
                content = sanitize_html(entry['prepend_html'] + '\n' + post.content)
                if hashlib.sha256(content.encode()).hexdigest() != entry['updated_body_sha256']:
                    raise CommandError('Update pack failed its content integrity check; nothing changed for this article.')
                changes = {'content': content, 'reading_time': reading_minutes(content)}
                for field, values in entry['fields'].items():
                    if field not in ('seo_title', 'meta_description', 'og_title', 'og_description'):
                        raise CommandError('Update pack contains an unsupported field.')
                    if getattr(post, field) == values['from'] and values['from'] != values['to']:
                        changes[field] = values['to']
                if options['apply']:
                    # Keep a restore point without pruning any existing revision history.
                    ContentRevision.objects.create(kind=post.KIND, object_id=post.pk, snapshot=services.snapshot(post))
                    for field, value in changes.items():
                        setattr(post, field, value)
                    post.save(update_fields=[*changes, 'updated_at'])
                self.emit(entry, 'applied' if options['apply'] else 'ready', list(changes))

    def emit(self, entry, status, fields=None):
        self.stdout.write(json.dumps({'slug': entry['slug'], 'status': status, 'fields': fields or []}))
