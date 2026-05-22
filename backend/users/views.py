from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from .otp import send_otp_email, verify_otp
from .serializers import (
    RegisterSerializer,
    LoginSerializer,
    UserProfileSerializer,
    UserTokenSerializer,
    ChangePasswordSerializer
)
from .models import User


from .email import send_welcome_email

class RegisterView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.save()
            token_data = UserTokenSerializer(user).data

            # Send welcome email
            send_welcome_email(user)

            return Response({
                'message': 'Account created successfully',
                'user': token_data
            }, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class LoginView(APIView):
    permission_classes = [AllowAny]  # ← ADD THIS

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        if serializer.is_valid():
            user = serializer.validated_data['user']
            token_data = UserTokenSerializer(user).data
            return Response({
                'message': 'Login successful',
                'user': token_data
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class MeView(APIView):
    permission_classes = [IsAuthenticated]  # ← This stays protected
    parser_classes = [MultiPartParser, FormParser, JSONParser]

    def get(self, request):
        serializer = UserProfileSerializer(request.user)
        return Response(serializer.data)

    def put(self, request):
        serializer = UserProfileSerializer(
            request.user,
            data=request.data,
            partial=True
        )
        if serializer.is_valid():
            serializer.save()
            return Response({
                'message': 'Profile updated',
                'user': serializer.data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        user = request.user
        user.delete()
        return Response({
            'message': 'Account deleted successfully'
        }, status=status.HTTP_204_NO_CONTENT)


class UserProfileViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [AllowAny]  # ← ADD THIS
    serializer_class = UserProfileSerializer

    def get_queryset(self):
        return User.objects.filter(is_active=True)
    


class SendOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        if not email:
            return Response({'error': 'Email is required'}, status=400)

        # Check email not already registered
        if User.objects.filter(email=email).exists():
            return Response({'error': 'Email already registered'}, status=400)

        try:
            send_otp_email(email)
            return Response({'message': f'OTP sent to {email}'})
        except Exception as e:
            print(f"OTP email error: {e}")
            return Response({'error': 'Failed to send OTP — check email address'}, status=400)


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(
            data=request.data,
            context={'request': request}
        )
        if serializer.is_valid():
            user = request.user
            user.set_password(serializer.validated_data['new_password'])
            user.save()
            return Response({
                'message': 'Password changed successfully'
            }, status=status.HTTP_200_OK)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class VerifyOTPView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        email = request.data.get('email', '').strip()
        otp   = request.data.get('otp', '').strip()

        if not email or not otp:
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
        return Response({'error': message}, status=400)