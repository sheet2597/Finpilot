import { Link } from "react-router-dom";
import { useAuth } from "@/features/auth/AuthContext";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { useDashboardSummary } from "../hooks";
import { useClients } from "@/features/clients/hooks";
import { getUserRole, UserRole } from "@/features/auth/authorization";

// Dashboard widget definitions (inlined from dashboard.config)
const dashboardWidgets = [
  { id: "clients", title: "Total Clients", priority: 1, roles: [UserRole.CA], link: "/clients" },
  { id: "companies_ca", title: "Total Companies", priority: 2, roles: [UserRole.CA], link: "/companies" },
  { id: "compliance_score", title: "Compliance Score", priority: 4, roles: [UserRole.CA] },
  { id: "users", title: "Total Users", priority: 1, roles: [UserRole.ADMIN] },
];


const CURRENCY_WIDGETS = new Set([
  "income", "expenses", "tax_summary", "business_income", "client_payments", "sales", "employees",
]);

export default function DashboardPage() {
  const { user } = useAuth();
  const { selectedCompany } = useWorkspace();
  const { data: summary, isLoading } = useDashboardSummary();
  const { data: clientsData } = useClients({ page_size: 1 });
  const hasClients = clientsData?.pagination?.total > 0;

  if (!user) return null;

  const role = getUserRole(user);
  const widgets = dashboardWidgets.
  filter((w) => !w.roles || w.roles.includes(role)).
  sort((a, b) => a.priority - b.priority);

  const formatValue = (id, val) => {
    if (CURRENCY_WIDGETS.has(id)) {
      const num = val === undefined || val === null ? 0 : Number(val);
      return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(num);
    }
    if (val === undefined || val === null) return "0";
    return val.toString();
  };

  const getWidgetValue = (id) => {
    if (!summary || !summary.metrics) return null;
    const keyMap = {
      income: "income",
      expenses: "expenses",
      tax_summary: "tax_summary",
      clients: "clients",
      companies_ca: "companies",
      compliance_score: "compliance_score",
      review_queue: "review_queue",
      audit_cases: "audit_cases",
      users: "users",
    };
    const metricKey = keyMap[id];
    return metricKey ? summary.metrics[metricKey] : null;
  };

  return (
    <div className="space-y-6">
      <Card className="bg-ink-950 text-white p-6 rounded-xl shadow-lg border border-white/5 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-32 h-32 bg-accent/20 rounded-full blur-2xl transform translate-x-10 -translate-y-10" />
        <p className="text-sm text-slate-400 font-medium">Welcome back,</p>
        <h2 className="mt-1 font-display text-2xl font-semibold tracking-tight">{user.full_name}</h2>
        <p className="mt-2 max-w-md text-sm text-slate-400">
          Logged in as <span className="text-accent-light font-medium">{role}</span>.
          {selectedCompany ? (
            <> Viewing <span className="text-slate-200 font-medium">{selectedCompany.name}</span>.</>
          ) : (
            " Here's your workspace overview."
          )}
        </p>
      </Card>

      {/* Onboarding Checklist for New Users */}
      {summary?.user_type === "standard" && summary.total_companies === 0 &&
      <Card className="p-6 border border-blue-200 dark:border-blue-900 bg-blue-50/20 dark:bg-blue-950/10 rounded-xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h3 className="font-display text-base font-semibold text-blue-900 dark:text-blue-300">Getting Started Checklist</h3>
              <p className="text-sm text-blue-700 dark:text-blue-400 mt-1">Complete these steps to fully activate your financial intelligence dashboards.</p>
            </div>
            <div className="text-xs font-semibold bg-blue-500/10 text-blue-600 dark:text-blue-400 px-3 py-1 rounded-full">
              Step 1 of 4
            </div>
          </div>
          
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 border border-slate-200 bg-white dark:bg-ink-900 rounded-xl space-y-2 relative opacity-60">
              <span className="absolute top-2 right-2 text-emerald-500 text-lg leading-none">✓</span>
              <span className="text-xs font-bold text-slate-400">Step 1</span>
              <p className="text-sm font-semibold text-ink-900 dark:text-slate-100">Verify Profile</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">OTP code verified.</p>
            </div>
            <div className="p-4 border border-blue-200 dark:border-blue-800 bg-white dark:bg-ink-900 rounded-xl space-y-2 relative shadow-md">
              <span className="text-xs font-bold text-blue-500">Step 2 (Active)</span>
              <p className="text-sm font-semibold text-ink-900 dark:text-slate-100">Create Company</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Add settings & PAN/GST details.</p>
              <Link to="/companies" className="text-xs text-blue-600 dark:text-blue-400 font-semibold hover:underline block pt-2">Go to Companies →</Link>
            </div>
            <div className="p-4 border border-slate-200 bg-white dark:bg-ink-900 rounded-xl space-y-2 relative opacity-50">
              <span className="text-xs font-bold text-slate-400">Step 3</span>
              <p className="text-sm font-semibold text-ink-900 dark:text-slate-100">Import Transactions</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Upload bank files or CSVs.</p>
            </div>
            <div className="p-4 border border-slate-200 dark:border-ink-800 bg-white dark:bg-ink-900 rounded-xl space-y-2 relative opacity-50">
              <span className="text-xs font-bold text-slate-400">Step 4</span>
              <p className="text-sm font-semibold text-ink-900 dark:text-slate-100">Set Preferences</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">Configure default display currency.</p>
            </div>
          </div>
        </Card>
      }

      {/* Dynamic Widgets Grid */}
      <div>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100 mb-4">Workspace Statistics</h3>
        {isLoading ?
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) =>
          <Skeleton key={i} className="h-28 w-full rounded-xl" />
          )}
          </div> :
        widgets.length === 0 ?
        <p className="text-sm text-slate-500">No widgets available for this role.</p> :

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {widgets.map((widget) => {
            const rawValue = getWidgetValue(widget.id);
            return (
              <Card key={widget.id} className="p-5 hover:shadow-md transition duration-200 border border-slate-100 dark:border-ink-800 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1.5 h-full bg-accent dark:bg-accent-dark opacity-75 group-hover:opacity-100 transition" />
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{widget.title}</p>
                  <p className="mt-2 font-display text-2xl font-bold text-ink-900 dark:text-slate-100">
                    {formatValue(widget.id, rawValue)}
                  </p>
                  {widget.link && (
                    <Link to={widget.link} className="absolute inset-0 z-10" aria-label={`Go to ${widget.title}`} />
                  )}
                </Card>);

          })}
          </div>
        }
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Companies list */}
        <Card className="p-5 border border-slate-100 dark:border-ink-800 rounded-xl">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Recent companies</h3>
            {role !== "Individual" &&
            <Link to="/companies" className="text-sm font-medium bg-accent text-white px-3 py-1.5 rounded-lg hover:bg-accent-dark transition flex items-center gap-1">
              Add company
            </Link>
            }
          </div>
          {isLoading ?
          <div className="mt-4 space-y-3">
              {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div> :
          !summary?.recent_companies?.length ?
          <div className="mt-4">
              <EmptyState title="No companies yet" description="Companies you create will show up here." />
            </div> :

          <ul className="mt-4 divide-y divide-slate-100 dark:divide-ink-800">
              {summary.recent_companies.map((company) =>
            <li key={company.id} className="flex items-center justify-between py-3">
                  <Link to={`/companies/${company.id}`} className="font-medium text-ink-900 hover:text-accent-dark dark:text-slate-100 hover:underline">
                    {company.name}
                  </Link>
                  <span className="text-xs text-slate-400">{new Date(company.created_at).toLocaleDateString()}</span>
                </li>
            )}
            </ul>
          }
        </Card>

        {/* Quick Actions / Shortcuts */}
        <Card className="p-5 border border-slate-100 dark:border-ink-800 rounded-xl">
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Quick Shortcuts</h3>
          <div className="mt-4 grid grid-cols-2 gap-3">
            <Link to="/clients" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 dark:border-ink-800 hover:bg-slate-50 dark:hover:bg-ink-800 text-center transition group">
              <span className="text-xl group-hover:scale-110 transition-transform">👥</span>
              <span className="mt-1 text-xs font-medium text-ink-900 dark:text-slate-200">+ Add Client</span>
            </Link>

            {hasClients ? (
              <Link to="/companies" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 dark:border-ink-800 hover:bg-slate-50 dark:hover:bg-ink-800 text-center transition group">
                <span className="text-xl group-hover:scale-110 transition-transform">🏢</span>
                <span className="mt-1 text-xs font-medium text-ink-900 dark:text-slate-200">+ Add Company</span>
              </Link>
            ) : (
              <div className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 dark:border-ink-800 bg-slate-50/50 dark:bg-ink-900/50 text-center cursor-not-allowed opacity-60" title="Create a client before creating companies.">
                <span className="text-xl grayscale">🏢</span>
                <span className="mt-1 text-xs font-medium text-slate-500">+ Add Company</span>
              </div>
            )}

            <Link to="/documents" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 dark:border-ink-800 hover:bg-slate-50 dark:hover:bg-ink-800 text-center transition group">
              <span className="text-xl group-hover:scale-110 transition-transform">📄</span>
              <span className="mt-1 text-xs font-medium text-ink-900 dark:text-slate-200">+ Upload Documents</span>
            </Link>
            <Link to="/analytics" className="flex flex-col items-center justify-center p-3 rounded-lg border border-slate-100 dark:border-ink-800 hover:bg-slate-50 dark:hover:bg-ink-800 text-center transition group">
              <span className="text-xl group-hover:scale-110 transition-transform">📊</span>
              <span className="mt-1 text-xs font-medium text-ink-900 dark:text-slate-200">+ Generate Report</span>
            </Link>
          </div>
        </Card>
      </div>
    </div>);

}