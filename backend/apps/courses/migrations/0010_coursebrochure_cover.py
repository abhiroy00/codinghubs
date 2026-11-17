from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('courses', '0009_coursebrochure'),
    ]

    operations = [
        migrations.AddField(
            model_name='coursebrochure',
            name='cover_key',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AddField(
            model_name='coursebrochure',
            name='cover_small_key',
            field=models.CharField(blank=True, max_length=200),
        ),
    ]
