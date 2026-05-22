from django.db import models
from django.conf import settings
import uuid


class Notification(models.Model):

    TYPE_CHOICES = [
        ('booking_confirmed', 'Booking Confirmed'),
        ('booking_cancelled', 'Booking Cancelled'),
        ('booking_completed', 'Booking Completed'),
        ('payment_success',   'Payment Success'),
        ('new_message',       'New Message'),
        ('new_vehicle',       'New Vehicle Added'),
    ]

    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user       = models.ForeignKey(
                     settings.AUTH_USER_MODEL,
                     on_delete=models.CASCADE,
                     related_name='notifications'
                 )
    type       = models.CharField(max_length=50, choices=TYPE_CHOICES)
    title      = models.CharField(max_length=255)
    message    = models.TextField()
    target_url = models.CharField(max_length=255, blank=True, null=True)
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.user.username} — {self.title}"

    class Meta:
        db_table = 'notifications'
        ordering = ['-created_at']