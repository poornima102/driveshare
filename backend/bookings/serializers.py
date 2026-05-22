from rest_framework import serializers
from django.utils import timezone
from .models import Booking


class BookingCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Booking
        fields = ['vehicle', 'pickup_date', 'return_date']

    def validate(self, data):
        pickup_date = data.get('pickup_date')
        return_date = data.get('return_date')
        vehicle     = data.get('vehicle')

        # Check pickup is in the future (with 5-minute buffer for processing)
        buffer = timezone.now() + timezone.timedelta(minutes=5)
        if pickup_date <= buffer:
            raise serializers.ValidationError(
                {'pickup_date': 'Pickup date must be at least 5 minutes from now'}
            )

        # Check return is after pickup
        if return_date <= pickup_date:
            raise serializers.ValidationError(
                {'return_date': 'Return date must be after pickup date'}
            )

        # Check vehicle is available
        if not vehicle.is_available:
            raise serializers.ValidationError(
                {'vehicle': 'This vehicle is not available'}
            )

        # ── Double booking prevention ──────────────────────────
        # Check if any CONFIRMED booking overlaps with requested dates
        from django.db.models import Q
        conflict = Booking.objects.filter(
            vehicle=vehicle,
            status='confirmed'
        ).filter(
            Q(pickup_date__lt=return_date) &
            Q(return_date__gt=pickup_date)
        ).exists()

        if conflict:
            raise serializers.ValidationError(
                {'vehicle': 'Vehicle is already booked for these dates'}
            )

        return data

    def validate_vehicle(self, vehicle):
        # Owner cannot book their own vehicle
        request = self.context.get('request')
        if request and vehicle.owner == request.user:
            raise serializers.ValidationError(
                'You cannot book your own vehicle'
            )
        return vehicle


class BookingListSerializer(serializers.ModelSerializer):
    vehicle_brand  = serializers.CharField(source='vehicle.brand',      read_only=True)
    vehicle_model  = serializers.CharField(source='vehicle.model',      read_only=True)
    vehicle_image  = serializers.SerializerMethodField()
    renter_name    = serializers.CharField(source='renter.username',    read_only=True)
    owner_name     = serializers.CharField(source='vehicle.owner.username', read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id', 'vehicle', 'vehicle_brand', 'vehicle_model',
            'vehicle_image', 'renter_name', 'owner_name',
            'pickup_date', 'return_date',
            'total_price', 'status', 'created_at'
        ]

    def get_vehicle_image(self, obj):
        image = obj.vehicle.images.filter(is_primary=True).first()
        if not image:
            image = obj.vehicle.images.first()
        if image and image.image:
            request = self.context.get('request')
            if request:
                return request.build_absolute_uri(image.image.url)
        return None


class BookingDetailSerializer(serializers.ModelSerializer):
    vehicle_brand    = serializers.CharField(source='vehicle.brand',  read_only=True)
    vehicle_model    = serializers.CharField(source='vehicle.model',  read_only=True)
    vehicle_year     = serializers.IntegerField(source='vehicle.year', read_only=True)
    vehicle_city     = serializers.CharField(source='vehicle.city',   read_only=True)
    renter_name      = serializers.CharField(source='renter.username', read_only=True)
    renter_phone     = serializers.CharField(source='renter.phone',   read_only=True)
    owner_name       = serializers.CharField(source='vehicle.owner.username', read_only=True)
    owner_phone      = serializers.CharField(source='vehicle.owner.phone',    read_only=True)

    class Meta:
        model  = Booking
        fields = [
            'id',
            'vehicle', 'vehicle_brand', 'vehicle_model',
            'vehicle_year', 'vehicle_city',
            'renter_name', 'renter_phone',
            'owner_name',  'owner_phone',
            'pickup_date', 'return_date',
            'total_price', 'status',
            'payment_intent_id',
            'created_at', 'updated_at'
        ]