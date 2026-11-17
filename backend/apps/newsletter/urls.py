from django.urls import path
from . import views

urlpatterns = [
    path('subscribe/', views.Subscribe.as_view()),
    path('confirm/', views.TokenAction.as_view()),
    path('unsubscribe/', views.Unsubscribe.as_view()),
    path('issues/', views.IssueList.as_view()),
    path('issues/<slug:slug>/', views.IssueDetail.as_view()),
]
admin_urlpatterns = [
    path('newsletter/subscribers/', views.AdminSubscribers.as_view()),
    path('newsletter/subscribers/export/', views.SubscriberExport.as_view()),
    path('newsletter/subscribers/<int:pk>/', views.AdminSubscriber.as_view()),
    path('newsletter/issues/', views.AdminIssues.as_view()),
    path('newsletter/issues/<int:pk>/preview/', views.AdminPreview.as_view()),
    path('newsletter/issues/<int:pk>/', views.AdminIssue.as_view()),
    path('newsletter/campaigns/', views.AdminCampaigns.as_view()),
    path('newsletter/campaigns/<int:pk>/deliveries/', views.CampaignDeliveries.as_view()),
]
