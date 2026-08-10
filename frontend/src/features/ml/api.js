import { api } from "@/lib/axios";






export const mlApi = {
  // Model management
  modelStatus: () => api.get("/ml/models/"),
  
  modelReadiness: (companyId) => api.get("/ml/models/readiness/", { params: { company_id: companyId } }),

  trainAll: () => api.post("/ml/models/train-all/"),

  trainSingle: async (modelType, companyId) => {
    const res = await api.post(`/ml/models/${modelType}/train/`, { company_id: companyId });
    return res.data;
  },
  
  trainDemo: async (modelType, companyId) => {
    const res = await api.post(`/ml/demo/${modelType}/train/`, { company_id: companyId });
    return res.data;
  },

  // Module 1 — Expense Categorization
  categorizeExpenses: (transactionIds) =>
  api.post("/ml/expenses/categorize/", { transaction_ids: transactionIds }),

  applyCategory: (transactionId, categoryName) =>
  api.post("/ml/expenses/apply-category/", { transaction_id: transactionId, category_name: categoryName }),

  // Module 2 — Duplicate Transaction Detection
  duplicateTransactions: (companyId) =>
  api.get("/ml/transactions/duplicates/", { params: { company_id: companyId } }),

  // Module 3 — Compliance Risk Prediction
  complianceRisk: (companyId) =>
  api.get("/ml/compliance/risk/", { params: { company_id: companyId } }),

  complianceRiskRules: () =>
  api.get("/ml/compliance/risk/rules/"),

  // Modules 4 & 5 — Forecasts
  forecastTax: (periodsAhead = 3) =>
  api.get(
    "/ml/forecast/tax-liability/", { params: { periods_ahead: periodsAhead } }
  ),

  forecastExpenses: (periodsAhead = 3) =>
  api.get(
    "/ml/forecast/expenses/", { params: { periods_ahead: periodsAhead } }
  ),

  // Reports
  downloadReport: (reportType, format, companyId) =>
  api.get(`/ml/reports/${reportType}/`, { params: { file_format: format, company_id: companyId }, responseType: "blob" })
};