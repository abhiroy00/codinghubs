from django.urls import path

from . import views

urlpatterns = [
    path('verify/', views.VerifyView.as_view(), name='certificate-verify'),
    path('sample.pdf', views.SamplePdfView.as_view(), name='certificate-sample'),
    path('mine/', views.MineView.as_view(), name='certificate-mine'),
    path('applications/', views.ApplyView.as_view(), name='certificate-apply'),
    path('download/', views.DownloadView.as_view(), name='certificate-download'),
    path('<str:code>/link/', views.LinkView.as_view(), name='certificate-link'),
]
