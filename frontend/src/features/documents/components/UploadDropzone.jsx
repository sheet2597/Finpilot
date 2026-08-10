import { useRef, useState } from "react";
import toast from "react-hot-toast";
import { Select } from "@/components/ui/Select";
import { documentsApi } from "../api";

const ACCEPTED_EXTENSIONS = [".pdf", ".jpg", ".jpeg", ".png", ".csv", ".xls", ".xlsx"];
const MAX_SIZE_BYTES = 25 * 1024 * 1024;

const categoryOptions = [
  { value: "invoice", label: "Invoice" },
  { value: "bank_statement", label: "Bank Statement" },
  { value: "gst", label: "GST" },
  { value: "tds", label: "TDS" },
  { value: "income_tax", label: "Income Tax" },
  { value: "receipt", label: "Receipt" },
  { value: "excel", label: "Excel" },
  { value: "other", label: "Other" },
];

export function UploadDropzone({ companyOptions, onUploadComplete }) {
  const [companyId, setCompanyId] = useState(companyOptions[0]?.value || "");
  const [category, setCategory] = useState("other");
  const [queue, setQueue] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  const inputRef = useRef(null);

  const validateFile = (file) => {
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!ACCEPTED_EXTENSIONS.includes(ext)) {
      return `Unsupported file type (${ext}).`;
    }
    if (file.size > MAX_SIZE_BYTES) {
      return "File exceeds the 25MB limit.";
    }
    return null;
  };

  const uploadItem = (item) => {
    if (!companyId) {
      toast.error("Select a company before uploading.");
      return;
    }
    const controller = new AbortController();
    setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "uploading", progress: 0, controller, error: undefined } : q)));

    documentsApi
      .upload(companyId, category, [item.file], {
        signal: controller.signal,
        onUploadProgress: (percent) => {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, progress: percent } : q)));
        },
      })
      .then((res) => {
        const result = res.data.data[0];
        if (result?.success) {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "success", progress: 100 } : q)));
          toast.success(`${item.file.name} uploaded.`);
          onUploadComplete();
        } else if (result?.duplicate) {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "duplicate", error: result.error } : q)));
          toast.error(`Duplicate detected: ${item.file.name}`);
        } else {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: result?.error || "Upload failed." } : q)));
        }
      })
      .catch((error) => {
        if (error?.code === "ERR_CANCELED") {
          setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "cancelled" } : q)));
          return;
        }
        const message = error?.response?.data?.message || "Upload failed. Please retry.";
        setQueue((prev) => prev.map((q) => (q.id === item.id ? { ...q, status: "error", error: message } : q)));
        toast.error(`${item.file.name}: ${message}`);
      });
  };

  const addFiles = (files) => {
    const items = Array.from(files).map((file) => {
      const error = validateFile(file);
      return {
        id: `${file.name}-${file.size}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        file,
        status: error ? "error" : "pending",
        progress: 0,
        error: error || undefined,
      };
    });
    setQueue((prev) => [...items, ...prev]);
    items.filter((item) => item.status === "pending").forEach(uploadItem);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files?.length) addFiles(e.dataTransfer.files);
  };

  const cancelItem = (item) => item.controller?.abort();

  const retryItem = (item) => uploadItem(item);

  const removeItem = (id) => setQueue((prev) => prev.filter((q) => q.id !== id));

  return (
    <div className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Select label="Company" options={companyOptions} value={companyId} onChange={(e) => setCompanyId(e.target.value)} />
        <Select
          label="Category"
          options={categoryOptions}
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        />
      </div>

      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        onClick={() => inputRef.current?.click()}
        className={`flex cursor-pointer flex-col items-center justify-center rounded-xl2 border-2 border-dashed px-6 py-10 text-center transition ${
          isDragging ? "border-accent bg-accent-light/40" : "border-slate-200 hover:border-accent dark:border-ink-700"
        }`}
      >
        <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mb-2 text-accent">
          <path d="M12 16V4m0 0l-4 4m4-4l4 4M4 16v3a2 2 0 002 2h12a2 2 0 002-2v-3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className="text-sm font-medium text-ink-900 dark:text-slate-100">Drag & drop files here, or click to browse</p>
        <p className="mt-1 text-xs text-slate-400">PDF, JPG, PNG, CSV, XLS, XLSX — up to 25MB each</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={ACCEPTED_EXTENSIONS.join(",")}
          className="hidden"
          onChange={(e) => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }}
        />
      </div>

      {queue.length > 0 && (
        <ul className="space-y-2">
          {queue.map((item) => (
            <li key={item.id} className="flex items-center gap-3 rounded-lg border border-slate-100 px-3 py-2 text-sm dark:border-ink-800">
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink-900 dark:text-slate-100">{item.file.name}</p>
                {item.status === "uploading" && (
                  <div className="mt-1 h-1.5 w-full rounded-full bg-slate-100 dark:bg-ink-800">
                    <div className="h-1.5 rounded-full bg-accent transition-all" style={{ width: `${item.progress}%` }} />
                  </div>
                )}
                {(item.status === "error" || item.status === "duplicate") && (
                  <p className="mt-0.5 text-xs text-red-500">{item.error}</p>
                )}
                {item.status === "cancelled" && <p className="mt-0.5 text-xs text-slate-400">Cancelled.</p>}
                {item.status === "success" && <p className="mt-0.5 text-xs text-emerald-600">Uploaded.</p>}
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {item.status === "uploading" && (
                  <button onClick={() => cancelItem(item)} className="text-xs font-medium text-slate-500 hover:text-red-500">
                    Cancel
                  </button>
                )}
                {(item.status === "error" || item.status === "cancelled" || item.status === "duplicate") && (
                  <button onClick={() => retryItem(item)} className="text-xs font-medium text-accent-dark hover:underline">
                    Retry
                  </button>
                )}
                {item.status !== "uploading" && (
                  <button onClick={() => removeItem(item.id)} className="text-slate-400 hover:text-red-500" aria-label={`Remove ${item.file.name}`}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {companyOptions.length === 0 && (
        <p className="text-sm text-slate-500">Create a company first to start uploading documents.</p>
      )}
    </div>
  );
}
