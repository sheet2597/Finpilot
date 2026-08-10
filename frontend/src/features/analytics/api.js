import { api } from "@/lib/axios";

export const analyticsApi = {
  dashboard: (companyId) =>
    api.get("/analytics/dashboard/", { params: { company_id: companyId } }),

  executiveDashboard: (companyId) =>
    api.get("/analytics/executive-dashboard/", { params: { company_id: companyId } }),

  kpis: (companyId) =>
    api.get("/analytics/kpis/", { params: { company_id: companyId } }),

  insights: (companyId) =>
    api.get("/analytics/insights/", { params: { company_id: companyId } }),

  financial: (analysisType, companyId, extra = {}) =>
    api.get(`/analytics/financial/${analysisType}/`, { params: { company_id: companyId, ...extra } }),

  periodAnalysis: (granularity, companyId) =>
    api.get("/analytics/financial/period/", { params: { granularity, company_id: companyId } }),

  categoryAnalysis: (txnType, companyId) =>
    api.get(`/analytics/financial/category-${txnType}/`, { params: { company_id: companyId } }),

  partyAnalysis: (partyType, companyId) =>
    api.get(`/analytics/financial/${partyType}/`, { params: { company_id: companyId } }),

  topTransactions: (txnType, companyId, limit = 10) =>
    api.get(`/analytics/financial/top-${txnType === "expense" ? "expenses" : "income"}/`, { params: { company_id: companyId, limit } }),

  trend: (metric, granularity = "monthly", companyId) =>
    api.get("/analytics/trends/", { params: { metric, granularity, company_id: companyId } }),

  comparePeriods: (companyId, periodA, periodB, granularity = "monthly") =>
    api.get("/analytics/compare/periods/", { params: { company_id: companyId, period_a: periodA, period_b: periodB, granularity } }),

  compareCompanies: (companyIds) =>
    api.post("/analytics/compare/companies/", { company_ids: companyIds }),

  compareClients: (clientIds) =>
    api.post("/analytics/compare/clients/", { client_ids: clientIds }),

  reportCatalog: () => api.get("/analytics/reports/"),

  downloadReport: (reportType, format, companyId) =>
    api.get(`/analytics/reports/${reportType}/`, { params: { file_format: format, company_id: companyId }, responseType: "blob" }),

  batchExport: (reportTypes, format, companyId) =>
    api.post("/analytics/reports/batch-export/", { report_types: reportTypes, format, company_id: companyId }, { responseType: "blob" }),

  search: (q, companyId) =>
    api.get("/analytics/search/", { params: { q, company_id: companyId } }),
};
