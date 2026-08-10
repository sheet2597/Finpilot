from django.core.signing import BadSignature, SignatureExpired, TimestampSigner
from django.utils import timezone
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.exceptions import TokenError
from rest_framework_simplejwt.serializers import TokenRefreshSerializer
from rest_framework_simplejwt.tokens import RefreshToken
from django.conf import settings

def set_jwt_cookies(response, access_token, refresh_token=None):
    response.set_cookie(
        "access", access_token,
        httponly=True, samesite="Lax", secure=not settings.DEBUG,
    )
    if refresh_token:
        response.set_cookie(
            "refresh", refresh_token,
            httponly=True, samesite="Lax", secure=not settings.DEBUG,
        )

from .models import AuditLog, EmailVerificationOTP, PasswordResetOTP, User
from .serializers import (
    ChangePasswordSerializer,
    ForgotPasswordSerializer,
    LoginSerializer,
    RegisterSerializer,
    ResendOTPSerializer,
    ResetPasswordSerializer,
    UpdateProfileSerializer,
    UserSerializer,
    VerifyOTPSerializer,
    VerifyResetOTPSerializer,
)
from .throttles import LoginRateThrottle, OTPRateThrottle
from .utils import generate_otp_code, log_audit, otp_expiry, send_otp_email, sync_mongo_user

RESET_TOKEN_SALT = "password-reset"
RESET_TOKEN_MAX_AGE = 10 * 60  # 10 minutes, matches OTP verification window


def issue_tokens_for_user(user, request=None):
    refresh = RefreshToken.for_user(user)
    return {"access": str(refresh.access_token), "refresh": str(refresh)}


# ---------------------------------------------------------------------------
# Register
# ---------------------------------------------------------------------------
class RegisterView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = RegisterSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.save()

        otp_code = generate_otp_code()
        EmailVerificationOTP.objects.create(user=user, otp_code=otp_code, expires_at=otp_expiry())
        email_sent = send_otp_email(user, otp_code, purpose="verify your email")

        sync_mongo_user(user)
        log_audit(request, AuditLog.Action.REGISTER, user=user)

        # Bug fix (verified): the account and OTP are always created
        # successfully at this point regardless of email delivery, so the
        # response must reflect that - never a 500 - while still letting the
        # user know if the email may not have arrived so they know to use
        # "Resend OTP" rather than assume something is broken.
        message = (
            "Registration successful. Please check your email for the OTP to verify your account."
            if email_sent
            else "Registration successful, but we couldn't send the verification email right now. "
            "Please use the Resend OTP option in a moment."
        )
        return Response(
            {
                "success": True,
                "message": message,
                "data": {"email": user.email},
            },
            status=status.HTTP_201_CREATED,
        )


class VerifyOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = VerifyOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        otp = serializer.validated_data["otp"]

        otp.is_used = True
        otp.save(update_fields=["is_used"])
        user.is_email_verified = True
        user.save(update_fields=["is_email_verified"])

        log_audit(request, AuditLog.Action.EMAIL_VERIFIED, user=user)
        return Response({"success": True, "message": "Email verified successfully. You can now log in."})


class ResendOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = ResendOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data["email"])
        EmailVerificationOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp_code = generate_otp_code()
        EmailVerificationOTP.objects.create(user=user, otp_code=otp_code, expires_at=otp_expiry())
        email_sent = send_otp_email(user, otp_code, purpose="verify your email")
        message = (
            "A new OTP has been sent to your email."
            if email_sent
            else "A new OTP was generated, but we couldn't send the email right now. Please try again shortly."
        )
        return Response({"success": True, "message": message})


