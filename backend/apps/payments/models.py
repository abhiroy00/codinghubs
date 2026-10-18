from django.conf import settings
from django.db import models


class Order(models.Model):
    STATUS_CREATED = 'created'
    STATUS_PAID = 'paid'
    STATUS_FAILED = 'failed'
    STATUS_CHOICES = (
        (STATUS_CREATED, 'Created'),
        (STATUS_PAID, 'Paid'),
        (STATUS_FAILED, 'Failed'),
    )

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name='orders')
    course = models.ForeignKey('courses.Course', on_delete=models.CASCADE, related_name='orders')
    razorpay_order_id = models.CharField(max_length=64, unique=True)
    razorpay_payment_id = models.CharField(max_length=64, blank=True)
    amount = models.PositiveIntegerField(help_text='Amount in paise')
    status = models.CharField(max_length=10, choices=STATUS_CHOICES, default=STATUS_CREATED)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self):
        return f'{self.razorpay_order_id} ({self.status})'
