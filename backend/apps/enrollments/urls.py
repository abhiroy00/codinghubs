from django.urls import path

from .views import MyEnrollmentsView

urlpatterns = [
    path('me/', MyEnrollmentsView.as_view(), name='enrollments-me'),
]
