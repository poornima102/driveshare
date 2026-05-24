import random
import string
from django.core.cache import cache
from django.core.mail import send_mail
from django.conf import settings


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email):
    otp = generate_otp()
    cache.set(f"otp_{email}", otp, timeout=600)
    send_mail(
        subject='Your DriveShare verification code',
        message=f'Your verification code is: {otp}\n\nExpires in 10 minutes.\nDo not share this code.\n\nDriveShare Team',
        from_email=settings.DEFAULT_FROM_EMAIL,
        recipient_list=[email],
        fail_silently=False,
    )
    return True


def verify_otp(email, otp):
    stored = cache.get(f"otp_{email}")
    if not stored:
        return False, "OTP expired — request a new one"
    if stored != otp:
        return False, "Invalid OTP"
    cache.delete(f"otp_{email}")
    return True, "Verified"