from rest_framework import permissions
from rest_framework.generics import CreateAPIView
from rest_framework.response import Response
from rest_framework.throttling import AnonRateThrottle
from rest_framework.views import APIView

from .models import Campaign
from .serializers import LeadSerializer, PublicCampaignSerializer


class LeadThrottle(AnonRateThrottle):
    rate = '10/min'


class ActiveCampaignView(APIView):
    """GET ?path=&course=&category=: the one live offer for this page, or null. Never cached, so expired offers vanish."""

    permission_classes = [permissions.AllowAny]
    authentication_classes = []

    def get(self, request):
        p = request.query_params
        campaign = Campaign.pick(path=p.get('path', '')[:300], course=p.get('course', '')[:120], category=p.get('category', '')[:120])
        response = Response({'campaign': PublicCampaignSerializer(campaign).data if campaign else None})
        response['Cache-Control'] = 'no-store'
        return response


class LeadCreateView(CreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LeadThrottle]
