import { NavLink } from "react-router-dom";
import {
  Building2, Users, LayoutGrid, User, Settings, FileText,
  Banknote, Tag, Truck, Receipt, Sparkles, BarChart2,
} from "lucide-react";
import { useAuth } from "@/features/auth/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { sidebarNavItems } from "./sidebar.config";
import { getUserRole, hasPermission } from "@/features/auth/authorization";

const iconMap = {
  building: Building2,
  users: Users,
  users_party: Users,
  grid: LayoutGrid,
  user: User,
  gear: Settings,
  file: FileText,
  cash: Banknote,
  tag: Tag,
  truck: Truck,
  receipt: Receipt,
  sparkle: Sparkles,
  chart: BarChart2,
};

export function Sidebar({ onNavigate }) {
  const { user } = useAuth();
  const { selectedCompany } = useWorkspace();

  const filteredNavItems = sidebarNavItems.filter((item) => {
    if (item.roles && item.roles.length > 0) {
      const userRole = getUserRole(user);
      if (!item.roles.includes(userRole)) {
        return false;
      }
    }
    if (item.permissions && item.permissions.length > 0) {
      const hasAll = item.permissions.every((perm) => hasPermission(user, perm));
      if (!hasAll) {
        return false;
      }
    }
    return true;
  });

  const allowedPathsWithoutCompany = ["/dashboard", "/clients", "/companies", "/categories","/profile"];
  const finalNavItems = filteredNavItems.filter((item) => {
    if (!selectedCompany?.id && !allowedPathsWithoutCompany.includes(item.route)) {
      return false;
    }
    return true;
  });

  const displayWorkspace = user ? `${getUserRole(user)} workspace` : "Workspace";

  return (
    <div className="flex h-full w-64 flex-col bg-ink-950 text-slate-300">
      <div className="flex items-center justify-between px-6 py-6 border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent font-display text-sm font-bold text-white">
            FP
          </div>
          <a href="/dashboard" className="font-display text-base font-semibold text-white">
            FinPilot
          </a>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-4 overflow-y-auto scrollbar-none">
        {finalNavItems.map(({ route, title, icon }) => {
          const Icon = iconMap[icon] || LayoutGrid;
          return (
            <NavLink
              key={route}
              to={route}
              end={route === "/analytics" || route === "/dashboard"}
              onClick={onNavigate}
              className={({ isActive }) =>
                `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive ? "bg-white/10 text-white" : "text-slate-200 hover:bg-white/5 hover:text-white"
                }`
              }
            >
              <Icon size={18} />
              {title}
            </NavLink>
          );
        })}
      </nav>

      <div className="border-t border-white/10 px-6 py-4 text-xs text-slate-500">
        {displayWorkspace}
      </div>
    </div>
  );
}
