from django.urls import path
from . import views

urlpatterns = [
    path('create-order/',              views.CreateOrderView.as_view(),    name='create-order'),
    path('verify/',                    views.VerifyPaymentView.as_view(),  name='verify-payment'),
    path('refund/',                    views.RefundView.as_view(),         name='refund'),
    path('refund-policy/<str:booking_id>/', views.RefundPolicyView.as_view(), name='refund-policy'),
    path('history/',                   views.PaymentHistoryView.as_view(), name='payment-history'),
]