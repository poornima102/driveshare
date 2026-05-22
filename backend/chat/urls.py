from django.urls import path
from . import views

urlpatterns = [
    path('conversations/',         views.ConversationListView.as_view(), name='conversations'),
    path('<str:booking_id>/messages/', views.MessageListView.as_view(),  name='messages'),
]