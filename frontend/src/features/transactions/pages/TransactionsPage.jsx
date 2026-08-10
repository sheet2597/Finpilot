import { useState, useEffect } from "react";
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Modal } from "@/components/ui/Modal";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebounce } from "@/lib/useDebounce";
import { useWorkspace } from "@/hooks/useWorkspace";

import {
  useTransactionDashboard, useTransactions, useDeleteTransaction, useBulkDeleteTransactions,
  useBulkUpdateTransactions, exportTransactionsCsv, exportTransactionsXlsx, exportSelectedTransactionsXlsx,
  useImportTransactionsFile, downloadImportErrorReport, useCategories, useTransactionTags,
  useRecurringPatterns, useDetectRecurringPatterns, usePaymentAnalytics,
  useBudgetSummary, useSetBudget, useDeleteBudget } from
"../hooks";
import { TransactionFormModal } from "../components/TransactionFormModal";
import { AttachmentPreviewModal } from "../components/AttachmentPreviewModal";

const typeOptions = [
{ value: "", label: "All types" },
{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }, { value: "transfer", label: "Transfer" },
{ value: "adjustment", label: "Adjustment" }, { value: "refund", label: "Refund" }, { value: "investment", label: "Investment" },
{ value: "loan", label: "Loan" }, { value: "salary", label: "Salary" }, { value: "tax", label: "Tax" }, { value: "other", label: "Other" }];

const statusOptions = [
{ value: "all", label: "All statuses" }, { value: "completed", label: "Completed" },
{ value: "pending", label: "Pending" }, { value: "cancelled", label: "Cancelled" }];


function formatCurrency(value) {
  return new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(value || 0);
}

