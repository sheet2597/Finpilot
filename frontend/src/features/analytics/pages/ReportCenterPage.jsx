import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useReportCatalog, useGlobalSearch, downloadAnalyticsReport, downloadBatchExport } from "../hooks";

export default function ReportCenterPage() {
  const { selectedCompany } = useWorkspace();
  const [selected, setSelected] = useState([]);
  const [batchFormat, setBatchFormat] = useState("xlsx");
  const [query, setQuery] = useState("");

  const { data: catalog, isLoading } = useReportCatalog();
  const search = useGlobalSearch();

  const analyticsReports = (catalog || []).filter((r) => r.source === "analytics" && r.report_type !== "batch-export");
  const mlReports = (catalog || []).filter((r) => r.source === "ml");

  function toggle(reportType) {
    setSelected((prev) => (prev.includes(reportType) ? prev.filter((r) => r !== reportType) : [...prev, reportType]));
  }

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to access the report center.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold text-ink-900 dark:text-slate-100">Report Center</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">Generate, search, and batch-export reports across the whole project.</p>
        </div>
      </div>

      <Card>
        <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Global Search</h3>
        <div className="flex gap-2">
          <Input
            placeholder="Search report names, vendors, customers, invoices, categories..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && query && search.mutate({ q: query, companyId: selectedCompany?.id || undefined })}
          />
          <Button onClick={() => query && search.mutate({ q: query, companyId: selectedCompany?.id || undefined })} isLoading={search.isLoading}>Search</Button>
        </div>
        {search.data && (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 text-sm">
            {["reports", "vendors", "customers", "categories"].map((key) => (
              <div key={key}>
                <p className="mb-1 text-xs font-medium uppercase tracking-wide text-slate-400">{key}</p>
                <ul className="space-y-1">
                  {search.data.data.data[key].map((item, i) => (
                    <li key={i} className="text-slate-600 dark:text-slate-300">{item.label || item.name}</li>
                  ))}
                  {search.data.data.data[key].length === 0 && <li className="text-slate-400">No matches</li>}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="font-display text-sm font-semibold text-ink-900 dark:text-slate-100">Batch Export</h3>
          <div className="flex items-center gap-2">
            <Select className="w-28" options={[{ value: "xlsx", label: "XLSX" }, { value: "pdf", label: "PDF" }, { value: "csv", label: "CSV" }]} value={batchFormat} onChange={(e) => setBatchFormat(e.target.value)} />
            <Button disabled={selected.length === 0} onClick={() => downloadBatchExport(selected, batchFormat, selectedCompany?.id || undefined)}>
              Export {selected.length > 0 ? `(${selected.length})` : ""}
            </Button>
          </div>
        </div>
        <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Select reports below, or use single-report download for AI/ML reports (not eligible for batch export).</p>
      </Card>

      {isLoading ? (
        <p className="text-sm text-slate-500 dark:text-slate-400">Loading report catalog...</p>
      ) : (
        <>
          <ReportSection
            title="Financial & Accounting Reports" reports={analyticsReports}
            selected={selected} onToggle={toggle} companyId={selectedCompany?.id}
          />
          <ReportSection
            title="ML Reports (from the ML Models page)"
            reports={mlReports}
            selected={selected} onToggle={toggle} companyId={selectedCompany?.id} batchEligible={false}
          />
        </>
      )}
    </div>
  );
}

function ReportSection({
  title, reports, selected, onToggle, companyId, batchEligible = true,
}) {
  return (
    <Card>
      <h3 className="mb-3 font-display text-sm font-semibold text-ink-900 dark:text-slate-100">{title}</h3>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {reports.map((r) => (
          <div key={r.report_type} className="flex items-center justify-between rounded-lg border border-slate-200 p-2.5 text-sm dark:border-ink-800">
            <label className="flex items-center gap-2">
              {batchEligible && (
                <input type="checkbox" checked={selected.includes(r.report_type)} onChange={() => onToggle(r.report_type)} className="rounded border-slate-300" />
              )}
              <span className="text-ink-900 dark:text-slate-100">{r.label}</span>
            </label>
            <div className="flex gap-1">
              {["xlsx", "pdf"].map((fmt) => (
                <button
                  key={fmt}
                  className="rounded border border-slate-200 px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-50 dark:border-ink-700 dark:text-slate-400 dark:hover:bg-ink-800"
                  onClick={() => downloadAnalyticsReport(r.report_type, fmt, companyId || undefined)}
                >
                  {fmt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}
