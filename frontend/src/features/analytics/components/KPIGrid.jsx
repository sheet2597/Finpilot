import { Card } from "@/components/ui/Card";

function formatValue(kpi) {
  if (kpi.unit === "percent") return `${kpi.current_value}%`;
  if (kpi.unit === "score") return `${kpi.current_value}`;
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(kpi.current_value);
}

const TREND_STYLES = {
  up: "text-emerald-600 dark:text-emerald-400",
  down: "text-red-600 dark:text-red-400",
  flat: "text-slate-500",
};

const TREND_ICON = { up: "▲", down: "▼", flat: "—" };

export function KPIGrid({ kpis }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
      {kpis.map((kpi) => (
        <Card key={kpi.name} className="!p-3">
          <p className="text-xs text-slate-500 dark:text-slate-400">{kpi.name}</p>
          <p className="mt-1 font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{formatValue(kpi)}</p>
          <p className={`mt-0.5 text-xs font-medium ${TREND_STYLES[kpi.trend]}`}>
            {TREND_ICON[kpi.trend]} {Math.abs(kpi.percentage_change)}% vs previous
          </p>
        </Card>
      ))}
    </div>
  );
}
