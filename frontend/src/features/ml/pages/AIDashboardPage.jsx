import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useWorkspace } from "@/hooks/useWorkspace";
import {
  useModelStatus,
  useTrainAllModels,
  useTrainSingleModel,
  useDuplicateTransactions,
  useComplianceRisk,
  useTaxForecast,
  useExpenseForecast,
  useModelReadiness,
  useTrainDemoModel,
  downloadMLReport } from
"../hooks";


function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

function StatusBadge({ status }) {
  const colors = {
    trained: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30",
    not_trained: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    skipped: "bg-slate-100 text-slate-500 border-slate-200 dark:bg-slate-500/20 dark:text-slate-400 dark:border-slate-500/30",
    High: "bg-red-100 text-red-700 border-red-200 dark:bg-red-500/20 dark:text-red-400 dark:border-red-500/30",
    Medium: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30",
    Low: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30"
  };
  return (
    <span className={`px-2 py-0.5 rounded border text-xs font-medium ${colors[status] || "bg-slate-500/20 text-slate-500 dark:text-slate-400 border-slate-500/30"}`}>
      {status}
    </span>);

}

const MODEL_LABELS = {
  expense_categorization: {
    label: "Expense Categorization",
    description: "Automatically assigns categories to transactions based on description, vendor and amount.",
    icon: "🏷️"
  },
  fraud_detection: {
    label: "anomaly detection",
    description: "Anomaly detection identifies suspicious and duplicate transactions.",
    icon: "🔍"
  },
  compliance_risk: {
    label: "Compliance Risk Prediction",
    description: "Predicts GST/TDS compliance risk from transaction and document patterns.",
    icon: "⚖️"
  },
  tax_liability_forecast: {
    label: "Tax Liability Forecast",
    description: "Forecasts future tax liability from historical monthly patterns.",
    icon: "📊"
  },
  expense_forecast: {
    label: "Expense Forecast",
    description: "Projects upcoming monthly expenses with confidence intervals.",
    icon: "📈"
  }
};

const REPORTS = [
{ id: "duplicate-transactions", label: "anomaly detection" },
{ id: "compliance-risk", label: "Compliance Risk Report" },
{ id: "tax-prediction", label: "Tax Liability Forecast Report" },
{ id: "expense-forecast", label: "Expense Forecast Report" }];