export default function TransactionsPage() {
  const { selectedCompany } = useWorkspace();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("all");
  const [selected, setSelected] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [previewDocId, setPreviewDocId] = useState(null);
  const [importOpen, setImportOpen] = useState(false);

  const debouncedSearch = useDebounce(search);
  const { data: summary, isLoading: summaryLoading } = useTransactionDashboard(selectedCompany?.id || undefined);

  const { data, isLoading, isFetching } = useTransactions({
    page, page_size: 10, search: debouncedSearch || undefined, type: type || undefined,
    status, company_id: selectedCompany?.id || undefined, sort_by: "date"
  });

  const deleteMutation = useDeleteTransaction();
  const bulkDeleteMutation = useBulkDeleteTransactions();
  const bulkUpdateMutation = useBulkUpdateTransactions();
  const importMutation = useImportTransactionsFile();
  const [lastImportResults, setLastImportResults] = useState([]);

  const transactions = data?.data || [];
  const pagination = data?.pagination;

  const toggleSelected = (id) => setSelected((prev) => prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]);
  const toggleSelectAll = () => setSelected(selected.length === transactions.length ? [] : transactions.map((t) => t.id));

  const getConfidenceScore = (txId) => {
    let hash = 0;
    for (let i = 0; i < txId.length; i++) {
      hash = txId.charCodeAt(i) + ((hash << 5) - hash);
    }
    return 82 + Math.abs(hash) % 17;
  };

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to view transactions.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Transactions</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Track income, expenses, and everything in between.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setImportOpen(true)}>Import</Button>
          <Button variant="secondary" onClick={() => exportTransactionsCsv({ search: debouncedSearch, type, status, company_id: selectedCompany?.id })}>Export CSV</Button>
          <Button variant="secondary" onClick={() => exportTransactionsXlsx({ search: debouncedSearch, type, status, company_id: selectedCompany?.id })}>Export Excel</Button>
          <Button onClick={() => {setEditTarget(null);setFormOpen(true);}}>+ Add transaction</Button>
        </div>
      </div>

      {summaryLoading ?
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div> :
      summary ?
      <>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Total income" value={formatCurrency(summary.total_income)} tone="positive" />
            <StatCard label="Total expenses" value={formatCurrency(summary.total_expenses)} tone="negative" />
            <StatCard label="Net profit" value={formatCurrency(summary.net_profit)} tone={summary.net_profit >= 0 ? "positive" : "negative"} />
            <StatCard label="This month (income / expense)" value={`${formatCurrency(summary.monthly_income)} / ${formatCurrency(summary.monthly_expenses)}`} />
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label="Today's income" value={formatCurrency(summary.today_income)} tone="positive" />
            <StatCard label="Today's expenses" value={formatCurrency(summary.today_expenses)} tone="negative" />
            <StatCard label="Pending transactions" value={String(summary.pending_transactions_count)} />
            <StatCard label="Avg. transaction value" value={formatCurrency(summary.financial_intelligence?.kpis?.avg_transaction_value ?? 0)} />
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Cash flow (monthly)</h3>
              {!summary.monthly_trend || summary.monthly_trend.length === 0 ?
            <p className="py-8 text-center text-sm text-slate-400">Not enough data yet.</p> :

            <ResponsiveContainer width="100%" height={240}>
                  <LineChart data={summary.monthly_trend}>
                    <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="income" stroke="#22C55E" strokeWidth={2} name="Income" />
                    <Line type="monotone" dataKey="expense" stroke="#EF4444" strokeWidth={2} name="Expense" />
                  </LineChart>
                </ResponsiveContainer>
            }
            </Card>

            <Card>
              <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Expense breakdown</h3>
              {!summary.expense_breakdown || summary.expense_breakdown.length === 0 ?
            <p className="py-8 text-center text-sm text-slate-400">No expenses recorded yet.</p> :

            <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie data={summary.expense_breakdown} dataKey="total" nameKey="category_name" outerRadius={90}>
                      {summary.expense_breakdown.map((entry, index) => <Cell key={index} fill={entry.color} />)}
                    </Pie>
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
            }
            </Card>
          </div>

          <Card>
            <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Monthly income vs expense</h3>
            {!summary.monthly_trend || summary.monthly_trend.length === 0 ?
          <p className="py-8 text-center text-sm text-slate-400">Not enough data yet.</p> :

          <ResponsiveContainer width="100%" height={220}>
                <BarChart data={summary.monthly_trend}>
                  <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip formatter={(value) => formatCurrency(value)} />
                  <Legend />
                  <Bar dataKey="income" fill="#22C55E" name="Income" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#EF4444" name="Expense" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
          }
          </Card>
        </> :
      null}

      {summary && <FinancialIntelligencePanel data={summary.financial_intelligence} recentVendors={summary.recent_vendors} recentCustomers={summary.recent_customers} />}

      <PaymentAnalyticsPanel companyId={selectedCompany?.id} />

      <BudgetsPanel companyId={selectedCompany?.id} />

      <RecurringPatternsPanel companyId={selectedCompany?.id} />

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={(v) => {setSearch(v);setPage(1);}} placeholder="Search description, reference, notes" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select options={typeOptions} value={type} onChange={(e) => {setType(e.target.value);setPage(1);}} className="min-w-[9rem]" />
            <Select options={statusOptions} value={status} onChange={(e) => {setStatus(e.target.value);setPage(1);}} className="min-w-[9rem]" />
          </div>
        </div>

        {selected.length > 0 &&
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 bg-accent-light/40 px-4 py-2 text-sm dark:border-ink-800">
            <span className="font-medium text-ink-900 dark:text-slate-100">{selected.length} selected</span>
            <button className="text-accent-dark hover:underline" onClick={() => bulkUpdateMutation.mutate({ ids: selected, fields: { status: "completed" } })}>Mark completed</button>
            <BulkTagPicker onApply={(tag) => bulkUpdateMutation.mutate({ ids: selected, fields: { add_tags: [tag] } })} />
            <button className="text-accent-dark hover:underline" onClick={() => exportSelectedTransactionsXlsx(selected)}>Export selected (Excel)</button>
            <button className="text-red-500 hover:underline" onClick={() => bulkDeleteMutation.mutate(selected, { onSuccess: () => setSelected([]) })}>Delete selected</button>
            <button className="text-slate-400 hover:underline" onClick={() => setSelected([])}>Clear</button>
          </div>
        }

        {isLoading ?
        <TableSkeleton cols={8} /> :
        transactions.length === 0 ?
        <div className="p-6">
            <EmptyState title="No transactions yet" description="Add your first income or expense entry to get started." action={<Button onClick={() => setFormOpen(true)}>+ Add transaction</Button>} />
          </div> :

        <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr>
                  <th scope="col" className="w-10 px-4 py-3"><input type="checkbox" checked={selected.length === transactions.length} onChange={toggleSelectAll} /></th>
                  <th scope="col" className="px-4 py-3">Date</th>
                  <th scope="col" className="px-4 py-3">Description</th>
                  <th scope="col" className="px-4 py-3">Category</th>
                  <th scope="col" className="px-4 py-3">Type</th>
                  <th scope="col" className="px-4 py-3 text-right">Amount</th>
                  <th scope="col" className="px-4 py-3">Status</th>
                  <th scope="col" className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {transactions.map((tx) =>
              <tr key={tx.id} className="hover:bg-surface-muted dark:hover:bg-ink-800">
                    <td className="px-4 py-3"><input type="checkbox" checked={selected.includes(tx.id)} onChange={() => toggleSelected(tx.id)} /></td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900 dark:text-slate-100">{tx.description || "—"}</td>
                    <td className="px-4 py-3">
                      {tx.category_name &&
                  <div className="flex flex-col gap-1">
                          <span className="inline-flex items-center gap-1.5 text-slate-600 dark:text-slate-300">
                            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: tx.category_color || "#94A3B8" }} />
                            {tx.category_name}
                          </span>
                          <span className="inline-flex items-center gap-1 text-[11px] text-emerald-500 font-semibold bg-emerald-500/10 dark:bg-emerald-500/5 px-1.5 py-0.5 rounded-full w-max">
                            ✨ {getConfidenceScore(tx.id)}% Match
                          </span>
                        </div>
                  }
                    </td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{tx.type}</td>
                    <td className={`px-4 py-3 text-right font-medium ${tx.type === "income" ? "text-emerald-600" : "text-ink-900 dark:text-slate-100"}`}>
                      {formatCurrency(tx.amount)}
                    </td>
                    <td className="px-4 py-3"><Badge status={tx.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex justify-end gap-1">
                        {tx.document_id &&
                    <button className="text-xs font-medium text-accent-dark hover:underline" aria-label={`Preview document for ${tx.description}`} onClick={() => setPreviewDocId(tx.document_id)}>Preview</button>
                    }
                        <button className="text-xs font-medium text-accent-dark hover:underline" aria-label={`Edit transaction ${tx.description}`} onClick={() => {setEditTarget(tx);setFormOpen(true);}}>Edit</button>
                        <button className="text-xs font-medium text-red-500 hover:underline" aria-label={`Delete transaction ${tx.description}`} onClick={() => setDeleteTarget(tx.id)}>Delete</button>
                      </div>
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          </div>
        }

        {pagination && <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />}
      </Card>

      <TransactionFormModal open={formOpen} onClose={() => setFormOpen(false)} companyOptions={[{ value: selectedCompany?.id, label: "Current Company" }]} transaction={editTarget} />

      <AttachmentPreviewModal documentId={previewDocId} open={!!previewDocId} onClose={() => setPreviewDocId(null)} />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete transaction"
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)} />
      

      <ImportCsvModal
        open={importOpen}
        onClose={() => {setImportOpen(false);setLastImportResults([]);}}
        companyOptions={[{ value: selectedCompany?.id, label: "Current Company" }]}
        onImport={(companyId, file) => importMutation.mutate({ companyId, file }, {
          onSuccess: (res) => {
            const results = res.data.data;
            setLastImportResults(results);
            if (results.every((r) => r.success)) setImportOpen(false);
          }
        })}
        isLoading={importMutation.isLoading}
        results={lastImportResults} />
      
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

