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
    store_types = (
        'Product', 'ProductCategory', 'ProductImage', 'StoreSettings', 'Coupon', 'Cart', 'CartItem',
        'Order', 'OrderItem', 'Payment', 'PaymentEvent', 'Refund', 'InventoryMovement',
        'CouponRedemption', 'DownloadPermission', 'FreeDownloadLead',
    )
    product_asset_ids = [str(pk) for pk in rows('DigitalAsset').filter(product__isnull=False).values_list('pk', flat=True)]
    rows('AuditLog').filter(
        Q(object_type__in=[name for model in store_types for name in (model, model.lower())])
        | Q(object_type__in=['DigitalAsset', 'digitalasset'], object_id__in=product_asset_ids)
    ).delete()
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