export default function MLDashboardPage() {
  const { selectedCompany } = useWorkspace();
  const [activeTab, setActiveTab] = useState("overview");
  const [reportFormat, setReportFormat] = useState("xlsx");
  const [downloadingReport, setDownloadingReport] = useState(null);

  const { data: modelStatus, isLoading: isStatusLoading, refetch: refetchStatus } = useModelStatus();
  const { data: modelReadiness } = useModelReadiness(selectedCompany?.id);
  const trainAll = useTrainAllModels();
  const trainSingle = useTrainSingleModel();
  const trainDemo = useTrainDemoModel();

  const { data: duplicates, isLoading: isDuplicatesLoading } = useDuplicateTransactions(activeTab === "duplicates" ? selectedCompany?.id : undefined);
  const { data: complianceRisks, isLoading: isComplianceLoading } = useComplianceRisk(activeTab === "compliance" ? selectedCompany?.id : undefined);
  const { data: taxForecast, isLoading: isTaxLoading } = useTaxForecast(3);
  const { data: expenseForecast, isLoading: isExpenseLoading } = useExpenseForecast(3);

  const handleTrainAll = async () => {
    await trainAll.mutateAsync();
    refetchStatus();
  };

  const handleTrainSingle = async (modelType) => {
    await trainSingle.mutateAsync({ modelType, companyId: selectedCompany?.id });
    refetchStatus();
  };

  const handleTrainDemo = async (modelType) => {
    await trainDemo.mutateAsync({ modelType, companyId: selectedCompany?.id });
    refetchStatus();
  };

  const handleDownloadReport = async (reportId) => {
    setDownloadingReport(reportId);
    await downloadMLReport(reportId, reportFormat, selectedCompany?.id || undefined);
    setDownloadingReport(null);
  };

  const tabs = [
  { id: "overview", label: "Model Overview" },
  { id: "duplicates", label: "Anomaly Detection" },
  { id: "compliance", label: "Compliance Risk" },
  { id: "forecasts", label: "Forecasts" },
  { id: "reports", label: "Reports" }];


  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to access the ML models.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink-900 dark:text-slate-100">Make Prediction With AI</h1>
          
        </div>
        <div className="flex gap-2 items-center">
          <Button
            id="train-all-btn"
            variant="primary"
            onClick={handleTrainAll}
            isLoading={trainAll.isLoading}
            disabled={trainAll.isLoading}>
            
            All Finacial Sync
          </Button>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex gap-1 p-1 bg-surface-muted dark:bg-ink-900 rounded-xl border border-slate-200 dark:border-ink-800 w-fit">
        {tabs.map((tab) =>
        <button
          key={tab.id}
          id={`ml-tab-${tab.id}`}
          onClick={() => setActiveTab(tab.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
          activeTab === tab.id ?
          "bg-indigo-600 text-white shadow dark:bg-indigo-500" :
          "text-slate-500 dark:text-slate-400 hover:text-ink-900 dark:hover:text-white hover:bg-slate-200 dark:hover:bg-ink-800"}`
          }>
          
            {tab.label}
          </button>
        )}
      </div>

      {/* ── Tab: Model Overview ── */}
      {activeTab === "overview" &&
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {Object.entries(MODEL_LABELS).map(([modelType, meta]) => {
          const entry = modelStatus?.find((m) => m.model_type === modelType);
          const status = entry ? "trained" : "not_trained";
          return (
            <Card key={modelType} className="p-5 border-slate-200 dark:border-ink-800 hover:border-indigo-500/40 transition-all">
                <div className="flex items-start justify-between mb-3">
                  <span className="text-2xl">{meta.icon}</span>
                  {/* <StatusBadge status={status} /> */}
                </div>
                <h3 className="font-semibold text-ink-900 dark:text-slate-100 text-sm mb-1">{meta.label}</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs leading-relaxed mb-4">{meta.description}</p>
                {entry &&
              <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                    
                    {entry.metrics?.accuracy != null &&
                <div className="bg-slate-100 dark:bg-ink-950/50 rounded p-2 col-span-2">
                        <div className="text-slate-500 dark:text-slate-400">Accuracy</div>
                        <div className="text-emerald-600 dark:text-emerald-400 font-medium">{(entry.metrics.accuracy * 100).toFixed(1)}%</div>
                      </div>
                }
                  </div>
              }
                {entry && entry.is_demo_model && (
                  <div className="mb-4 p-2 bg-amber-50 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800 rounded text-xs text-amber-800 dark:text-amber-200">
                    <span className="font-bold">⚠ Demo Model</span>
                    <p className="mt-1">This model was trained using deterministic demonstration labels. Do not use for production predictions.</p>
                  </div>
                )}
                
                {entry && !entry.is_demo_model && (
                  <div className="mb-4 p-2 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 rounded text-xs text-emerald-800 dark:text-emerald-200">
                    <span className="font-bold">✓ Production Model</span>
                    <p className="mt-1">Active and using real historical data.</p>
                  </div>
                )}

                {modelReadiness && modelReadiness[modelType] && (
                  <div className="text-xs mb-3 space-y-2">
                    {/* Production Readiness */}
                    <div className="p-2 bg-slate-50 dark:bg-ink-900 rounded border border-slate-200 dark:border-ink-800 space-y-1">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-500 font-medium">Production Ready:</span>
                        <span className={(modelReadiness[modelType].production?.ready || modelReadiness[modelType].ready) ? "text-emerald-600 font-medium" : "text-red-500 font-medium"}>
                          {(modelReadiness[modelType].production?.ready || modelReadiness[modelType].ready) ? "✓ YES" : "✗ NO"}
                        </span>
                      </div>
                      
                      {(() => {
                         const prodData = modelReadiness[modelType].production || modelReadiness[modelType];
                         return (
                           <>
                              <div className="flex justify-between items-center">
                                <span className="text-slate-500">Available Samples:</span>
                                <span className="text-ink-900 dark:text-slate-200 font-medium">{prodData.available_samples} / {prodData.required_samples}</span>
                              </div>
                              {prodData.unique_classes !== undefined && (
                                <div className="flex justify-between items-center">
                                  <span className="text-slate-500">Unique Classes:</span>
                                  <span className="text-ink-900 dark:text-slate-200 font-medium">{prodData.unique_classes}</span>
                                </div>
                              )}
                              {prodData.reason && (
                                <div className="mt-1 text-amber-600 dark:text-amber-500 italic">
                                  {prodData.reason}
                                </div>
                              )}
                           </>
                         )
                      })()}
                    </div>
                    
                    {/* Demo Readiness */}
                    {modelReadiness[modelType].demo && modelReadiness[modelType].demo.available && (
                       <div className="p-2 bg-slate-50 dark:bg-ink-900 rounded border border-slate-200 dark:border-ink-800 space-y-1">
                          <div className="flex justify-between items-center">
                            <span className="text-slate-500 font-medium">Demo Ready:</span>
                            <span className="text-emerald-600 font-medium">✓ YES</span>
                          </div>
                          <div className="mt-1 text-slate-500 italic">
                            {modelReadiness[modelType].demo.reason}
                          </div>
                       </div>
                    )}
                  </div>
                )}
                
                <div className="flex flex-col gap-2">
                  <Button
                  id={`train-${modelType}-btn`}
                  variant={entry && !entry.is_demo_model ? "secondary" : "primary"}
                  size="sm"
                  className="w-full"
                  onClick={() => handleTrainSingle(modelType)}
                  disabled={modelReadiness && modelReadiness[modelType] && !(modelReadiness[modelType].production?.ready || modelReadiness[modelType].ready)}
                  isLoading={trainSingle.isLoading && trainSingle.variables?.modelType === modelType}>
                    Train Production
                  </Button>
                  
                  {modelReadiness && modelReadiness[modelType] && modelReadiness[modelType].demo && modelReadiness[modelType].demo.available && (
                    <Button
                    id={`train-demo-${modelType}-btn`}
                    variant={entry && entry.is_demo_model ? "secondary" : "outline"}
                    size="sm"
                    className="w-full"
                    onClick={() => handleTrainDemo(modelType)}
                    isLoading={trainDemo.isLoading && trainDemo.variables?.modelType === modelType}>
                      Train Demo
                    </Button>
                  )}
                </div>
              </Card>);

        })}
        </div>
      }

      {/* ── Tab: Duplicate Detection ── */}
      {activeTab === "duplicates" &&
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-slate-100">Duplicate & Anomalous Transactions</h2>
            <Button
            id="download-dup-report-btn"
            variant="secondary" size="sm"
            onClick={() => handleDownloadReport("duplicate-transactions")}
            isLoading={downloadingReport === "duplicate-transactions"}>
            
              Download Report
            </Button>
          </div>
          {!selectedCompany?.id &&
        <Card className="p-8 text-center bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
              <p className="text-slate-500 dark:text-slate-400">Select a company to run duplicate transaction detection.</p>
            </Card>
        }
          {selectedCompany?.id && isDuplicatesLoading &&
        <div className="space-y-3">
              {[1, 2, 3].map((i) => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
        }
          {selectedCompany?.id && !isDuplicatesLoading &&
        <>
              {!duplicates || duplicates.length === 0 ?
          <Card className="p-8 text-center bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
                  <p className="text-2xl mb-2">✅</p>
                  <p className="text-slate-600 dark:text-slate-300 font-medium">No anomalous transactions detected.</p>
                  <p className="text-slate-500 text-sm mt-1">Train the fraud_detection model first if you haven't yet.</p>
                </Card> :

          <div className="space-y-3">
                  {duplicates.map((anomaly) =>
            <Card key={anomaly.transaction_id} className="p-4 bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <p className="text-ink-900 dark:text-slate-100 text-sm font-medium truncate">{anomaly.description || "Unknown transaction"}</p>
                          <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">{anomaly.explanation || `Risk Score: ${anomaly.risk_score}/100`}</p>
                        </div>
                        <div className="flex flex-col items-end gap-1 ml-4 shrink-0">
                          <StatusBadge status={anomaly.risk_level} />
                          <span className="text-ink-900 dark:text-slate-100 font-medium text-sm">{formatCurrency(anomaly.amount)}</span>
                        </div>
                      </div>
                    </Card>
            )}
                </div>
          }
            </>
        }
        </div>
      }

      {/* ── Tab: Compliance Risk ── */}
      {activeTab === "compliance" &&
      <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-slate-100">Compliance Risk Predictions</h2>
            <Button
            id="download-compliance-report-btn"
            variant="secondary" size="sm"
            onClick={() => handleDownloadReport("compliance-risk")}
            isLoading={downloadingReport === "compliance-risk"}>
            
              Download Report
            </Button>
          </div>
          {!selectedCompany?.id &&
        <Card className="p-8 text-center bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
              <p className="text-slate-500 dark:text-slate-400">Select a company to view compliance risk predictions.</p>
            </Card>
        }
          {selectedCompany?.id && isComplianceLoading && <div className="space-y-3">{[1, 2].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>}
          {selectedCompany?.id && !isComplianceLoading &&
        <>
              {!complianceRisks || complianceRisks.length === 0 ?
          <Card className="p-8 text-center bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
                  <p className="text-slate-500 dark:text-slate-400">No compliance data. Train the compliance_risk model first.</p>
                </Card> :

          <div className="space-y-3">
                  {complianceRisks.map((r) =>
            <Card key={r.company_id} className="p-5 bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
                      <div className="flex items-center justify-between mb-3">
                        <h3 className="font-medium text-ink-900 dark:text-slate-100 text-sm">{selectedCompany?.name || "Workspace"}</h3>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 dark:text-slate-400 text-xs">Confidence: {(r.confidence * 100).toFixed(0)}%</span>
                          <StatusBadge status={r.risk_level} />
                        </div>
                      </div>
                      {r.explanation && <p className="text-slate-500 dark:text-slate-400 text-xs mb-3">{r.explanation}</p>}
                      <div className="grid grid-cols-3 gap-2">
                        {Object.entries(r.features || {}).slice(0, 3).map(([k, v]) =>
                <div key={k} className="bg-slate-100 dark:bg-ink-950/50 rounded p-2 text-xs">
                            <div className="text-slate-500 truncate">{k.replace(/_/g, " ")}</div>
                            <div className="text-ink-900 dark:text-slate-100 font-medium">{typeof v === "number" ? v.toFixed(2) : v}</div>
                          </div>
                )}
                      </div>
                    </Card>
            )}
                </div>
          }
            </>
        }
        </div>
      }

      {/* ── Tab: Forecasts ── */}
      {activeTab === "forecasts" &&
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Tax Forecast */}
          <Card className="p-5 bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-ink-900 dark:text-slate-100">Tax Liability Forecast</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Next 3 months predicted tax liability</p>
              </div>
              <Button
              id="download-tax-report-btn"
              variant="secondary" size="sm"
              onClick={() => handleDownloadReport("tax-prediction")}
              isLoading={downloadingReport === "tax-prediction"}>
              
                Export
              </Button>
            </div>
            {isTaxLoading ?
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div> :
          !taxForecast?.forecast?.length ?
          <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Train the tax_liability_forecast model first.</p>
              </div> :

          <div className="space-y-3">
                {taxForecast.forecast.map((f, idx) =>
            <div key={idx} className="bg-slate-100 dark:bg-ink-950/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">{f.year}-{String(f.month).padStart(2, "0")}</span>
                      <div className="text-right">
                        <div className="text-ink-900 dark:text-slate-100 font-semibold">{formatCurrency(f.predicted_total)}</div>
                        <div className="text-slate-500 text-xs">{formatCurrency(f.lower_bound)} – {formatCurrency(f.upper_bound)}</div>
                      </div>
                    </div>
                    {f.explanation && <p className="text-slate-500 text-xs mt-1 leading-relaxed">{f.explanation}</p>}
                  </div>
            )}
              </div>
          }
          </Card>

          {/* Expense Forecast */}
          <Card className="p-5 bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="font-semibold text-ink-900 dark:text-slate-100">Expense Forecast</h3>
                <p className="text-slate-500 dark:text-slate-400 text-xs mt-0.5">Next 3 months projected expenses</p>
              </div>
              <Button
              id="download-expense-report-btn"
              variant="secondary" size="sm"
              onClick={() => handleDownloadReport("expense-forecast")}
              isLoading={downloadingReport === "expense-forecast"}>
              
                Export
              </Button>
            </div>
            {isExpenseLoading ?
          <div className="space-y-3">{[1, 2, 3].map((i) => <Skeleton key={i} className="h-16 w-full" />)}</div> :
          !expenseForecast?.forecast?.length ?
          <div className="text-center py-8">
                <p className="text-slate-500 dark:text-slate-400 text-sm">Train the expense_forecast model first.</p>
              </div> :

          <div className="space-y-3">
                {expenseForecast.forecast.map((f, idx) =>
            <div key={idx} className="bg-slate-100 dark:bg-ink-950/50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-600 dark:text-slate-300 text-sm">{f.year}-{String(f.month).padStart(2, "0")}</span>
                      <div className="text-right">
                        <div className="text-ink-900 dark:text-slate-100 font-semibold">{formatCurrency(f.predicted_total)}</div>
                        <div className="text-slate-500 text-xs">{formatCurrency(f.lower_bound)} – {formatCurrency(f.upper_bound)}</div>
                      </div>
                    </div>
                    {f.explanation && <p className="text-slate-500 text-xs mt-1 leading-relaxed">{f.explanation}</p>}
                  </div>
            )}
              </div>
          }
          </Card>
        </div>
      }

      {/* ── Tab: Reports ── */}
      {activeTab === "reports" &&
      <div className="space-y-4">
          <div className="flex items-center gap-3">
            <h2 className="text-lg font-semibold text-ink-900 dark:text-slate-100">Download ML Reports</h2>
            <Select
            id="report-format-select"
            options={[{ value: "xlsx", label: "Excel (.xlsx)" }, { value: "pdf", label: "PDF (.pdf)" }]}
            value={reportFormat}
            onChange={(e) => setReportFormat(e.target.value)}
            className="w-36" />
          
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {REPORTS.map((report) =>
          <Card key={report.id} className="p-5 bg-white dark:bg-ink-900/50 border-slate-200 dark:border-ink-800 flex items-center justify-between">
                <span className="text-ink-900 dark:text-slate-100 text-sm font-medium">{report.label}</span>
                <Button
              id={`report-download-${report.id}-btn`}
              variant="secondary"
              size="sm"
              onClick={() => handleDownloadReport(report.id)}
              isLoading={downloadingReport === report.id}>
              
                  Download {reportFormat.toUpperCase()}
                </Button>
              </Card>
          )}
          </div>
        </div>
      }
    </div>);

}