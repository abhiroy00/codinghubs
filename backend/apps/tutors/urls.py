from django.urls import path

from .views import TutorBookingCreateView, TutorListView

urlpatterns = [
    path('', TutorListView.as_view(), name='tutor-list'),
    path('bookings/', TutorBookingCreateView.as_view(), name='tutor-booking-create'),
]
