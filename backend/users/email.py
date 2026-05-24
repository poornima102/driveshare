import os


def _send_brevo(to_email, subject, html_content):
    try:
        import sib_api_v3_sdk

        configuration = sib_api_v3_sdk.Configuration()
        configuration.api_key['api-key'] = os.environ.get('BREVO_API_KEY')

        api_instance = sib_api_v3_sdk.TransactionalEmailsApi(
            sib_api_v3_sdk.ApiClient(configuration)
        )

        email_obj = sib_api_v3_sdk.SendSmtpEmail(
            to=[{"email": to_email}],
            sender={"email": "poornimachandran26@gmail.com", "name": "DriveShare"},
            subject=subject,
            html_content=html_content
        )
        api_instance.send_transac_email(email_obj)
    except Exception as e:
        print(f"Email error: {e}")


def send_welcome_email(user):
    _send_brevo(
        to_email=user.email,
        subject="Welcome to DriveShare! 🚗",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px">
            <h2 style="color:#2563EB">🚗 DriveShare</h2>
            <h3>Hi {user.username}! 👋</h3>
            <p>Welcome to DriveShare — your peer-to-peer car rental marketplace.</p>
            <ul>
                <li>✅ Browse and book cars near you</li>
                <li>✅ List your own car and earn money</li>
                <li>✅ Chat with owners in real-time</li>
            </ul>
            <a href="https://driveshare-phi.vercel.app"
               style="display:inline-block;background:#2563EB;color:#fff;
                      padding:12px 24px;border-radius:8px;text-decoration:none;
                      font-weight:bold;margin-top:16px">
                Get Started 🚀
            </a>
            <p style="color:#aaa;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )


def send_booking_confirmed_email(booking):
    _send_brevo(
        to_email=booking.renter.email,
        subject="Booking Confirmed — DriveShare 🎉",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px">
            <h2 style="color:#2563EB">🚗 DriveShare</h2>
            <h3>Booking Confirmed! 🎉</h3>
            <p>Hi {booking.renter.username}, your booking details:</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f8fafc">
                    <td style="padding:10px;color:#888;font-size:13px">Vehicle</td>
                    <td style="padding:10px;font-weight:600">
                        {booking.vehicle.brand} {booking.vehicle.model} ({booking.vehicle.year})
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px;color:#888;font-size:13px">Pickup</td>
                    <td style="padding:10px">
                        {booking.pickup_date.strftime("%d %b %Y, %I:%M %p")}
                    </td>
                </tr>
                <tr style="background:#f8fafc">
                    <td style="padding:10px;color:#888;font-size:13px">Return</td>
                    <td style="padding:10px">
                        {booking.return_date.strftime("%d %b %Y, %I:%M %p")}
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px;color:#888;font-size:13px">Location</td>
                    <td style="padding:10px">
                        {booking.vehicle.pickup_location}, {booking.vehicle.city}
                    </td>
                </tr>
                <tr style="background:#f8fafc">
                    <td style="padding:10px;color:#888;font-size:13px">Total Paid</td>
                    <td style="padding:10px;font-weight:700;color:#2563EB;font-size:18px">
                        ₹{booking.total_price}
                    </td>
                </tr>
            </table>
            <a href="https://driveshare-phi.vercel.app/my-bookings"
               style="display:inline-block;background:#2563EB;color:#fff;
                      padding:12px 24px;border-radius:8px;text-decoration:none;
                      font-weight:bold">
                View Booking
            </a>
            <p style="color:#aaa;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )


def send_booking_cancelled_email(booking):
    _send_brevo(
        to_email=booking.renter.email,
        subject="Booking Cancelled — DriveShare",
        html_content=f"""
        <div style="font-family:sans-serif;max-width:500px;margin:auto;padding:20px">
            <h2 style="color:#2563EB">🚗 DriveShare</h2>
            <h3>Booking Cancelled</h3>
            <p>Hi {booking.renter.username}, your booking has been cancelled.</p>
            <table style="width:100%;border-collapse:collapse;margin:16px 0">
                <tr style="background:#f8fafc">
                    <td style="padding:10px;color:#888">Vehicle</td>
                    <td style="padding:10px;font-weight:600">
                        {booking.vehicle.brand} {booking.vehicle.model}
                    </td>
                </tr>
                <tr>
                    <td style="padding:10px;color:#888">Dates</td>
                    <td style="padding:10px">
                        {booking.pickup_date.strftime("%d %b %Y")} →
                        {booking.return_date.strftime("%d %b %Y")}
                    </td>
                </tr>
                <tr style="background:#f8fafc">
                    <td style="padding:10px;color:#888">Amount</td>
                    <td style="padding:10px;font-weight:600">₹{booking.total_price}</td>
                </tr>
            </table>
            <a href="https://driveshare-phi.vercel.app"
               style="display:inline-block;background:#2563EB;color:#fff;
                      padding:12px 24px;border-radius:8px;text-decoration:none;
                      font-weight:bold">
                Browse Other Cars
            </a>
            <p style="color:#aaa;font-size:12px;margin-top:24px">DriveShare Team</p>
        </div>
        """
    )