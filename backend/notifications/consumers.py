import json
from channels.generic.websocket import AsyncWebsocketConsumer


class NotificationConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.user_id   = self.scope['url_route']['kwargs']['user_id']
        self.room_name = f"notifications_{self.user_id}"

        await self.channel_layer.group_add(
            self.room_name,
            self.channel_name
        )
        await self.accept()
        print(f"✅ Notification WebSocket connected for user: {self.user_id}")

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(
            self.room_name,
            self.channel_name
        )
        print(f"❌ Notification WebSocket disconnected for user: {self.user_id}")

    async def receive(self, text_data):
        pass

    async def notification_message(self, event):
        """Send notification to WebSocket client"""
        await self.send(text_data=json.dumps({
            'id':         event.get('id', ''),
            'title':      event.get('title', ''),
            'message':    event.get('message', ''),
            'type':       event.get('ntype', 'general'),
            'target_url': event.get('target_url', ''),
            'data':       event.get('data', {}),
        }))
        print(f"📨 Notification sent to user {self.user_id}: {event.get('title')}")