# ---------------------------------------------------------------------------
# Login / Refresh / Logout
# ---------------------------------------------------------------------------
class LoginView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [LoginRateThrottle]

    def post(self, request):
        serializer = LoginSerializer(data=request.data)
        try:
            serializer.is_valid(raise_exception=True)
        except Exception:
            log_audit(request, AuditLog.Action.LOGIN_FAILED, metadata={"email": request.data.get("email")})
            raise

        user = serializer.validated_data["user"]
        tokens = issue_tokens_for_user(user, request)

        user.last_login_at = timezone.now()
        user.save(update_fields=["last_login_at"])
        sync_mongo_user(user)
        log_audit(request, AuditLog.Action.LOGIN_SUCCESS, user=user)

        response = Response(
            {
                "success": True,
                "message": "Login successful.",
                "data": {"user": UserSerializer(user).data},
            }
        )
        set_jwt_cookies(response, tokens["access"], tokens["refresh"])
        return response


class LogoutView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass
        
        response = Response({"success": True, "message": "Logged out successfully."})
        response.delete_cookie("access", samesite="Lax")
        response.delete_cookie("refresh", samesite="Lax")
        return response


class RefreshTokenView(APIView):
    permission_classes = [AllowAny]

    def post(self, request):
        refresh_token = request.COOKIES.get("refresh")
        if not refresh_token:
            return Response({"success": False, "message": "Refresh token is required."}, status=status.HTTP_401_UNAUTHORIZED)

        try:
            old_token = RefreshToken(refresh_token)
        except TokenError as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        user_id = old_token.payload.get("user_id")
        user = User.objects.filter(id=user_id).first()
        if user is None or not user.is_active or user.account_status != User.AccountStatus.ACTIVE:
            return Response({"success": False, "message": "This session is no longer valid. Please log in again."}, status=status.HTTP_401_UNAUTHORIZED)

        serializer = TokenRefreshSerializer(data={"refresh": refresh_token})
        try:
            serializer.is_valid(raise_exception=True)
        except Exception as exc:
            return Response({"success": False, "message": str(exc)}, status=status.HTTP_401_UNAUTHORIZED)

        response = Response({"success": True, "message": "Token refreshed successfully."})
        
        # If ROTATE_REFRESH_TOKENS is True, simplejwt returns a new refresh token too
        new_refresh = serializer.validated_data.get("refresh")
        set_jwt_cookies(response, serializer.validated_data["access"], new_refresh)
        return response


# ---------------------------------------------------------------------------
# Forgot / Reset password
# ---------------------------------------------------------------------------
class ForgotPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = ForgotPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = User.objects.get(email=serializer.validated_data["email"])
        PasswordResetOTP.objects.filter(user=user, is_used=False).update(is_used=True)

        otp_code = generate_otp_code()
        PasswordResetOTP.objects.create(user=user, otp_code=otp_code, expires_at=otp_expiry())
        email_sent = send_otp_email(user, otp_code, purpose="reset your password")

        log_audit(request, AuditLog.Action.PASSWORD_RESET_REQUESTED, user=user)
        message = (
            "An OTP has been sent to your email to reset your password."
            if email_sent
            else "We couldn't send the reset email right now. Please try again shortly."
        )
        return Response({"success": True, "message": message})


class VerifyResetOTPView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]
    throttle_classes = [OTPRateThrottle]

    def post(self, request):
        serializer = VerifyResetOTPSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.validated_data["user"]
        otp = serializer.validated_data["otp"]

        otp.is_used = True
        otp.save(update_fields=["is_used"])

        # Issue a short-lived signed token proving OTP was verified, required by reset-password.
        signer = TimestampSigner(salt=RESET_TOKEN_SALT)
        reset_token = signer.sign(str(user.id))

        return Response({"success": True, "message": "OTP verified.", "data": {"reset_token": reset_token}})


