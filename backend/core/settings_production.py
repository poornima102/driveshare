from .settings import *

DEBUG        = False
ALLOWED_HOSTS = ['your-app.railway.app', 'localhost']

# Security settings
SECURE_SSL_REDIRECT              = True
SESSION_COOKIE_SECURE            = True
CSRF_COOKIE_SECURE               = True
SECURE_BROWSER_XSS_FILTER        = True
SECURE_CONTENT_TYPE_NOSNIFF      = True
SECURE_HSTS_SECONDS              = 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS   = True

# CORS for production
CORS_ALLOWED_ORIGINS = [
    'https://driveshare.vercel.app',
]
