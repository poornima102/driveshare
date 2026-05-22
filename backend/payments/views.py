import razorpay
import hmac
import hashlib
from decimal import Decimal
from django.utils import timezone

from django.conf import settings
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework import status

from bookings.models import Booking
from .models import Payment
from users.email import send_booking_confirmed_email

client = razorpay.Client(
    auth=(settings.RAZORPAY_KEY_ID, settings.RAZORPAY_KEY_SECRET)
)


# Refund policy — % refund based on hours before pickup
REFUND_POLICY = [
    (48, 100),   # Cancel 48+ hours before → 100% refund
    (24, 75),    # Cancel 24-48 hours before → 75% refund
    (12, 50),    # Cancel 12-24 hours before → 50% refund
    (0,  25),    # Cancel less than 12 hours → 25% refund
]


def calculate_refund(booking):
    """Calculate refund amount based on cancellation policy"""
    now = timezone.now()
    hours_before = (booking.pickup_date - now).total_seconds() / 3600

    refund_percent = 0
    for hours, percent in REFUND_POLICY:
        if hours_before >= hours:
            refund_percent = percent
            break

    refund_amount = Decimal(str(booking.total_price)) * Decimal(str(refund_percent)) / 100
    return round(refund_amount, 2), refund_percent


def send_ws_notification(user_id, notif_type, title, message, data={}, target_url=None):
    """Send real-time notification to a user via WebSocket"""
    try:
        from asgiref.sync import async_to_sync
        from channels.layers import get_channel_layer
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user_id}",
            {
                'type':       'notification_message',
                'id':         None,
                'title':      title,
                'message':    message,
                'ntype':      notif_type,
                'data':       data,
                'target_url': target_url,
            }
        )
    except Exception as e:
        pass


class CreateOrderView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')

        if not booking_id:
            return Response(
                {'error': 'booking_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            booking = Booking.objects.get(
                id=booking_id,
                renter=request.user,
                status='pending'
            )
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        try:
            amount_paise = int(booking.total_price * 100)

            order = client.order.create({
                'amount':   amount_paise,
                'currency': 'INR',
                'notes': {
                    'booking_id': str(booking.id),
                    'vehicle':    f"{booking.vehicle.brand} {booking.vehicle.model}",
                    'renter':     request.user.username
                }
            })

            Payment.objects.create(
                booking           = booking,
                user              = request.user,
                amount            = booking.total_price,
                razorpay_order_id = order['id'],
                status            = 'pending'
            )

            return Response({
                'order_id':   order['id'],
                'amount':     order['amount'],
                'currency':   order['currency'],
                'key_id':     settings.RAZORPAY_KEY_ID,
                'booking_id': str(booking.id),
                'name':       f"{booking.vehicle.brand} {booking.vehicle.model}",
                'email':      request.user.email,
                'phone':      request.user.phone,
            })

        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )


