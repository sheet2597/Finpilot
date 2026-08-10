import { Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useAnalyticsDashboard, useCategoryAnalysis, usePeriodAnalysis } from "../hooks";
import { KPIGrid } from "../components/KPIGrid";
import { TrendChart } from "../components/TrendChart";
import { CategoryDonutChart } from "../components/CategoryDonutChart";
import { BusinessInsightsList } from "../components/BusinessInsightsList";

export default function AnalyticsDashboardPage() {
  const { selectedCompany } = useWorkspace();

  const { data: dashboard, isLoading } = useAnalyticsDashboard(selectedCompany?.id || undefined);
  const { data: monthly } = usePeriodAnalysis("monthly", selectedCompany?.id || undefined);
  const { data: expenseCategories } = useCategoryAnalysis("expense", selectedCompany?.id || undefined);

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to view its analytics data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-slate-100">Analytics Dashboard</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Reports, KPIs, and Business Intelligence across Parts 4–6.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/analytics/executive" className="btn-secondary text-sm">
            Executive View
          </Link>
          <Link to="/analytics/reports" className="btn-primary text-sm">
            Report Center
          </Link>
        </div>
      </div>

      {isLoading || !dashboard ? (
        <div className="space-y-4">
          <Skeleton className="h-24 w-full" /><Skeleton className="h-64 w-full" /><Skeleton className="h-64 w-full" />
        </div>
      ) : (
        <>
          <KPIGrid kpis={dashboard.kpis} />

          <div className="grid gap-3 sm:grid-cols-4">
            {Object.entries(dashboard.quick_statistics).map(([key, value]) => (
              <Card key={key} className="!p-3 text-center">
                <p className="font-display text-xl font-semibold text-ink-900 dark:text-slate-100">{value}</p>
                <p className="text-xs capitalize text-slate-500 dark:text-slate-400">{key.replace(/_/g, " ")}</p>
              </Card>
            ))}
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Income vs Expense (Monthly)</h3>
              <TrendChart
                data={(monthly || []).map((m) => ({ period: m.period, income: m.income, expense: m.expense }))}
                dataKey="income" style="area"
              />
            </Card>
            <Card>
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Expense Breakdown</h3>
              <CategoryDonutChart data={expenseCategories || []} />
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <BusinessInsightsList insights={dashboard.business_intelligence} />
            <Card>
              <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Top Alerts</h3>
              {dashboard.top_alerts.length === 0 ? (
                <p className="text-sm text-slate-500 dark:text-slate-400">No active alerts.</p>
              ) : (
                <ul className="space-y-2">
                  {dashboard.top_alerts.map((a, i) => (
                    <li key={i} className="rounded-lg border border-slate-200 p-2.5 text-sm dark:border-ink-800">
                      <span className="mr-2 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{a.level}</span>
                      {a.message}
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Recent Reports</h3>
            {dashboard.recent_reports.length === 0 ? (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                No reports generated yet — visit the <Link to="/analytics/reports" className="text-accent-600 underline dark:text-accent-400">Report Center</Link> to create one.
              </p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-ink-800">
                {dashboard.recent_reports.map((r, i) => (
                  <li key={i} className="flex items-center justify-between py-2 text-sm">
                    <span className="capitalize text-ink-900 dark:text-slate-100">{r.report_type.replace(/-/g, " ")}</span>
                    <span className="text-xs text-slate-400">{r.format.toUpperCase()} &middot; {new Date(r.generated_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </>
      )}
    </div>
  );
}