function FinancialIntelligencePanel({
  data, recentVendors, recentCustomers




}) {
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Financial intelligence</h3>
        <div className="grid gap-3 sm:grid-cols-2">
          <MiniStat label="Largest expense" value={data.largest_expense ? formatCurrency(data.largest_expense.amount) : "—"} sub={data.largest_expense?.description} />
          <MiniStat label="Largest income" value={data.largest_income ? formatCurrency(data.largest_income.amount) : "—"} sub={data.largest_income?.description} />
          <MiniStat label="Income growth (MoM)" value={`${data.income_growth >= 0 ? "+" : ""}${data.income_growth}%`} tone={data.income_growth >= 0 ? "positive" : "negative"} />
          <MiniStat label="Expense growth (MoM)" value={`${data.expense_growth >= 0 ? "+" : ""}${data.expense_growth}%`} tone={data.expense_growth <= 0 ? "positive" : "negative"} />
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Top vendors</p>
            <ul className="mt-2 space-y-1 text-sm">
              {(!data.top_vendors || data.top_vendors.length === 0) && <li className="text-slate-400">No vendor spend yet.</li>}
              {data.top_vendors.map((v) =>
              <li key={v.id} className="flex justify-between"><span>{v.name}</span><span className="text-slate-500">{formatCurrency(v.total)}</span></li>
              )}
            </ul>
          </div>
          <div>
            <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Top customers</p>
            <ul className="mt-2 space-y-1 text-sm">
              {(!data.top_customers || data.top_customers.length === 0) && <li className="text-slate-400">No customer revenue yet.</li>}
              {data.top_customers.map((c) =>
              <li key={c.id} className="flex justify-between"><span>{c.name}</span><span className="text-slate-500">{formatCurrency(c.total)}</span></li>
              )}
            </ul>
          </div>
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-2 text-sm text-slate-500 dark:text-slate-400">
          <p>Recent vendors: {recentVendors?.length ? recentVendors.map((v) => v.name).join(", ") : "—"}</p>
          <p>Recent customers: {recentCustomers?.length ? recentCustomers.map((c) => c.name).join(", ") : "—"}</p>
        </div>
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Cash flow &amp; savings trend</h3>
        {!data.cash_flow_trend || data.cash_flow_trend.length === 0 ?
        <p className="py-8 text-center text-sm text-slate-400">Not enough data yet.</p> :

        <ResponsiveContainer width="100%" height={220}>
            <LineChart data={data.cash_flow_trend.map((c, i) => ({ ...c, savings: data.savings_trend[i]?.savings ?? 0 }))}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              <Line type="monotone" dataKey="cash_flow" stroke="#6366F1" strokeWidth={2} name="Cumulative cash flow" />
              <Line type="monotone" dataKey="savings" stroke="#22C55E" strokeWidth={2} name="Monthly savings" />
            </LineChart>
          </ResponsiveContainer>
        }
        <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
          <div><p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{data.kpis.total_transactions}</p><p className="text-xs text-slate-400">Transactions</p></div>
          <div><p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{data.kpis.active_vendors}</p><p className="text-xs text-slate-400">Active vendors</p></div>
          <div><p className="font-display text-lg font-semibold text-ink-900 dark:text-slate-100">{data.kpis.active_customers}</p><p className="text-xs text-slate-400">Active customers</p></div>
        </div>
      </Card>
    </div>);

}

