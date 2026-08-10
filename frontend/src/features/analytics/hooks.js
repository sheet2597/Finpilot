import { useMutation, useQuery } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { analyticsApi } from "./api";

export function useAnalyticsDashboard(companyId) {
  return useQuery(["analytics-dashboard", companyId], () => analyticsApi.dashboard(companyId).then((r) => r.data.data), {
    enabled: !!companyId,
  });
}

export function useExecutiveDashboard(companyId) {
  return useQuery(["analytics-executive-dashboard", companyId], () => analyticsApi.executiveDashboard(companyId).then((r) => r.data.data), {
    enabled: !!companyId,
  });
}

export function usePeriodAnalysis(granularity, companyId) {
  return useQuery(
    ["analytics-period", granularity, companyId],
    () => analyticsApi.periodAnalysis(granularity, companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useCategoryAnalysis(txnType, companyId) {
  return useQuery(
    ["analytics-category", txnType, companyId],
    () => analyticsApi.categoryAnalysis(txnType, companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useReportCatalog() {
  return useQuery(["analytics-report-catalog"], () => analyticsApi.reportCatalog().then((r) => r.data.data));
}

export function useGlobalSearch() {
  return useMutation(({ q, companyId }) => analyticsApi.search(q, companyId), {
    onError: (error) => { toast.error(getApiErrorMessage(error, "Search failed.")); },
  });
}

function downloadBlob(data, filename) {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
}

export async function downloadAnalyticsReport(reportType, format, companyId) {
  try {
    const response = await analyticsApi.downloadReport(reportType, format, companyId);
    downloadBlob(response.data, `${reportType}-report.${format}`);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not download the report."));
  }
}

export async function downloadBatchExport(reportTypes, format, companyId) {
  try {
    const response = await analyticsApi.batchExport(reportTypes, format, companyId);
    downloadBlob(response.data, `reports-batch.zip`);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not export the reports."));
  }
}
