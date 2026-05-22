from asgiref.sync import async_to_sync
from channels.layers import get_channel_layer
from .models import Notification


def send_notification(user, notif_type, title, message, target_url=None, data=None):
    """
    Send a real-time notification to a user.
    Saves to DB and pushes via WebSocket.
    """
    try:
        # Save to database
        notification = Notification.objects.create(
            user       = user,
            type       = notif_type,
            title      = title,
            message    = message,
            target_url = target_url,
        )

        # Push via WebSocket
        channel_layer = get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"notifications_{user.id}",
            {
                'type':       'notification_message',
                'id':         str(notification.id),
                'title':      title,
                'message':    message,
                'ntype':      notif_type,
                'target_url': target_url,
                'data':       data or {},
            }
        )
        return notification

    except Exception as e:
        return None