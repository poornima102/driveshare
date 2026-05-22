from django.db import models
from django.conf import settings
import uuid


class Message(models.Model):
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Which booking this chat belongs to
    booking    = models.ForeignKey(
                     'bookings.Booking',
                     on_delete=models.CASCADE,
                     related_name='messages'
                 )

    # Who sent the message
    sender     = models.ForeignKey(
                     settings.AUTH_USER_MODEL,
                     on_delete=models.CASCADE,
                     related_name='sent_messages'
                 )

    content    = models.TextField()
    is_read    = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.sender.username}: {self.content[:50]}"

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']