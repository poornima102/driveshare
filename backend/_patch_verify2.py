from pathlib import Path

path = Path('users/views.py')
text = path.read_text(encoding='utf-8')
old = """        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=400)

        valid, message = verify_otp(email, otp)
        if valid:
            return Response({'message': 'Email verified successfully'})
        return Response({'error': message}, """
new = """        if not email or not otp:
            return Response({'error': 'Email and OTP are required'}, status=400)

        valid, message = verify_otp(email, otp)
        if valid:
            try:
                user = User.objects.get(email=email)
                user.is_verified = True
                user.save(update_fields=['is_verified'])
            except User.DoesNotExist:
                pass
            return Response({'message': 'Email verified successfully'})
        return Response({'error': message}, """

if old not in text:
    raise RuntimeError('Old text not found in users/views.py')
path.write_text(text.replace(old, new), encoding='utf-8')
print('patched')
