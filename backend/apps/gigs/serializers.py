from rest_framework import serializers

from .models import Gig, Proposal


class BriefInput(serializers.Serializer):
    title = serializers.CharField(min_length=10, max_length=120)
    scope = serializers.CharField(min_length=80, max_length=5000)
    deliverable = serializers.CharField(min_length=20, max_length=1200)
    skills = serializers.ListField(child=serializers.CharField(min_length=2, max_length=40), min_length=1, max_length=8)

    def validate_skills(self, values):
        return list(dict.fromkeys(values))


class PublicBrief(serializers.ModelSerializer):
    class Meta:
        model = Gig
        fields = ['slug', 'title', 'scope', 'deliverable', 'skills', 'created_at', 'updated_at']


class OwnedBrief(PublicBrief):
    class Meta(PublicBrief.Meta):
        fields = PublicBrief.Meta.fields + ['status']


class ProposalInput(serializers.Serializer):
    pitch = serializers.CharField(min_length=40, max_length=3000)


class PrivateProposal(serializers.ModelSerializer):
    gig_slug = serializers.CharField(source='gig.slug', read_only=True)
    gig_title = serializers.CharField(source='gig.title', read_only=True)

    class Meta:
        model = Proposal
        # No applicant account details are exposed, even to listing owners during the pilot.
        fields = ['id', 'gig_slug', 'gig_title', 'pitch', 'created_at']


class ReportInput(serializers.Serializer):
    reason = serializers.CharField(min_length=20, max_length=1500)
