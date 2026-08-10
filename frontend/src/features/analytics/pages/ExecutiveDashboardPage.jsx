import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useExecutiveDashboard } from "../hooks";
import { KPIGrid } from "../components/KPIGrid";

function scoreColor(score) {
  if (score >= 70) return "text-emerald-600 dark:text-emerald-400";
  if (score >= 50) return "text-amber-600 dark:text-amber-400";
  return "text-red-600 dark:text-red-400";
}

export default function ExecutiveDashboardPage() {
  const { selectedCompany } = useWorkspace();
  const { data: dashboard, isLoading } = useExecutiveDashboard(selectedCompany?.id || undefined);

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to view the executive dashboard.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-slate-100">Executive Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">A CEO/CA-level view — fewer numbers, clearer decisions.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/analytics" className="btn-secondary text-sm">
            Full Analytics
          </Link>
        </div>
      </div>

      {isLoading || !dashboard ? (
        <div className="space-y-4"><Skeleton className="h-32 w-full" /><Skeleton className="h-64 w-full" /></div>
      ) : (
        <>
          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="text-center">
              <p className="text-xs uppercase tracking-wide text-slate-400">Business Score</p>
              <p className={`mt-2 font-display text-5xl font-bold ${scoreColor(dashboard.business_score)}`}>{dashboard.business_score}</p>
              <p className="mt-1 text-xs text-slate-400">/ 100</p>
            </Card>
            <Card className="lg:col-span-2">
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Business Performance</p>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Net Profit</p>
                  <p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">
                    {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(dashboard.overview.net_profit)}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Income Growth</p>
                  <p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{dashboard.overview.income_growth}%</p>
                </div>
                <div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">Expense Growth</p>
                  <p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{dashboard.overview.expense_growth}%</p>
                </div>
              </div>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Financial Health</p>
              <p className={`font-display text-3xl font-bold ${scoreColor(dashboard.financial_health.overall_score)}`}>{dashboard.financial_health.overall_score}</p>
              <ul className="mt-2 space-y-1 text-xs text-slate-500 dark:text-slate-400">
                {dashboard.financial_health.suggestions.slice(0, 3).map((s, i) => <li key={i}>&bull; {s}</li>)}
              </ul>
            </Card>
            <Card>
              <p className="mb-2 text-xs uppercase tracking-wide text-slate-400">Tax &amp; Compliance Status</p>
              <p className={`font-display text-3xl font-bold ${scoreColor(dashboard.tax_status.score ?? 0)}`}>{dashboard.tax_status.score ?? "—"}</p>
              <p className="mt-1 text-xs capitalize text-slate-500 dark:text-slate-400">{dashboard.tax_status.status.replace(/_/g, " ")}</p>
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Top KPIs</h3>
            <KPIGrid kpis={dashboard.top_kpis} />
          </Card>

          <Card>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Quick Decisions</h3>
            <ul className="space-y-2">
              {dashboard.quick_decisions.map((d, i) => (
                <li key={i} className="flex items-start gap-2 rounded-lg border border-slate-200 p-2.5 text-sm text-slate-700 dark:border-ink-800 dark:text-slate-300">
                  <span className="mt-0.5 text-accent-500">&rarr;</span>{d}
                </li>
              ))}
            </ul>
          </Card>
        </>
      )}
    </div>
  );
}
