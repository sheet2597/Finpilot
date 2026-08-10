import { Card } from "@/components/ui/Card";

const LABELS = {
  highest_spending_category: "Highest Spending Category",
  highest_revenue_source: "Highest Revenue Source",
  vendor_dependency: "Vendor Dependency",
  customer_dependency: "Customer Dependency",
  cash_flow_risk: "Cash Flow Risk",
  profitability_trend: "Profitability Trend",
  business_growth: "Business Growth",
  financial_stability: "Financial Stability",
  risk_indicators: "Risk Indicators",
};

export function BusinessInsightsList({ insights }) {
  return (
    <Card>
      <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Business Intelligence</h3>
      {insights.length === 0 ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">No standout patterns yet — insights build up as more history accumulates.</p>
      ) : (
        <div className="space-y-2">
          {insights.map((insight, i) => (
            <div key={i} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-ink-800">
              <p className="font-medium text-ink-900 dark:text-slate-100">{LABELS[insight.type] || insight.type}</p>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{insight.explanation}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
