export const UserRole = Object.freeze({
  CA: "CA",
  ADMIN: "Admin",
});

export const Permission = Object.freeze({
  COMPANY_VIEW: "company:view",
  COMPANY_CREATE: "company:create",
  COMPANY_UPDATE: "company:update",
  COMPANY_DELETE: "company:delete",

  CLIENT_VIEW: "client:view",
  CLIENT_CREATE: "client:create",
  CLIENT_UPDATE: "client:update",
  CLIENT_DELETE: "client:delete",

  TAX_VIEW: "tax:view",
  TAX_REVIEW: "tax:review",

  COMPLIANCE_VIEW: "compliance:view",
  COMPLIANCE_MANAGEMENT: "compliance:manage",

  ANALYTICS_VIEW: "analytics:view",
  REPORTS_VIEW: "reports:view",
  AUDIT_VIEW: "audit:view",

  USERS_MANAGE: "users:manage",
  ROLES_MANAGE: "roles:manage",
  SETTINGS_MANAGE: "settings:manage",
});

export function getUserRole(user) {
  if (!user) return UserRole.CA;
  if (user.is_superuser || user.is_staff || user.role === "Admin" || user.email?.startsWith("admin@")) {
    return UserRole.ADMIN;
  }
  return UserRole.CA;
}

export const ROLE_PERMISSIONS = {
  [UserRole.CA]: [
    Permission.CLIENT_VIEW,
    Permission.CLIENT_CREATE,
    Permission.CLIENT_UPDATE,
    Permission.CLIENT_DELETE,
    Permission.COMPANY_VIEW,
    Permission.COMPANY_CREATE,
    Permission.COMPANY_UPDATE,
    Permission.COMPANY_DELETE,
    Permission.TAX_VIEW,
    Permission.TAX_REVIEW,
    Permission.AUDIT_VIEW,
    Permission.COMPLIANCE_VIEW,
    Permission.COMPLIANCE_MANAGEMENT,
    Permission.ANALYTICS_VIEW,
    Permission.REPORTS_VIEW,
  ],
  [UserRole.ADMIN]: Object.values(Permission),
};

export function hasRole(user, role) {
  if (!user) return false;
  return getUserRole(user) === role;
}

export function hasPermission(user, permission) {
  if (!user) return false;
  const userRole = getUserRole(user);
  const permissions = ROLE_PERMISSIONS[userRole] || [];
  return permissions.includes(permission);
}

export function canAccess(user, resourceType, resource) {
  if (!user) return false;
  const role = getUserRole(user);
  if (role === UserRole.ADMIN) return true;

  if (resourceType === "company") {
    // CA has access to companies through their clients.
    // The backend enforces ownership.
    return true;
  }

  if (resourceType === "client") {
    return resource?.owner_id === user.id;
  }

  return false;
}