class ResetPasswordView(APIView):
    authentication_classes = []
    permission_classes = [AllowAny]

    def post(self, request):
        serializer = ResetPasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data

        signer = TimestampSigner(salt=RESET_TOKEN_SALT)
        try:
            user_id = signer.unsign(data["reset_token"], max_age=RESET_TOKEN_MAX_AGE)
        except SignatureExpired:
            return Response({"success": False, "message": "Reset session expired. Please verify OTP again."}, status=status.HTTP_400_BAD_REQUEST)
        except BadSignature:
            return Response({"success": False, "message": "Invalid reset token."}, status=status.HTTP_400_BAD_REQUEST)

        try:
            user = User.objects.get(id=user_id, email=data["email"].lower())
        except User.DoesNotExist:
            return Response({"success": False, "message": "Invalid reset request."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(data["new_password"])
        user.save(update_fields=["password"])

        log_audit(request, AuditLog.Action.PASSWORD_RESET_COMPLETED, user=user)
        return Response({"success": True, "message": "Password reset successfully. You can now log in."})


# ---------------------------------------------------------------------------
# Profile
# ---------------------------------------------------------------------------
class ProfileView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        response = Response({"success": True, "data": UserSerializer(request.user).data})
        response["Cache-Control"] = "no-store, no-cache, must-revalidate"
        response["Pragma"] = "no-cache"
        response["Expires"] = "0"
        return response

    def put(self, request):
        serializer = UpdateProfileSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = serializer.update(request.user, serializer.validated_data)

        sync_mongo_user(user)
        log_audit(request, AuditLog.Action.PROFILE_UPDATED, user=user)
        return Response({"success": True, "message": "Profile updated successfully.", "data": UserSerializer(user).data})


class ChangePasswordView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        serializer = ChangePasswordSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user = request.user

        if not user.check_password(serializer.validated_data["old_password"]):
            return Response({"success": False, "message": "Current password is incorrect."}, status=status.HTTP_400_BAD_REQUEST)

        user.set_password(serializer.validated_data["new_password"])
        user.save(update_fields=["password"])
        log_audit(request, AuditLog.Action.PASSWORD_RESET_COMPLETED, user=user, metadata={"via": "change_password"})
        return Response({"success": True, "message": "Password changed successfully."})


class UserStatsView(APIView):
    permission_classes = [IsAuthenticated]

    def get(self, request):
        from apps.mongo import connection as mongo_connection
        db = mongo_connection.get_db()
        owner_str = str(request.user.id)

        company_ids = [c["_id"] for c in db.companies.find({"owner_id": owner_str})]

        stats = {
            "companies": len(company_ids),
            "transactions": db.transactions.count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
            "documents": db.documents.count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
            "reports": db.reports.count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
            "ml_models": db.ml_models.count_documents({"company_id": {"$in": company_ids}}) if company_ids else 0,
        }

        return Response({"success": True, "data": stats})


class DeleteAccountView(APIView):
    permission_classes = [IsAuthenticated]

    def post(self, request):
        user = request.user
        password = request.data.get("password")
        if not password or not user.check_password(password):
            return Response({"success": False, "message": "Incorrect password."}, status=status.HTTP_400_BAD_REQUEST)

        from apps.mongo import connection as mongo_connection
        db = mongo_connection.get_db()
        owner_str = str(user.id)

        # Get all companies owned by this user
        company_cursor = db.companies.find({"owner_id": owner_str})
        company_ids = [c["_id"] for c in company_cursor]

        if company_ids:
            # Cascading deletes
            db.transactions.delete_many({"company_id": {"$in": company_ids}})
            db.documents.delete_many({"company_id": {"$in": company_ids}})
            db.reports.delete_many({"company_id": {"$in": company_ids}})
            db.ml_models.delete_many({"company_id": {"$in": company_ids}})
            db.transaction_categories.delete_many({"company_id": {"$in": company_ids}})
            db.vendors.delete_many({"company_id": {"$in": company_ids}})
            db.customers.delete_many({"company_id": {"$in": company_ids}})
            db.budgets.delete_many({"company_id": {"$in": company_ids}})
            db.company_members.delete_many({"company_id": {"$in": company_ids}})

        db.companies.delete_many({"owner_id": owner_str})
        db.user_preferences.delete_many({"user_id": owner_str})
        db.users.delete_many({"user_id": owner_str})

        # Blacklist tokens
        refresh_token = request.COOKIES.get("refresh")
        if refresh_token:
            try:
                token = RefreshToken(refresh_token)
                token.blacklist()
            except TokenError:
                pass

        user.delete()

        response = Response({"success": True, "message": "Account deleted successfully."})
        response.delete_cookie("access", samesite="Lax")
        response.delete_cookie("refresh", samesite="Lax")
        return response
