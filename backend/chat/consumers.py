import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.contrib.auth import get_user_model

User = get_user_model()


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.booking_id = self.scope['url_route']['kwargs']['booking_id']
        self.room_name  = f"chat_{self.booking_id}"

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )

    async def receive(self, text_data):
        try:
            data       = json.loads(text_data)
            content    = data.get('content', '').strip()
            sender_id  = data.get('sender_id')
            booking_id = data.get('booking_id')

            if not content:
                return

            # Save message to DB
            message = await self.save_message(sender_id, booking_id, content)

            # Broadcast to everyone in the chat room
            await self.channel_layer.group_send(
                self.room_name,
                {
                    'type':        'chat_message',
                    'message_id':  str(message['id']),
                    'content':     content,
                    'sender_id':   str(sender_id),
                    'sender_name': message['sender_name'],
                    'created_at':  message['created_at'],
                }
            )

            # Send notification to the other person
            await self.notify_other_person(
                sender_id, booking_id, content, message['sender_name']
            )

        except Exception as e:
            pass

    async def chat_message(self, event):
        await self.send(text_data=json.dumps({
            'message_id':  event['message_id'],
            'content':     event['content'],
            'sender_id':   event['sender_id'],
            'sender_name': event['sender_name'],
            'created_at':  event['created_at'],
        }))

    @database_sync_to_async
    def save_message(self, sender_id, booking_id, content):
        from .models import Message
        from bookings.models import Booking

        sender  = User.objects.get(id=sender_id)
        booking = Booking.objects.get(id=booking_id)

        message = Message.objects.create(
            booking = booking,
            sender  = sender,
            content = content
        )

        return {
            'id':          str(message.id),
            'sender_name': sender.username,
            'created_at':  str(message.created_at),
        }

    async def notify_other_person(self, sender_id, booking_id, content, sender_name):
        """Send notification to the other person in the booking"""
        try:
            # Get other person info from database
            recipient_info = await self.get_other_person_info(sender_id, booking_id)
            if not recipient_info:
                return

            other_person_id = recipient_info['id']
            recipient_name = recipient_info['name']

            # Send notification via channel layer (async)
            await self.channel_layer.group_send(
                f"notifications_{other_person_id}",
                {
                    'type':       'notification_message',
                    'id':         str(booking_id),
                    'title':      f'💬 New message from {sender_name}',
                    'message':    content[:100],
                    'ntype':      'new_message',
                    'target_url': f'/chat/{booking_id}/',
                    'data':       {'booking_id': str(booking_id)},
                }
            )

            # Also save to database
            await self.save_notification_to_db(
                other_person_id, 'new_message',
                f'💬 New message from {sender_name}',
                content[:100], f'/chat/{booking_id}/'
            )

        except Exception as e:
            pass

    @database_sync_to_async
    def get_other_person_info(self, sender_id, booking_id):
        """Get the ID and name of the other person in the booking"""
        from bookings.models import Booking
        import uuid

        try:
            # Convert booking_id to UUID if it's a string
            if isinstance(booking_id, str):
                booking_id = uuid.UUID(booking_id)
            
            booking = Booking.objects.select_related(
                'renter', 'vehicle__owner'
            ).get(id=booking_id)

            # Convert sender_id to string for comparison
            sender_id_str = str(sender_id)
            renter_id_str = str(booking.renter.id)
            owner_id_str = str(booking.vehicle.owner.id)

            # Find the OTHER person
            if sender_id_str == renter_id_str:
                other_person = booking.vehicle.owner
                role = "Vehicle Owner"
            else:
                other_person = booking.renter
                role = "Renter"

            return {
                'id': other_person.id,
                'name': other_person.username,
            }

        except Exception as e:
            return None

    @database_sync_to_async
    def save_notification_to_db(self, user_id, notif_type, title, message, target_url):
        """Save notification to database"""
        from notifications.models import Notification

        try:
            Notification.objects.create(
                user       = User.objects.get(id=user_id),
                type       = notif_type,
                title      = title,
                message    = message,
                target_url = target_url,
            )
        except Exception as e:
            pass