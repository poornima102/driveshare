from django.db import models
from django.conf import settings
import uuid


class Payment(models.Model):

    STATUS_CHOICES = [
        ('pending',   'Pending'),
        ('succeeded', 'Succeeded'),
        ('failed',    'Failed'),
        ('refunded',  'Refunded'),
        ('partial_refund', 'Partial Refund'),
    ]

    id                  = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    booking             = models.OneToOneField(
                              'bookings.Booking',
                              on_delete=models.CASCADE,
                              related_name='payment'
                          )
    user                = models.ForeignKey(
                              settings.AUTH_USER_MODEL,
                              on_delete=models.CASCADE,
                              related_name='payments'
                          )
    amount              = models.DecimalField(max_digits=10, decimal_places=2)
    currency            = models.CharField(max_length=10, default='INR')

    # Razorpay IDs
    razorpay_order_id   = models.CharField(max_length=255, unique=True)
    razorpay_payment_id = models.CharField(max_length=255, blank=True)
    razorpay_signature  = models.CharField(max_length=500, blank=True)

    # Refund fields
    razorpay_refund_id  = models.CharField(max_length=255, blank=True)
    refund_amount       = models.DecimalField(
                              max_digits=10, decimal_places=2,
                              null=True, blank=True
                          )
    refund_reason       = models.TextField(blank=True)
    refunded_at         = models.DateTimeField(null=True, blank=True)

    status              = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    created_at          = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Payment {self.razorpay_order_id} — {self.status}"

    class Meta:
        db_table = 'payments'
        ordering = ['-created_at']