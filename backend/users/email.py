from django.core.mail import send_mail
from django.conf import settings


def send_welcome_email(user):
    try:
        send_mail(
            subject='Welcome to DriveShare! 🚗',
            message=f'''
Hi {user.username}!

Welcome to DriveShare — your peer-to-peer car rental marketplace.

You can now:
✅ Browse and book cars near you
✅ List your own car and earn money
✅ Chat with owners in real-time

Get started: https://driveshare-phi.vercel.app

Happy driving!
DriveShare Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[user.email],
            fail_silently=True,
        )
    except Exception:
        pass


def send_booking_confirmed_email(booking):
    try:
        send_mail(
            subject='Booking Confirmed — DriveShare 🎉',
            message=f'''
Hi {booking.renter.username}!

Your booking is confirmed!

Vehicle:     {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})
Pickup:      {booking.pickup_date.strftime("%d %b %Y, %I:%M %p")}
Return:      {booking.return_date.strftime("%d %b %Y, %I:%M %p")}
Location:    {booking.vehicle.pickup_location}, {booking.vehicle.city}
Total Paid:  ₹{booking.total_price}

View booking: https://driveshare-phi.vercel.app/my-bookings

Have a great trip!
DriveShare Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.renter.email],
            fail_silently=True,
        )
    except Exception:
        pass


def send_booking_cancelled_email(booking):
    try:
        send_mail(
            subject='Booking Cancelled — DriveShare',
            message=f'''
Hi {booking.renter.username},

Your booking has been cancelled.

Vehicle:  {booking.vehicle.brand} {booking.vehicle.model}
Dates:    {booking.pickup_date.strftime("%d %b %Y")} to {booking.return_date.strftime("%d %b %Y")}
Amount:   ₹{booking.total_price}

Browse other cars: https://driveshare-phi.vercel.app

DriveShare Team
            ''',
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[booking.renter.email],
            fail_silently=True,
        )
    except Exception:
        pass