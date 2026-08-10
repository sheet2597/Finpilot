import { Permission, UserRole } from "@/features/auth/authorization";

export const sidebarNavItems = [
  { route: "/dashboard",    title: "Dashboard",     icon: "grid" },
  {
    route: "/clients",    title: "Clients",       icon: "users",
    permissions: [Permission.CLIENT_VIEW],
    roles: [UserRole.CA, UserRole.ADMIN],
  },
  {
    route: "/companies",  title: "Companies",     icon: "building",
    permissions: [Permission.COMPANY_VIEW],
    roles: [UserRole.CA, UserRole.ADMIN],
  },
  { route: "/documents",    title: "Documents",     icon: "file" },
  { route: "/transactions", title: "Transactions",  icon: "cash" },
  { route: "/categories",   title: "Categories",    icon: "tag" },
  { route: "/tax-center",   title: "Tax Center",    icon: "receipt",   permissions: [Permission.TAX_VIEW] },
  { route: "/analytics/reports", title: "Reports",  icon: "file" },
  {
    route: "/ml-dashboard", title: "AI Insights",   icon: "sparkle",
    roles: [UserRole.CA, UserRole.ADMIN],
  },
  { route: "/analytics",    title: "Analytics",     icon: "chart",     permissions: [Permission.ANALYTICS_VIEW] },
  
  { route: "/profile",      title: "Profile",       icon: "user" }

];
