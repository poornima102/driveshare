from rest_framework import serializers
from .models import Message


class MessageSerializer(serializers.ModelSerializer):
    sender_name  = serializers.CharField(source='sender.username', read_only=True)
    sender_id    = serializers.CharField(source='sender.id',       read_only=True)

    class Meta:
        model  = Message
        fields = [
            'id', 'booking', 'sender_name',
            'sender_id', 'content',
            'is_read', 'created_at'
        ]
        read_only_fields = ['id', 'created_at', 'sender_name', 'sender_id']