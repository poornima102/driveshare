from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Sum, Count, Q
from django.db.models.functions import TruncMonth
from decimal import Decimal
from django.utils import timezone

from .models import Booking
from .serializers import (
    BookingCreateSerializer,
    BookingListSerializer,
    BookingDetailSerializer
)
from notifications.utils import send_notification


class BookingViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]

    def get_serializer_class(self):
        if self.action == 'create':
            return BookingCreateSerializer
        elif self.action == 'list':
            return BookingListSerializer
        return BookingDetailSerializer

    def get_queryset(self):
        user = self.request.user
        return Booking.objects.filter(
            Q(renter=user) | Q(vehicle__owner=user)
        ).select_related(
            'renter', 'vehicle', 'vehicle__owner'
        ).prefetch_related('vehicle__images')

    def create(self, request, *args, **kwargs):
        # Use serializer with request context for validation
        serializer = BookingCreateSerializer(
            data=request.data,
            context={'request': request}
        )
        if not serializer.is_valid():
            serializer.is_valid(raise_exception=True)

        vehicle     = serializer.validated_data['vehicle']
        pickup_date = serializer.validated_data['pickup_date']
        return_date = serializer.validated_data['return_date']

        # Calculate total price
        duration    = return_date - pickup_date
        days        = Decimal(str(duration.total_seconds() / 86400))
        total_price = round(days * vehicle.daily_price, 2)

        # Save booking
        booking = serializer.save(
            renter      = request.user,
            total_price = total_price,
            status      = 'pending'
        )

        # Return booking ID so frontend can use it for payment
        return Response({
            'id':          str(booking.id),
            'vehicle':     str(booking.vehicle.id),
            'pickup_date': booking.pickup_date,
            'return_date': booking.return_date,
            'total_price': str(booking.total_price),
            'status':      booking.status,
        }, status=status.HTTP_201_CREATED)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        booking = self.get_object()

        if booking.renter != request.user:
            return Response(
                {'error': 'Only the renter can cancel'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status not in ['pending', 'confirmed']:
            return Response(
                {'error': f'Cannot cancel a {booking.status} booking'},
                status=status.HTTP_400_BAD_REQUEST
            )

        booking.status = 'cancelled'
        booking.save()

        vehicle = booking.vehicle
        owner = vehicle.owner

        # Notify the owner about the cancellation
        send_notification(
            owner,
            'booking_cancelled',
            title=f'Booking cancelled: {vehicle.brand} {vehicle.model}',
            message=f'{request.user.username} cancelled their booking for your vehicle.',
            target_url=f'/dashboard?bookingId={booking.id}',
            data={
                'booking_id': str(booking.id),
                'vehicle_id': str(vehicle.id),
            }
        )

        # Notify the renter that cancellation succeeded
        send_notification(
            request.user,
            'booking_cancelled',
            title=f'Booking cancelled: {vehicle.brand} {vehicle.model}',
            message='Your booking has been cancelled successfully.',
            target_url='/my-bookings',
            data={
                'booking_id': str(booking.id),
                'vehicle_id': str(vehicle.id),
            }
        )

        return Response({
            'message': 'Booking cancelled successfully',
            'status':  booking.status
        })

    @action(detail=False, methods=['get'])
    def my_bookings(self, request):
        from notifications.models import Notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync
        
        # Auto-complete bookings past return date and notify
        completed_bookings = Booking.objects.filter(
            renter=request.user,
            status='confirmed',
            return_date__lt=timezone.now()
        )
        
        channel_layer = get_channel_layer()
        
        for booking in completed_bookings:
            booking.status = 'completed'
            booking.save()
            
            # Create completion notification
            notif = Notification.objects.create(
                user=request.user,
                type='booking_completed',
                title=f'Booking completed: {booking.vehicle.brand} {booking.vehicle.model}',
                message='Please rate your rental experience',
                target_url=f'/my-bookings',
            )
            
            # Send real-time notification
            try:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{request.user.id}",
                    {
                        'type':       'notification_message',
                        'id':         str(notif.id),
                        'title':      notif.title,
                        'message':    notif.message,
                        'ntype':      'booking_completed',
                        'target_url': '/my-bookings',
                    }
                )
            except Exception as e:
                pass
        
        bookings = Booking.objects.filter(
            renter=request.user
        ).select_related(
            'vehicle', 'vehicle__owner'
        ).prefetch_related('vehicle__images')

        serializer = BookingListSerializer(
            bookings, many=True, context={'request': request}
        )
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def owner_bookings(self, request):
        bookings = Booking.objects.filter(
            vehicle__owner=request.user
        ).select_related(
            'renter', 'vehicle'
        ).prefetch_related('vehicle__images')

        serializer = BookingListSerializer(
            bookings, many=True, context={'request': request}
        )
        return Response(serializer.data)


class CompleteExpiredBookingsView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        from notifications.models import Notification
        from channels.layers import get_channel_layer
        from asgiref.sync import async_to_sync

        completed_bookings = Booking.objects.filter(
            renter=request.user,
            status='confirmed',
            return_date__lt=timezone.now()
        )

        channel_layer = get_channel_layer()
        updated_count = 0

        for booking in completed_bookings:
            booking.status = 'completed'
            booking.save()
            updated_count += 1

            notif = Notification.objects.create(
                user=request.user,
                type='booking_completed',
                title=f'Booking completed: {booking.vehicle.brand} {booking.vehicle.model}',
                message='Please rate your rental experience',
                target_url=f'/my-bookings',
            )

            try:
                async_to_sync(channel_layer.group_send)(
                    f"notifications_{request.user.id}",
                    {
                        'type':       'notification_message',
                        'id':         str(notif.id),
                        'title':      notif.title,
                        'message':    notif.message,
                        'ntype':      'booking_completed',
                        'target_url': '/my-bookings',
                    }
                )
            except Exception as e:
                pass

        serializer = BookingListSerializer(
            Booking.objects.filter(
                renter=request.user
            ).select_related('vehicle', 'vehicle__owner').prefetch_related('vehicle__images'),
            many=True, context={'request': request}
        )

        return Response({
            'updated': updated_count,
            'bookings': serializer.data,
        })


class DashboardView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        total_earnings = Booking.objects.filter(
            vehicle__owner=user,
            status__in=['confirmed', 'completed']
        ).aggregate(total=Sum('total_price'))['total'] or 0

        monthly = Booking.objects.filter(
            vehicle__owner=user,
            status__in=['confirmed', 'completed']
        ).annotate(
            month=TruncMonth('created_at')
        ).values('month').annotate(
            earnings=Sum('total_price'),
            count=Count('id')
        ).order_by('month')

        total_bookings     = Booking.objects.filter(vehicle__owner=user).count()
        confirmed_bookings = Booking.objects.filter(vehicle__owner=user, status='confirmed').count()
        cancelled_bookings = Booking.objects.filter(vehicle__owner=user, status='cancelled').count()
        completed_bookings = Booking.objects.filter(vehicle__owner=user, status='completed').count()

        cancellation_rate = 0
        if total_bookings > 0:
            cancellation_rate = round(
                (cancelled_bookings / total_bookings) * 100, 1
            )

        return Response({
            'total_earnings':     total_earnings,
            'total_bookings':     total_bookings,
            'confirmed_bookings': confirmed_bookings,
            'cancelled_bookings': cancelled_bookings,
            'completed_bookings': completed_bookings,
            'cancellation_rate':  cancellation_rate,
            'monthly_earnings':   list(monthly),
        })