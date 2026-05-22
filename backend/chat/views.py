from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status
from django.db.models import Q
from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer

from bookings.models import Booking
from .models import Message
from .serializers import MessageSerializer
from notifications.utils import send_notification


class MessageListView(APIView):
    """
    GET  /api/chat/{booking_id}/messages/ → load message history
    POST /api/chat/{booking_id}/messages/ → send a message
    """
    permission_classes = [IsAuthenticated]

    def get_booking(self, booking_id, user):
        """
        Only the renter or vehicle owner can access this chat
        """
        try:
            booking = Booking.objects.get(id=booking_id)
            # Check user is part of this booking
            if booking.renter != user and booking.vehicle.owner != user:
                return None
            return booking
        except Booking.DoesNotExist:
            return None

    def get(self, request, booking_id):
        booking = self.get_booking(booking_id, request.user)

        if not booking:
            return Response(
                {'error': 'Booking not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        # Get all messages for this booking
        messages = Message.objects.filter(
            booking=booking
        ).select_related('sender')

        # Mark messages as read
        messages.exclude(sender=request.user).update(is_read=True)

        serializer = MessageSerializer(messages, many=True)

        if booking.renter == request.user:
            other_person = booking.vehicle.owner
        else:
            other_person = booking.renter

        return Response({
            'booking': {
                'id': str(booking.id),
                'other_person': other_person.username,
                'vehicle': f"{booking.vehicle.brand} {booking.vehicle.model}",
            },
            'messages': serializer.data,
        })

    def post(self, request, booking_id):
        booking = self.get_booking(booking_id, request.user)

        if not booking:
            return Response(
                {'error': 'Booking not found or access denied'},
                status=status.HTTP_404_NOT_FOUND
            )

        content = request.data.get('content', '').strip()

        if not content:
            return Response(
                {'error': 'Message content is required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Save message to database
        message = Message.objects.create(
            booking=booking,
            sender=request.user,
            content=content
        )

        # Broadcast to chat room so connected users receive the message
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{booking_id}",
            {
                'type':        'chat_message',
                'message_id':  str(message.id),
                'content':     message.content,
                'sender_id':   str(request.user.id),
                'sender_name': request.user.username,
                'created_at':  str(message.created_at),
            }
        )

        # Notify the other user about the new chat message
        if booking.renter == request.user:
            other_person = booking.vehicle.owner
        else:
            other_person = booking.renter

        send_notification(
            user       = other_person,
            notif_type = 'new_message',
            title      = f'💬 New message from {request.user.username}',
            message    = content[:100],
            target_url = f'/chat/{booking_id}/',
            data       = {'booking_id': str(booking_id)}
        )

        serializer = MessageSerializer(message)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class ConversationListView(APIView):
    """
    GET /api/chat/conversations/
    Returns all conversations for the logged in user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        user = request.user

        # Get all bookings where user is renter or owner
        from django.db.models import Q, Max, Count
        bookings = Booking.objects.filter(
            Q(renter=user) | Q(vehicle__owner=user)
        ).filter(
            messages__isnull=False  # only bookings with messages
        ).select_related(
            'renter', 'vehicle', 'vehicle__owner'
        ).annotate(
            last_message_time=Max('messages__created_at'),
            unread_count=Count(
                'messages',
                filter=Q(messages__is_read=False) & ~Q(messages__sender=user)
            )
        ).order_by('-last_message_time')

        data = []
        for booking in bookings:
            # Get last message
            last_message = booking.messages.last()

            # Determine who the other person is
            if booking.renter == user:
                other_person = booking.vehicle.owner
            else:
                other_person = booking.renter

            data.append({
                'booking_id':       str(booking.id),
                'vehicle':          f"{booking.vehicle.brand} {booking.vehicle.model}",
                'other_person':     other_person.username,
                'other_person_id':  str(other_person.id),
                'last_message':     last_message.content if last_message else '',
                'last_message_time': booking.last_message_time,
                'unread_count':     booking.unread_count,
            })

        return Response(data)