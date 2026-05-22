from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.shortcuts import get_object_or_404
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Avg
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import Vehicle, VehicleImage, Review
from .serializers import (
    VehicleListSerializer,
    VehicleDetailSerializer,
    VehicleCreateSerializer,
    ReviewSerializer
)
from .filters import VehicleFilter
from .permissions import IsOwnerOrReadOnly


class VehicleViewSet(viewsets.ModelViewSet):
    permission_classes  = [IsOwnerOrReadOnly]
    filter_backends     = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class     = VehicleFilter
    search_fields       = ['brand', 'model', 'city', 'description']
    ordering_fields     = ['daily_price', 'created_at', 'year']
    ordering            = ['-created_at']

    def get_queryset(self):
        return Vehicle.objects.select_related('owner')\
                              .prefetch_related('images', 'reviews')\
                              .annotate(avg_rating=Avg('reviews__rating'))

    def get_serializer_class(self):
        if self.action == 'list':
            return VehicleListSerializer
        elif self.action in ['create', 'update', 'partial_update']:
            return VehicleCreateSerializer
        return VehicleDetailSerializer

    def create(self, request, *args, **kwargs):
        serializer = VehicleCreateSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        vehicle = serializer.save(owner=request.user)
        print(f"DEBUG - Vehicle created with ID: {vehicle.id}")
        
        # Send notification to all users about new vehicle
        from notifications.models import Notification
        from users.models import User
        
        channel_layer = get_channel_layer()
        
        # Notify all users (in production, only notify nearby users)
        for u in User.objects.exclude(id=request.user.id)[:50]:
            notif = Notification.objects.create(
                user       = u,
                type       = 'new_vehicle',
                title      = f'New car available! {vehicle.brand} {vehicle.model}',
                message    = f'₹{vehicle.daily_price}/day in {vehicle.city}',
                target_url = f'/vehicles/{vehicle.id}/',
            )
            try:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{u.id}",
                    {
                        'type':       'notification_message',
                        'id':         str(notif.id),
                        'title':      notif.title,
                        'message':    notif.message,
                        'ntype':      notif.type,
                        'target_url': notif.target_url,
                    }
                )
            except Exception as e:
                print(f"Notification error: {e}")

        # Notify all users about new vehicle (persistent utility)
        try:
            from notifications.utils import send_notification
            from users.models import User as UserModel

            for u in UserModel.objects.exclude(id=request.user.id)[:100]:
                try:
                    send_notification(
                        user       = u,
                        notif_type = 'new_vehicle',
                        title      = f'🚗 New car available in {vehicle.city}!',
                        message    = f'{vehicle.brand} {vehicle.model} ({vehicle.year}) — ₹{vehicle.daily_price}/day',
                        target_url = f'/vehicles/{vehicle.id}/',
                    )
                except Exception as e:
                    print(f"send_notification error for user {u.id}: {e}")
        except Exception as e:
            print(f"Notification utility error: {e}")
        
        return Response({
            'id':           str(vehicle.id),
            'brand':        vehicle.brand,
            'model':        vehicle.model,
            'year':         vehicle.year,
            'city':         vehicle.city,
            'daily_price':  str(vehicle.daily_price),
            'is_available': vehicle.is_available,
        }, status=status.HTTP_201_CREATED)

    def perform_create(self, serializer):
        serializer.save(owner=self.request.user)

    # ── Toggle availability on/off ─────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def toggle_availability(self, request, pk=None):
        vehicle = self.get_object()

        if vehicle.owner != request.user:
            return Response(
                {'error': 'Only the owner can change availability'},
                status=status.HTTP_403_FORBIDDEN
            )

        vehicle.is_available = not vehicle.is_available
        vehicle.save()

        return Response({
            'message':      f"Vehicle is now {'Available 🟢' if vehicle.is_available else 'Hidden 🔴'}",
            'is_available': vehicle.is_available
        })

    # ── Check booked dates for a vehicle ──────────────────────
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def availability(self, request, pk=None):
        vehicle  = self.get_object()
        bookings = vehicle.bookings.filter(
            status='confirmed'
        ).values('pickup_date', 'return_date')

        booked_dates = []
        for booking in bookings:
            booked_dates.append({
                'start': booking['pickup_date'],
                'end':   booking['return_date']
            })

        return Response({'booked_dates': booked_dates})

    # ── My vehicles ────────────────────────────────────────────
    @action(detail=False, methods=['get'], permission_classes=[IsAuthenticated])
    def my_vehicles(self, request):
        vehicles   = Vehicle.objects.filter(owner=request.user)\
                                    .prefetch_related('images', 'reviews')
        serializer = VehicleListSerializer(
            vehicles, many=True, context={'request': request}
        )
        return Response(serializer.data)

    # ── Add a review ───────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def add_review(self, request, pk=None):
        vehicle = self.get_object()

        if vehicle.owner == request.user:
            return Response(
                {'error': 'You cannot review your own vehicle'},
                status=status.HTTP_400_BAD_REQUEST
            )

        has_completed = vehicle.bookings.filter(
            renter=request.user,
            status='completed'
        ).exists()

        if not has_completed:
            return Response(
                {'error': 'You can only review after a completed booking'},
                status=status.HTTP_403_FORBIDDEN
            )

        if Review.objects.filter(vehicle=vehicle, reviewer=request.user).exists():
            return Response(
                {'error': 'You have already reviewed this vehicle'},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ReviewSerializer(data=request.data)
        if serializer.is_valid():
            serializer.save(vehicle=vehicle, reviewer=request.user)
            return Response(serializer.data, status=status.HTTP_201_CREATED)

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # ── Upload images ──────────────────────────────────────────
    @action(detail=True, methods=['post'], permission_classes=[IsAuthenticated])
    def upload_images(self, request, pk=None):
        vehicle = self.get_object()

        if vehicle.owner != request.user:
            return Response(
                {'error': 'Only the owner can upload images'},
                status=status.HTTP_403_FORBIDDEN
            )

        images = request.FILES.getlist('images')
        if not images:
            return Response(
                {'error': 'No images provided'},
                status=status.HTTP_400_BAD_REQUEST
            )

        uploaded = []
        for i, image in enumerate(images):
            is_primary = (i == 0 and not vehicle.images.exists())
            vehicle_image = VehicleImage.objects.create(
                vehicle=vehicle,
                image=image,
                is_primary=is_primary
            )
            uploaded.append({
                'id':         vehicle_image.id,
                'is_primary': vehicle_image.is_primary
            })

        return Response({
            'message': f'{len(uploaded)} image(s) uploaded',
            'images':  uploaded
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['delete'], url_path='images/(?P<image_id>[^/.]+)', permission_classes=[IsAuthenticated])
    def delete_image(self, request, pk=None, image_id=None):
        vehicle = self.get_object()

        if vehicle.owner != request.user:
            return Response(
                {'error': 'Only the owner can remove images'},
                status=status.HTTP_403_FORBIDDEN
            )

        image = get_object_or_404(VehicleImage, id=image_id, vehicle=vehicle)
        image.delete()

        return Response({'message': 'Image deleted'}, status=status.HTTP_200_OK)

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def stats(self, request):
        from bookings.models import Booking

        completed_bookings = Booking.objects.filter(status='completed').count()
        cities_served = Vehicle.objects.filter(is_available=True).values('city').distinct().count()
        avg_rating = Review.objects.aggregate(avg=Avg('rating'))['avg'] or 0

        return Response({
            'completed_bookings': completed_bookings,
            'cities_served':      cities_served,
            'avg_rating':         round(avg_rating, 1),
        })