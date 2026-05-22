from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/auth/',          include('users.urls')),
    path('api/vehicles/',      include('vehicles.urls')),
    path('api/bookings/',      include('bookings.urls')),
    path('api/payments/',      include('payments.urls')),
    path('api/chat/',          include('chat.urls')),
    path('api/notifications/', include('notifications.urls')),
]

# Serve media files in development only
if settings.DEBUG:
    urlpatterns += static(
        settings.MEDIA_URL,
        document_root=settings.MEDIA_ROOT
    )
    urlpatterns += static(
        '/vehicles/',
        document_root=settings.BASE_DIR / 'vehicles'
    )