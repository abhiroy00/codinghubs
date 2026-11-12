"""Read-only audit for store orders that claim to be paid without a gateway payment.

The old checkout accepted a client-supplied `skip_payment` flag, which marked digital-only
orders paid without Razorpay. Those orders have total > 0 but no Payment row carrying a
provider payment id. Run this after deploying the fix and reconcile every row by hand:
refund/cancel the order or collect the money through a separate channel.
"""
import csv
import sys

from django.core.management.base import BaseCommand
from django.db.models import Count, Q
from django.utils import timezone

from apps.shop.models import Order


class Command(BaseCommand):
    help = 'List paid store orders that have no provider payment (legacy skip-payment orders).'

    def add_arguments(self, parser):
        parser.add_argument('--csv', action='store_true', help='Write CSV to stdout instead of a table.')

    def handle(self, *args, csv_output=False, **options):
        qs = (
            Order.objects.filter(
                total__gt=0,
                payment_status__in=[Order.PAY_PAID, Order.PAY_PART, Order.PAY_REFUNDED],
            )
            .annotate(gateway_payments=Count('payments', filter=~Q(payments__provider_payment_id='')))
            .filter(gateway_payments=0)
            .select_related('user')
            .order_by('created_at')
        )

        rows = [
            {
                'number': order.number,
                'created_at': timezone.localtime(order.created_at).isoformat(timespec='seconds'),
                'status': order.status,
                'payment_status': order.payment_status,
                'total': str(order.total),
                'email': order.email,
                'user': order.user.get_username() if order.user_id else '',
                'items': '; '.join(f'{i.quantity} x {i.title}' for i in order.items.all()),
            }
            for order in qs
        ]

        if csv_output:
            writer = csv.DictWriter(sys.stdout, fieldnames=list(rows[0].keys()) if rows else [
                'number', 'created_at', 'status', 'payment_status', 'total', 'email', 'user', 'items',
            ])
            writer.writeheader()
            writer.writerows(rows)
            if rows:
                raise SystemExit(1)
            return

        if not rows:
            self.stdout.write(self.style.SUCCESS('No paid orders without a provider payment were found.'))
            return

        self.stdout.write(self.style.WARNING(f'{len(rows)} order(s) are marked paid without a gateway payment:'))
        for row in rows:
            self.stdout.write(
                f"  {row['number']}  {row['created_at']}  {row['total']}  {row['email']}  ({row['status']}/{row['payment_status']})"
            )
        self.stdout.write('')
        self.stdout.write('Reconcile each order manually: it was never paid through Razorpay.')
        # Non-zero so a cron job or deploy check can alert on legacy bypassed orders.
        raise SystemExit(1)
