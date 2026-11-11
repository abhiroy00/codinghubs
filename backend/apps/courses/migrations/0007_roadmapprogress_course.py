from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):
    dependencies = [('courses', '0006_roadmapprogress')]
    operations = [
        migrations.AddField(model_name='roadmapprogress', name='course_slug', field=models.SlugField(default='generative-ai', max_length=120)),
        migrations.AlterField(model_name='roadmapprogress', name='user', field=models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='roadmap_progress', to=settings.AUTH_USER_MODEL)),
        migrations.AddConstraint(model_name='roadmapprogress', constraint=models.UniqueConstraint(fields=('user', 'course_slug'), name='unique_user_roadmap_course')),
    ]
