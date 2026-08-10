import { useState } from "react";
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useTaxDashboard, useEstimateIncomeTax, useIncomeTaxHistory,
  useGstDashboard, useGstCalculator, useTdsDashboard, useTdsDeductionHistory, useTdsCalculator,
  useComplianceCenter, useFilingReadiness } from
"../hooks";


function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

const TABS = [
{ id: "overview", label: "Overview" },
{ id: "gst", label: "GST" },
{ id: "tds", label: "TDS" },
{ id: "compliance", label: "Compliance" }];



export default function TaxCenterPage() {
  const { selectedCompany } = useWorkspace();
  const [tab, setTab] = useState("overview");

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to view tax center data.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-slate-100">Tax Center</h1>
      </div>

      <div className="flex gap-1 border-b border-slate-200 dark:border-ink-800 overflow-x-auto whitespace-nowrap scrollbar-none">
        {TABS.map((t) =>
        <button
          key={t.id}
          onClick={() => setTab(t.id)}
          className={`px-4 py-2 text-sm font-medium transition ${
          tab === t.id ? "border-b-2 border-accent-dark text-accent-dark" : "text-slate-500 hover:text-ink-900 dark:text-slate-400 dark:hover:text-slate-100"}`
          }>
          
            {t.label}
          </button>
        )}
      </div>

      {tab === "overview" && <OverviewTab companyId={selectedCompany?.id} />}
      {tab === "gst" && <GstTab companyId={selectedCompany?.id} />}
      {tab === "tds" && <TdsTab companyId={selectedCompany?.id} />}
      {tab === "compliance" && <ComplianceTab companyId={selectedCompany?.id} />}
    </div>);

}

