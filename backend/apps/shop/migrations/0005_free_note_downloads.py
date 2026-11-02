from decimal import Decimal

from django.db import migrations


FREE_NOTE_KINDS = ('programming_notes', 'interview_notes', 'pdf_notes')


def make_existing_notes_free(apps, schema_editor):
    Product = apps.get_model('shop', 'Product')
    ProductCategory = apps.get_model('shop', 'ProductCategory')
    database = schema_editor.connection.alias

    notes = ProductCategory.objects.using(database).filter(slug='notes').first()
    if notes is None:
        notes = ProductCategory.objects.using(database).create(
            name='Notes', slug='notes', description='Free study notes.'
        )

    products = Product.objects.using(database).filter(
        product_type='digital', item_kind__in=FREE_NOTE_KINDS
    )
    products.filter(category__isnull=True).update(category_id=notes.pk)
    products.update(price=Decimal('0.00'), original_price=None)


class Migration(migrations.Migration):
    dependencies = [
        ('shop', '0004_freedownloadlead'),
    ]

    operations = [
        migrations.RunPython(make_existing_notes_free, migrations.RunPython.noop),
    ]
