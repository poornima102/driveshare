import random
import string
import os
from django.core.cache import cache


def generate_otp():
    return ''.join(random.choices(string.digits, k=6))


def send_otp_email(email):
    otp = generate_otp()
    cache.set(f"otp_{email}", otp, timeout=600)

    import sib_api_v3_sdk
    from sib_api_v3_sdk.rest import ApiException

    configuration = sib_api_v3_sdk.Configuration()
    configuration.api_key['api-key'] = os.environ.get('BREVO_API_KEY')

    api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
        sib_api_v3_sdk.ApiClient(configuration)
    )

    email_obj = sib_api_v3_sdk.SendSmtpEmail(
        to=[{"email": email}],
        sender={"email": "poornimachandran26@gmail.com", "name": "DriveShare"},
        subject="Your DriveShare OTP Code",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:400px;margin:auto;padding:20px">
            <h2 style="color:#2563EB">🚗 DriveShare</h2>
            <p>Your verification code is:</p>
            <h1 style="font-size:48px;letter-spacing:8px;color:#2563EB;text-align:center">
                {otp}
            </h1>
            <p style="color:#888">This code expires in <strong>10 minutes</strong>.</p>
            <p style="color:#888">Do not share this code with anyone.</p>
            <hr/>
            <p style="color:#aaa;font-size:12px">DriveShare Team</p>
        </div>
        """
    )

    api_instance.send_transac_email(email_obj)
    return True


def verify_otp(email, otp):
    stored = cache.get(f"otp_{email}")
    if not stored:
        return False, "OTP expired — request a new one"
    if stored != otp:
        return False, "Invalid OTP"
    cache.delete(f"otp_{email}")
    return True, "Verified"