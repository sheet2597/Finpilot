import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQueryClient } from "react-query";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Modal } from "@/components/ui/Modal";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDebounce } from "@/lib/useDebounce";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDocumentDashboard, useDocuments, useArchiveDocuments, useRestoreDocuments, useDeleteDocument, downloadDocument } from "../hooks";
import { UploadDropzone } from "../components/UploadDropzone";

const categoryOptions = [
  { value: "", label: "All categories" },
  { value: "invoice", label: "Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "gst", label: "GST" },
  { value: "tds", label: "TDS" },
  { value: "income_tax", label: "Income Tax" },
  { value: "receipt", label: "Receipt" },
  { value: "excel", label: "Excel" },
  { value: "other", label: "Other" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "archived", label: "Archived" },
  { value: "all", label: "All" },
];

const sortOptions = [
  { value: "created_at", label: "Newest first" },
  { value: "filename", label: "File name" },
  { value: "size_bytes", label: "Size" },
];

function formatBytes(bytes) {
  if (!bytes) return "0 KB";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(1)} ${units[unitIndex]}`;
}

export default function DocumentsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { selectedCompany } = useWorkspace();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("");
  const [status, setStatus] = useState("active");
  const [sortBy, setSortBy] = useState("created_at");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search);

  const { data: summary, isLoading: summaryLoading } = useDocumentDashboard(selectedCompany?.id || undefined);

  const { data, isLoading, isFetching } = useDocuments({
    page, page_size: 10, search: debouncedSearch || undefined,
    category: category || undefined, status, company_id: selectedCompany?.id || undefined, sort_by: sortBy,
  });

  const archiveMutation = useArchiveDocuments();
  const restoreMutation = useRestoreDocuments();
  const deleteMutation = useDeleteDocument();

  const documents = data?.data || [];
  const pagination = data?.pagination;

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  if (!selectedCompany?.id) {
    return (
      <div className="flex h-[60vh] flex-col items-center justify-center text-center">
        <h2 className="mt-4 font-display text-xl font-semibold text-ink-900 dark:text-slate-100">No company selected</h2>
        <p className="mt-2 text-sm text-slate-500 dark:text-slate-400 max-w-md">
          Please select a company from the top navigation bar to manage documents.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Documents</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Upload, organize, and manage documents.</p>
        </div>
        <Button onClick={() => setUploadOpen(true)}>+ Upload documents</Button>
      </div>

      {summaryLoading ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-24" />)}
        </div>
      ) : summary ? (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-5">
          <StatCard label="Total documents" value={summary.total_documents} />
          <StatCard label="Invoices" value={summary.total_invoices} />
          <StatCard label="Bank statements" value={summary.total_bank_statements} />
          <StatCard label="GST documents" value={summary.total_gst_documents} />
          <StatCard label="Storage used" value={formatBytes(summary.storage_used_bytes)} />
        </div>
      ) : null}

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by file name" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select options={categoryOptions} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="min-w-[10rem]" />
            <Select options={statusOptions} value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="min-w-[9rem]" />
            <Select options={sortOptions} value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="min-w-[9rem]" />
          </div>
        </div>

        {isLoading ? (
          <TableSkeleton cols={7} />
        ) : documents.length === 0 ? (
          <div className="p-6">
            <EmptyState
              title="No documents yet"
              description="Upload invoices, bank statements, and other files to keep them organized here."
              action={<Button onClick={() => setUploadOpen(true)}>+ Upload documents</Button>}
            />
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr>
                  <th className="px-4 py-3">File name</th>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Size</th>
                  <th className="px-4 py-3">Uploaded by</th>
                  <th className="px-4 py-3">Uploaded</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {documents.map((doc) => (
                  <tr key={doc.id} className="cursor-pointer hover:bg-surface-muted dark:hover:bg-ink-800" onClick={() => navigate(`/documents/${doc.id}`)}>
                    <td className="max-w-xs truncate px-4 py-3 font-medium text-ink-900 dark:text-slate-100">{doc.filename}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{doc.company_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{doc.category_label}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{formatBytes(doc.size_bytes)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{doc.uploaded_by_name}</td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(doc.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3"><Badge status={doc.status} /></td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex justify-end gap-1">
                        <IconButton title="Download" onClick={() => downloadDocument(doc.id, doc.filename)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M12 3v12m0 0l-4-4m4 4l4-4M4 21h16" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </IconButton>
                        {doc.status === "active" ? (
                          <IconButton title="Archive" onClick={() => archiveMutation.mutate([doc.id])}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <rect x="3" y="4" width="18" height="4" rx="1" /><path d="M5 8v11a1 1 0 001 1h12a1 1 0 001-1V8M10 13h4" strokeLinecap="round" />
                            </svg>
                          </IconButton>
                        ) : (
                          <IconButton title="Restore" onClick={() => restoreMutation.mutate([doc.id])}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 12a9 9 0 1 1 2.6 6.4M3 12V6m0 6h6" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </IconButton>
                        )}
                        <IconButton title="Delete" danger onClick={() => setDeleteTarget(doc.id)}>
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        </IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />}
      </Card>

      <Modal open={uploadOpen} onClose={() => setUploadOpen(false)} title="Upload documents" wide>
        <UploadDropzone
          companyOptions={[{ value: selectedCompany?.id, label: "Current Company" }]}
          onUploadComplete={() => {
            queryClient.invalidateQueries("documents");
            queryClient.invalidateQueries("document-dashboard");
          }}
        />
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete document"
        description="This document will be moved to trash and removed from active lists. This cannot be undone from the UI."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <Card>
      <p className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{value}</p>
    </Card>
  );
}

function IconButton({ children, onClick, title, danger }) {
  return (
    <button
      onClick={onClick}
      title={title}
      aria-label={title}
      className={`rounded-lg p-1.5 text-slate-400 hover:bg-surface-muted dark:hover:bg-ink-800 ${danger ? "hover:!bg-red-50 hover:!text-red-500 dark:hover:!bg-red-500/10" : "hover:text-ink-900 dark:hover:text-slate-100"}`}
    >
      {children}
    </button>
  );
}
