from rest_framework import generics, permissions
from rest_framework.throttling import AnonRateThrottle

from .models import Tutor
from .serializers import TutorBookingCreateSerializer, TutorSerializer


class TutorListView(generics.ListAPIView):
    permission_classes = [permissions.AllowAny]
    serializer_class = TutorSerializer
    queryset = Tutor.objects.filter(is_active=True)


class BookingThrottle(AnonRateThrottle):
    rate = '5/min'


class TutorBookingCreateView(generics.CreateAPIView):
    permission_classes = [permissions.AllowAny]
    throttle_classes = [BookingThrottle]
    serializer_class = TutorBookingCreateSerializer
