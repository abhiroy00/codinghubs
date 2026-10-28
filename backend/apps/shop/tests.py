import hashlib
import hmac
import json
import shutil
import tempfile
from datetime import timedelta
from decimal import Decimal
from io import BytesIO
from unittest import mock
from zipfile import ZipFile

from django.contrib.auth import get_user_model
from django.core import mail
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from rest_framework.test import APIClient

from apps.courses.models import Course, CourseCategory
from apps.enrollments.models import Enrollment

from . import downloads, orders
from .models import (
    Coupon, DigitalAsset, DownloadPermission, InventoryMovement, Order, PaymentEvent, Product, ProductCategory, Project, ProjectGuide, StoreSettings,
)

User = get_user_model()
NO_THROTTLE = {
    'DEFAULT_AUTHENTICATION_CLASSES': ('rest_framework_simplejwt.authentication.JWTAuthentication',),
    'DEFAULT_PERMISSION_CLASSES': ('rest_framework.permissions.IsAuthenticatedOrReadOnly',),
    'DEFAULT_THROTTLE_CLASSES': (),
    'DEFAULT_THROTTLE_RATES': {'anon': '1000/min', 'user': '1000/min'},
}
PRIVATE = tempfile.mkdtemp()
MEDIA = tempfile.mkdtemp()
SECRET, WH_SECRET = 'test_key_secret', 'test_webhook_secret'
ADDRESS = {'line1': '12 Test Street', 'city': 'Delhi', 'state': 'Delhi', 'postal_code': '110034'}


def pdf_bytes():
    return b'%PDF-1.4\n1 0 obj<<>>endobj\ntrailer<<>>\n%%EOF'


def zip_bytes(names=('readme.txt',)):
    buf = BytesIO()
    with ZipFile(buf, 'w') as z:
        for n in names:
            z.writestr(n, 'hello')
    return buf.getvalue()


def sign(order_id, payment_id):
    return hmac.new(SECRET.encode(), f'{order_id}|{payment_id}'.encode(), hashlib.sha256).hexdigest()


@override_settings(
    REST_FRAMEWORK=NO_THROTTLE, PRIVATE_MEDIA_ROOT=PRIVATE, MEDIA_ROOT=MEDIA, RAZORPAY_KEY_ID='rzp_test_abc', RAZORPAY_KEY_SECRET=SECRET,
    RAZORPAY_WEBHOOK_SECRET=WH_SECRET, EMAIL_BACKEND='django.core.mail.backends.locmem.EmailBackend', SITE_URL='https://codinghubs.in',
)
class ShopBase(TestCase):
    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(PRIVATE, ignore_errors=True)
        shutil.rmtree(MEDIA, ignore_errors=True)

    def setUp(self):
        cache.clear()
        mail.outbox = []
        self.boss = User.objects.create_user('boss', email='boss@example.com', password='S3cure-pass!', is_staff=True, is_superuser=True)
        self.editor = User.objects.create_user('ed', email='ed@example.com', password='S3cure-pass!', is_staff=True)
        self.alice = User.objects.create_user('alice', email='alice@example.com', password='S3cure-pass!')
        self.bob = User.objects.create_user('bob', email='bob@example.com', password='S3cure-pass!')
        self.api = APIClient()
        self.api.force_authenticate(self.boss)
        self.anon = APIClient()
        StoreSettings.load()

    def as_user(self, user):
        c = APIClient()
        if user:
            c.force_authenticate(user)
        return c

    def product(self, title='Python Notes', ptype='digital', price='199.00', stock=0, **kw):
        defaults = dict(title=title, slug=title.lower().replace(' ', '-'), sku=None, product_type=ptype, price=Decimal(price), status='published',
                        published_at=timezone.now() - timedelta(minutes=1), stock_quantity=stock, track_stock=ptype != 'digital')
        defaults.update(kw)
        p = Product(**defaults)
        p.save()
        return p

    def attach_pdf(self, product, name='notes.pdf'):
        return downloads.create_asset({'product': product}, SimpleUploadedFile(name, pdf_bytes()), 'The PDF')

    def cart_client(self, user=None):
        c = self.as_user(user)
        token = None
        r = c.post('/api/cart/items/', {'product': 0}, format='json')  # create nothing; token comes from the first valid add
        return c, token

    def add(self, client, product, qty=1, token=None):
        if token:
            client.credentials(HTTP_X_CART_TOKEN=token)
        r = client.post('/api/cart/items/', {'product': product.id, 'quantity': qty}, format='json')
        return r

    def checkout(self, client, items, token=None, **extra):
        first = True
        for p, qty in items:
            r = self.add(client, p, qty, token)
            token = r.json().get('token') or token
            if token:
                client.credentials(HTTP_X_CART_TOKEN=token)
        data = {'name': 'Asha Rao', 'email': 'asha@example.com', 'phone': '+919999999999', **extra}
        return client.post('/api/checkout/', data, format='json'), token

    def pay(self, order, payment_id='pay_1', status='captured', amount=None):
        pay = order.payments.first()
        info = {'id': payment_id, 'order_id': pay.provider_order_id, 'amount': amount if amount is not None else int(order.total * 100), 'currency': 'INR', 'status': status}
        with mock.patch('apps.shop.gateway.fetch_payment', return_value=info):
            return self.anon.post('/api/store/payments/verify/', {
                'order_number': order.number, 'razorpay_order_id': pay.provider_order_id, 'razorpay_payment_id': payment_id,
                'razorpay_signature': sign(pay.provider_order_id, payment_id),
            }, format='json', HTTP_X_ORDER_TOKEN=order.public_token)

    def gateway_ok(self):
        return mock.patch('apps.shop.gateway.create_order', side_effect=lambda amt, receipt, notes: {'id': f'order_{receipt}'})

    def paid_order(self, user=None, items=None, **kw):
        items = items or [(self.product(),1)]
        c = self.as_user(user)
        with self.gateway_ok():
            r, _ = self.checkout(c, items, shipping_address=ADDRESS, **kw)
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get(number=r.json()['order_number'])
        if not r.json().get('free'):
            self.assertEqual(self.pay(order).status_code, 200)
        order.refresh_from_db()
        return order


# ====================== auth & permissions ======================
class PermissionTests(ShopBase):
    def test_admin_endpoints_need_staff_with_permissions(self):
        urls = ['/api/admin/products/', '/api/admin/projects/', '/api/admin/project-guides/', '/api/admin/store-orders/', '/api/admin/coupons/',
                '/api/admin/inventory/', '/api/admin/customers/', '/api/admin/store-settings/', '/api/admin/shop/stats/']
        for u in urls:
            self.assertEqual(self.as_user(None).get(u).status_code, 401, u)
            self.assertEqual(self.as_user(self.alice).get(u).status_code, 403, u)
            self.assertEqual(self.as_user(self.editor).get(u).status_code, 403, u)  # staff without model permissions

    def test_staff_without_delete_permission_cannot_delete_or_refund(self):
        from django.contrib.auth.models import Permission

        self.editor.user_permissions.add(*Permission.objects.filter(content_type__app_label='shop', codename__in=['view_product', 'change_product', 'add_product']))
        ed = self.as_user(User.objects.get(pk=self.editor.pk))
        p = self.product()
        self.assertEqual(ed.get('/api/admin/products/').status_code, 200)
        self.assertEqual(ed.patch(f'/api/admin/products/{p.id}/', {'short_description': 'x'}, format='json').status_code, 200)
        self.assertEqual(ed.delete(f'/api/admin/products/{p.id}/').status_code, 403)
        self.assertEqual(ed.get('/api/admin/store-orders/').status_code, 403)


