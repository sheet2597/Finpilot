from django.contrib.auth import authenticate, password_validation
from django.core.exceptions import ValidationError as DjangoValidationError
from rest_framework import serializers

from .models import EmailVerificationOTP, PasswordResetOTP, Profile, User


# ---------------------------------------------------------------------------
# Registration
# ---------------------------------------------------------------------------
class RegisterSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, min_length=8)
    confirm_password = serializers.CharField(write_only=True, min_length=8)
    accept_terms = serializers.BooleanField(write_only=True)

    class Meta:
        model = User
        fields = [
            "full_name", "email", "password", "confirm_password", "mobile_number",
            "country", "state", "accept_terms",
        ]
        extra_kwargs = {"email": {"validators": []}}

    def validate_email(self, value):
        value = value.lower().strip()
        if User.objects.filter(email=value).exists():
            raise serializers.ValidationError("An account with this email already exists.")
        return value

    def validate_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        if attrs["password"] != attrs.pop("confirm_password"):
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        if not attrs.get("accept_terms"):
            raise serializers.ValidationError({"accept_terms": "You must accept the terms and conditions."})
        return attrs

    def create(self, validated_data):
        validated_data.pop("accept_terms")
        password = validated_data.pop("password")
        user = User(**validated_data, accepted_terms=True)
        user.set_password(password)
        user.save()
        Profile.objects.create(user=user)
        return user


class VerifyOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"].lower())
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No account found with this email."})

        otp = EmailVerificationOTP.objects.filter(user=user, is_used=False).order_by("-created_at").first()
        if not otp:
            raise serializers.ValidationError({"otp_code": "No active OTP found. Please request a new one."})
        if otp.is_expired():
            raise serializers.ValidationError({"otp_code": "OTP has expired. Please request a new one."})
        if otp.attempts >= 5:
            raise serializers.ValidationError({"otp_code": "Too many failed attempts. Please request a new OTP."})

        if otp.otp_code != attrs["otp_code"]:
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            if otp.attempts >= 5:
                raise serializers.ValidationError({"otp_code": "Too many failed attempts. Please request a new OTP."})
            raise serializers.ValidationError({"otp_code": "Invalid OTP code."})

        attrs["user"] = user
        attrs["otp"] = otp
        return attrs


class ResendOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = value.lower().strip()
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No account found with this email.")
        return value


# ---------------------------------------------------------------------------
# Login
# ---------------------------------------------------------------------------
class LoginSerializer(serializers.Serializer):
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)

    def validate(self, attrs):
        email = attrs["email"].lower().strip()
        user = authenticate(username=email, password=attrs["password"])
        if not user:
            raise serializers.ValidationError({"detail": "Invalid email or password."})
        if not user.is_active:
            raise serializers.ValidationError({"detail": "This account has been deactivated."})
        # Bug fix (verified): account_status was set by admins (suspend/deactivate)
        # but was never actually checked anywhere - a suspended user with
        # is_active=True could still log in normally. Enforce it here too.
        if user.account_status == User.AccountStatus.SUSPENDED:
            raise serializers.ValidationError({"detail": "This account has been suspended. Please contact support."})
        if user.account_status == User.AccountStatus.DEACTIVATED:
            raise serializers.ValidationError({"detail": "This account has been deactivated."})
        if not user.is_email_verified:
            raise serializers.ValidationError({"detail": "Please verify your email before logging in."})
        attrs["user"] = user
        return attrs


# ---------------------------------------------------------------------------
# Forgot / Reset password
# ---------------------------------------------------------------------------
class ForgotPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()

    def validate_email(self, value):
        value = value.lower().strip()
        if not User.objects.filter(email=value).exists():
            raise serializers.ValidationError("No account found with this email.")
        return value


class VerifyResetOTPSerializer(serializers.Serializer):
    email = serializers.EmailField()
    otp_code = serializers.CharField(max_length=6, min_length=6)

    def validate(self, attrs):
        try:
            user = User.objects.get(email=attrs["email"].lower())
        except User.DoesNotExist:
            raise serializers.ValidationError({"email": "No account found with this email."})

        otp = PasswordResetOTP.objects.filter(user=user, is_used=False).order_by("-created_at").first()
        if not otp:
            raise serializers.ValidationError({"otp_code": "No active OTP found. Please request a new one."})
        if otp.is_expired():
            raise serializers.ValidationError({"otp_code": "OTP has expired. Please request a new one."})
        if otp.attempts >= 5:
            raise serializers.ValidationError({"otp_code": "Too many failed attempts. Please request a new OTP."})

        if otp.otp_code != attrs["otp_code"]:
            otp.attempts += 1
            otp.save(update_fields=["attempts"])
            if otp.attempts >= 5:
                raise serializers.ValidationError({"otp_code": "Too many failed attempts. Please request a new OTP."})
            raise serializers.ValidationError({"otp_code": "Invalid OTP code."})

        attrs["user"] = user
        attrs["otp"] = otp
        return attrs


class ResetPasswordSerializer(serializers.Serializer):
    email = serializers.EmailField()
    reset_token = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField()
    new_password = serializers.CharField(min_length=8)
    confirm_password = serializers.CharField(min_length=8)

    def validate_new_password(self, value):
        try:
            password_validation.validate_password(value)
        except DjangoValidationError as exc:
            raise serializers.ValidationError(list(exc.messages))
        return value

    def validate(self, attrs):
        if attrs["new_password"] != attrs["confirm_password"]:
            raise serializers.ValidationError({"confirm_password": "Passwords do not match."})
        return attrs


# ---------------------------------------------------------------------------
# Profile / User
# ---------------------------------------------------------------------------
class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ["address", "company_name", "profile_photo"]


class UserSerializer(serializers.ModelSerializer):
    profile = ProfileSerializer(read_only=True)

    class Meta:
        model = User
        fields = [
            "id", "full_name", "email", "mobile_number", "country", "state",
            "account_status", "is_email_verified", "created_at", "last_login_at", "profile",
        ]
        read_only_fields = fields


class UpdateProfileSerializer(serializers.Serializer):
    """Combined update for User + Profile fields, used by PUT /profile."""

    full_name = serializers.CharField(max_length=150, required=False)
    mobile_number = serializers.CharField(max_length=20, required=False)
    address = serializers.CharField(required=False, allow_blank=True)
    company_name = serializers.CharField(required=False, allow_blank=True)
    profile_photo = serializers.ImageField(required=False)

    def update(self, instance: User, validated_data):
        for field in ["full_name", "mobile_number"]:
            if field in validated_data:
                setattr(instance, field, validated_data[field])
        instance.save()

        profile = instance.profile
        for field in ["address", "company_name", "profile_photo"]:
            if field in validated_data:
                setattr(profile, field, validated_data[field])
        profile.save()
        return instance
