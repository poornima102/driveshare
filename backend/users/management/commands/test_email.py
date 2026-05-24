from django.core.management.base import BaseCommand
from django.core.mail import send_mail
from django.conf import settings

class Command(BaseCommand):
    def handle(self, *args, **kwargs):
        self.stdout.write(f'HOST: {settings.EMAIL_HOST}')
        self.stdout.write(f'USER: {settings.EMAIL_HOST_USER}')
        self.stdout.write(f'PORT: {settings.EMAIL_PORT}')
        try:
            send_mail(
                'Test OTP',
                'Your test OTP is 123456',
                settings.DEFAULT_FROM_EMAIL,
                ['poornimachandran102@gmail.com'],
                fail_silently=False
            )
            self.stdout.write('EMAIL SENT SUCCESSFULLY')
        except Exception as e:
            self.stdout.write(f'ERROR: {e}')