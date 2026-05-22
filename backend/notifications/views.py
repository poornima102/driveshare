from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .models import Notification


class NotificationListView(APIView):
    """
    GET /api/notifications/
    Returns all notifications for logged in user
    """
    permission_classes = [IsAuthenticated]

    def get(self, request):
        notifications = Notification.objects.filter(
            user=request.user
        )[:50]  # Last 50 notifications

        data = []
        for n in notifications:
            data.append({
                'id':         str(n.id),
                'type':       n.type,
                'title':      n.title,
                'message':    n.message,
                'target_url': n.target_url,
                'is_read':    n.is_read,
                'created_at': n.created_at,
            })

        return Response(data)


class MarkReadView(APIView):
    """
    POST /api/notifications/{id}/read/
    Marks a notification as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request, pk):
        try:
            notification = Notification.objects.get(
                id=pk,
                user=request.user
            )
            notification.is_read = True
            notification.save()
            return Response({'message': 'Marked as read'})
        except Notification.DoesNotExist:
            return Response({'error': 'Not found'}, status=404)


class MarkAllReadView(APIView):
    """
    POST /api/notifications/mark-all-read/
    Marks all notifications as read
    """
    permission_classes = [IsAuthenticated]

    def post(self, request):
        Notification.objects.filter(
            user=request.user,
            is_read=False
        ).update(is_read=True)
        return Response({'message': 'All notifications marked as read'})