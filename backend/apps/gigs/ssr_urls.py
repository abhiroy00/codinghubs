from django.urls import path
from .ssr import public_page

urlpatterns = [path('gigs', public_page), path('gigs/<slug:slug>', public_page)]
