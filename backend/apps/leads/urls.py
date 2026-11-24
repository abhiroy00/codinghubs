from django.urls import path

from .views import ActiveCampaignView, LeadCreateView

urlpatterns = [
    path('', LeadCreateView.as_view(), name='lead-create'),
    path('campaigns/active/', ActiveCampaignView.as_view(), name='campaign-active'),
]
