from rest_framework import serializers

from .models import Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = (
            'id', 'name', 'phone', 'course', 'mode', 'source_page',
            'utm_source', 'utm_medium', 'utm_campaign', 'created_at',
        )
        read_only_fields = ('id', 'created_at')
