from django.db import migrations

CATEGORIES = [
    ('T-Shirts', 't-shirts', 'Coding Hubs T-shirts.'),
    ('Notes', 'notes', 'Free study notes.'),
    ('Books', 'books', 'Free books.'),
]


def add_categories(apps, schema_editor):
    ProductCategory = apps.get_model('shop', 'ProductCategory')
    for name, slug, description in CATEGORIES:
        if not ProductCategory.objects.filter(slug=slug).exists() and not ProductCategory.objects.filter(name=name).exists():
            ProductCategory.objects.create(name=name, slug=slug, description=description)


class Migration(migrations.Migration):
    dependencies = [('shop', '0002_projectquestion')]
    operations = [migrations.RunPython(add_categories, migrations.RunPython.noop)]
