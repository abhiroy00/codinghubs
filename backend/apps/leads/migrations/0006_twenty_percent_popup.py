"""Show the existing welcome offer with the requested popup presentation."""
from django.db import migrations
from django.utils import timezone


def show_popup(apps, schema_editor):
    apps.get_model('leads', 'Campaign').objects.filter(
        title='20% off course fees', offer_label='20% OFF', cta_url='#demo', presentation='bar',
    ).update(presentation='modal', updated_at=timezone.now())


class Migration(migrations.Migration):
    dependencies = [('leads', '0005_twenty_percent_offer')]
    operations = [migrations.RunPython(show_popup, migrations.RunPython.noop)]