class VerifyPaymentView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        razorpay_order_id   = request.data.get('razorpay_order_id')
        razorpay_payment_id = request.data.get('razorpay_payment_id')
        razorpay_signature  = request.data.get('razorpay_signature')

        if not all([razorpay_order_id, razorpay_payment_id, razorpay_signature]):
            return Response(
                {'error': 'Missing payment details'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = Payment.objects.get(
                razorpay_order_id=razorpay_order_id,
                user=request.user
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        msg       = f"{razorpay_order_id}|{razorpay_payment_id}"
        secret    = settings.RAZORPAY_KEY_SECRET.encode()
        generated = hmac.new(
            secret,
            msg.encode(),
            hashlib.sha256
        ).hexdigest()

        if generated == razorpay_signature:
            payment.razorpay_payment_id = razorpay_payment_id
            payment.razorpay_signature  = razorpay_signature
            payment.status              = 'succeeded'
            payment.save()

            booking        = payment.booking
            booking.status = 'confirmed'
            booking.save()

            vehicle      = booking.vehicle
            renter       = booking.renter
            owner        = vehicle.owner
            vehicle_name = f"{vehicle.brand} {vehicle.model}"

            # ── Notify OWNER — new booking on their car ──────────
            send_ws_notification(
                user_id    = owner.id,
                notif_type = 'booking_confirmed',
                title      = f'New Booking! 🎉',
                message    = f'{renter.username} booked your {vehicle_name} for ₹{booking.total_price}',
                data       = {
                    'booking_id': str(booking.id),
                    'vehicle_id': str(vehicle.id),
                    'renter':     renter.username,
                    'vehicle':    vehicle_name,
                    'amount':     str(booking.total_price),
                },
                target_url = f'/dashboard?bookingId={booking.id}',
            )

            # ── Notify RENTER — booking confirmed ────────────────
            send_ws_notification(
                user_id    = renter.id,
                notif_type = 'booking_confirmed',
                title      = 'Booking Confirmed! ✅',
                message    = f'Your booking for {vehicle_name} is confirmed. You can now chat with the owner.',
                data       = {
                    'booking_id': str(booking.id),
                    'vehicle_id': str(vehicle.id),
                    'vehicle':    vehicle_name,
                },
                target_url = '/my-bookings',
            )

            # ── Notifications (persistent) ──────────────────────
            try:
                from notifications.utils import send_notification

                # Notify the RENTER — booking confirmed
                send_notification(
                    user       = booking.renter,
                    notif_type = 'booking_confirmed',
                    title      = '✅ Booking Confirmed!',
                    message    = f'Your booking for {booking.vehicle.brand} {booking.vehicle.model} is confirmed. Pickup: {booking.pickup_date.strftime("%d %b %Y, %I:%M %p")}',
                    target_url = '/my-bookings',
                )

                # Notify the OWNER — someone booked their car
                send_notification(
                    user       = booking.vehicle.owner,
                    notif_type = 'booking_confirmed',
                    title      = f'🚗 New Booking from {booking.renter.username}!',
                    message    = f'{booking.renter.username} booked your {booking.vehicle.brand} {booking.vehicle.model} for ₹{booking.total_price}',
                    target_url = f'/dashboard?bookingId={booking.id}',
                )
            except Exception as e:
                pass

            # Send confirmation email
            try:
                send_booking_confirmed_email(booking)
            except Exception as e:
                pass

            return Response({
                'message':    'Payment verified successfully',
                'booking_id': str(booking.id),
                'status':     'confirmed'
            })

        else:
            payment.status = 'failed'
            payment.save()
            return Response(
                {'error': 'Payment verification failed'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RefundView(APIView):
    """
    POST /api/payments/refund/
    Cancel booking and process Razorpay refund
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        booking_id = request.data.get('booking_id')
        reason     = request.data.get('reason', 'Customer requested cancellation')

        if not booking_id:
            return Response(
                {'error': 'booking_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            booking = Booking.objects.select_related('vehicle__owner').get(id=booking_id)
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        is_renter = booking.renter == request.user
        is_owner  = booking.vehicle.owner == request.user

        if not (is_renter or is_owner):
            return Response(
                {'error': 'You are not authorized to cancel this booking'},
                status=status.HTTP_403_FORBIDDEN
            )

        if booking.status != 'confirmed':
            return Response(
                {'error': 'Only confirmed bookings can be refunded'},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            payment = Payment.objects.get(
                booking=booking,
                status='succeeded'
            )
        except Payment.DoesNotExist:
            return Response(
                {'error': 'Payment not found for this booking'},
                status=status.HTTP_404_NOT_FOUND
            )

        if not payment.razorpay_payment_id:
            return Response(
                {'error': 'No Razorpay payment ID found for this booking'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Calculate refund amount based on policy
        refund_amount, refund_percent = calculate_refund(booking)

        if refund_amount <= 0:
            booking.status = 'cancelled'
            booking.save()

            try:
                from notifications.utils import send_notification

                send_notification(
                    user       = booking.renter,
                    notif_type = 'booking_cancelled',
                    title      = '❌ Booking Cancelled',
                    message    = 'Your booking was cancelled. No refund is applicable for this cancellation.',
                    target_url = '/my-bookings',
                )

                send_notification(
                    user       = booking.vehicle.owner,
                    notif_type = 'booking_cancelled',
                    title      = f'❌ Booking Cancelled: {booking.vehicle.brand} {booking.vehicle.model}',
                    message    = 'The booking was cancelled, but no refund was applicable.',
                    target_url = f'/dashboard?bookingId={booking.id}',
                )
            except Exception as e:
                pass

            return Response({
                'message':        'Booking cancelled. No refund applicable for this cancellation',
                'refund_amount':  '0.00',
                'refund_percent': 0,
                'status':         'cancelled',
                'note':           'No refund is available for this cancellation',
            }, status=status.HTTP_200_OK)

        try:
            # Process refund via Razorpay
            refund_paise = int(refund_amount * 100)

            refund = client.payment.refund(
                payment.razorpay_payment_id,
                {
                    'amount': refund_paise,
                    'notes': {
                        'booking_id': str(booking.id),
                        'reason':     reason,
                    }
                }
            )

            # Update payment record
            payment.razorpay_refund_id = refund.get('id') or refund.get('refund_id') or ''
            payment.refund_amount      = refund_amount
            payment.refund_reason      = reason
            payment.refunded_at        = timezone.now()
            payment.status             = 'refunded'
            payment.save()

            # Cancel the booking
            booking.status = 'cancelled'
            booking.save()

            # Send notifications
            try:
                from notifications.utils import send_notification

                send_notification(
                    user       = booking.renter,
                    notif_type = 'booking_cancelled',
                    title      = '❌ Booking Cancelled — Refund Initiated',
                    message    = f'₹{refund_amount} ({refund_percent}% refund) will be credited in 5-7 business days',
                )

                send_notification(
                    user       = booking.vehicle.owner,
                    notif_type = 'booking_cancelled',
                    title      = f'❌ Booking Cancelled by {booking.renter.username}',
                    message    = f'{booking.vehicle.brand} {booking.vehicle.model} booking for {booking.pickup_date.strftime("%d %b")} was cancelled',
                )
            except Exception as e:
                pass

            return Response({
                'message':        'Booking cancelled and refund initiated',
                'refund_amount':  str(refund_amount),
                'refund_percent': refund_percent,
                'refund_id':      payment.razorpay_refund_id,
                'status':         'refund_initiated',
                'note':           'Refund will be credited in 5-7 business days',
            })

        except razorpay.errors.BadRequestError as e:
            return Response(
                {'error': f'Refund failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Refund failed: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class RefundPolicyView(APIView):
    """
    GET /api/payments/refund-policy/{booking_id}/
    Check refund amount before cancelling
    """
    permission_classes = [IsAuthenticated]

    def get(self, request, booking_id):
        try:
            booking = Booking.objects.get(
                id=booking_id,
                renter=request.user,
                status='confirmed'
            )
        except Booking.DoesNotExist:
            return Response(
                {'error': 'Booking not found'},
                status=status.HTTP_404_NOT_FOUND
            )

        refund_amount, refund_percent = calculate_refund(booking)

        hours_before = (booking.pickup_date - timezone.now()).total_seconds() / 3600

        return Response({
            'booking_id':      str(booking.id),
            'total_paid':      str(booking.total_price),
            'refund_amount':   str(refund_amount),
            'refund_percent':  refund_percent,
            'hours_before':    round(hours_before, 1),
            'policy': [
                {'hours': '48+ hours before', 'refund': '100%'},
                {'hours': '24-48 hours before', 'refund': '75%'},
                {'hours': '12-24 hours before', 'refund': '50%'},
                {'hours': 'Less than 12 hours', 'refund': '25%'},
            ]
        })


class PaymentHistoryView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        payments = Payment.objects.filter(
            user=request.user
        ).select_related('booking', 'booking__vehicle')

        data = []
        for payment in payments:
            data.append({
                'id':                  str(payment.id),
                'amount':              payment.amount,
                'currency':            payment.currency,
                'status':              payment.status,
                'razorpay_order_id':   payment.razorpay_order_id,
                'razorpay_payment_id': payment.razorpay_payment_id,
                'refund_amount':       payment.refund_amount,
                'refund_reason':       payment.refund_reason,
                'refunded_at':         payment.refunded_at,
                'vehicle':             f"{payment.booking.vehicle.brand} {payment.booking.vehicle.model}",
                'pickup_date':         payment.booking.pickup_date,
                'return_date':         payment.booking.return_date,
                'created_at':          payment.created_at,
            })

        return Response(data)