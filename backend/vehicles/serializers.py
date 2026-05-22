from rest_framework import serializers
from django.db.models import Avg
from .models import Vehicle, VehicleImage, Review


class VehicleImageSerializer(serializers.ModelSerializer):
    class Meta:
        model  = VehicleImage
        fields = ['id', 'image', 'is_primary']


class ReviewSerializer(serializers.ModelSerializer):
    reviewer_name = serializers.CharField(
        source='reviewer.username',
        read_only=True
    )

    class Meta:
        model  = Review
        fields = ['id', 'reviewer_name', 'rating', 'comment', 'created_at']
        read_only_fields = ['id', 'created_at']


class VehicleListSerializer(serializers.ModelSerializer):
    owner_name    = serializers.CharField(source='owner.username', read_only=True)
    avg_rating    = serializers.SerializerMethodField()
    primary_image = serializers.SerializerMethodField()
    images        = VehicleImageSerializer(many=True, read_only=True)

    class Meta:
        model  = Vehicle
        fields = [
            'id', 'brand', 'model', 'year',
            'transmission', 'fuel_type', 'seats',
            'city', 'pickup_location',
            'daily_price', 'hourly_price', 'weekly_price',
            'is_available', 'status',
            'owner_name', 'avg_rating', 'primary_image', 'images',
            'latitude', 'longitude',
            'created_at'
        ]

    def get_avg_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0.0

    def get_primary_image(self, obj):
        image = obj.images.filter(is_primary=True).first()
        if not image:
            image = obj.images.first()
        if image and image.image:
            try:
                url = image.image.url
                request = self.context.get('request')
                if request and not url.startswith('http'):
                    return request.build_absolute_uri(url)
                return url
            except Exception:
                return None
        return None


class VehicleDetailSerializer(serializers.ModelSerializer):
    owner_name   = serializers.CharField(source='owner.username', read_only=True)
    owner_id     = serializers.CharField(source='owner.id',       read_only=True)
    owner_phone  = serializers.CharField(source='owner.phone',    read_only=True)
    images       = VehicleImageSerializer(many=True, read_only=True)
    reviews      = ReviewSerializer(many=True, read_only=True)
    avg_rating   = serializers.SerializerMethodField()
    review_count = serializers.SerializerMethodField()
    owner_bio    = serializers.CharField(source='owner.bio', read_only=True)


    class Meta:
        model  = Vehicle
        fields = [
            'id', 'brand', 'model', 'year',
            'transmission', 'fuel_type', 'seats', 'description',
            'city', 'pickup_location', 'latitude', 'longitude',
            'daily_price', 'hourly_price', 'weekly_price',
            'is_available', 'status',
            'owner_name', 'owner_id', 'owner_phone',
            'images', 'reviews',
            'avg_rating', 'review_count',
            'created_at', 'updated_at',
            'owner_name', 'owner_id', 'owner_phone', 'owner_bio',
        ]

    def get_avg_rating(self, obj):
        avg = obj.reviews.aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0.0

    def get_review_count(self, obj):
        return obj.reviews.count()


class VehicleCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Vehicle
        fields = [
            'brand', 'model', 'year',
            'transmission', 'fuel_type', 'seats', 'description',
            'city', 'pickup_location', 'latitude', 'longitude',
            'daily_price', 'hourly_price', 'weekly_price',
            'is_available', 'status'
        ]

    def validate_year(self, value):
        if value < 2000 or value > 2026:
            raise serializers.ValidationError('Year must be between 2000 and 2026')
        return value

    def validate_daily_price(self, value):
        if value < 100:
            raise serializers.ValidationError('Daily price must be at least ₹100')
        return value

    def validate_seats(self, value):
        if value < 2 or value > 10:
            raise serializers.ValidationError('Seats must be between 2 and 10')
        return value