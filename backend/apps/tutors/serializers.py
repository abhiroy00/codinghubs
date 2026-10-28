from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import serializers

from .models import Tutor, TutorBooking


class TutorSerializer(serializers.ModelSerializer):
    class Meta:
        model = Tutor
        fields = (
            'id', 'full_name', 'profile_image', 'designation', 'bio', 'experience',
            'expertise', 'courses', 'teaching_approach',
        )


class TutorBookingCreateSerializer(serializers.ModelSerializer):
    tutor = serializers.PrimaryKeyRelatedField(queryset=Tutor.objects.filter(is_active=True))
    submission_key = serializers.UUIDField()
    reference = serializers.CharField(read_only=True)

    class Meta:
        model = TutorBooking
        fields = (
            'id', 'reference', 'student_name', 'student_email', 'tutor', 'course',
            'preferred_date', 'preferred_time', 'session_type', 'message', 'submission_key',
        )
        read_only_fields = ('id', 'reference')

    def validate_preferred_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError('The preferred date cannot be in the past.')
        return value

    def create(self, validated_data):
        validated_data.setdefault('message', '')
        key = validated_data['submission_key']
        try:
            with transaction.atomic():
                booking, created = TutorBooking.objects.get_or_create(
                    submission_key=key,
                    defaults=validated_data,
                )
        except IntegrityError:
            booking = TutorBooking.objects.get(submission_key=key)
            created = False

        if not created:
            fields = (
                'student_name', 'student_email', 'tutor_id', 'course', 'preferred_date',
                'preferred_time', 'session_type', 'message',
            )
            expected_values = {**validated_data, 'tutor_id': validated_data['tutor'].pk}
            if any(getattr(booking, field) != expected_values[field] for field in fields):
                raise serializers.ValidationError(
                    {'submission_key': 'This submission key was already used for a different booking.'}
                )
        return booking

    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['tutor'] = instance.tutor_id
        data['reference'] = instance.reference
        return data


class TutorBookingAdminSerializer(serializers.ModelSerializer):
    tutor_name = serializers.CharField(source='tutor.full_name', read_only=True)
    reference = serializers.CharField(read_only=True)

    class Meta:
        model = TutorBooking
        fields = (
            'id', 'reference', 'student_name', 'student_email', 'tutor', 'tutor_name',
            'course', 'preferred_date', 'preferred_time', 'session_type', 'message',
            'status', 'created_at', 'updated_at',
        )
        read_only_fields = (
            'id', 'reference', 'student_name', 'student_email', 'tutor', 'tutor_name',
            'course', 'preferred_date', 'preferred_time', 'session_type', 'message',
            'created_at', 'updated_at',
        )
