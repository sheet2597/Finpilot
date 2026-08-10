import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import {
  useDocument, useRenameDocument, useDeleteDocument, useArchiveDocuments, useRestoreDocuments, downloadDocument,
} from "../hooks";

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

export default function DocumentDetailPage() {
  const { documentId } = useParams();
  const navigate = useNavigate();
  const { data: doc, isLoading } = useDocument(documentId);
  const [renameOpen, setRenameOpen] = useState(false);
  const [newName, setNewName] = useState("");
  const [deleteOpen, setDeleteOpen] = useState(false);

  const renameMutation = useRenameDocument(documentId || "");
  const archiveMutation = useArchiveDocuments();
  const restoreMutation = useRestoreDocuments();
  const deleteMutation = useDeleteDocument();

  if (isLoading || !doc) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-64" />
      </div>
    );
  }

  const isImage = ["image/jpeg", "image/png"].includes(doc.mime_type);
  const isPdf = doc.mime_type === "application/pdf";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <button onClick={() => navigate("/documents")} className="mb-2 text-sm font-medium text-slate-500 hover:text-ink-900 dark:hover:text-slate-100">
            &larr; Back to Documents
          </button>
          <h1 className="max-w-lg truncate font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{doc.filename}</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{doc.company_name} &middot; {doc.category_label}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => downloadDocument(doc.id, doc.filename)}>Download</Button>
          {doc.is_owner && (
            <Button variant="secondary" onClick={() => { setNewName(doc.filename); setRenameOpen(true); }}>Rename</Button>
          )}
          {doc.is_owner && (
            doc.status === "active" ? (
              <Button variant="secondary" onClick={() => archiveMutation.mutate([doc.id])}>Archive</Button>
            ) : (
              <Button variant="secondary" onClick={() => restoreMutation.mutate([doc.id])}>Restore</Button>
            )
          )}
          {doc.is_owner && (
            <Button className="!bg-red-600 hover:!bg-red-700" onClick={() => setDeleteOpen(true)}>Delete</Button>
          )}
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Preview</h3>
          {isImage ? (
            <img src={doc.storage_url} alt={doc.filename} className="max-h-[420px] w-full rounded-lg border border-slate-100 object-contain dark:border-ink-800" />
          ) : isPdf ? (
            <>
              {/* Desktop: iframe preview */}
              <div className="hidden sm:block">
                <iframe
                  src={doc.storage_url.replace(/^https?:\/\/[^/]+/, "")}
                  title={doc.filename}
                  className="h-[420px] w-full rounded-lg border border-slate-100 dark:border-ink-800"
                />
              </div>
              {/* Mobile: iframe preview often fails on iOS Safari — show download CTA */}
              <div className="flex sm:hidden flex-col items-center justify-center gap-3 h-40 rounded-lg border border-dashed border-slate-200 dark:border-ink-800 text-center px-4">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-slate-400"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" strokeLinecap="round"/><path d="M14 2v6h6M9 13h6M9 17h6" strokeLinecap="round"/></svg>
                <p className="text-sm text-slate-500 dark:text-slate-400">PDF preview is not available on mobile.</p>
                <a
                  href={doc.storage_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primary text-xs px-4 py-2"
                >
                  Open PDF
                </a>
              </div>
            </>
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-ink-800">
              No inline preview available for this file type. Use Download to view it.
            </div>
          )}
          {doc.ocr_text && (
            <div className="mt-4">
              <h4 className="mb-2 text-sm font-semibold text-ink-900 dark:text-slate-100">Extracted text (OCR)</h4>
              <p className="max-h-40 overflow-y-auto whitespace-pre-wrap rounded-lg bg-surface-muted p-3 text-xs text-slate-600 dark:bg-ink-800 dark:text-slate-300">
                {doc.ocr_text}
              </p>
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card>
            <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Metadata</h3>
            <dl className="space-y-2 text-sm">
              <Row label="Status"><Badge status={doc.status} /></Row>
              <Row label="Size">{formatBytes(doc.size_bytes)}</Row>
              <Row label="Type">{doc.extension.replace(".", "").toUpperCase()}</Row>
              <Row label="Version">v{doc.version}</Row>
              <Row label="Uploaded by">{doc.uploaded_by_name}</Row>
              <Row label="Uploaded">{new Date(doc.created_at).toLocaleString()}</Row>
              <Row label="Last updated">{new Date(doc.updated_at).toLocaleString()}</Row>
            </dl>
          </Card>

          <Card>
            <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Upload history</h3>
            {!doc.activity?.length ? (
              <p className="text-sm text-slate-500">No activity recorded yet.</p>
            ) : (
              <ul className="space-y-3">
                {doc.activity.map((entry) => (
                  <li key={entry.id} className="flex items-center justify-between text-sm">
                    <span className="capitalize text-ink-900 dark:text-slate-100">{entry.action.replace(/_/g, " ")}</span>
                    <span className="text-xs text-slate-400">{new Date(entry.created_at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>
      </div>

      <Modal open={renameOpen} onClose={() => setRenameOpen(false)} title="Rename document">
        <div className="space-y-4">
          <Input label="File name" value={newName} onChange={(e) => setNewName(e.target.value)} />
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={() => setRenameOpen(false)}>Cancel</Button>
            <Button
              isLoading={renameMutation.isLoading}
              onClick={() => renameMutation.mutate(newName, { onSuccess: () => setRenameOpen(false) })}
            >
              Save
            </Button>
          </div>
        </div>
      </Modal>

      <ConfirmDialog
        open={deleteOpen}
        title="Delete document"
        description="This document will be removed from active lists. This cannot be undone from the UI."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={() => deleteMutation.mutate(doc.id, { onSuccess: () => navigate("/documents") })}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-ink-900 dark:text-slate-100">{children}</dd>
    </div>
  );
}
