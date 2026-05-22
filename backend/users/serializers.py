from rest_framework import serializers
from rest_framework_simplejwt.tokens import RefreshToken
from django.contrib.auth import authenticate
from .models import User
from vehicles.serializers import ReviewSerializer
from vehicles.models import Review


class RegisterSerializer(serializers.ModelSerializer):
    password  = serializers.CharField(write_only=True, min_length=8)
    password2 = serializers.CharField(write_only=True)

    class Meta:
        model  = User
        fields = ['email', 'username', 'phone', 'password', 'password2']

    def validate(self, data):
        # Check both passwords match
        if data['password'] != data['password2']:
            raise serializers.ValidationError({'password': 'Passwords do not match'})
        return data

    def validate_email(self, value):
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError('Email already registered')
        return value

    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already taken')
        return value

    def create(self, validated_data):
        # Remove password2 — not a model field
        validated_data.pop('password2')
        password = validated_data.pop('password')

        # Create user with hashed password
        user = User(**validated_data)
        user.set_password(password)  # hashes the password
        user.save()
        return user


class LoginSerializer(serializers.Serializer):
    email    = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, data):
        email    = data.get('email')
        password = data.get('password')

        # authenticate() checks email + password against database
        user = authenticate(username=email, password=password)

        if not user:
            raise serializers.ValidationError('Invalid email or password')

        if not user.is_active:
            raise serializers.ValidationError('Account is disabled')

        data['user'] = user
        return data


class UserProfileSerializer(serializers.ModelSerializer):
    owner_reviews = serializers.SerializerMethodField()
    owner_avg_rating = serializers.SerializerMethodField()
    owner_review_count = serializers.SerializerMethodField()
    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'phone',
            'profile_image', 'bio', 'is_verified', 'created_at',
            'owner_reviews', 'owner_avg_rating', 'owner_review_count'
        ]
        # These fields cannot be changed via API
        read_only_fields = ['id', 'email', 'is_verified', 'created_at']

    def get_owner_reviews(self, obj):
        reviews = Review.objects.filter(vehicle__owner=obj).select_related('reviewer')
        return ReviewSerializer(reviews, many=True, context=self.context).data

    def get_owner_avg_rating(self, obj):
        from django.db.models import Avg
        avg = Review.objects.filter(vehicle__owner=obj).aggregate(Avg('rating'))['rating__avg']
        return round(avg, 1) if avg else 0.0

    def get_owner_review_count(self, obj):
        return Review.objects.filter(vehicle__owner=obj).count()


class UserTokenSerializer(serializers.ModelSerializer):
    """Returns user data + JWT tokens together after login/register"""
    access  = serializers.SerializerMethodField()
    refresh = serializers.SerializerMethodField()

    class Meta:
        model  = User
        fields = [
            'id', 'email', 'username', 'phone',
            'profile_image', 'is_verified', 'access', 'refresh'
        ]

    def get_access(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh.access_token)

    def get_refresh(self, user):
        refresh = RefreshToken.for_user(user)
        return str(refresh)


class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=6)

    def validate_current_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Current password is incorrect')
        return value

    def validate_new_password(self, value):
        if len(value) < 6:
            raise serializers.ValidationError('Password must be at least 6 characters')
        return value