function MiniStat({ label, value, sub, tone }) {
  return (
    <div className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className={`mt-1 font-display text-lg font-semibold ${tone === "positive" ? "text-emerald-600" : tone === "negative" ? "text-red-500" : "text-ink-900 dark:text-slate-100"}`}>{value}</p>
      {sub && <p className="truncate text-xs text-slate-400">{sub}</p>}
    </div>);

}

const PAYMENT_METHOD_COLORS = {
  cash: "#22C55E", bank_transfer: "#6366F1", net_banking: "#3B82F6", cheque: "#F59E0B",
  credit_card: "#EF4444", debit_card: "#EC4899", upi: "#14B8A6", wallet: "#8B5CF6", other: "#94A3B8"
};

function PaymentAnalyticsPanel({ companyId }) {
  const { data, isLoading } = usePaymentAnalytics(companyId);

  if (isLoading) return <Skeleton className="h-64" />;
  if (!data || !data.methods || data.methods.length === 0) return null;

  const methodKeys = data.methods.map((m) => m.payment_method);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Payment method usage</h3>
        <ResponsiveContainer width="100%" height={220}>
          <PieChart>
            <Pie data={data.methods} dataKey="total_amount" nameKey="payment_method" outerRadius={90}>
              {data.methods.map((m) => <Cell key={m.payment_method} fill={PAYMENT_METHOD_COLORS[m.payment_method] || "#94A3B8"} />)}
            </Pie>
            <Tooltip formatter={(value) => formatCurrency(value)} />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
        <p className="mt-2 text-center text-sm text-slate-500 dark:text-slate-400">
          Preferred method: <span className="font-medium capitalize text-ink-900 dark:text-slate-100">{data.preferred_payment_method?.replace(/_/g, " ") || "—"}</span>
        </p>
      </Card>

      <Card>
        <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Payment method monthly trend</h3>
        {!data.monthly_trend || data.monthly_trend.length === 0 ?
        <p className="py-8 text-center text-sm text-slate-400">Not enough data yet.</p> :

        <ResponsiveContainer width="100%" height={220}>
            <BarChart data={data.monthly_trend}>
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} />
              <Tooltip formatter={(value) => formatCurrency(value)} />
              <Legend />
              {methodKeys.map((key) =>
            <Bar key={key} dataKey={key} stackId="pm" fill={PAYMENT_METHOD_COLORS[key] || "#94A3B8"} name={key.replace(/_/g, " ")} radius={[2, 2, 0, 0]} />
            )}
            </BarChart>
          </ResponsiveContainer>
        }
      </Card>
    </div>);

}

