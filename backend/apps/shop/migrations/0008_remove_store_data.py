"""Delete the retired store's data, including orders, at the owner's request.

Projects, guides, their files, users, courses, enrollments and course payments are
not store data. This purge is intentionally irreversible; rollback needs a database
backup. Store APIs are removed in this release so the records cannot be recreated
through the website or the admin panel. Historical shared model definitions remain
for the migration graph and resource access code; this migration does not drop tables.
"""
from django.db import migrations
from django.db.models import Q


def remove_store_data(apps, schema_editor):
    alias = schema_editor.connection.alias

    def rows(name):
        return apps.get_model('shop', name).objects.using(alias)

    # SET_NULL on Product deletion must never make previously paid project files public.
    rows('Project').filter(product__price__gt=0).update(files_restricted=True)
    rows('DownloadEvent').filter(Q(order__isnull=False) | Q(asset__product__isnull=False) | Q(source__in=['order', 'free'])).delete()
    rows('AuditLog').exclude(object_type__in=['Project', 'ProjectGuide', 'project', 'guide', 'projectguide']).delete()
    for name in (
        'DownloadPermission', 'FreeDownloadLead', 'CartItem', 'Cart', 'InventoryMovement',
        'Refund', 'Payment', 'PaymentEvent', 'CouponRedemption', 'OrderItem', 'Order', 'Coupon',
    ):
        rows(name).all().delete()
    # Product files alone are removed; project and guide assets remain private and usable.
    rows('DigitalAsset').filter(product__isnull=False).delete()
    for name in ('ProductImage', 'Product', 'ProductCategory', 'StoreSettings'):
        rows(name).all().delete()


class Migration(migrations.Migration):
    dependencies = [('shop', '0007_project_files_restricted')]
    operations = [migrations.RunPython(remove_store_data)]
