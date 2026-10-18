from rest_framework import permissions
from rest_framework.generics import ListAPIView

from .models import Enrollment
from .serializers import EnrollmentSerializer


class MyEnrollmentsView(ListAPIView):
    serializer_class = EnrollmentSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        return Enrollment.objects.filter(user=self.request.user).select_related('course', 'order')