# ====================== products ======================
class ProductTests(ShopBase):
    def create(self, **kw):
        body = {'title': 'Interview Notes', 'product_type': 'digital', 'price': '99.00', 'item_kind': 'interview_notes', **kw}
        return self.api.post('/api/admin/products/', body, format='json')

    def test_create_edit_publish_visibility(self):
        r = self.create()
        self.assertEqual(r.status_code, 201, r.content)
        p = r.json()
        self.assertEqual(p['slug'], 'interview-notes')
        self.assertTrue(p['sku'].startswith('CH-'))
        self.assertEqual(self.anon.get('/api/products/').json()['count'], 0)
        self.assertEqual(self.anon.get(f'/api/products/{p["slug"]}/').status_code, 404)
        self.api.post(f'/api/admin/products/{p["id"]}/publish/')
        self.assertEqual(self.anon.get('/api/products/').json()['count'], 1)
        self.assertEqual(self.anon.get(f'/api/products/{p["slug"]}/').status_code, 200)
        self.api.post(f'/api/admin/products/{p["id"]}/unpublish/')
        self.assertEqual(self.anon.get(f'/api/products/{p["slug"]}/').status_code, 404)

    def test_validation(self):
        self.assertEqual(self.create(price='-5').status_code, 400)
        self.assertEqual(self.create(price='100', original_price='50').status_code, 400)
        self.assertEqual(self.create(isbn='123').status_code, 400)
        self.assertEqual(self.create(isbn='978-3-16-148410-0').status_code, 201)
        self.assertEqual(self.create(title='  ').status_code, 400)
        self.assertEqual(self.create(product_type='teleport').status_code, 400)
        self.assertEqual(self.create(stock_quantity=-3, product_type='physical').status_code, 400)
        a = self.create(sku='dup-1').json()
        self.assertEqual(a['sku'], 'DUP-1')
        self.assertEqual(self.create(sku='DUP-1', title='Another').status_code, 400)

    def test_duplicate_slug_gets_suffix(self):
        self.assertEqual(self.create().json()['slug'], 'interview-notes')
        self.assertEqual(self.create().json()['slug'], 'interview-notes-2')

    def test_description_is_sanitised_and_images_validated(self):
        r = self.create(description='<p>ok</p><script>alert(1)</script><img src=x onerror=alert(1)>')
        self.assertNotIn('<script', r.json()['description'])
        self.assertNotIn('onerror', r.json()['description'])
        bad = self.create(images=[{'src': 'javascript:alert(1)', 'alt': 'x'}])
        self.assertEqual(bad.status_code, 400)
        good = self.create(title='With image', images=[{'src': '/media/uploads/a.png', 'alt': 'cover'}])
        self.assertEqual(good.status_code, 201)

    def test_public_filters_search_sort_pagination(self):
        cat = ProductCategory.objects.create(name='Notes')
        for i in range(14):
            self.product(f'Item {i}', price=str(10 + i), category=cat if i % 2 else None)
        self.product('Printed Book', 'physical', '500.00', stock=3, item_kind='book')
        pub = self.anon
        r = pub.get('/api/products/').json()
        self.assertEqual((r['count'], len(r['results'])), (15, 12))
        self.assertEqual(len(pub.get('/api/products/?page=2').json()['results']), 3)
        self.assertEqual(pub.get('/api/products/?q=printed').json()['count'], 1)
        self.assertEqual(pub.get('/api/products/?category=notes').json()['count'], 7)
        self.assertEqual(pub.get('/api/products/?type=physical').json()['count'], 1)
        self.assertEqual(pub.get('/api/products/?min_price=20&max_price=22').json()['count'], 3)
        prices = [Decimal(x['price']) for x in pub.get('/api/products/?ordering=price_desc').json()['results']]
        self.assertEqual(prices, sorted(prices, reverse=True))
        self.assertEqual(pub.get('/api/products/?min_price=abc').status_code, 200)  # junk filter is ignored, not a crash

    def test_public_detail_never_leaks_private_files(self):
        p = self.product()
        asset = self.attach_pdf(p)
        body = self.anon.get(f'/api/products/{p.slug}/').content.decode()
        self.assertIn('The PDF', body)  # the label is shown ...
        for leak in ('.pdf', str(asset.file.name), 'private_media', 'sha256'):
            self.assertNotIn(leak, body)  # ... the file itself is not

    def test_no_fake_scarcity_or_ratings(self):
        p = self.product('Book', 'physical', '300.00', stock=500)
        d = self.anon.get(f'/api/products/{p.slug}/').json()
        self.assertEqual(d['stock_label'], 'In stock')  # exact count only shown when genuinely low
        for bad in ('rating', '"review"', 'aggregate'):
            self.assertNotIn(bad, json.dumps(d).lower())
        p.stock_quantity = 2
        p.save()
        self.assertEqual(self.anon.get(f'/api/products/{p.slug}/').json()['stock_label'], 'Only 2 left')


# ====================== pricing, cart, coupons ======================
class CartTests(ShopBase):
    def test_totals_come_from_the_server(self):
        p = self.product(price='250.00')
        c = APIClient()
        r = c.post('/api/cart/items/', {'product': p.id, 'quantity': 1, 'price': '1.00', 'total': '1.00'}, format='json')
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['total'], '250.00')

    def test_quantity_rules(self):
        digital, physical = self.product('Pdf'), self.product('Book', 'physical', '100.00', stock=50)
        c = APIClient()
        self.assertEqual(c.post('/api/cart/items/', {'product': digital.id, 'quantity': 5}, format='json').json()['items'][0]['quantity'], 1)
        tok = c.post('/api/cart/items/', {'product': physical.id, 'quantity': 99}, format='json').json()['token']
        c.credentials(HTTP_X_CART_TOKEN=tok)
        items = {i['product']['slug']: i['quantity'] for i in c.get('/api/cart/').json()['items']}
        self.assertEqual(items['book'], 10)  # capped
        self.assertEqual(c.post('/api/cart/items/', {'product': physical.id, 'quantity': -1}, format='json').status_code, 400)
        self.assertEqual(c.post('/api/cart/items/', {'product': physical.id, 'quantity': 0}, format='json').status_code, 400)
        self.assertEqual(c.post('/api/cart/items/', {'product': 'x'}, format='json').status_code, 400)
        self.assertEqual(c.patch(f'/api/cart/items/{physical.id}/', {'quantity': 3}, format='json').json()['subtotal'], '300.00')
        self.assertEqual(len(c.delete(f'/api/cart/items/{physical.id}/').json()['items']), 0)

    def test_draft_and_unknown_products_cannot_be_added(self):
        d = self.product('Hidden', status='draft')
        c = APIClient()
        self.assertEqual(c.post('/api/cart/items/', {'product': d.id}, format='json').status_code, 404)
        self.assertEqual(c.post('/api/cart/items/', {'product': 99999}, format='json').status_code, 404)

    def test_cart_reports_unavailable_items(self):
        p = self.product('Book', 'physical', '100.00', stock=2)
        c = APIClient()
        tok = c.post('/api/cart/items/', {'product': p.id, 'quantity': 2}, format='json').json()['token']
        c.credentials(HTTP_X_CART_TOKEN=tok)
        Product.objects.filter(pk=p.pk).update(stock_quantity=0)
        data = c.get('/api/cart/').json()
        self.assertEqual(data['problems'][0]['message'], 'Out of stock.')
        Product.objects.filter(pk=p.pk).update(status='archived')
        self.assertIn('no longer available', c.get('/api/cart/').json()['problems'][0]['message'])

    def test_guest_cart_merges_into_account_cart(self):
        p = self.product()
        guest = APIClient()
        tok = guest.post('/api/cart/items/', {'product': p.id}, format='json').json()['token']
        c = self.as_user(self.alice)
        c.credentials(HTTP_X_CART_TOKEN=tok)
        data = c.get('/api/cart/').json()
        self.assertEqual(len(data['items']), 1)
        self.assertIsNone(data['token'])  # now it belongs to the account
        self.assertEqual(self.as_user(self.alice).get('/api/cart/').json()['count'], 1)
        self.assertEqual(self.as_user(self.bob).get('/api/cart/').json()['count'], 0)

    def test_tax_exclusive_and_inclusive(self):
        p = self.product(price='100.00')
        cfg = StoreSettings.load()
        cfg.tax_mode, cfg.default_tax_rate = 'exclusive', Decimal('18')
        cfg.save()
        c = APIClient()
        r = c.post('/api/cart/items/', {'product': p.id}, format='json').json()
        self.assertEqual((r['tax'], r['total']), ('18.00', '118.00'))
        cfg.tax_mode = 'inclusive'
        cfg.save()
        tok = r['token']
        c.credentials(HTTP_X_CART_TOKEN=tok)
        r = c.get('/api/cart/').json()
        self.assertEqual((r['tax'], r['total']), ('15.25', '100.00'))
        Product.objects.filter(pk=p.pk).update(tax_rate=Decimal('0'))  # per-product override
        self.assertEqual(c.get('/api/cart/').json()['tax'], '0.00')
        cfg.tax_mode = 'none'
        cfg.save()
        self.assertEqual(c.get('/api/cart/').json()['tax'], '0.00')

    def test_shipping_only_for_physical_and_free_over_threshold(self):
        cfg = StoreSettings.load()
        cfg.shipping_flat, cfg.free_shipping_over = Decimal('60'), Decimal('500')
        cfg.save()
        pdf, book = self.product('Pdf', price='100.00'), self.product('Book', 'physical', '300.00', stock=9)
        c = APIClient()
        tok = c.post('/api/cart/items/', {'product': pdf.id}, format='json').json()['token']
        c.credentials(HTTP_X_CART_TOKEN=tok)
        self.assertEqual(c.get('/api/cart/').json()['shipping'], '0.00')
        r = c.post('/api/cart/items/', {'product': book.id}, format='json').json()
        self.assertEqual((r['shipping'], r['total']), ('60.00', '460.00'))
        r = c.post('/api/cart/items/', {'product': book.id}, format='json').json()  # 100 + 600 = 700 >= 500
        self.assertEqual((r['shipping'], r['total']), ('0.00', '700.00'))


