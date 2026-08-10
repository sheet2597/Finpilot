import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { useDocument, downloadDocument } from "@/features/documents/hooks";

const INLINE_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];

/**
 * Inline preview for a transaction's linked document (invoice, receipt,
 * PDF, or image) without leaving the page or downloading anything first.
 * Reuses the Document module's own storage/serving — no new storage system.
 */
export function AttachmentPreviewModal({
  documentId, open, onClose,
}) {
  const { data: doc, isLoading } = useDocument(documentId || undefined);

  const isImage = doc ? INLINE_IMAGE_TYPES.includes(doc.mime_type) : false;
  const isPdf = doc?.mime_type === "application/pdf";

  return (
    <Modal open={open} onClose={onClose} title={doc ? doc.filename : "Attachment"} wide>
      {isLoading || !doc ? (
        <Skeleton className="h-96" />
      ) : (
        <div className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">{doc.category_label} &middot; {doc.company_name}</p>
          {isImage ? (
            <img src={doc.storage_url} alt={doc.filename} className="max-h-[480px] w-full rounded-lg border border-slate-100 object-contain dark:border-ink-800" />
          ) : isPdf ? (
            <iframe src={doc.storage_url} title={doc.filename} className="h-[480px] w-full rounded-lg border border-slate-100 dark:border-ink-800" />
          ) : (
            <div className="flex h-40 items-center justify-center rounded-lg border border-dashed border-slate-200 text-sm text-slate-400 dark:border-ink-800">
              No inline preview available for this file type. Use Download to view it.
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => downloadDocument(doc.id, doc.filename)}>Download</Button>
            <Button variant="secondary" onClick={onClose}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
