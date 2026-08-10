import logging
import string

from django.conf import settings
from django.core.mail import send_mail
from django.utils import timezone
from datetime import timedelta

from .models import AuditLog

logger = logging.getLogger(__name__)


import secrets

def generate_otp_code(length=6):
    return "".join(secrets.choice(string.digits) for _ in range(length))


def otp_expiry():
    return timezone.now() + timedelta(minutes=settings.OTP_EXPIRY_MINUTES)


def send_otp_email(user, otp_code, purpose="verify your email"):
    """Send OTP via email. Uses console backend in DEBUG for easy local testing.

    Bug fix (verified): this used to call send_mail with fail_silently=False
    and no error handling at any call site (register, resend-otp,
    forgot-password). A misconfigured/unreachable SMTP server (very possible
    in production with real credentials, per KNOWN_LIMITATIONS.md) raised an
    unhandled exception straight through the view, turning into a raw 500
    even though the user account / OTP row had *already been created
    successfully* in the database. The user would see "something went
    wrong" for an account that actually exists, with no way to recover
    (the resend button would fail the exact same way).

    This mirrors the existing "best-effort, must never block the primary
    flow" pattern already used for sync_mongo_user() in this same file:
    the OTP is always generated and persisted regardless of email delivery,
    so failing to send the email should degrade gracefully, not 500.
    Returns True if the email was handed off successfully, False otherwise.
    """
    subject = "Your AI Tax Assistant Verification Code"
    message = (
        f"Hi {user.full_name},\n\n"
        f"Your OTP to {purpose} is: {otp_code}\n"
        f"This code expires in {settings.OTP_EXPIRY_MINUTES} minutes.\n\n"
        f"If you did not request this, please ignore this email.\n"
    )
    try:
        send_mail(subject, message, settings.DEFAULT_FROM_EMAIL, [user.email], fail_silently=False)
        return True
    except Exception:
        logger.exception("Failed to send OTP email to %s (purpose=%s)", user.email, purpose)
        return False


def get_client_ip(request):
    x_forwarded_for = request.META.get("HTTP_X_FORWARDED_FOR")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip()
    return request.META.get("REMOTE_ADDR")


def log_audit(request, action, user=None, metadata=None):
    AuditLog.objects.create(
        user=user,
        action=action,
        ip_address=get_client_ip(request),
        user_agent=request.META.get("HTTP_USER_AGENT", "")[:255],
        metadata=metadata or {},
    )


def sync_mongo_user(user):
    """Best-effort mirror of the user into MongoDB for Part 2. Never raises -
    Part 1 auth must keep working even if MongoDB is unreachable."""
    try:
        from apps.mongo.utils import sync_user
        sync_user(user)
    except Exception:
        pass
