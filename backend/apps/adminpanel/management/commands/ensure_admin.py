import os

from django.contrib.auth import get_user_model
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = (
        'Create or update the admin-panel superuser from ADMIN_EMAIL / ADMIN_PASSWORD '
        '(environment variables or --email/--password). Does nothing when they are not set, '
        'so it is safe to run on every deploy.'
    )

    def add_arguments(self, parser):
        parser.add_argument('--email')
        parser.add_argument('--password')

    def handle(self, *args, **options):
        email = (options['email'] or os.environ.get('ADMIN_EMAIL', '')).strip().lower()
        password = options['password'] or os.environ.get('ADMIN_PASSWORD', '')
        if not email or not password:
            self.stdout.write('ADMIN_EMAIL / ADMIN_PASSWORD not set; skipping admin user.')
            return

        User = get_user_model()
        user = User.objects.filter(email__iexact=email).first() or User.objects.filter(username=email).first()
        created = user is None
        if created:
            user = User(username=email, email=email)
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f'Admin user {"created" if created else "updated"}: {email}'))
