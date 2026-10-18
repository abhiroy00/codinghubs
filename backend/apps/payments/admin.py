from django.contrib import admin

from .models import Order


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ('razorpay_order_id', 'user', 'course', 'amount', 'status', 'created_at')
    list_filter = ('status',)
    search_fields = ('razorpay_order_id', 'razorpay_payment_id', 'user__username', 'user__email')
    readonly_fields = ('razorpay_order_id', 'razorpay_payment_id', 'created_at', 'updated_at')
