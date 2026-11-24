"""Admin API for course offers (campaigns): list, create, edit, publish, pause, delete and preview stats.

Uses the panel's IsStaff permission with the Campaign model permission, so only authorised staff can manage offers.
"""
from django.db.models import Count
from rest_framework import generics, serializers

from apps.adminpanel.views import IsStaff

from .models import Campaign


class CampaignAdminSerializer(serializers.ModelSerializer):
    lead_count = serializers.IntegerField(read_only=True)
    state = serializers.SerializerMethodField()

    class Meta:
        model = Campaign
        fields = ('id', 'title', 'offer_text', 'offer_label', 'coupon_code', 'terms', 'cta_label', 'cta_url', 'status',
                  'starts_at', 'ends_at', 'presentation', 'target_type', 'target_values', 'priority', 'frequency',
                  'show_countdown', 'created_at', 'updated_at', 'lead_count', 'state')
        read_only_fields = ('id', 'created_at', 'updated_at', 'lead_count', 'state')

    def get_state(self, obj):
        """What a visitor sees right now: live, scheduled, expired, paused or draft."""
        from django.utils import timezone
        now = timezone.now()
        if obj.status != Campaign.STATUS_PUBLISHED:
            return obj.status
        if obj.starts_at > now:
            return 'scheduled'
        if obj.ends_at and obj.ends_at <= now:
            return 'expired'
        return 'live'

    def validate(self, attrs):
        instance = Campaign(**{**({f.name: getattr(self.instance, f.name) for f in Campaign._meta.concrete_fields} if self.instance else {}), **attrs})
        try:
            instance.clean()
        except Exception as error:  # django ValidationError -> DRF error with the same messages
            raise serializers.ValidationError(getattr(error, 'message_dict', {'detail': [str(error)]}))
        return attrs


class CampaignList(generics.ListCreateAPIView):
    permission_classes = [IsStaff]
    permission_model = Campaign
    serializer_class = CampaignAdminSerializer

    def get_queryset(self):
        return Campaign.objects.annotate(lead_count=Count('leads'))


class CampaignDetail(generics.RetrieveUpdateDestroyAPIView):
    permission_classes = [IsStaff]
    permission_model = Campaign
    serializer_class = CampaignAdminSerializer

    def get_queryset(self):
        return Campaign.objects.annotate(lead_count=Count('leads'))
