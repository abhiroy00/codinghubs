import re

from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from rest_framework import serializers

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'first_name', 'last_name', 'date_joined', 'avatar_url')
        read_only_fields = fields


PHONE_RE = re.compile(r'^\+?[0-9][0-9 ()-]{6,18}$')


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Fields a signed-in learner may edit on their own profile. Email, username and avatar stay read-only."""

    first_name = serializers.CharField(max_length=150, required=False, allow_blank=True, trim_whitespace=True)
    last_name = serializers.CharField(max_length=150, required=False, allow_blank=True, trim_whitespace=True)
    phone = serializers.CharField(max_length=20, required=False, allow_blank=True, trim_whitespace=True)

    class Meta:
        model = User
        fields = ('first_name', 'last_name', 'phone')

    def validate_phone(self, value):
        if value and not PHONE_RE.match(value):
            raise serializers.ValidationError('Enter a valid phone number, e.g. +91 98765 43210.')
        return value


class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'phone', 'first_name', 'last_name', 'password')

    def validate_email(self, value):
        if value and User.objects.filter(email__iexact=value).exists():
            raise serializers.ValidationError('An account with this email already exists.')
        return value

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)