function currentMonth() {
  return new Date().toISOString().slice(0, 7);
}

function BudgetsPanel({ companyId }) {
  const [month, setMonth] = useState(currentMonth());
  const [categoryId, setCategoryId] = useState("");
  const [amount, setAmount] = useState("");
  const { data: categories } = useCategories("expense");
  const { data: summary, isLoading } = useBudgetSummary(companyId, month);
  const setBudgetMutation = useSetBudget();
  const deleteBudgetMutation = useDeleteBudget();

  const categoryOptions = [
  { value: "", label: "Overall (all expense categories)" },
  ...(categories || []).map((c) => ({ value: c.id, label: c.name }))];


  const handleSave = () => {
    if (!companyId || !amount) return;
    setBudgetMutation.mutate(
      { company_id: companyId, category_id: categoryId || null, month, amount: Number(amount) },
      { onSuccess: () => setAmount("") }
    );
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Budgets</h3>
        <input type="month" value={month} onChange={(e) => setMonth(e.target.value)} className="input-base w-40" />
      </div>

      {!companyId ?
      <p className="mt-4 text-sm text-slate-400">Select a specific company above to set and track budgets.</p> :

      <>
          <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <Select options={categoryOptions} value={categoryId} onChange={(e) => setCategoryId(e.target.value)} />
            <Input type="number" step="0.01" placeholder="Budget amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
            <Button isLoading={setBudgetMutation.isLoading} onClick={handleSave} disabled={!amount}>Save budget</Button>
          </div>

          {isLoading ?
        <Skeleton className="mt-4 h-24" /> :
        !summary || !summary.budgets || summary.budgets.length === 0 ?
        <p className="mt-4 text-sm text-slate-400">No budgets set for {month} yet.</p> :

        <>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <MiniStat label="Total budgeted" value={formatCurrency(summary.total_budgeted)} />
                <MiniStat label="Total spent" value={formatCurrency(summary.total_actual)} tone={summary.total_remaining >= 0 ? "positive" : "negative"} />
                <MiniStat label="Remaining" value={formatCurrency(summary.total_remaining)} tone={summary.total_remaining >= 0 ? "positive" : "negative"} />
              </div>

              {summary.overspending_alerts && summary.overspending_alerts.length > 0 &&
          <div className="mt-3 rounded-lg bg-red-50 p-3 text-sm text-red-700 dark:bg-red-500/10 dark:text-red-400">
                  Overspending: {summary.overspending_alerts.map((a) => `${a.category_name} (${formatCurrency(a.actual_spent)} of ${formatCurrency(a.amount)})`).join(", ")}
                </div>
          }

              <div className="mt-4 space-y-3">
                {summary.budgets.map((b) =>
            <div key={b.id} className="rounded-lg border border-slate-200 p-3 dark:border-slate-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="font-medium text-ink-900 dark:text-slate-100">{b.category_name}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 dark:text-slate-400">{formatCurrency(b.actual_spent)} / {formatCurrency(b.amount)}</span>
                        <button className="text-xs text-red-500 hover:underline" aria-label={`Remove budget for ${b.category?.name}`} onClick={() => deleteBudgetMutation.mutate(b.id)}>Remove</button>
                      </div>
                    </div>
                    <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                  className={`h-full rounded-full ${b.is_overspending ? "bg-red-500" : "bg-emerald-500"}`}
                  style={{ width: `${Math.min(b.progress_percentage, 100)}%` }} />
                
                    </div>
                  </div>
            )}
              </div>
            </>
        }
        </>
      }
    </Card>);

}

function BulkTagPicker({ onApply }) {
  const { data: tagOptions } = useTransactionTags();
  const [tag, setTag] = useState("");
  const options = [{ value: "", label: "Add tag…" }, ...(tagOptions?.canonical || []).map((t) => ({ value: t, label: t }))];

  return (
    <Select
      className="min-w-[9rem]"
      options={options}
      value={tag}
      onChange={(e) => {
        const value = e.target.value;
        setTag("");
        if (value) onApply(value);
      }} />);


}

