from django.contrib import admin
from .models import Booking


@admin.register(Booking)
class BookingAdmin(admin.ModelAdmin):
    list_display  = ['id', 'renter', 'vehicle', 'pickup_date', 'return_date', 'total_price', 'status']
    list_filter   = ['status']
    search_fields = ['renter__username', 'vehicle__brand']
    ordering      = ['-created_at']