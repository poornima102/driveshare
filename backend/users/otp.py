import random
import string
import os
import resend
from django.core.cache import cache


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email):
    otp = generate_otp()
    cache.set(f"otp_{email}", otp, timeout=600)

    resend.api_key = os.environ.get("RESEND_API_KEY")

    resend.Emails.send({
        "from": "DriveShare <onboarding@resend.dev>",
        "to": email,
        "subject": "Your DriveShare verification code",
        "html": f"""
            <div style="font-family:sans-serif;max-width:400px;margin:auto">
                <h2>Your verification code</h2>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0284c7">{otp}</p>
                <p>This code expires in <strong>10 minutes</strong>.</p>
                <p>Do not share this code with anyone.</p>
                <hr/>
                <p style="color:#888;font-size:12px">DriveShare Team</p>
            </div>
        """
    })
    return True


def verify_otp(email, otp):
    stored = cache.get(f"otp_{email}")
    if not stored:
        return False, "OTP expired — request a new one"
    if stored != otp:
        return False, "Invalid OTP"
    cache.delete(f"otp_{email}")
    return True, "Verified"