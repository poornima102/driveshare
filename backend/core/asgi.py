import os
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.auth import AuthMiddlewareStack
from django.http import HttpResponse

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')

django_asgi_app = get_asgi_application()

import chat.routing
import notifications.routing

async def cors_wrapper(scope, receive, send):
    if scope["type"] == "http":
        async def send_with_cors(event):
            if event["type"] == "http.response.start":
                headers = list(event.get("headers", []))
                headers.append((b"access-control-allow-origin", b"https://driveshare-phi.vercel.app"))
                headers.append((b"access-control-allow-credentials", b"true"))
                headers.append((b"access-control-allow-headers", b"Authorization, Content-Type"))
                headers.append((b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"))
                event = {**event, "headers": headers}
            await send(event)

        if scope.get("method") == "OPTIONS":
            await send({"type": "http.response.start", "status": 204, "headers": [
                (b"access-control-allow-origin", b"https://driveshare-phi.vercel.app"),
                (b"access-control-allow-credentials", b"true"),
                (b"access-control-allow-headers", b"Authorization, Content-Type"),
                (b"access-control-allow-methods", b"GET, POST, PUT, PATCH, DELETE, OPTIONS"),
            ]})
            await send({"type": "http.response.body", "body": b""})
            return

        await django_asgi_app(scope, receive, send_with_cors)
    else:
        await inner_app(scope, receive, send)

inner_app = ProtocolTypeRouter({
    'http': django_asgi_app,
    'websocket': AuthMiddlewareStack(
        URLRouter(
            chat.routing.websocket_urlpatterns +
            notifications.routing.websocket_urlpatterns
        )
    ),
})

async def application(scope, receive, send):
    if scope["type"] == "http":
        await cors_wrapper(scope, receive, send)
    else:
        await inner_app(scope, receive, send)