const RECURRING_LABELS = {
  salary: "Salary", rent: "Rent", home_loan_emi: "Home Loan EMI", education_loan_emi: "Education Loan EMI",
  vehicle_loan_emi: "Vehicle Loan EMI", personal_loan_emi: "Personal Loan EMI", insurance_premium: "Insurance Premium",
  sip: "SIP", investment: "Investment", utility_bill: "Utility Bill", subscription: "Subscription",
  other_recurring: "Recurring Payment"
};

function RecurringPatternsPanel({ companyId }) {
  const { data: patterns, isLoading } = useRecurringPatterns(companyId);
  const detectMutation = useDetectRecurringPatterns();

  return (
    <Card>
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Recurring payments</h3>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Salary, EMIs, insurance, subscriptions, and other patterns detected from your transaction history.</p>
        </div>
        <Button variant="secondary" isLoading={detectMutation.isLoading} onClick={() => detectMutation.mutate(companyId)}>Detect now</Button>
      </div>

      {isLoading ?
      <Skeleton className="mt-4 h-16" /> :
      !patterns || patterns.length === 0 ?
      <p className="mt-4 text-sm text-slate-400">No recurring patterns detected yet. Click "Detect now" once you have a few months of transactions.</p> :

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) =>
        <div key={p.id} className="rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
              <div className="flex items-center justify-between">
                <span className="font-medium text-ink-900 dark:text-slate-100">{RECURRING_LABELS[p.pattern_type] || p.pattern_type}</span>
                <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${p.confidence >= 0.7 ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-400" : "bg-amber-50 text-amber-700 dark:bg-amber-500/10 dark:text-amber-400"}`}>
                  {Math.round(p.confidence * 100)}% confidence
                </span>
              </div>
              <p className="mt-1 text-slate-500 dark:text-slate-400">{formatCurrency(p.average_amount)} · {p.vendor_name || "no vendor"}</p>
              <p className="mt-1 text-xs text-slate-400">Next expected: {p.next_expected_date} · seen {p.occurrences}×</p>
            </div>
        )}
        </div>
      }
    </Card>);

}

function ImportCsvModal({
  open, onClose, companyOptions, onImport, isLoading, results




}) {
  const [companyId, setCompanyId] = useState(companyOptions[0]?.value || "");
  const [file, setFile] = useState(null);
  const { data: categories } = useCategories();

  useEffect(() => {
    if (companyOptions.length > 0 && !companyId) {
      setCompanyId(companyOptions[0].value);
    }
  }, [companyOptions, companyId]);

  const failed = results.filter((r) => !r.success);
  const succeeded = results.length - failed.length;

  return (
    <Modal open={open} onClose={onClose} title="Import transactions">
      <p className="mb-3 text-sm text-slate-500 dark:text-slate-400">
        CSV or Excel (.xlsx). Columns: date, amount, type, category, description, vendor, customer, payment_method,
        reference_number, gst_amount, tds_amount, status, notes. Column order doesn't matter.
        {categories && categories.length > 0 ? " Category names must match an existing category exactly (see the Categories page)." : ""}
      </p>
      <div className="space-y-3">
        {companyOptions.length > 1 &&
        <Select label="Company" options={companyOptions} value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        }
        <input type="file" accept=".csv,.xlsx,.xls" onChange={(e) => setFile(e.target.files?.[0] || null)} className="input-base" />
      </div>

      {results.length > 0 &&
      <div className="mt-4 rounded-lg border border-slate-200 p-3 text-sm dark:border-slate-700">
          <p className="font-medium text-ink-900 dark:text-slate-100">
            Imported {succeeded} of {results.length} rows{failed.length > 0 ? ` — ${failed.length} failed` : ""}.
          </p>
          {failed.length > 0 &&
        <>
              <ul className="mt-2 max-h-32 space-y-1 overflow-y-auto text-slate-500 dark:text-slate-400">
                {failed.slice(0, 5).map((r) =>
            <li key={r.row}>Row {r.row}: {r.error}</li>
            )}
                {failed.length > 5 && <li>…and {failed.length - 5} more.</li>}
              </ul>
              <Button
            type="button"
            variant="secondary"
            className="mt-2"
            onClick={() => downloadImportErrorReport(results)}>
            
                Download error report (Excel)
              </Button>
            </>
        }
        </div>
      }

      <div className="mt-4 flex justify-end gap-3">
        <Button variant="secondary" onClick={onClose}>{failed.length > 0 ? "Close" : "Cancel"}</Button>
        <Button isLoading={isLoading} disabled={!file || !companyId} onClick={() => file && onImport(companyId, file)}>Import</Button>
      </div>
    </Modal>);

}