from datetime import timedelta

from django.utils import timezone
from rest_framework import serializers

from .models import Certificate, CertificateApplication, CertificateEvent


class ApplicationSerializer(serializers.ModelSerializer):
    """What a learner submits and later sees about their own application."""

    class Meta:
        model = CertificateApplication
        fields = ('id', 'full_name', 'course_name', 'batch', 'completed_on', 'phone', 'note', 'status', 'staff_note', 'created_at', 'reviewed_at')
        read_only_fields = ('status', 'staff_note', 'created_at', 'reviewed_at')

    def validate_full_name(self, value):
        value = ' '.join(value.split())
        if len(value) < 3:
            raise serializers.ValidationError('Enter your full name as it should appear on the certificate.')
        return value

    def validate_completed_on(self, value):
        today = timezone.localdate()
        if value > today:
            raise serializers.ValidationError('The completion date cannot be in the future.')
        if value < today - timedelta(days=365 * 15):
            raise serializers.ValidationError('Please check the completion date.')
        return value

    def validate_phone(self, value):
        digits = ''.join(ch for ch in value if ch.isdigit())
        if value and not 10 <= len(digits) <= 13:
            raise serializers.ValidationError('Enter a valid phone number.')
        return value

    def validate(self, attrs):
        user = self.context['request'].user
        course = attrs.get('course_name', '').strip()
        if CertificateApplication.objects.filter(user=user, course_name__iexact=course, status=CertificateApplication.PENDING).exists():
            raise serializers.ValidationError({'course_name': 'You already have an application for this course under review.'})
        if Certificate.objects.filter(user=user, course_name__iexact=course, status=Certificate.VALID).exists():
            raise serializers.ValidationError({'course_name': 'A certificate for this course is already in your account.'})
        attrs['course_name'] = course
        return attrs


class OwnCertificateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Certificate
        fields = ('code', 'recipient_name', 'course_name', 'completed_on', 'issued_on', 'status')


class PublicCertificateSerializer(serializers.ModelSerializer):
    """Public verification: initials only, never the full name, phone, email or notes."""

    class Meta:
        model = Certificate
        fields = ('code', 'initials', 'course_name', 'completed_on', 'issued_on')


class EventSerializer(serializers.ModelSerializer):
    actor = serializers.CharField(source='actor.username', default='', read_only=True)

    class Meta:
        model = CertificateEvent
        fields = ('id', 'action', 'actor', 'note', 'at')
