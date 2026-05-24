import os
import resend


def _send(to: str, subject: str, html: str):
    resend.api_key = os.environ.get("RESEND_API_KEY")
    try:
        resend.Emails.send({
            "from": "DriveShare <onboarding@resend.dev>",
            "to": to,
            "subject": subject,
            "html": html,
        })
    except Exception:
        pass


def send_welcome_email(user):
    _send(
        to=user.email,
        subject="Welcome to DriveShare! 🚗",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Hi {user.username}! 👋</h2>
            <p>Welcome to <strong>DriveShare</strong> — your peer-to-peer car rental marketplace.</p>
            <p>You can now:</p>
            <ul>
                <li>✅ Browse and book cars near you</li>
                <li>✅ List your own car and earn money</li>
                <li>✅ Chat with owners in real-time</li>
            </ul>
            <a href="https://driveshare-phi.vercel.app"
               style="display:inline-block;background:#0284c7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold">
               Get Started
            </a>
            <p style="color:#888;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )


def send_booking_confirmed_email(booking):
    _send(
        to=booking.renter.email,
        subject="Booking Confirmed — DriveShare 🎉",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Booking Confirmed! 🎉</h2>
            <p>Hi {booking.renter.username}, your booking details:</p>
            <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px;color:#888">Vehicle</td>
                    <td style="padding:8px"><strong>{booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})</strong></td></tr>
                <tr style="background:#f8fafc"><td style="padding:8px;color:#888">Pickup</td>
                    <td style="padding:8px">{booking.pickup_date.strftime("%d %b %Y, %I:%M %p")}</td></tr>
                <tr><td style="padding:8px;color:#888">Return</td>
                    <td style="padding:8px">{booking.return_date.strftime("%d %b %Y, %I:%M %p")}</td></tr>
                <tr style="background:#f8fafc"><td style="padding:8px;color:#888">Location</td>
                    <td style="padding:8px">{booking.vehicle.pickup_location}, {booking.vehicle.city}</td></tr>
                <tr><td style="padding:8px;color:#888">Total Paid</td>
                    <td style="padding:8px"><strong>₹{booking.total_price}</strong></td></tr>
            </table>
            <a href="https://driveshare-phi.vercel.app/my-bookings"
               style="display:inline-block;background:#0284c7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
               View Booking
            </a>
            <p style="color:#888;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )


def send_booking_cancelled_email(booking):
    _send(
        to=booking.renter.email,
        subject="Booking Cancelled — DriveShare",
        html=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto">
            <h2>Booking Cancelled</h2>
            <p>Hi {booking.renter.username}, your booking has been cancelled.</p>
            <table style="width:100%;border-collapse:collapse">
                <tr><td style="padding:8px;color:#888">Vehicle</td>
                    <td style="padding:8px"><strong>{booking.vehicle.brand} {booking.vehicle.model}</strong></td></tr>
                <tr style="background:#f8fafc"><td style="padding:8px;color:#888">Dates</td>
                    <td style="padding:8px">{booking.pickup_date.strftime("%d %b %Y")} to {booking.return_date.strftime("%d %b %Y")}</td></tr>
                <tr><td style="padding:8px;color:#888">Amount</td>
                    <td style="padding:8px">₹{booking.total_price}</td></tr>
            </table>
            <a href="https://driveshare-phi.vercel.app"
               style="display:inline-block;background:#0284c7;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:bold;margin-top:16px">
               Browse Other Cars
            </a>
            <p style="color:#888;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )