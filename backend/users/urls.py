from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from . import views

router = DefaultRouter()
router.register(r'profile', views.UserProfileViewSet, basename='profile')

urlpatterns = [
    path('register/', views.RegisterView.as_view(), name='register'),
    path('login/',    views.LoginView.as_view(),    name='login'),
    path('refresh/',  TokenRefreshView.as_view(),   name='token_refresh'),
    path('me/',       views.MeView.as_view(),        name='me'),
        path('change-password/', views.ChangePasswordView.as_view(), name='change-password'),
    path('send-otp/',    views.SendOTPView.as_view(),    name='send-otp'),
    path('verify-otp/',  views.VerifyOTPView.as_view(),  name='verify-otp'),
    path('',          include(router.urls)),
]