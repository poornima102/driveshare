from django.contrib import admin
from .models import Vehicle, VehicleImage, Review


class VehicleImageInline(admin.TabularInline):
    model = VehicleImage
    extra = 1


@admin.register(Vehicle)
class VehicleAdmin(admin.ModelAdmin):
    list_display  = ['brand', 'model', 'year', 'owner', 'city', 'daily_price', 'is_available']
    list_filter   = ['is_available', 'transmission', 'fuel_type', 'city']
    search_fields = ['brand', 'model', 'city', 'owner__username']
    inlines       = [VehicleImageInline]


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ['vehicle', 'reviewer', 'rating', 'created_at']