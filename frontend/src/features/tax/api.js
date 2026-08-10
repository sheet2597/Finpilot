import { api } from "@/lib/axios";







export const taxApi = {
  dashboard: (companyId) =>
  api.get("/tax/dashboard", { params: { company_id: companyId } }),

  estimateIncomeTax: (payload) =>
  api.post("/tax/income-tax/estimate", payload),

  incomeTaxHistory: (companyId) =>
  api.get("/tax/income-tax/history", { params: { company_id: companyId } }),

  gstDashboard: (companyId) =>
  api.get("/tax/gst/dashboard", { params: { company_id: companyId } }),

  gstCalculator: (payload) =>
  api.post("/tax/gst/calculator", payload),

  validateGstin: (gstin) =>
  api.get("/tax/gst/validate-gstin", { params: { gstin } }),

  tdsDashboard: (companyId) =>
  api.get("/tax/tds/dashboard", { params: { company_id: companyId } }),

  tdsDeductionHistory: (companyId) =>
  api.get("/tax/tds/deduction-history", { params: { company_id: companyId } }),

  tdsCalculator: (payload) =>
  api.post("/tax/tds/calculator", payload),

  complianceCenter: (params) =>
  api.get("/tax/compliance-center", {
    params: { company_id: params.companyId, client_id: params.clientId, financial_year: params.financialYear }
  }),

  filingReadiness: (companyId, financialYear) =>
  api.get("/tax/filing-readiness", {
    params: { company_id: companyId, financial_year: financialYear }
  })
};