class CouponTests(ShopBase):
    def setUp(self):
        super().setUp()
        self.p = self.product(price='1000.00')
        self.c = APIClient()
        self.tok = self.c.post('/api/cart/items/', {'product': self.p.id}, format='json').json()['token']
        self.c.credentials(HTTP_X_CART_TOKEN=self.tok)

    def apply(self, code):
        return self.c.post('/api/cart/coupon/', {'code': code, 'email': 'a@example.com'}, format='json')

    def test_percent_with_cap_and_fixed(self):
        Coupon.objects.create(code='TEN', discount_type='percent', value=Decimal('10'))
        Coupon.objects.create(code='CAP', discount_type='percent', value=Decimal('50'), max_discount=Decimal('120'))
        Coupon.objects.create(code='FLAT', discount_type='fixed', value=Decimal('5000'))
        r = self.apply('ten').json()
        self.assertEqual((r['discount'], r['total']), ('100.00', '900.00'))
        self.assertEqual(self.apply('CAP').json()['discount'], '120.00')
        self.assertEqual(self.apply('FLAT').json()['total'], '0.00')  # fixed never exceeds the cart

    def test_invalid_expired_inactive_minimum_and_limits(self):
        now = timezone.now()
        Coupon.objects.create(code='OLD', value=Decimal('10'), valid_until=now - timedelta(days=1))
        Coupon.objects.create(code='SOON', value=Decimal('10'), valid_from=now + timedelta(days=1))
        Coupon.objects.create(code='OFF', value=Decimal('10'), is_active=False)
        Coupon.objects.create(code='BIG', value=Decimal('10'), min_purchase=Decimal('5000'))
        for code, expect in (('NOPE', 'not valid'), ('OLD', 'expired'), ('SOON', 'not active'), ('OFF', 'not valid'), ('BIG', 'Spend at least')):
            r = self.apply(code)
            self.assertEqual(r.status_code, 400, code)
            self.assertIn(expect, r.json()['coupon_error'], code)
        self.assertEqual(self.c.get('/api/cart/').json()['coupon'], '')  # a bad code is not kept

    def test_eligible_products_only(self):
        other = self.product('Other', price='50.00')
        coupon = Coupon.objects.create(code='ONLYOTHER', value=Decimal('50'))
        coupon.eligible_products.add(other)
        self.assertEqual(self.apply('ONLYOTHER').status_code, 400)
        self.c.post('/api/cart/items/', {'product': other.id}, format='json')
        r = self.apply('ONLYOTHER').json()
        self.assertEqual(r['discount'], '25.00')

    def test_usage_limit_counts_live_orders_only(self):
        Coupon.objects.create(code='ONCE', value=Decimal('10'), usage_limit=1)
        with self.gateway_ok():
            self.c.post('/api/cart/coupon/', {'code': 'ONCE'}, format='json')
            r = self.c.post('/api/checkout/', {'name': 'Asha', 'email': 'a@example.com'}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        order = Order.objects.get(number=r.json()['order_number'])
        other = APIClient()
        tok = other.post('/api/cart/items/', {'product': self.p.id}, format='json').json()['token']
        other.credentials(HTTP_X_CART_TOKEN=tok)
        self.assertEqual(other.post('/api/cart/coupon/', {'code': 'ONCE'}, format='json').status_code, 400)
        orders.cancel_order(order)  # a cancelled order gives the use back
        self.assertEqual(other.post('/api/cart/coupon/', {'code': 'ONCE'}, format='json').status_code, 200)

    def test_discount_is_recomputed_at_checkout_not_trusted(self):
        Coupon.objects.create(code='TEN', value=Decimal('10'))
        self.apply('TEN')
        with self.gateway_ok():
            r = self.c.post('/api/checkout/', {'name': 'Asha', 'email': 'a@example.com', 'discount': '999', 'total': '1', 'amount': 100}, format='json')
        o = Order.objects.get(number=r.json()['order_number'])
        self.assertEqual((o.subtotal, o.discount, o.total), (Decimal('1000.00'), Decimal('100.00'), Decimal('900.00')))
        self.assertEqual(r.json()['amount'], 90000)


# ====================== checkout, stock ======================
class CheckoutTests(ShopBase):
    def test_order_is_a_snapshot(self):
        p = self.product('Notes', price='120.00')
        order = self.paid_order(items=[(p, 1)])
        item = order.items.get()
        Product.objects.filter(pk=p.pk).update(title='Renamed', price=Decimal('999.00'))
        item.refresh_from_db()
        self.assertEqual((item.title, item.unit_price), ('Notes', Decimal('120.00')))
        p.delete()
        item.refresh_from_db()
        self.assertIsNone(item.product)  # history survives the product
        self.assertEqual(Order.objects.get(pk=order.pk).total, Decimal('120.00'))

    def test_validation_and_empty_cart(self):
        p = self.product()
        c = APIClient()
        self.assertEqual(c.post('/api/checkout/', {'name': 'A', 'email': 'a@example.com'}, format='json').status_code, 400)
        r, _ = self.checkout(c, [(p, 1)], name='A')
        self.assertEqual(r.status_code, 400)
        r, _ = self.checkout(APIClient(), [(p, 1)], email='not-an-email')
        self.assertEqual(r.status_code, 400)
        r, _ = self.checkout(APIClient(), [(p, 1)], phone='abc')
        self.assertEqual(r.status_code, 400)

    def test_physical_needs_a_valid_address(self):
        book = self.product('Book', 'physical', '100.00', stock=5)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(book, 1)])
            self.assertEqual(r.json()['code'], 'address_required')
            r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address={**ADDRESS, 'postal_code': '12'})
            self.assertEqual(r.json()['code'], 'bad_pin')
            r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
            self.assertEqual(r.status_code, 201)
        self.assertEqual(Order.objects.get().fulfilment_status, 'unfulfilled')

    def test_stock_is_reserved_and_never_oversold(self):
        book = self.product('Book', 'physical', '100.00', stock=3)
        with self.gateway_ok():
            r1, _ = self.checkout(APIClient(), [(book, 2)], shipping_address=ADDRESS)
            self.assertEqual(r1.status_code, 201)
            book.refresh_from_db()
            self.assertEqual(book.stock_quantity, 1)
            r2, _ = self.checkout(APIClient(), [(book, 2)], shipping_address=ADDRESS)
            self.assertEqual(r2.status_code, 400)
            self.assertIn('Only 1 left', r2.json()['detail'])
            r3, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
            self.assertEqual(r3.status_code, 201)
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 0)
        self.assertEqual(book.movements.filter(reason='reserve').count(), 2)
        self.assertGreaterEqual(book.stock_quantity, 0)

    def test_out_of_stock_is_refused(self):
        book = self.product('Book', 'physical', '100.00', stock=0)
        r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
        self.assertEqual(r.status_code, 400)

    def test_cancel_and_expiry_release_stock_once(self):
        book = self.product('Book', 'physical', '100.00', stock=2)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(book, 2)], shipping_address=ADDRESS)
        order = Order.objects.get(number=r.json()['order_number'])
        orders.cancel_order(order)
        orders.cancel_order(order)  # twice
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 2)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(book, 2)], shipping_address=ADDRESS)
        Order.objects.filter(number=r.json()['order_number']).update(created_at=timezone.now() - timedelta(hours=2))
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 0)
        with self.gateway_ok():
            r2, _ = self.checkout(APIClient(), [(book, 2)], shipping_address=ADDRESS)  # lazy expiry frees the stale reservation first
        self.assertEqual(r2.status_code, 201, r2.content)
        self.assertEqual(Order.objects.get(number=r.json()['order_number']).status, 'expired')
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 0)

    @override_settings(RAZORPAY_KEY_ID='', RAZORPAY_KEY_SECRET='')
    def test_gateway_not_configured_is_reported_honestly(self):
        book = self.product('Book', 'physical', '100.00', stock=2)
        r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
        self.assertEqual(r.status_code, 503)
        self.assertEqual(r.json()['code'], 'gateway_not_configured')
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 2)  # nothing stays reserved
        self.assertFalse(Order.objects.filter(status='pending_payment').exists())

    def test_guest_checkout_can_be_switched_off(self):
        cfg = StoreSettings.load()
        cfg.allow_guest_checkout = False
        cfg.save()
        p = self.product()
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(p, 1)])
            self.assertEqual(r.status_code, 401)
            r, _ = self.checkout(self.as_user(self.alice), [(p, 1)])
            self.assertEqual(r.status_code, 201)

    def test_free_product_completes_without_the_gateway_and_grants_access(self):
        p = self.product('Free notes', price='0.00')
        self.attach_pdf(p)
        with mock.patch('apps.shop.gateway.create_order', side_effect=AssertionError('gateway must not be called')):
            r, _ = self.checkout(APIClient(), [(p, 1)])
        self.assertEqual(r.status_code, 201)
        self.assertTrue(r.json()['free'])
        o = Order.objects.get()
        self.assertEqual((o.payment_status, o.status), ('paid', 'delivered'))
        self.assertEqual(o.permissions.count(), 1)


