from rest_framework import serializers

from .models import Enrollment


class EnrollmentSerializer(serializers.ModelSerializer):
    course_name = serializers.CharField(source='course.name', read_only=True)
    course_slug = serializers.CharField(source='course.slug', read_only=True)
    amount_paid = serializers.SerializerMethodField()
    payment_status = serializers.SerializerMethodField()

    class Meta:
        model = Enrollment
        fields = (
            'id', 'course', 'course_name', 'course_slug', 'amount_paid',
            'payment_status', 'enrolled_at',
        )
        read_only_fields = fields

    def get_amount_paid(self, obj):
        return obj.order.amount if obj.order else None

    def get_payment_status(self, obj):
        return obj.order.status if obj.order else 'paid'