function FilingReadinessBadge({ readiness }) {
  const styles = {
    ready: "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400",
    needs_review: "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400",
    not_ready: "bg-red-50 text-red-600 dark:bg-red-500/10 dark:text-red-400"
  };
  const labels = { ready: "Ready", needs_review: "Needs Review", not_ready: "Not Ready" };
  return <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[readiness.status]}`}>{labels[readiness.status]} &middot; {readiness.score}%</span>;
}

function OverviewTab({ companyId }) {
  const { data: dashboard, isLoading } = useTaxDashboard(companyId || undefined);
  const { data: history } = useIncomeTaxHistory(companyId || undefined);
  const estimateMutation = useEstimateIncomeTax();

  if (isLoading || !dashboard) {
    return <div className="space-y-4"><Skeleton className="h-24" /><Skeleton className="h-64" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        {dashboard.disclaimer}
      </div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{dashboard.role_label} workspace &middot; FY {dashboard.financial_year}</p>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Recommended regime" value={dashboard?.estimated_tax?.recommended_regime === "old" ? "Old regime" : "New regime"} />
        <StatCard label="Estimated tax (recommended)" value={formatCurrency(dashboard?.estimated_tax?.recommended_regime === "old" ? dashboard?.estimated_tax?.old_regime_tax || 0 : dashboard?.estimated_tax?.new_regime_tax || 0)} tone="negative" />
        <StatCard label="Potential savings vs. other regime" value={formatCurrency(dashboard?.estimated_tax?.estimated_savings || 0)} tone="positive" />
        <StatCard label="Compliance score" value={`${dashboard?.compliance_score || 0}%`} tone={(dashboard?.compliance_score || 0) >= 70 ? "positive" : "negative"} />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Filing readiness" value={`${dashboard?.filing_readiness || 0}%`} />
        <StatCard label="Tax saving score" value={`${dashboard?.tax_saving_score || 0}%`} />
        <StatCard label="Net GST liability" value={formatCurrency(dashboard?.gst_summary?.net_gst_liability || 0)} />
        <StatCard label="TDS deducted" value={formatCurrency(dashboard?.tds_summary?.total_tds_deducted || 0)} />
      </div>

      {(dashboard?.missing_documents?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Missing supporting documents</h3>
          <ul className="mt-3 space-y-2 text-sm">
            {dashboard.missing_documents.map((m, i) =>
          <li key={i} className="rounded-lg border border-slate-200 p-2.5 dark:border-slate-700">
                <span className="font-medium capitalize text-ink-900 dark:text-slate-100">{m.pattern_type?.replace(/_/g, " ")}</span>
                <p className="text-slate-500 dark:text-slate-400">{m.suggestion}</p>
              </li>
          )}
          </ul>
        </Card>
      }

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Upcoming statutory due dates</h3>
        <p className="mt-1 text-xs text-slate-400">General recurring due dates — verify against official portal notifications for the current year.</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {dashboard?.upcoming_due_dates?.map((d, i) =>
          <li key={i} className="flex justify-between rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
              <span>{d.label}</span>
              <span className="text-slate-500 dark:text-slate-400">{d.frequency || d.day_month}</span>
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Income tax: old vs. new regime</h3>
          <Button
            variant="secondary"
            isLoading={estimateMutation.isLoading}
            onClick={() => estimateMutation.mutate({ company_id: companyId || undefined, financial_year: dashboard.financial_year })}>
            
            Recalculate &amp; save snapshot
          </Button>
        </div>

        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={[
          { regime: "Old regime", tax: dashboard.estimated_tax?.old_regime_tax || 0 },
          { regime: "New regime", tax: dashboard.estimated_tax?.new_regime_tax || 0 }]
          }>
            <XAxis dataKey="regime" tick={{ fontSize: 12 }} />
            <YAxis tick={{ fontSize: 11 }} />
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
            <Bar dataKey="tax" name="Estimated tax" fill="#6366F1" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>

        {history && history.length > 0 &&
        <div className="mt-4">
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Estimate history</p>
            <ul className="mt-2 space-y-1 text-sm">
              {history.map((h) =>
            <li key={h.id} className="flex justify-between">
                  <span>{h.financial_year} &middot; {new Date(h.created_at).toLocaleDateString()}</span>
                  <span className="text-slate-500 dark:text-slate-400">
                    {h.result?.recommended_regime === "old" ? formatCurrency(h.result?.old_regime?.total_tax || 0) : formatCurrency(h.result?.new_regime?.total_tax || 0)}
                    {" "}({h.result?.recommended_regime || "new"} regime)
                  </span>
                </li>
            )}
            </ul>
          </div>
        }
      </Card>
    </div>);

}

function GstTab({ companyId }) {
  const { data: dashboard, isLoading } = useGstDashboard(companyId || undefined);
  const calcMutation = useGstCalculator();
  const [taxableValue, setTaxableValue] = useState("100000");
  const [rate, setRate] = useState("0.18");
  const [supplyType, setSupplyType] = useState("intra_state");

  if (isLoading || !dashboard) return <Skeleton className="mt-6 h-64" />;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        {dashboard.disclaimer}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Output GST" value={formatCurrency(dashboard?.summary?.output_gst || 0)} />
        <StatCard label="Input GST (ITC)" value={formatCurrency(dashboard?.summary?.input_gst || 0)} />
        <StatCard label="Net GST liability" value={formatCurrency(dashboard?.summary?.net_gst_liability || 0)} tone={(dashboard?.summary?.net_gst_liability || 0) >= 0 ? "negative" : "positive"} />
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Filing readiness</p>
          <div className="mt-2">{dashboard?.filing_readiness && <FilingReadinessBadge readiness={dashboard.filing_readiness} />}</div>
        </Card>
      </div>

      {dashboard?.gstin_status?.has_company_selected &&
      <div className={`rounded-lg border p-3 text-sm ${dashboard.gstin_status.is_valid ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-400" : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400"}`}>
          GSTIN on file: {dashboard.gstin_status.gstin || "not set"} — {dashboard.gstin_status.is_valid ? "valid format" : "missing or invalid"}
        </div>
      }

      {(dashboard?.filing_readiness?.reasons?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Filing readiness checks</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            {dashboard.filing_readiness.reasons.map((r, i) => <li key={i}>&bull; {r}</li>)}
          </ul>
        </Card>
      }

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Input Tax Credit reconciliation</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <MiniStat label="Total input GST" value={formatCurrency(dashboard?.itc_reconciliation?.total_input_gst || 0)} />
          <MiniStat label="Reconciled (invoice on file)" value={formatCurrency(dashboard?.itc_reconciliation?.reconciled_input_gst || 0)} tone="positive" />
          <MiniStat label="Unreconciled (no invoice)" value={formatCurrency(dashboard?.itc_reconciliation?.unreconciled_input_gst || 0)} tone={(dashboard?.itc_reconciliation?.unreconciled_input_gst || 0) > 0 ? "negative" : "positive"} />
        </div>
        {(dashboard?.itc_reconciliation?.unreconciled_transactions?.length || 0) > 0 &&
        <ul className="mt-3 space-y-1 text-sm">
            {dashboard.itc_reconciliation.unreconciled_transactions.map((t) =>
          <li key={t.id} className="flex justify-between rounded-lg border border-slate-200 p-2 dark:border-slate-700">
                <span>{t.date} &middot; {t.description || "—"}</span>
                <span className="text-slate-500 dark:text-slate-400">{formatCurrency(t.gst_amount)}</span>
              </li>
          )}
          </ul>
        }
      </Card>

      {(dashboard?.summary?.monthly_trend?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Output vs. input GST trend</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={dashboard.summary.monthly_trend}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="output_gst" stroke="#22C55E" strokeWidth={2} name="Output GST" />
              <Line type="monotone" dataKey="input_gst" stroke="#6366F1" strokeWidth={2} name="Input GST" />
            </LineChart>
          </ResponsiveContainer>
        </Card>
      }

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">GST due dates</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {dashboard?.due_dates?.map((d, i) =>
          <li key={i} className="flex justify-between rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
              <span>{d.label}</span><span className="text-slate-500 dark:text-slate-400">{d.frequency}</span>
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">GST calculator</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <Input label="Taxable value" type="number" value={taxableValue} onChange={(e) => setTaxableValue(e.target.value)} />
          <Select label="Rate" options={[{ value: "0", label: "0%" }, { value: "0.05", label: "5%" }, { value: "0.12", label: "12%" }, { value: "0.18", label: "18%" }, { value: "0.28", label: "28%" }]} value={rate} onChange={(e) => setRate(e.target.value)} />
          <Select label="Supply type" options={[{ value: "intra_state", label: "Intra-state (CGST+SGST)" }, { value: "inter_state", label: "Inter-state (IGST)" }]} value={supplyType} onChange={(e) => setSupplyType(e.target.value)} />
          <Button className="self-end" isLoading={calcMutation.isLoading} onClick={() => calcMutation.mutate({ taxable_value: Number(taxableValue), rate: Number(rate), supply_type: supplyType })}>Calculate</Button>
        </div>
        {calcMutation.data &&
        <div className="mt-3 grid gap-3 sm:grid-cols-4 text-sm">
            <MiniStat label="CGST" value={formatCurrency(calcMutation.data.data.data.cgst)} />
            <MiniStat label="SGST" value={formatCurrency(calcMutation.data.data.data.sgst)} />
            <MiniStat label="IGST" value={formatCurrency(calcMutation.data.data.data.igst)} />
            <MiniStat label="Total invoice value" value={formatCurrency(calcMutation.data.data.data.total_invoice_value)} />
          </div>
        }
      </Card>
    </div>);

}

function TdsTab({ companyId }) {
  const { data: dashboard, isLoading } = useTdsDashboard(companyId || undefined);
  const { data: history } = useTdsDeductionHistory(companyId || undefined);
  const calcMutation = useTdsCalculator();
  const [amount, setAmount] = useState("50000");
  const [section, setSection] = useState("194J");

  if (isLoading || !dashboard) return <Skeleton className="mt-6 h-64" />;

  const sectionOptions = Object.entries(dashboard.sections_reference).map(([key, info]) => ({ value: key, label: `${key} - ${info.label} (${(info.rate * 100).toFixed(0)}%)` }));

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        {dashboard.disclaimer}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <StatCard label="Total TDS deducted" value={formatCurrency(dashboard?.summary?.total_tds_deducted || 0)} tone="negative" />
        <StatCard label="TDS transactions" value={String(dashboard?.summary?.transaction_count || 0)} />
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Filing readiness</p>
          <div className="mt-2">{dashboard?.filing_readiness && <FilingReadinessBadge readiness={dashboard.filing_readiness} />}</div>
        </Card>
      </div>

      {(dashboard?.filing_readiness?.reasons?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Filing readiness checks</h3>
          <ul className="mt-2 space-y-1 text-sm text-slate-500 dark:text-slate-400">
            {dashboard.filing_readiness.reasons.map((r, i) => <li key={i}>&bull; {r}</li>)}
          </ul>
        </Card>
      }

      {history && history.length > 0 &&
      <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Description</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">TDS</th><th className="px-4 py-3">Section (guessed)</th><th className="px-4 py-3">Vendor on file</th></tr>
              </thead>
              <tbody>
                {history.map((h) =>
              <tr key={h.id} className="border-b border-slate-50 dark:border-ink-800/50">
                    <td className="px-4 py-3">{h.date}</td>
                    <td className="px-4 py-3">{h.description || "—"}</td>
                    <td className="px-4 py-3">{formatCurrency(h.amount)}</td>
                    <td className="px-4 py-3">{formatCurrency(h.tds_amount)}</td>
                    <td className="px-4 py-3">{h.guessed_section_label || "Unconfirmed"}</td>
                    <td className="px-4 py-3">{h.has_vendor_on_file ? "Yes" : "No"}</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </Card>
      }

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">TDS due dates</h3>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {dashboard?.due_dates?.map((d, i) =>
          <li key={i} className="flex justify-between rounded-lg border border-slate-200 p-2.5 text-sm dark:border-slate-700">
              <span>{d.label}</span><span className="text-slate-500 dark:text-slate-400">{d.frequency || d.day_month}</span>
            </li>
          )}
        </ul>
      </Card>

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">TDS calculator</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <Input label="Gross amount" type="number" value={amount} onChange={(e) => setAmount(e.target.value)} />
          <Select label="Section" options={sectionOptions} value={section} onChange={(e) => setSection(e.target.value)} />
          <Button className="self-end" isLoading={calcMutation.isLoading} onClick={() => calcMutation.mutate({ amount: Number(amount), section })}>Calculate</Button>
        </div>
        {calcMutation.data &&
        <div className="mt-3 grid gap-3 sm:grid-cols-3 text-sm">
            <MiniStat label="TDS to withhold" value={formatCurrency(calcMutation.data.data.data.tds_amount)} tone="negative" />
            <MiniStat label="Net payable" value={formatCurrency(calcMutation.data.data.data.net_payable)} tone="positive" />
            <MiniStat label="Rate applied" value={`${(calcMutation.data.data.data.rate * 100).toFixed(0)}%`} />
          </div>
        }
      </Card>
    </div>);

}

const SEVERITY_STYLES = {
  high: "border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400",
  warning: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400",
  info: "border-slate-200 bg-slate-50 text-slate-600 dark:border-ink-800 dark:bg-ink-900 dark:text-slate-400"
};

function ComplianceTab({ companyId }) {
  const { data: compliance, isLoading } = useComplianceCenter({ companyId: companyId || undefined });
  const { data: readiness } = useFilingReadiness(companyId || undefined);

  if (isLoading || !compliance) return <Skeleton className="mt-6 h-64" />;

  return (
    <div className="mt-6 space-y-6">
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">
        {compliance.disclaimer}
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Overall compliance score" value={`${compliance?.overall_compliance_score || 0}%`} tone={(compliance?.overall_compliance_score || 0) >= 70 ? "positive" : "negative"} />
        <StatCard label="GST compliance" value={`${compliance?.gst_compliance_score ?? "—"}%`} />
        <StatCard label="TDS compliance" value={`${compliance?.tds_compliance_score ?? "—"}%`} />
        <StatCard label="Income tax compliance" value={`${compliance?.income_tax_compliance_score ?? "—"}%`} />
      </div>

      {companyId && readiness &&
      <Card>
          <div className="flex items-center justify-between">
            <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Filing readiness</h3>
            <FilingReadinessBadge readiness={readiness} />
          </div>
          <ul className="mt-3 space-y-2 text-sm">
            {readiness.checks.map((c) =>
          <li key={c.category} className="flex items-start gap-2">
                <span className={c.passed ? "text-emerald-600" : "text-red-500"}>{c.passed ? "✓" : "✗"}</span>
                <span className="text-slate-500 dark:text-slate-400"><span className="font-medium capitalize text-ink-900 dark:text-slate-100">{c.category.replace(/_/g, " ")}:</span> {c.detail}</span>
              </li>
          )}
          </ul>
        </Card>
      }

      {(compliance?.high_priority_issues?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">High priority issues</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {compliance.high_priority_issues.map((issue, i) =>
          <li key={i} className="rounded-lg border border-red-200 bg-red-50 p-2.5 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400">{issue}</li>
          )}
          </ul>
        </Card>
      }

      {(compliance?.warnings?.length || 0) > 0 &&
      <Card>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Warnings</h3>
          <ul className="mt-2 space-y-2 text-sm">
            {compliance.warnings.map((w, i) =>
          <li key={i} className="rounded-lg border border-amber-200 bg-amber-50 p-2.5 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-400">{w}</li>
          )}
          </ul>
        </Card>
      }

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Compliance timeline</h3>
        <ul className="mt-3 space-y-2 text-sm">
          {compliance?.timeline?.map((e, i) =>
          <li key={i} className={`rounded-lg border p-2.5 ${SEVERITY_STYLES[e.severity]}`}>{e.message}</li>
          )}
        </ul>
      </Card>

      {(compliance?.companies?.length || 0) > 1 &&
      <Card className="!p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr><th className="px-4 py-3" scope="col">Company</th><th className="px-4 py-3" scope="col">Overall</th><th className="px-4 py-3" scope="col">GST</th><th className="px-4 py-3" scope="col">TDS</th><th className="px-4 py-3" scope="col">Income Tax</th><th className="px-4 py-3" scope="col">Filing status</th></tr>
              </thead>
              <tbody>
                {compliance.companies.map((c) =>
              <tr key={c.company_id} className="border-b border-slate-50 dark:border-ink-800/50">
                    <td className="px-4 py-3">{c.company_id}</td>
                    <td className="px-4 py-3">{c.overall_score}%</td>
                    <td className="px-4 py-3">{c.gst_score}%</td>
                    <td className="px-4 py-3">{c.tds_score}%</td>
                    <td className="px-4 py-3">{c.income_tax_score}%</td>
                    <td className="px-4 py-3 capitalize">{c.filing_readiness_status?.replace(/_/g, " ")}</td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        </Card>
      }
    </div>);

}

function StatCard({ label, value, tone }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-2 font-display text-2xl font-semibold ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-500" : "text-ink-900 dark:text-slate-100"}`}>
        {value}
      </p>
    </Card>);

}

function MiniStat({ label, value, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-500" : "text-ink-900 dark:text-slate-100"}`}>{value}</p>
    </div>);

}