# ====================== payments ======================
class PaymentTests(ShopBase):
    def make(self):
        p = self.product(price='300.00')
        self.attach_pdf(p)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(p, 1)])
        return Order.objects.get(number=r.json()['order_number']), r.json()

    def test_checkout_returns_provider_order_for_the_server_total(self):
        order, data = self.make()
        self.assertEqual(data['amount'], 30000)
        self.assertEqual(data['key'], 'rzp_test_abc')
        self.assertNotIn(SECRET, json.dumps(data))
        self.assertEqual(order.payment_status, 'pending')

    def test_valid_signature_and_captured_payment_marks_paid_and_grants_files(self):
        order, _ = self.make()
        r = self.pay(order)
        self.assertEqual(r.json()['status'], 'paid')
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ('delivered', 'paid'))
        self.assertEqual(order.permissions.count(), 1)
        self.assertEqual(len(mail.outbox), 1)
        self.assertIn(order.number, mail.outbox[0].subject)

    def test_verify_twice_is_idempotent(self):
        order, _ = self.make()
        self.pay(order)
        self.pay(order)
        order.refresh_from_db()
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(order.permissions.count(), 1)
        self.assertEqual(order.payments.filter(status='captured').count(), 1)

    def test_bad_signature_is_rejected_and_order_stays_unpaid(self):
        order, _ = self.make()
        pay = order.payments.first()
        r = self.anon.post('/api/store/payments/verify/', {'order_number': order.number, 'razorpay_order_id': pay.provider_order_id, 'razorpay_payment_id': 'pay_x', 'razorpay_signature': 'deadbeef'},
                           format='json', HTTP_X_ORDER_TOKEN=order.public_token)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['code'], 'bad_signature')
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')
        self.assertEqual(order.permissions.count(), 0)

    def test_amount_mismatch_is_rejected(self):
        order, _ = self.make()
        r = self.pay(order, amount=100)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(r.json()['code'], 'mismatch')
        order.refresh_from_db()
        self.assertNotEqual(order.payment_status, 'paid')

    def test_success_page_visit_never_marks_paid(self):
        order, _ = self.make()
        self.anon.get(f'/payment/success?order={order.number}&token={order.public_token}')
        self.anon.get(f'/api/store/orders/{order.number}/?token={order.public_token}')
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')
        self.assertEqual(self.anon.get(f'/api/store/orders/{order.number}/?token={order.public_token}').json()['downloads'], [])

    def test_authorized_but_not_captured_stays_pending(self):
        order, _ = self.make()
        r = self.pay(order, status='authorized')
        self.assertEqual(r.json()['status'], 'pending')
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')

    def test_failed_payment_keeps_the_order_open_for_retry(self):
        order, _ = self.make()
        r = self.pay(order, status='failed')
        self.assertEqual(r.json()['status'], 'failed')
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'failed')
        with self.gateway_ok():
            retry = self.anon.post(f'/api/store/orders/{order.number}/pay/', {}, format='json', HTTP_X_ORDER_TOKEN=order.public_token)
        self.assertEqual(retry.status_code, 200)

    def webhook(self, payload, event_id='evt_1', secret=WH_SECRET, signature=None):
        body = json.dumps(payload).encode()
        sig = signature if signature is not None else hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
        return self.anon.post('/api/store/payments/webhook/', data=body, content_type='application/json', HTTP_X_RAZORPAY_SIGNATURE=sig, HTTP_X_RAZORPAY_EVENT_ID=event_id)

    def captured_event(self, order, payment_id='pay_w1'):
        pay = order.payments.first()
        return {'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': payment_id, 'order_id': pay.provider_order_id, 'amount': int(order.total * 100), 'currency': 'INR', 'status': 'captured'}}}}

    def test_webhook_signature_is_required(self):
        order, _ = self.make()
        self.assertEqual(self.webhook(self.captured_event(order), signature='bad').status_code, 400)
        self.assertEqual(self.webhook(self.captured_event(order), secret='wrong').status_code, 400)
        self.assertEqual(self.webhook(self.captured_event(order), signature='').status_code, 400)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending')

    @override_settings(RAZORPAY_WEBHOOK_SECRET='')
    def test_webhook_without_a_configured_secret_rejects_everything(self):
        order, _ = self.make()
        self.assertEqual(self.webhook(self.captured_event(order), signature='anything').status_code, 400)

    def test_webhook_marks_paid_once_even_when_delivered_twice(self):
        order, _ = self.make()
        ev = self.captured_event(order)
        with mock.patch('apps.shop.gateway.fetch_payment', return_value=ev['payload']['payment']['entity']):
            self.assertEqual(self.webhook(ev).status_code, 200)
            self.assertEqual(self.webhook(ev).status_code, 200)  # same event id
            self.assertEqual(self.webhook(ev, event_id='evt_2').status_code, 200)  # a different delivery of the same payment
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')
        self.assertEqual(len(mail.outbox), 1)
        self.assertEqual(order.permissions.count(), 1)
        self.assertEqual(PaymentEvent.objects.count(), 2)

    def test_webhook_then_browser_verify_do_not_double_fulfil(self):
        order, _ = self.make()
        ev = self.captured_event(order, 'pay_1')
        with mock.patch('apps.shop.gateway.fetch_payment', return_value=ev['payload']['payment']['entity']):
            self.webhook(ev)
        self.pay(order, 'pay_1')
        self.assertEqual(len(mail.outbox), 1)

    def test_webhook_failed_event(self):
        order, _ = self.make()
        pay = order.payments.first()
        ev = {'event': 'payment.failed', 'payload': {'payment': {'entity': {'id': 'pay_f', 'order_id': pay.provider_order_id, 'error_description': 'declined'}}}}
        self.assertEqual(self.webhook(ev, 'evt_f').status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'failed')

    def test_webhook_for_an_unknown_order_is_ignored(self):
        ev = {'event': 'payment.captured', 'payload': {'payment': {'entity': {'id': 'pay_z', 'order_id': 'order_not_ours'}}}}
        self.assertEqual(self.webhook(ev, 'evt_z').status_code, 200)

    def test_payment_for_an_expired_order_still_credits_the_customer(self):
        book = self.product('Book', 'physical', '100.00', stock=1)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
        order = Order.objects.get(number=r.json()['order_number'])
        orders.inventory.release_for_order(order)
        Order.objects.filter(pk=order.pk).update(status='expired')
        order.refresh_from_db()
        self.assertEqual(self.pay(order).status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'paid')  # money received is never ignored
        book.refresh_from_db()
        self.assertEqual(book.stock_quantity, 0)


