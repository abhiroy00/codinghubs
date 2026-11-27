"""SEO cleanup: merges 7 cannibalizing/duplicate-intent blog posts into their stronger counterpart and fixes one
dead URL, approved by the site owner after a content audit (see the audit report for the full cluster table).

For each (loser, keep) pair below: the loser post is unpublished (set to draft — its row and content are kept,
nothing is hard-deleted) and its old URL gets a permanent redirect to the keep post, so neither visitors nor
Google crawlers hit a 404. Redirect chains are collapsed (A->B->C becomes A->C) the same way apps.content.services
does it for an ordinary slug rename.

For three of those pairs, a short, genuinely unique section found only in the loser post (verified against the
keep post's own content — not duplicated there) is folded into the keep post, right before an existing heading,
using the HTML already live on the loser post (seed_data/blog_merges/<keep-slug>.html), not newly authored copy.
This only happens if that exact heading is still present and the addition is not already there, so a post edited
since the audit is left untouched rather than corrupted.

/blog/what-is-an-ai-engineer was deleted (pre-dating the admin panel's new delete-redirect prompt) and 404s even
though Google still has it indexed; it is pointed at the closest live match by topic.

One-way, like the other content-seeding migrations in this app (0006, 0013, 0019): reversing a merge and a content
insert cleanly is not meaningful, so the reverse is a no-op.
"""
import re
from pathlib import Path

from django.conf import settings
from django.db import migrations
from django.utils import timezone

# (old slug, keep slug) - unpublish old, 301 its URL to keep.
MERGES = (
    ('non-it-to-it-career-switch-without-experience-2026', 'switch-career-from-non-it-to-it'),
    ('non-it-to-software-developer', 'switch-career-from-non-it-to-it'),
    ('career-switch-to-it', 'switch-career-from-non-it-to-it'),
    ('api-testing-tutorial-for-beginners-with-postman', 'api-testing-tutorial'),
    ('what-is-automation-testing-types-tools-and-examples', 'what-is-automation-testing'),
    ('ai-engineer-roadmap-for-beginners-your-complete-guide-to-starting-in-2026', 'how-to-become-an-ai-engineer'),
    ('coding-courses-in-nsp-delhi', 'computer-and-coding-classes-near-netaji-subhash-place-nsp'),
    ('coding-classes-near-pitampura', 'python-course-in-pitampura-beginner-to-job-ready-roadmap'),
    ('software-development-course-delhi', 'full-stack-developer-course-delhi'),
)

# A post deleted before this merge existed, left 404ing. No live row to unpublish — just the redirect.
DEAD_URL_FIX = ('what-is-an-ai-engineer', 'what-is-ai-engineering')

# keep slug -> (heading text already in that post to insert before, seed_data/blog_merges file to insert).
# Matched by heading text, not id: ids are regenerated at render time (sanitize.add_heading_ids) and are never
# part of the stored content field, so anchoring on one would never match.
CONTENT_MERGES = {
    'how-to-become-an-ai-engineer': 'Frequently Asked Questions',
    'what-is-automation-testing': 'Best Practices for Automation Testing',
    'switch-career-from-non-it-to-it': 'Step 1: Choose One Role That Matches Your Background (Week 1)',
}


def heading_anchor(text):
    """A <h2> (optionally wrapping its text in a <span>, however the post was originally authored) regex,
    matched against the stored content so it is insensitive to ids, which only exist at render time."""
    return re.compile(rf'<h2[^>]*>(?:<span[^>]*>)?{re.escape(text)}(?:</span>)?</h2>')


def run(apps, schema_editor):
    if getattr(settings, 'TESTING', False):
        return
    from apps.content.sanitize import reading_minutes, sanitize_html

    Blog = apps.get_model('content', 'Blog')
    SlugRedirect = apps.get_model('content', 'SlugRedirect')
    db = schema_editor.connection.alias
    now = timezone.now()

    def point_redirect(old_slug, target_slug):
        SlugRedirect.objects.using(db).filter(kind='blog', new_slug=old_slug).update(new_slug=target_slug)  # collapse A->B->C
        row = SlugRedirect.objects.using(db).filter(kind='blog', old_slug=old_slug).first()
        if row:
            row.new_slug = target_slug
            row.save(using=db)
        else:
            SlugRedirect.objects.using(db).create(kind='blog', old_slug=old_slug, new_slug=target_slug)

    for loser_slug, keep_slug in MERGES:
        if Blog.objects.using(db).filter(slug=loser_slug).exists():
            Blog.objects.using(db).filter(slug=loser_slug).update(status='draft', updated_at=now)
            point_redirect(loser_slug, keep_slug)

    point_redirect(*DEAD_URL_FIX)

    merge_dir = Path(__file__).resolve().parent.parent / 'seed_data' / 'blog_merges'
    for keep_slug, heading_text in CONTENT_MERGES.items():
        obj = Blog.objects.using(db).filter(slug=keep_slug).first()
        if not obj:
            continue
        addition = (merge_dir / f'{keep_slug}.html').read_text(encoding='utf-8')
        m = heading_anchor(heading_text).search(obj.content)
        if not m or addition in obj.content:
            continue  # already merged, or the post changed since the audit - leave it for manual review
        new_content = sanitize_html(obj.content[:m.start()] + addition + obj.content[m.start():])
        Blog.objects.using(db).filter(pk=obj.pk).update(
            content=new_content, reading_time=reading_minutes(new_content), updated_at=now,
        )


class Migration(migrations.Migration):

    dependencies = [
        ('content', '0019_publish_switch_career_from_non_it_to_it'),
    ]

    operations = [
        migrations.RunPython(run, migrations.RunPython.noop),
    ]
