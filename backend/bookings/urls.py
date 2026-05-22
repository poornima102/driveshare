from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'', views.BookingViewSet, basename='booking')

urlpatterns = [
    path('dashboard/',        views.DashboardView.as_view(),               name='dashboard'),
    path('complete-expired/', views.CompleteExpiredBookingsView.as_view(),  name='complete-expired'),
    path('',                  include(router.urls)),
]