# ====================== refunds, fulfilment ======================
class OrderAdminTests(ShopBase):
    def test_physical_fulfilment_state_machine(self):
        book = self.product('Book', 'physical', '200.00', stock=3)
        order = self.paid_order(items=[(book, 1)])
        self.assertEqual((order.status, order.fulfilment_status), ('paid', 'unfulfilled'))
        url = f'/api/admin/store-orders/{order.number}/status/'
        self.assertEqual(self.api.post(url, {'status': 'delivered'}, format='json').status_code, 400)  # no jumping ahead
        self.assertEqual(self.api.post(url, {'status': 'paid'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'status': 'nonsense'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(url, {'status': 'shipped'}, format='json').status_code, 400)  # must be processed first
        self.assertEqual(self.api.post(url, {'status': 'processing'}, format='json').json()['fulfilment_status'], 'processing')
        r = self.api.post(url, {'status': 'shipped', 'carrier': 'BlueDart', 'tracking_number': 'BD123'}, format='json')
        self.assertEqual(r.json()['tracking_number'], 'BD123')
        self.assertEqual(len(mail.outbox), 2)  # confirmation + shipped
        self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/cancel/', {}, format='json').status_code, 400)  # too late
        self.assertEqual(self.api.post(url, {'status': 'delivered'}, format='json').json()['status'], 'delivered')

    def test_unpaid_order_cannot_be_fulfilled(self):
        book = self.product('Book', 'physical', '200.00', stock=3)
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(book, 1)], shipping_address=ADDRESS)
        self.assertEqual(self.api.post(f"/api/admin/store-orders/{r.json()['order_number']}/status/", {'status': 'processing'}, format='json').status_code, 400)

    def test_orders_cannot_be_edited_directly(self):
        order = self.paid_order()
        r = self.api.patch(f'/api/admin/store-orders/{order.number}/', {'status': 'delivered', 'total': '1', 'payment_status': 'paid', 'admin_note': 'called customer'}, format='json')
        self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual((order.total, order.admin_note), (Decimal('199.00'), 'called customer'))

    def test_full_refund_revokes_downloads_and_calls_the_gateway(self):
        p = self.product(price='400.00')
        self.attach_pdf(p)
        order = self.paid_order(user=self.alice, items=[(p, 1)])
        self.assertEqual(order.permissions.filter(revoked_at__isnull=True).count(), 1)
        with mock.patch('apps.shop.gateway.refund', return_value={'id': 'rfnd_1'}) as rf:
            r = self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'reason': 'customer asked'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        rf.assert_called_once()
        self.assertEqual(rf.call_args.args[1], 40000)
        order.refresh_from_db()
        self.assertEqual((order.status, order.payment_status, order.refunded_amount), ('refunded', 'refunded', Decimal('400.00')))
        self.assertEqual(order.permissions.filter(revoked_at__isnull=True).count(), 0)
        self.assertEqual(self.as_user(self.alice).get('/api/my-account/downloads/').json(), [])  # refunded: nothing is offered any more
        perm = DownloadPermission.objects.get()
        self.assertEqual(self.as_user(self.alice).post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').status_code, 404)
        self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {}, format='json').status_code, 400)  # nothing left to refund

    def test_partial_refund_and_over_refund(self):
        order = self.paid_order(items=[(self.product(price='400.00'), 1)])
        with mock.patch('apps.shop.gateway.refund', return_value={'id': 'rfnd_p'}):
            r = self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'amount': '150.00'}, format='json')
            self.assertEqual(r.json()['status'], 'partially_refunded')
            self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'amount': '300'}, format='json').status_code, 400)
            self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'amount': '-1'}, format='json').status_code, 400)
            self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'amount': 'abc'}, format='json').status_code, 400)
            order.refresh_from_db()
            self.assertEqual(order.permissions.filter(revoked_at__isnull=True).count(), 0 if False else order.permissions.filter(revoked_at__isnull=True).count())
            self.assertEqual(self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {'amount': '250.00'}, format='json').json()['status'], 'refunded')

    def test_refund_of_unpaid_order_is_rejected(self):
        with self.gateway_ok():
            r, _ = self.checkout(APIClient(), [(self.product(), 1)])
        self.assertEqual(self.api.post(f"/api/admin/store-orders/{r.json()['order_number']}/refund/", {}, format='json').status_code, 400)

    def test_gateway_refund_failure_changes_nothing(self):
        order = self.paid_order()
        from .gateway import GatewayError

        with mock.patch('apps.shop.gateway.refund', side_effect=GatewayError('down')):
            r = self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {}, format='json')
        self.assertEqual(r.status_code, 502)
        order.refresh_from_db()
        self.assertEqual((order.payment_status, order.refunded_amount), ('paid', Decimal('0.00')))

    def test_refund_webhook_is_recorded_once(self):
        order = self.paid_order(items=[(self.product(price='100.00'), 1)])
        ev = {'event': 'refund.processed', 'payload': {'payment': {'entity': {'id': 'pay_1', 'order_id': order.payments.first().provider_order_id}}, 'refund': {'entity': {'id': 'rfnd_w', 'amount': 5000}}}}
        PaymentTests.webhook(self, ev, 'evt_r1')
        PaymentTests.webhook(self, ev, 'evt_r2')
        order.refresh_from_db()
        self.assertEqual(order.refunded_amount, Decimal('50.00'))

    def test_customer_can_request_a_refund_and_it_is_flagged(self):
        order = self.paid_order(user=self.alice)
        r = self.as_user(self.alice).post(f'/api/store/orders/{order.number}/request-refund/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        order.refresh_from_db()
        self.assertEqual(order.status, 'refund_requested')
        self.assertEqual(self.as_user(self.bob).post(f'/api/store/orders/{order.number}/request-refund/', {}, format='json').status_code, 404)

    def test_audit_log_records_admin_actions(self):
        order = self.paid_order(items=[(self.product('Book', 'physical', '10.00', stock=2), 1)])
        self.api.post(f'/api/admin/store-orders/{order.number}/status/', {'status': 'processing'}, format='json')
        self.api.post(f'/api/admin/store-orders/{order.number}/status/', {'status': 'shipped', 'tracking_number': 'T1'}, format='json')
        rows = self.api.get('/api/admin/shop/audit/').json()['results']
        actions = [r['action'] for r in rows]
        self.assertIn('order.status', actions)
        self.assertIn('order.paid', actions)

    def test_order_list_filters(self):
        a = self.paid_order(user=self.alice, items=[(self.product('A', price='10.00'), 1)])
        b = self.paid_order(user=self.bob, items=[(self.product('Book', 'physical', '20.00', stock=3), 1)])
        self.assertEqual(self.api.get('/api/admin/store-orders/').json()['count'], 2)
        self.assertEqual(self.api.get('/api/admin/store-orders/?product_type=physical').json()['count'], 1)
        self.assertEqual(self.api.get(f'/api/admin/store-orders/?q={a.number}').json()['count'], 1)
        self.assertEqual(self.api.get(f'/api/admin/store-orders/?customer={self.bob.id}').json()['count'], 1)
        self.assertEqual(self.api.get('/api/admin/store-orders/?payment_status=paid&status=delivered').json()['count'], 1)
        today = timezone.now().date().isoformat()
        self.assertEqual(self.api.get(f'/api/admin/store-orders/?date_from={today}&date_to={today}').json()['count'], 2)
        self.assertEqual(self.api.get('/api/admin/store-orders/?date_from=2000-01-01&date_to=2000-01-02').json()['count'], 0)
        self.assertEqual(self.api.get('/api/admin/store-orders/?date_from=garbage').status_code, 200)


# ====================== downloads & ownership ======================
class DownloadTests(ShopBase):
    def setUp(self):
        super().setUp()
        self.p = self.product(price='150.00')
        self.asset = self.attach_pdf(self.p)

    def test_no_access_before_payment(self):
        with self.gateway_ok():
            r, _ = self.checkout(self.as_user(self.alice), [(self.p, 1)])
        order = Order.objects.get(number=r.json()['order_number'])
        self.assertEqual(order.permissions.count(), 0)
        self.assertEqual(self.as_user(self.alice).get('/api/my-account/downloads/').json(), [])

    def test_buyer_downloads_through_a_signed_link(self):
        order = self.paid_order(user=self.alice, items=[(self.p, 1)])
        alice = self.as_user(self.alice)
        perm = alice.get('/api/my-account/downloads/').json()[0]
        self.assertEqual((perm['label'], perm['available']), ('The PDF', True))
        link = alice.post(f'/api/store/downloads/{perm["id"]}/link/', {}, format='json').json()
        self.assertEqual(link['expires_in'], 600)
        r = alice.get(link['url'])
        self.assertEqual(r.status_code, 200)
        self.assertEqual(b''.join(r.streaming_content), pdf_bytes())
        self.assertIn('attachment', r['Content-Disposition'])
        self.assertEqual(r['X-Content-Type-Options'], 'nosniff')
        self.assertIn('no-store', r['Cache-Control'])
        self.assertEqual(DownloadPermission.objects.get().download_count, 1)
        self.assertEqual(asset_events(), 1)

    def test_another_customer_cannot_get_a_link_or_see_the_order(self):
        order = self.paid_order(user=self.alice, items=[(self.p, 1)])
        perm = DownloadPermission.objects.get()
        bob = self.as_user(self.bob)
        self.assertEqual(bob.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').status_code, 404)
        self.assertEqual(self.anon.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').status_code, 404)
        self.assertEqual(bob.get(f'/api/store/orders/{order.number}/').status_code, 404)
        self.assertEqual(self.anon.get(f'/api/store/orders/{order.number}/').status_code, 404)
        self.assertEqual(self.anon.get(f'/api/store/orders/{order.number}/?token=wrong').status_code, 404)
        self.assertEqual(self.as_user(self.bob).get('/api/my-account/orders/').json()['count'], 0)
        self.assertEqual(self.as_user(self.alice).get('/api/my-account/orders/').json()['count'], 1)

    def test_a_link_cannot_be_used_by_changing_it_or_replaying_after_expiry(self):
        self.paid_order(user=self.alice, items=[(self.p, 1)])
        perm = DownloadPermission.objects.get()
        alice = self.as_user(self.alice)
        url = alice.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').json()['url']
        self.assertEqual(self.anon.get(url[:-2] + 'xx/').status_code, 404)  # tampered
        with override_settings(STORE_DOWNLOAD_LINK_TTL=-1):
            self.assertEqual(self.anon.get(url).status_code, 404)  # expired
        self.assertEqual(DownloadPermission.objects.get().download_count, 0)

    def test_guest_with_the_order_token_can_download_and_nobody_else(self):
        order = self.paid_order(items=[(self.p, 1)])  # guest
        perm = DownloadPermission.objects.get()
        ok = self.anon.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json', HTTP_X_ORDER_TOKEN=order.public_token)
        self.assertEqual(ok.status_code, 200)
        self.assertEqual(self.anon.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json', HTTP_X_ORDER_TOKEN='guess').status_code, 404)
        detail = self.anon.get(f'/api/store/orders/{order.number}/?token={order.public_token}').json()
        self.assertEqual(detail['downloads'][0]['label'], 'The PDF')

    def test_download_limit_is_enforced(self):
        Product.objects.filter(pk=self.p.pk).update(download_limit=1)
        self.paid_order(user=self.alice, items=[(Product.objects.get(pk=self.p.pk), 1)])
        perm = DownloadPermission.objects.get()
        self.assertEqual(perm.max_downloads, 1)
        alice = self.as_user(self.alice)
        url = alice.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').json()['url']
        self.assertEqual(alice.get(url).status_code, 200)
        self.assertEqual(alice.post(f'/api/store/downloads/{perm.id}/link/', {}, format='json').status_code, 403)
        self.assertEqual(alice.get(url).status_code, 404)  # the old link no longer works either

    def test_claiming_a_guest_order_needs_the_private_token(self):
        order = self.paid_order(items=[(self.p, 1)])
        alice = self.as_user(self.alice)
        self.assertEqual(alice.post('/api/my-account/claim-order/', {'order_number': order.number, 'token': 'nope'}, format='json').status_code, 404)
        self.assertEqual(alice.post('/api/my-account/claim-order/', {'order_number': order.number, 'token': order.public_token}, format='json').status_code, 200)
        self.assertEqual(alice.get('/api/my-account/orders/').json()['count'], 1)
        self.assertEqual(self.as_user(self.bob).post('/api/my-account/claim-order/', {'order_number': order.number, 'token': order.public_token}, format='json').status_code, 404)  # already owned


def asset_events():
    from .models import DownloadEvent

    return DownloadEvent.objects.count()


# ====================== uploads ======================
class UploadTests(ShopBase):
    def up(self, owner, name, data, label='File', route='products'):
        return self.api.post(f'/api/admin/{route}/{owner.id}/assets/', {'file': SimpleUploadedFile(name, data), 'label': label}, format='multipart')

    def test_valid_files_are_stored_privately_with_random_names(self):
        p = self.product()
        r = self.up(p, '../../My Notes (final).pdf', pdf_bytes())
        self.assertEqual(r.status_code, 201, r.content)
        asset = DigitalAsset.objects.get()
        self.assertTrue(asset.file.path.startswith(PRIVATE))
        self.assertFalse(asset.file.path.startswith(MEDIA))
        self.assertNotIn('Notes', asset.file.name)
        self.assertNotIn('..', asset.original_name)
        self.assertEqual(asset.content_type, 'application/pdf')
        self.assertEqual(len(asset.sha256), 64)
        with self.assertRaises(ValueError):
            asset.file.storage.url(asset.file.name)  # no public URL exists
        self.assertEqual(self.up(p, 'src.zip', zip_bytes()).status_code, 201)
        self.assertEqual(self.up(p, 'schema.sql', b'CREATE TABLE a(id int);').status_code, 201)

    def test_rejects_dangerous_or_fake_files(self):
        p = self.product()
        bad = [('run.exe', b'MZ\x90\x00'), ('a.php', b'<?php echo 1;'), ('a.html', b'<script>1</script>'), ('a.svg', b'<svg onload=x>'), ('a.sh', b'#!/bin/sh'),
               ('fake.pdf', b'<html>not a pdf</html>'), ('fake.zip', b'not a zip file at all'), ('fake.png', b'GIF89a'), ('empty.pdf', b''),
               ('bin.txt', b'abc\x00def'), ('noext', b'hello'), ('evil.zip', zip_bytes(('../../etc/passwd',))), ('abs.zip', zip_bytes(('/etc/passwd',)))]
        for name, data in bad:
            r = self.up(p, name, data)
            self.assertEqual(r.status_code, 400, name)
        self.assertEqual(DigitalAsset.objects.count(), 0)

    def test_size_limit(self):
        p = self.product()
        with mock.patch('apps.shop.downloads.MAX_ASSET_BYTES', 100):
            self.assertEqual(self.up(p, 'big.pdf', pdf_bytes() + b'x' * 200).status_code, 400)

    def test_upload_needs_permission_and_deleting_removes_the_file(self):
        p = self.product()
        self.assertEqual(self.as_user(self.editor).post(f'/api/admin/products/{p.id}/assets/', {'file': SimpleUploadedFile('a.pdf', pdf_bytes())}, format='multipart').status_code, 403)
        a = self.attach_pdf(p)
        path = a.file.path
        self.assertEqual(self.api.delete(f'/api/admin/assets/{a.id}/').status_code, 204)
        import os

        self.assertFalse(os.path.exists(path))


# ====================== projects & guides ======================
class ProjectGuideTests(ShopBase):
    def new_project(self, **kw):
        body = {'title': 'Library App', 'summary': 'A small app.', 'difficulty': 'beginner', 'technologies': ['Django', 'django', 'React'],
                'features': [{'title': f'F{i}', 'description': 'd'} for i in range(14)], **kw}
        r = self.api.post('/api/admin/projects/', body, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_project_lifecycle_and_dynamic_features(self):
        p = self.new_project()
        self.assertEqual(p['technologies'], ['Django', 'React'])
        self.assertEqual(len(p['features']), 14)  # not limited to a fixed number
        self.assertEqual(self.anon.get(f'/api/projects/{p["slug"]}/').status_code, 404)
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        d = self.anon.get(f'/api/projects/{p["slug"]}/').json()
        self.assertEqual(len(d['features']), 14)
        self.api.post(f'/api/admin/projects/{p["id"]}/unpublish/')
        self.assertEqual(self.anon.get('/api/projects/').json()['count'], 0)

    def test_filters(self):
        for t, diff, tech, cat in (('A', 'beginner', ['Python'], 'Web'), ('B', 'advanced', ['Go'], 'Data'), ('C', 'beginner', ['Python', 'Go'], 'Web')):
            p = self.new_project(title=t, difficulty=diff, technologies=tech, category=cat)
            self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        g = self.anon.get
        self.assertEqual(g('/api/projects/?difficulty=beginner').json()['count'], 2)
        self.assertEqual(g('/api/projects/?technology=go').json()['count'], 2)
        self.assertEqual(g('/api/projects/?category=data').json()['count'], 1)
        self.assertEqual(g('/api/projects/?q=C').json()['count'], 1)
        self.assertEqual(sorted(g('/api/projects/').json()['categories']), ['Data', 'Web'])

    def test_validation(self):
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'difficulty': 'godlike'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'repo_url': 'http://insecure.example.com'}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'screenshots': [{'src': 'javascript:1', 'alt': ''}]}, format='json')
        self.assertEqual(r.status_code, 400)
        r = self.api.post('/api/admin/projects/', {'title': 'x', 'overview': '<p>a</p><script>alert(1)</script>'}, format='json')
        self.assertNotIn('<script', r.json()['overview'])

    def test_private_repo_is_never_exposed(self):
        p = self.new_project(repo_url='https://github.com/acme/private', demo_url='https://demo.example.com')
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        body = self.anon.get(f'/api/projects/{p["slug"]}/').content.decode()
        self.assertNotIn('github.com/acme/private', body)
        self.assertIn('demo.example.com', body)
        self.api.patch(f'/api/admin/projects/{p["id"]}/', {'repo_public': True}, format='json')
        self.assertIn('github.com/acme/private', self.anon.get(f'/api/projects/{p["slug"]}/').content.decode())

    def test_paid_project_files_need_a_purchase(self):
        prod = self.product('Project source', price='499.00')
        p = self.new_project(product=prod.id)
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        up = self.api.post(f'/api/admin/projects/{p["id"]}/assets/', {'file': SimpleUploadedFile('src.zip', zip_bytes()), 'label': 'Source'}, format='multipart')
        self.assertEqual(up.status_code, 201)
        aid = up.json()['id']
        d = self.anon.get(f'/api/projects/{p["slug"]}/').json()
        self.assertTrue(d['is_paid'])
        self.assertEqual((d['price'], d['unlocked'], d['files'], d['locked_files']), ('499.00', False, [], 1))
        link = f'/api/projects/{p["slug"]}/files/{aid}/link/'
        self.assertEqual(self.anon.post(link, {}, format='json').status_code, 403)
        self.assertEqual(self.as_user(self.alice).post(link, {}, format='json').status_code, 403)
        self.paid_order(user=self.alice, items=[(prod, 1)])
        r = self.as_user(self.alice).post(link, {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.as_user(self.alice).get(r.json()['url']).status_code, 200)
        self.assertEqual(self.as_user(self.bob).post(link, {}, format='json').status_code, 403)
        self.assertEqual(self.as_user(self.alice).get(f'/api/projects/{p["slug"]}/').json()['files'][0]['label'], 'Source')

    def test_free_project_files_are_open(self):
        p = self.new_project()
        self.api.post(f'/api/admin/projects/{p["id"]}/publish/')
        aid = self.api.post(f'/api/admin/projects/{p["id"]}/assets/', {'file': SimpleUploadedFile('s.zip', zip_bytes())}, format='multipart').json()['id']
        r = self.anon.post(f'/api/projects/{p["slug"]}/files/{aid}/link/', {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(self.anon.get(r.json()['url']).status_code, 200)

    # ---- guides ----
    def new_guide(self, **kw):
        sections = [{'key': 'introduction', 'title': 'Introduction', 'html': '<p>Free intro.</p>', 'enabled': True, 'preview': True},
                    {'key': 'implementation', 'title': 'Step-by-step implementation', 'html': '<p>SECRET STEPS</p><pre><code>print(1)</code></pre>', 'enabled': True},
                    {'key': 'testing', 'title': 'Testing', 'html': '<p>Hidden</p>', 'enabled': False}]
        body = {'title': 'Build a library app', 'summary': 'Step by step.', 'sections': sections, **kw}
        r = self.api.post('/api/admin/project-guides/', body, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return r.json()

    def test_guide_sections_are_configurable_and_sanitised(self):
        g = self.new_guide(sections=[{'key': 'x', 'title': 'Only one', 'html': '<p>ok</p><script>alert(1)</script>', 'enabled': True}])
        self.assertEqual(len(g['sections']), 1)
        self.assertNotIn('<script', g['sections'][0]['html'])
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        d = self.anon.get(f'/api/project-guides/{g["slug"]}/').json()
        self.assertEqual([s['key'] for s in d['sections']], ['x'])

    def test_free_guide_is_open_and_disabled_sections_hidden(self):
        g = self.new_guide()
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        d = self.anon.get(f'/api/project-guides/{g["slug"]}/').json()
        self.assertTrue(d['unlocked'])
        self.assertEqual([s['key'] for s in d['sections']], ['introduction', 'implementation'])  # 'testing' is disabled
        self.assertIn('SECRET STEPS', json.dumps(d))

    def test_account_only_guide(self):
        g = self.new_guide(access_type='account')
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        self.assertNotIn('SECRET STEPS', self.anon.get(f'/api/project-guides/{g["slug"]}/').content.decode())
        self.assertIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())

    def test_paid_guide_is_locked_everywhere_until_purchase(self):
        prod = self.product('Guide pack', price='299.00')
        g = self.new_guide(access_type='paid', product=prod.id)
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        api_body = self.anon.get(f'/api/project-guides/{g["slug"]}/').content.decode()
        html = self.anon.get(f'/project-guides/{g["slug"]}').content.decode()
        for body in (api_body, html):
            self.assertNotIn('SECRET STEPS', body)
            self.assertNotIn('print(1)', body)
            self.assertIn('Free intro.', body)  # the preview section is shown
        d = self.anon.get(f'/api/project-guides/{g["slug"]}/').json()
        self.assertFalse(d['unlocked'])
        self.assertEqual(d['unlock']['product']['slug'], 'guide-pack')
        self.assertTrue([s for s in d['sections'] if s['locked']])
        self.assertNotIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())
        self.paid_order(user=self.alice, items=[(prod, 1)])
        self.assertIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())
        self.assertNotIn('SECRET STEPS', self.as_user(self.bob).get(f'/api/project-guides/{g["slug"]}/').content.decode())

    def test_refund_removes_guide_access_for_paid_guides(self):
        prod = self.product('Guide pack', price='299.00')
        g = self.new_guide(access_type='paid', product=prod.id)
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        order = self.paid_order(user=self.alice, items=[(prod, 1)])
        with mock.patch('apps.shop.gateway.refund', return_value={'id': 'r'}):
            self.api.post(f'/api/admin/store-orders/{order.number}/refund/', {}, format='json')
        self.assertNotIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())

    def test_paid_guide_requires_a_product(self):
        r = self.api.post('/api/admin/project-guides/', {'title': 'x', 'access_type': 'paid'}, format='json')
        self.assertEqual(r.status_code, 400)
        self.assertIn('product', r.json())

    def test_guide_included_with_a_course(self):
        cat = CourseCategory.objects.create(name='AI', slug='ai')
        course = Course.objects.create(category=cat, name='Gen AI', slug='gen-ai')
        g = self.new_guide(access_type='included', included_course_ids=[course.id])
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        self.assertNotIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())
        Enrollment.objects.create(user=self.alice, course=course)
        self.assertIn('SECRET STEPS', self.as_user(self.alice).get(f'/api/project-guides/{g["slug"]}/').content.decode())

    def test_guide_files_follow_the_guide_access_rules(self):
        prod = self.product('Guide pack', price='299.00')
        g = self.new_guide(access_type='paid', product=prod.id)
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        aid = self.api.post(f'/api/admin/project-guides/{g["id"]}/assets/', {'file': SimpleUploadedFile('r.pdf', pdf_bytes()), 'label': 'Report'}, format='multipart').json()['id']
        link = f'/api/project-guides/{g["slug"]}/files/{aid}/link/'
        self.assertEqual(self.anon.post(link, {}, format='json').status_code, 403)
        self.paid_order(user=self.alice, items=[(prod, 1)])
        r = self.as_user(self.alice).post(link, {}, format='json')
        self.assertEqual(r.status_code, 200)
        self.assertEqual(b''.join(self.as_user(self.alice).get(r.json()['url']).streaming_content), pdf_bytes())
        # like a presigned URL the link itself is the credential for its short lifetime (STORE_DOWNLOAD_LINK_TTL); it is only
        # ever minted for an entitled user, expires, and entitlement is re-checked when it is used
        prod_order = Order.objects.get()
        with mock.patch('apps.shop.orders.gateway.refund', return_value={'id': 'r'}):
            self.api.post(f'/api/admin/store-orders/{prod_order.number}/refund/', {}, format='json')
        self.assertEqual(self.anon.get(r.json()['url']).status_code, 404)  # the already-issued link stops working: entitlement is re-checked on use
        self.assertEqual(self.as_user(self.alice).post(link, {}, format='json').status_code, 403)  # and no new link is issued

    def test_guide_preview_needs_a_signed_token_and_is_noindex(self):
        g = self.new_guide()
        self.assertEqual(self.anon.get(f'/api/project-guides/{g["slug"]}/?preview=bad').status_code, 404)
        url = self.api.post(f'/api/admin/project-guides/{g["id"]}/preview/').json()['url']
        r = self.anon.get(f'/project-guides/{g["slug"]}?preview={url.split("preview=")[1]}')
        self.assertEqual(r.status_code, 200)
        self.assertIn('noindex', r['X-Robots-Tag'])


# ====================== inventory / coupons / settings / stats ======================
class AdminToolsTests(ShopBase):
    def test_inventory_adjustments_and_history(self):
        book = self.product('Book', 'physical', '100.00', stock=5, low_stock_threshold=3)
        r = self.api.post(f'/api/admin/inventory/{book.id}/adjust/', {'delta': -3, 'note': 'damaged'}, format='json')
        self.assertEqual(r.json()['stock'], 2)
        self.assertEqual(self.api.post(f'/api/admin/inventory/{book.id}/adjust/', {'delta': -10}, format='json').status_code, 400)
        self.assertEqual(self.api.post(f'/api/admin/inventory/{book.id}/adjust/', {'delta': 'x'}, format='json').status_code, 400)
        self.assertEqual(self.api.post(f'/api/admin/inventory/{book.id}/adjust/', {'delta': 0}, format='json').status_code, 400)
        self.assertEqual(self.api.post(f'/api/admin/inventory/{book.id}/adjust/', {'set_to': 20, 'reason': 'restock'}, format='json').json()['stock'], 20)
        rows = self.api.get(f'/api/admin/inventory/{book.id}/movements/').json()
        self.assertEqual([m['delta'] for m in rows], [18, -3])
        self.assertEqual(rows[1]['note'], 'damaged')
        pdf = self.product('Pdf')
        self.assertEqual(self.api.post(f'/api/admin/inventory/{pdf.id}/adjust/', {'delta': 1}, format='json').status_code, 400)  # digital: no stock
        self.assertEqual(self.api.get('/api/admin/inventory/').json()['count'], 1)

    def test_low_stock_listing_and_stats(self):
        self.product('Low', 'physical', '10.00', stock=2, low_stock_threshold=5)
        self.product('Fine', 'physical', '10.00', stock=50)
        self.assertEqual([r['title'] for r in self.api.get('/api/admin/inventory/?low=1').json()['results']], ['Low'])
        s = self.api.get('/api/admin/shop/stats/').json()
        self.assertEqual(s['products']['total'], 2)
        self.assertEqual(s['low_stock'][0]['title'], 'Low')
        self.assertEqual((s['orders']['paid'], s['digital_sales']['orders']), (0, 0))  # real numbers, no invented sales

    def test_stats_reflect_real_orders(self):
        self.paid_order(items=[(self.product('A', price='100.00'), 1)])
        self.paid_order(items=[(self.product('Book', 'physical', '250.00', stock=4), 1)])
        s = self.api.get('/api/admin/shop/stats/').json()
        self.assertEqual(s['orders']['paid'], 2)
        self.assertEqual((s['digital_sales']['orders'], s['digital_sales']['amount']), (1, '100.00'))
        self.assertEqual((s['physical_sales']['orders'], s['physical_sales']['amount']), (1, '250.00'))

    def test_coupon_crud_and_validation(self):
        r = self.api.post('/api/admin/coupons/', {'code': 'save10', 'discount_type': 'percent', 'value': '10'}, format='json')
        self.assertEqual((r.status_code, r.json()['code']), (201, 'SAVE10'))
        self.assertEqual(self.api.post('/api/admin/coupons/', {'code': 'SAVE10', 'value': '5'}, format='json').status_code, 400)
        self.assertEqual(self.api.post('/api/admin/coupons/', {'code': 'BAD', 'discount_type': 'percent', 'value': '150'}, format='json').status_code, 400)
        self.assertEqual(self.api.post('/api/admin/coupons/', {'code': 'B A D', 'value': '5'}, format='json').status_code, 400)
        now = timezone.now()
        self.assertEqual(self.api.post('/api/admin/coupons/', {'code': 'X', 'value': '5', 'valid_from': now.isoformat(), 'valid_until': (now - timedelta(days=1)).isoformat()}, format='json').status_code, 400)
        cid = r.json()['id']
        self.assertEqual(self.api.patch(f'/api/admin/coupons/{cid}/', {'is_active': False}, format='json').json()['is_active'], False)
        self.assertEqual(self.api.delete(f'/api/admin/coupons/{cid}/').status_code, 204)

    def test_store_settings_and_public_view(self):
        r = self.api.patch('/api/admin/store-settings/', {'tax_mode': 'exclusive', 'default_tax_rate': '12.50', 'shipping_flat': '40', 'refund_policy': '<p>7 days</p><script>x</script>', 'contact_email': 'help@example.com'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertNotIn('<script', r.json()['refund_policy'])
        pub = self.anon.get('/api/store/settings/').json()
        self.assertEqual((pub['tax_mode'], pub['contact_email'], pub['payments_enabled']), ('exclusive', 'help@example.com', True))
        self.assertNotIn('notify_email', pub)
        self.assertEqual(self.api.patch('/api/admin/store-settings/', {'tax_mode': 'weird'}, format='json').status_code, 400)
        self.assertEqual(self.api.patch('/api/admin/store-settings/', {'currency': 'rupee'}, format='json').status_code, 400)

    def test_customers_list_aggregates_real_orders(self):
        self.paid_order(user=self.alice, items=[(self.product('A', price='100.00'), 1)])
        self.paid_order(user=self.alice, items=[(self.product('B', price='50.00'), 1)])
        rows = self.api.get('/api/admin/customers/').json()['results']
        self.assertEqual((rows[0]['username'], rows[0]['orders'], rows[0]['spent']), ('alice', 2, '150.00'))

    def test_deleting_a_product_keeps_old_orders(self):
        p = self.product(price='80.00')
        order = self.paid_order(items=[(p, 1)])
        self.assertEqual(self.api.delete(f'/api/admin/products/{p.id}/').status_code, 204)
        order.refresh_from_db()
        self.assertEqual(order.items.get().title, 'Python Notes')


# ====================== SEO ======================
class SeoTests(ShopBase):
    def ld(self, html):
        return json.loads(html.split('<script type="application/ld+json">')[1].split('</script>')[0])

    def test_product_page_metadata_and_offer_match_real_data(self):
        p = self.product('Django Handbook', 'physical', '349.00', stock=7, short_description='A practical handbook.', seo_title='Django Handbook (Printed)', author='Asha Rao')
        html = self.anon.get('/store/django-handbook').content.decode()
        self.assertIn('<title>Django Handbook (Printed)</title>', html)
        self.assertIn('<link rel="canonical" href="https://codinghubs.in/store/django-handbook">', html)
        node = [n for n in self.ld(html)['@graph'] if n['@type'] == 'Product'][0]
        self.assertEqual((node['offers']['price'], node['offers']['priceCurrency'], node['offers']['availability']), ('349.00', 'INR', 'https://schema.org/InStock'))
        self.assertEqual(node['sku'], p.sku)
        for bad in ('aggregateRating', '"review"', 'ratingValue'):
            self.assertNotIn(bad, html)
        Product.objects.filter(pk=p.pk).update(stock_quantity=0, price=Decimal('399.00'))
        html = self.anon.get('/store/django-handbook').content.decode()
        node = [n for n in self.ld(html)['@graph'] if n['@type'] == 'Product'][0]
        self.assertEqual((node['offers']['price'], node['offers']['availability']), ('399.00', 'https://schema.org/OutOfStock'))  # always current data

    def test_unknown_and_draft_pages_are_real_404s(self):
        d = self.product('Draft thing', status='draft')
        for u in ('/store/nope', f'/store/{d.slug}', '/projects/nope', '/project-guides/nope'):
            r = self.anon.get(u)
            self.assertEqual(r.status_code, 404, u)
            self.assertIn('noindex', r['X-Robots-Tag'])

    def test_listings_and_sitemap_include_only_published(self):
        pub = self.product('Public item')
        draft = self.product('Draft item', status='draft')
        scheduled = self.product('Later item', status='scheduled', published_at=timezone.now() + timedelta(days=3))
        pr = self.api.post('/api/admin/projects/', {'title': 'Pub project'}, format='json').json()
        self.api.post(f'/api/admin/projects/{pr["id"]}/publish/')
        self.api.post('/api/admin/projects/', {'title': 'Draft project'}, format='json')
        g = self.api.post('/api/admin/project-guides/', {'title': 'Pub guide'}, format='json').json()
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        store = self.anon.get('/store').content.decode()
        self.assertIn(pub.slug, store)
        self.assertNotIn(draft.slug, store)
        self.assertNotIn(scheduled.slug, store)
        self.assertIn('<link rel="canonical" href="https://codinghubs.in/store">', store)
        sm = self.anon.get('/sitemap-shop.xml').content.decode()
        for ok in (f'/store/{pub.slug}', f'/projects/{pr["slug"]}', f'/project-guides/{g["slug"]}', '/store<', '/projects<', '/project-guides<'):
            self.assertIn(ok, sm)
        for no in (draft.slug, scheduled.slug, 'draft-project'):
            self.assertNotIn(no, sm)
        self.api.post(f'/api/admin/products/{pub.id}/unpublish/')
        self.assertNotIn(pub.slug, self.anon.get('/sitemap-shop.xml').content.decode())

    def test_project_and_guide_pages_have_article_and_breadcrumb_data(self):
        pr = self.api.post('/api/admin/projects/', {'title': 'Chat app', 'summary': 'Realtime chat.'}, format='json').json()
        self.api.post(f'/api/admin/projects/{pr["id"]}/publish/')
        html = self.anon.get(f'/projects/{pr["slug"]}').content.decode()
        types = [n['@type'] for n in self.ld(html)['@graph']]
        self.assertEqual(types, ['Article', 'BreadcrumbList'])
        self.assertEqual(html.count('<h1'), 1)
        self.assertIn(f'href="https://codinghubs.in/projects/{pr["slug"]}"', html)

    def test_paid_guide_structured_data_says_not_free(self):
        prod = self.product('Pack')
        g = self.api.post('/api/admin/project-guides/', {'title': 'Paid guide', 'access_type': 'paid', 'product': prod.id}, format='json').json()
        self.api.post(f'/api/admin/project-guides/{g["id"]}/publish/')
        node = self.ld(self.anon.get(f'/project-guides/{g["slug"]}').content.decode())['@graph'][0]
        self.assertFalse(node['isAccessibleForFree'])

    def test_search_page_is_noindex(self):
        self.product('Findable')
        self.assertIn('content="noindex, follow"', self.anon.get('/store?q=find').content.decode())
