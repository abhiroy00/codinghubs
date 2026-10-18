from rest_framework import serializers

from .models import Order


class CreateOrderSerializer(serializers.Serializer):
    course_id = serializers.IntegerField()


class VerifyPaymentSerializer(serializers.Serializer):
    razorpay_order_id = serializers.CharField()
    razorpay_payment_id = serializers.CharField()
    razorpay_signature = serializers.CharField()


class OrderSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)

    class Meta:
        model = Order
        fields = (
            'id', 'course', 'course_name', 'razorpay_order_id', 'razorpay_payment_id',
            'amount', 'status', 'created_at',
        )
        read_only_fields = fields
