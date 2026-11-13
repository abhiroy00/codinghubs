"""Remove the store catalogue that the retired /store page left behind.

Products, carts, coupons, inventory and download rows only existed to serve the
store front end, which now redirects to the home page. Categories, orders, payments,
refunds and the projects/guides content stay: categories are the shop's defaults,
orders and payments are financial records, and projects/guides still power
/projects and /project-guides.
"""
from django.db import migrations

CATALOG_MODELS = (
    'CartItem',
    'Cart',
    'DownloadEvent',
    'DownloadPermission',
    'FreeDownloadLead',
    'InventoryMovement',
    'AuditLog',
    'DigitalAsset',
    'Product',
    'StoreSettings',
)


def purge_store_catalogue(apps, schema_editor):
    for name in CATALOG_MODELS:
        apps.get_model('shop', name).objects.all().delete()
    # Coupons tied to a redemption belong to an order history; the rest were never used.
    Coupon = apps.get_model('shop', 'Coupon')
    CouponRedemption = apps.get_model('shop', 'CouponRedemption')
    redeemed = set(CouponRedemption.objects.values_list('coupon_id', flat=True))
    Coupon.objects.exclude(id__in=redeemed).delete()


class Migration(migrations.Migration):

    dependencies = [
        ('shop', '0005_free_note_downloads'),
    ]

    operations = [
        migrations.RunPython(purge_store_catalogue, migrations.RunPython.noop),
    ]
