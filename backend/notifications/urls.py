from django.urls import path
from . import views

urlpatterns = [
    path('',                   views.NotificationListView.as_view(), name='notifications'),
    path('mark-all-read/',     views.MarkAllReadView.as_view(),      name='mark-all-read'),
    path('<str:pk>/read/',     views.MarkReadView.as_view(),         name='mark-read'),
]