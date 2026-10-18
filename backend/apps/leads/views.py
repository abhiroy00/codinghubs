from rest_framework import permissions
from rest_framework.generics import CreateAPIView
from rest_framework.throttling import AnonRateThrottle

from .serializers import LeadSerializer


class LeadThrottle(AnonRateThrottle):
    rate = '10/min'


class LeadCreateView(CreateAPIView):
    serializer_class = LeadSerializer
    permission_classes = [permissions.AllowAny]
    throttle_classes = [LeadThrottle]
