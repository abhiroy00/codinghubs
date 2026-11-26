"""Publishes the owner-approved 20% course-fee offer (Nov 2026). Admins edit, pause or delete it in Course Offers."""
from django.db import migrations
from django.utils import timezone

TITLE = '20% off course fees'


def create(apps, schema_editor):
    Campaign = apps.get_model('leads', 'Campaign')
    if Campaign.objects.filter(title=TITLE).exists():
        return
    Campaign.objects.create(
        title=TITLE,
        offer_label='20% OFF',
        offer_text='Get 20% off the fee of any Coding Hubs course. Book a free demo to claim it.',
        terms='Applies to the course fee. A counsellor confirms your final fee before you enrol.',
        cta_label='Claim 20% off',
        cta_url='#demo',
        status='published',
        starts_at=timezone.now(),
        ends_at=None,
        presentation='bar',
        target_type='all',
        target_values=[],
        priority=0,
        frequency='daily',
        show_countdown=False,
    )


def remove(apps, schema_editor):
    apps.get_model('leads', 'Campaign').objects.filter(title=TITLE, leads__isnull=True).delete()


class Migration(migrations.Migration):
    dependencies = [('leads', '0004_campaigns')]
    operations = [migrations.RunPython(create, remove)]
