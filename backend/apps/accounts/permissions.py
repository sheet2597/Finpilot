from rest_framework.permissions import BasePermission
from .roles import UserRole
from .permissions_registry import Permission
from .authorization import has_role, has_permission
from .ownership import can_access_company


class IsEmailVerified(BasePermission):
    """Allow access only to users who have verified their email address."""

    message = "Please verify your email address to access this resource."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_email_verified)




class IsCA(BasePermission):
    def has_permission(self, request, view):
        return has_role(request.user, UserRole.CA)


class IsAdmin(BasePermission):
    def has_permission(self, request, view):
        return has_role(request.user, UserRole.ADMIN)


class RequirePermission(BasePermission):
    def __init__(self, permission: Permission):
        self.permission = permission

    def has_permission(self, request, view):
        return has_permission(request.user, self.permission)

    def __call__(self):
        return self


class RequireCompanyAccess(BasePermission):
    def has_permission(self, request, view):
        from apps.mongo.utils import get_active_company_id
        company_id = get_active_company_id(request)
        if not company_id:
            return False
        return can_access_company(request.user, company_id)
