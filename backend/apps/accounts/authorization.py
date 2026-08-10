from .roles import UserRole
from .permissions_registry import Permission, ROLE_PERMISSIONS

def has_role(user, role: UserRole) -> bool:
    if not user or not user.is_authenticated:
        return False
    return UserRole.get_role_for_user(user) == role

def has_permission(user, permission: Permission) -> bool:
    if not user or not user.is_authenticated:
        return False
    role = UserRole.get_role_for_user(user)
    allowed_permissions = ROLE_PERMISSIONS.get(role, set())
    return permission in allowed_permissions

def can_review_tax(user) -> bool:
    return has_permission(user, Permission.TAX_REVIEW)

def can_manage_compliance(user) -> bool:
    return has_permission(user, Permission.COMPLIANCE_MANAGEMENT)
