import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Skeleton } from "./ui/Skeleton";
import { getUserRole, hasPermission, UserRole } from "@/features/auth/authorization";
import ForbiddenPage from "@/features/errors/ForbiddenPage";

const PATHS_WITHOUT_COMPANY = ["/dashboard", "/clients", "/companies", "/profile", "/categories"];

export function ProtectedRoute({ allowedRoles, requiredPermissions, fallback }) {
  const { isAuthenticated, isLoading: authLoading, user } = useAuth();
  const { selectedCompany, isLoading: companyLoading } = useWorkspace();
  
  if (authLoading || companyLoading) {
    return (
      <div className="flex h-screen flex-col gap-4 p-8">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  const canAccessWithoutCompany = PATHS_WITHOUT_COMPANY.some((p) => location.pathname.startsWith(p));
  if (!selectedCompany?.id && !canAccessWithoutCompany) {
    return <Navigate to="/companies" replace state={{ from: location.pathname }} />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = getUserRole(user);
    if (!allowedRoles.includes(userRole)) {
      return fallback || <ForbiddenPage />;
    }
  }

  if (requiredPermissions && requiredPermissions.length > 0) {
    const hasAll = requiredPermissions.every((perm) => hasPermission(user, perm));
    if (!hasAll) {
      return fallback || <ForbiddenPage />;
    }
  }

  return <Outlet />;
}

export function GuestRoute() {
  const { isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) return null;

  if (isAuthenticated) {
    const stored = sessionStorage.getItem("auth_redirect");
    if (stored) sessionStorage.removeItem("auth_redirect");
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
}

export function ProfessionalRoute() {
  return (
    <ProtectedRoute
      allowedRoles={[UserRole.ACCOUNTANT, UserRole.CA, UserRole.ADMIN]}
    />
  );
}
