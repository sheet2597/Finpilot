import { api } from "@/lib/axios";

export const documentsApi = {
  dashboard: (companyId) => api.get("/documents/dashboard", { params: { company_id: companyId } }),

  list: (params) => api.get("/documents", { params }),

  detail: (id) => api.get(`/documents/${id}`),

  upload: (
    companyId,
    category,
    files,
    options
  ) => {
    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("category", category);
    files.forEach((file) => formData.append("files", file));

    return api.post("/documents/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      signal: options?.signal,
      onUploadProgress: (event) => {
        if (!options?.onUploadProgress || !event.total) return;
        options.onUploadProgress(Math.round((event.loaded / event.total) * 100));
      },
    });
  },

  rename: (id, filename) => api.put(`/documents/${id}`, { filename }),

  updateCategory: (id, category) =>
    api.put(`/documents/${id}`, { category }),

  remove: (id) => api.delete(`/documents/${id}`),

  archive: (documentIds) => api.post("/documents/archive", { document_ids: documentIds }),

  restore: (documentIds) => api.post("/documents/restore", { document_ids: documentIds }),

  download: (id) => api.get(`/documents/download/${id}`, { responseType: "blob" }),
};
