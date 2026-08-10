import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { taxApi } from "./api";

export function useTaxDashboard(companyId) {
  return useQuery(
    ["tax-dashboard", companyId],
    () => taxApi.dashboard(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useIncomeTaxHistory(companyId) {
  return useQuery(
    ["tax-income-history", companyId],
    () => taxApi.incomeTaxHistory(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useEstimateIncomeTax() {
  const queryClient = useQueryClient();
  return useMutation(
    (payload) => taxApi.estimateIncomeTax(payload),
    {
      onSuccess: () => {
        toast.success("Estimate updated.");
        queryClient.invalidateQueries("tax-dashboard");
        queryClient.invalidateQueries("tax-income-history");
      },
      onError: (error) => {toast.error(getApiErrorMessage(error, "Could not generate the estimate."));}
    }
  );
}

export function useGstDashboard(companyId) {
  return useQuery(
    ["gst-dashboard", companyId],
    () => taxApi.gstDashboard(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useGstCalculator() {
  return useMutation((payload) => taxApi.gstCalculator(payload), {
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not compute GST."));}
  });
}

export function useTdsDashboard(companyId) {
  return useQuery(
    ["tds-dashboard", companyId],
    () => taxApi.tdsDashboard(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useTdsDeductionHistory(companyId) {
  return useQuery(
    ["tds-deduction-history", companyId],
    () => taxApi.tdsDeductionHistory(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useTdsCalculator() {
  return useMutation((payload) => taxApi.tdsCalculator(payload), {
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not compute TDS."));}
  });
}

export function useComplianceCenter(params) {
  return useQuery(
    ["compliance-center", params.companyId, params.clientId, params.financialYear],
    () => taxApi.complianceCenter(params).then((r) => r.data.data),
    { enabled: !!params.companyId }
  );
}

export function useFilingReadiness(companyId, financialYear) {
  return useQuery(
    ["filing-readiness", companyId, financialYear],
    () => taxApi.filingReadiness(companyId, financialYear).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}