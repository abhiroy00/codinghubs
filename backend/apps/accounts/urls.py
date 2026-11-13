from django.urls import path
from rest_framework_simplejwt.views import TokenRefreshView

from .views import (
    AccountDeleteView,
    AccountExportView,
    GoogleLoginView,
    LogoutView,
    LoginView,
    SessionView,
    MeView,
    PasswordResetConfirmView,
    PasswordResetRequestView,
    RegisterView,
)

urlpatterns = [
    path('register/', RegisterView.as_view(), name='auth-register'),
    path('login/', LoginView.as_view(), name='auth-login'),
    path('google/', GoogleLoginView.as_view(), name='auth-google'),
    path('session/', SessionView.as_view(), name='auth-session'),
    path('refresh/', TokenRefreshView.as_view(), name='auth-refresh'),
    path('logout/', LogoutView.as_view(), name='auth-logout'),
    path('password-reset/', PasswordResetRequestView.as_view(), name='auth-password-reset'),
    path('password-reset/confirm/', PasswordResetConfirmView.as_view(), name='auth-password-reset-confirm'),
    path('me/', MeView.as_view(), name='auth-me'),
    path('me/export/', AccountExportView.as_view(), name='auth-me-export'),
    path('me/delete/', AccountDeleteView.as_view(), name='auth-me-delete'),
]
