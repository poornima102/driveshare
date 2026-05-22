from django.db import models
from django.conf import settings
import uuid


class Vehicle(models.Model):

    TRANSMISSION_CHOICES = [
        ('manual',    'Manual'),
        ('automatic', 'Automatic'),
    ]

    FUEL_CHOICES = [
        ('petrol',   'Petrol'),
        ('diesel',   'Diesel'),
        ('electric', 'Electric'),
        ('hybrid',   'Hybrid'),
        ('cng',      'CNG'),
    ]

    STATUS_CHOICES = [
        ('available',   'Available'),
        ('unavailable', 'Unavailable'),
    ]

    # Primary key
    id           = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)

    # Owner — linked to our custom User model
    owner        = models.ForeignKey(
                       settings.AUTH_USER_MODEL,
                       on_delete=models.CASCADE,
                       related_name='vehicles'
                   )

    # Basic details
    brand        = models.CharField(max_length=50)
    model        = models.CharField(max_length=50)
    year         = models.IntegerField()
    transmission = models.CharField(max_length=20, choices=TRANSMISSION_CHOICES)
    fuel_type    = models.CharField(max_length=20, choices=FUEL_CHOICES)
    seats        = models.IntegerField()
    description  = models.TextField(blank=True)

    # Location
    city             = models.CharField(max_length=100)
    pickup_location  = models.CharField(max_length=255)
    latitude         = models.DecimalField(max_digits=9,  decimal_places=6, null=True, blank=True)
    longitude        = models.DecimalField(max_digits=9,  decimal_places=6, null=True, blank=True)

    # Pricing
    hourly_price = models.DecimalField(max_digits=10, decimal_places=2)
    daily_price  = models.DecimalField(max_digits=10, decimal_places=2)
    weekly_price = models.DecimalField(max_digits=10, decimal_places=2)

    # Status
    status       = models.CharField(max_length=20, choices=STATUS_CHOICES, default='available')
    is_available = models.BooleanField(default=True)

    # Timestamps
    created_at   = models.DateTimeField(auto_now_add=True)
    updated_at   = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"{self.brand} {self.model} ({self.year}) - {self.owner.username}"

    class Meta:
        db_table  = 'vehicles'
        ordering  = ['-created_at']


class VehicleImage(models.Model):
    # Multiple images per vehicle
    vehicle    = models.ForeignKey(
                     Vehicle,
                     on_delete=models.CASCADE,
                     related_name='images'
                 )
    image      = models.ImageField(upload_to='vehicles/')
    is_primary = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"Image for {self.vehicle.brand} {self.vehicle.model}"

    class Meta:
        db_table = 'vehicle_images'


class Review(models.Model):
    # Rating and review after completed booking
    id         = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    vehicle    = models.ForeignKey(Vehicle, on_delete=models.CASCADE, related_name='reviews')
    reviewer   = models.ForeignKey(
                     settings.AUTH_USER_MODEL,
                     on_delete=models.CASCADE,
                     related_name='reviews_given'
                 )
    rating     = models.IntegerField()  # 1 to 5
    comment    = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.reviewer.username} → {self.vehicle.brand} {self.vehicle.model} ({self.rating}★)"

    class Meta:
        db_table = 'reviews'
        # One review per user per vehicle
        unique_together = ['vehicle', 'reviewer']