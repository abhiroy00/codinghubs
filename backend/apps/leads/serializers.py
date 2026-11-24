from rest_framework import serializers

from .models import Campaign, Lead


class LeadSerializer(serializers.ModelSerializer):
    class Meta:
        model = Lead
        fields = (
            'id', 'name', 'phone', 'email', 'education', 'whatsapp_consent', 'course', 'mode', 'source_page',
            'utm_source', 'utm_medium', 'utm_campaign', 'campaign', 'created_at',
        )
        read_only_fields = ('id', 'created_at')

    campaign = serializers.PrimaryKeyRelatedField(queryset=Campaign.objects.all(), required=False, allow_null=True)

    def validate_campaign(self, campaign):
        """Only an offer that is live right now can be attached to a new enquiry."""
        if campaign is not None and not Campaign.objects.live().filter(pk=campaign.pk).exists():
            raise serializers.ValidationError('This offer is no longer available.')
        return campaign


class PublicCampaignSerializer(serializers.ModelSerializer):
    """Only what a visitor needs to see; internal targeting fields are not exposed."""

    class Meta:
        model = Campaign
        fields = ('id', 'title', 'offer_text', 'offer_label', 'coupon_code', 'terms', 'cta_label', 'cta_url',
                  'presentation', 'frequency', 'ends_at', 'show_countdown', 'updated_at')
