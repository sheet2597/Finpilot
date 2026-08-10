import { api } from "@/lib/axios";






export const transactionsApi = {
  dashboard: (companyId) =>
  api.get("/transactions/dashboard", { params: { company_id: companyId } }),

  paymentAnalytics: (params) =>
  api.get("/transactions/payment-analytics", {
    params: { company_id: params.companyId, date_from: params.dateFrom, date_to: params.dateTo }
  }),

  budgets: (companyId, month) =>
  api.get("/budgets", { params: { company_id: companyId, month } }),

  budgetSummary: (companyId, month) =>
  api.get("/budgets/summary", { params: { company_id: companyId, month } }),

  setBudget: (payload) =>
  api.post("/budgets", payload),

  deleteBudget: (id) => api.delete(`/budgets/${id}`),

  list: (params) => api.get("/transactions", { params }),

  detail: (id) => api.get(`/transactions/${id}`),

  create: (payload) => api.post("/transactions", payload),

  update: (id, payload) => api.put(`/transactions/${id}`, payload),

  remove: (id) => api.delete(`/transactions/${id}`),

  bulkDelete: (ids) => api.post("/transactions/bulk-delete", { ids }),

  bulkUpdate: (ids, fields) =>
  api.post("/transactions/bulk-update", { ids, ...fields }),

  exportCsv: (params) => api.get("/transactions/export", { params, responseType: "blob" }),

  exportXlsx: (params) =>
  api.get("/transactions/export", { params: { ...params, format: "xlsx" }, responseType: "blob" }),

  exportSelectedXlsx: (ids) =>
  api.get("/transactions/export", { params: { ids: ids.join(","), format: "xlsx" }, responseType: "blob" }),

  // Synchronous import — returns results immediately in the response body
  importFile: (companyId, file) => {
    const formData = new FormData();
    formData.append("company_id", companyId);
    formData.append("file", file);
    return api.post("/transactions/import", formData, { headers: { "Content-Type": "multipart/form-data" } });
  },

  tags: () => api.get("/transactions/tags"),

  recurring: (params) =>
  api.get("/transactions/recurring", { params }),

  detectRecurring: (payload) =>
  api.post("/transactions/recurring", payload)
};

export const categoriesApi = {
  list: (type) => api.get("/categories", { params: { type } }),
  create: (payload) =>
  api.post("/categories", payload),
  remove: (id) => api.delete(`/categories/${id}`)
};

function partyApi(resource) {
  return {
    list: (params) =>
    api.get(`/${resource}`, { params }),
    detail: (id) => api.get(`/${resource}/${id}`),
    create: (payload) => api.post(`/${resource}`, payload),
    update: (id, payload) => api.put(`/${resource}/${id}`, payload),
    remove: (id) => api.delete(`/${resource}/${id}`)
  };
}

export const vendorsApi = partyApi("vendors");
export const customersApi = partyApi("customers");