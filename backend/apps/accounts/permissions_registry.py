from enum import Enum
from .roles import UserRole

class Permission(Enum):
    COMPANY_VIEW = "company:view"
    COMPANY_CREATE = "company:create"
    COMPANY_UPDATE = "company:update"
    COMPANY_DELETE = "company:delete"

    TAX_VIEW = "tax:view"
    TAX_REVIEW = "tax:review"

    COMPLIANCE_VIEW = "compliance:view"
    COMPLIANCE_MANAGEMENT = "compliance:manage"

    ANALYTICS_VIEW = "analytics:view"
    REPORTS_VIEW = "reports:view"

    USERS_MANAGE = "users:manage"
    ROLES_MANAGE = "roles:manage"
    SETTINGS_MANAGE = "settings:manage"


ROLE_PERMISSIONS = {

    UserRole.CA: {
        Permission.COMPANY_VIEW,
        Permission.COMPANY_CREATE,
        Permission.COMPANY_UPDATE,
        Permission.COMPANY_DELETE,
        Permission.TAX_VIEW,
        Permission.TAX_REVIEW,
        Permission.COMPLIANCE_VIEW,
        Permission.COMPLIANCE_MANAGEMENT,
        Permission.ANALYTICS_VIEW,
        Permission.REPORTS_VIEW,
    },
    UserRole.ADMIN: set(Permission),
}
