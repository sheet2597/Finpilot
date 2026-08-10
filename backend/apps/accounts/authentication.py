from rest_framework_simplejwt.authentication import JWTAuthentication
from rest_framework_simplejwt.exceptions import AuthenticationFailed

from .models import User


class AccountStatusJWTAuthentication(JWTAuthentication):
    """JWTAuthentication that also enforces User.account_status.

    Bug fix (verified): account_status (active/suspended/deactivated) is a
    real, admin-editable field (visible and filterable in Django admin,
    exposed to the frontend in UserSerializer/types/auth.ts) but nothing
    in the codebase ever actually checked it. simplejwt's default
    JWTAuthentication.get_user() only checks `is_active` - so an admin
    marking a user "suspended" via /admin had *zero* effect: the user's
    existing access token, and every future refresh of it, kept working
    exactly as before.

    This subclass re-checks account_status on every authenticated request,
    so a suspension actually takes effect immediately instead of only
    blocking new logins.
    """

    def authenticate(self, request):
        header = self.get_header(request)
        if header is None:
            raw_token = request.COOKIES.get('access')
        else:
            raw_token = self.get_raw_token(header)
            
        if raw_token is None:
            return None

        validated_token = self.get_validated_token(raw_token)
        return self.get_user(validated_token), validated_token

    def get_user(self, validated_token):
        user = super().get_user(validated_token)
        if user.account_status == User.AccountStatus.SUSPENDED:
            raise AuthenticationFailed("This account has been suspended. Please contact support.", code="account_suspended")
        if user.account_status == User.AccountStatus.DEACTIVATED:
            raise AuthenticationFailed("This account has been deactivated.", code="account_deactivated")
        return user
