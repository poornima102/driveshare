from django.db import models
from django.conf import settings
import uuid


class Booking(models.Model):

    STATUS_CHOICES = [
        ('pending',   'Pending Payment'),
        ('confirmed', 'Confirmed'),
        ('cancelled', 'Cancelled'),
        ('completed', 'Completed'),
    ]

    id          = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Who is renting
    renter      = models.ForeignKey(
                      settings.AUTH_USER_MODEL,
                      on_delete=models.CASCADE,
                      related_name='bookings_as_renter'
                  )

    # Which vehicle
    vehicle     = models.ForeignKey(
                      'vehicles.Vehicle',
                      on_delete=models.CASCADE,
                      related_name='bookings'
                  )

    # Booking dates
    pickup_date  = models.DateTimeField()
    return_date  = models.DateTimeField()

    # Pricing
    total_price  = models.DecimalField(max_digits=10, decimal_places=2)

    # Status
    status       = models.CharField(
                       max_length=20,
                       choices=STATUS_CHOICES,
                       default='pending'
                   )

    # Stripe payment intent ID
    payment_intent_id = models.CharField(max_length=255, blank=True)

    # Timestamps
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.renter.username} → {self.vehicle.brand} {self.vehicle.model} ({self.status})"

    class Meta:
        db_table = 'bookings'
        ordering = ['-created_at']