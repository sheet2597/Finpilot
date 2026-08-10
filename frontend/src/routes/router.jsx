import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "@/features/auth/AuthContext";
import { WorkspaceProvider } from "@/context/WorkspaceContext";
import { ProtectedRoute, GuestRoute } from "@/components/ProtectedRoute";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Skeleton } from "@/components/ui/Skeleton";
import NotFoundPage from "@/features/errors/NotFoundPage";
import ForbiddenPage from "@/features/errors/ForbiddenPage";

import { UserRole } from "@/features/auth/authorization";

// Auth pages load eagerly
import RegisterPage from "@/features/auth/pages/RegisterPage";
import LoginPage from "@/features/auth/pages/LoginPage";
import VerifyOtpPage from "@/features/auth/pages/VerifyOtpPage";
import ForgotPasswordPage from "@/features/auth/pages/ForgotPasswordPage";
import VerifyResetOtpPage from "@/features/auth/pages/VerifyResetOtpPage";
import ResetPasswordPage from "@/features/auth/pages/ResetPasswordPage";
import LandingPage from "@/features/landing/LandingPage";

// Lazy-loaded pages
const DashboardPage = lazy(() => import("@/features/dashboard/pages/DashboardPage"));
const ProfilePage = lazy(() => import("@/features/profile/pages/ProfilePage"));
const SettingsPage = lazy(() => import("@/features/system/pages/SettingsPage"));
const CompanyListPage = lazy(() => import("@/features/companies/pages/CompanyListPage"));
const CompanyDetailPage = lazy(() => import("@/features/companies/pages/CompanyDetailPage"));
const ClientsPage = lazy(() => import("@/features/clients/pages/ClientsPage"));
const ClientDetailPage = lazy(() => import("@/features/clients/pages/ClientDetailPage"));
const DocumentsPage = lazy(() => import("@/features/documents/pages/DocumentsPage"));
const DocumentDetailPage = lazy(() => import("@/features/documents/pages/DocumentDetailPage"));
const TransactionsPage = lazy(() => import("@/features/transactions/pages/TransactionsPage"));
const CategoriesPage = lazy(() => import("@/features/transactions/pages/CategoriesPage"));
const VendorsPage = lazy(() => import("@/features/transactions/pages/VendorsPage"));
const VendorDetailPage = lazy(() => import("@/features/transactions/pages/VendorDetailPage"));
const CustomersPage = lazy(() => import("@/features/transactions/pages/CustomersPage"));
const CustomerDetailPage = lazy(() => import("@/features/transactions/pages/CustomerDetailPage"));
const TaxCenterPage = lazy(() => import("@/features/tax/pages/TaxCenterPage"));
const AIDashboardPage = lazy(() => import("@/features/ml/pages/AIDashboardPage"));
const AnalyticsDashboardPage = lazy(() => import("@/features/analytics/pages/AnalyticsDashboardPage"));
const ExecutiveDashboardPage = lazy(() => import("@/features/analytics/pages/ExecutiveDashboardPage"));
const ReportCenterPage = lazy(() => import("@/features/analytics/pages/ReportCenterPage"));

function PageFallback() {
  return (
    <div className="space-y-4 p-2">
      <Skeleton className="h-10 w-48" />
      <Skeleton className="h-40 w-full" />
      <Skeleton className="h-40 w-full" />
    </div>
  );
}

function Lazy({ children }) {
  return (
    <RouteErrorBoundary>
      <Suspense fallback={<PageFallback />}>{children}</Suspense>
    </RouteErrorBoundary>
  );
}

import { RouteErrorBoundary } from "@/components/RouteErrorBoundary";

export function AppRouter() {
  return (
    <AuthProvider>
      <WorkspaceProvider>
        <Routes>
          <Route path="/" element={<LandingPage />} />

          <Route element={<GuestRoute />}>
            <Route path="/register" element={<RegisterPage />} />
            <Route path="/login" element={<LoginPage />} />
            <Route path="/verify-otp" element={<VerifyOtpPage />} />
            <Route path="/forgot-password" element={<ForgotPasswordPage />} />
            <Route path="/verify-reset-otp" element={<VerifyResetOtpPage />} />
            <Route path="/reset-password" element={<ResetPasswordPage />} />
          </Route>

          <Route element={<ProtectedRoute />}>
            <Route element={<DashboardLayout />}>
              {/* Core dashboard — points to the real financial dashboard */}
              <Route path="/dashboard" element={<Lazy><DashboardPage /></Lazy>} />
              <Route path="/profile" element={<Lazy><ProfilePage /></Lazy>} />
              <Route path="/categories" element={<Lazy><CategoriesPage /></Lazy>} />

              <Route path="/documents" element={<Lazy><DocumentsPage /></Lazy>} />
              <Route path="/documents/:documentId" element={<Lazy><DocumentDetailPage /></Lazy>} />
              <Route path="/transactions" element={<Lazy><TransactionsPage /></Lazy>} />
              <Route path="/categories" element={<Lazy><CategoriesPage /></Lazy>} />
              <Route path="/tax-center" element={<Lazy><TaxCenterPage /></Lazy>} />
              <Route path="/analytics" element={<Lazy><AnalyticsDashboardPage /></Lazy>} />
              <Route path="/analytics/executive" element={<Lazy><ExecutiveDashboardPage /></Lazy>} />
              <Route path="/analytics/reports" element={<Lazy><ReportCenterPage /></Lazy>} />

              {/* Allowed roles for CA and Admin */}
              <Route element={<ProtectedRoute allowedRoles={[UserRole.CA, UserRole.ADMIN]} />}>
                <Route path="/clients" element={<Lazy><ClientsPage /></Lazy>} />
                <Route path="/clients/:id" element={<Lazy><ClientDetailPage /></Lazy>} />
                <Route path="/companies" element={<Lazy><CompanyListPage /></Lazy>} />
                <Route path="/companies/:companyId" element={<Lazy><CompanyDetailPage /></Lazy>} />
                {/* ML Dashboard — accessible to all authenticated users with companies */}
                <Route path="/ml-dashboard" element={<Lazy><AIDashboardPage /></Lazy>} />
                <Route path="/vendors" element={<Lazy><VendorsPage /></Lazy>} />
                <Route path="/vendors/:partyId" element={<Lazy><VendorDetailPage /></Lazy>} />
                <Route path="/customers" element={<Lazy><CustomersPage /></Lazy>} />
                <Route path="/customers/:partyId" element={<Lazy><CustomerDetailPage /></Lazy>} />
              </Route>

              <Route path="/forbidden" element={<ForbiddenPage />} />
              <Route path="*" element={<NotFoundPage />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </WorkspaceProvider>
    </AuthProvider>
  );
}
