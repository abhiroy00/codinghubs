import hashlib
from django.db import migrations, models


def fill_digest(apps, schema_editor):
    Campaign = apps.get_model('newsletter', 'Campaign')
    seen = set()
    for row in Campaign.objects.order_by('pk').iterator():
        digest = hashlib.sha256((row.subject + '\0' + row.content).encode()).hexdigest()
        if (row.issue_id, digest) in seen:
            # Retain historical delivery records rather than deleting duplicate legacy attempts.
            digest = hashlib.sha256((digest + ':' + str(row.pk)).encode()).hexdigest()
        seen.add((row.issue_id, digest))
        Campaign.objects.filter(pk=row.pk).update(content_digest=digest)


class Migration(migrations.Migration):
    dependencies = [('newsletter', '0001_initial')]
    operations = [
        migrations.AddField(model_name='campaign', name='content_digest', field=models.CharField(default='', max_length=64), preserve_default=False),
        migrations.RunPython(fill_digest, migrations.RunPython.noop),
        migrations.AddConstraint(model_name='campaign', constraint=models.UniqueConstraint(fields=('issue', 'content_digest'), name='newsletter_issue_content_once')),
    ]
