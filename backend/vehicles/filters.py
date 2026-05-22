import django_filters
from .models import Vehicle


class VehicleFilter(django_filters.FilterSet):
    # Filter by city (case insensitive)
    city = django_filters.CharFilter(
        field_name='city',
        lookup_expr='icontains'
    )

    # Filter by price range
    min_price = django_filters.NumberFilter(
        field_name='daily_price',
        lookup_expr='gte'   # greater than or equal
    )
    max_price = django_filters.NumberFilter(
        field_name='daily_price',
        lookup_expr='lte'   # less than or equal
    )

    # Filter by transmission type
    transmission = django_filters.ChoiceFilter(
        choices=Vehicle.TRANSMISSION_CHOICES
    )

    # Filter by fuel type
    fuel_type = django_filters.ChoiceFilter(
        choices=Vehicle.FUEL_CHOICES
    )

    # Filter by seats
    seats = django_filters.NumberFilter(field_name='seats')

    # Filter by availability
    is_available = django_filters.BooleanFilter(field_name='is_available')

    class Meta:
        model  = Vehicle
        fields = [
            'city', 'min_price', 'max_price',
            'transmission', 'fuel_type',
            'seats', 'is_available'
        ]