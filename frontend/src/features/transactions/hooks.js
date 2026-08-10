import { useWorkspaceFilters, useWorkspaceQueryKey } from "@/hooks/useWorkspaceFilters";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";

import { categoriesApi, customersApi, transactionsApi, vendorsApi } from "./api";

// --- Transactions ---------------------------------------------------------

export function useTransactionDashboard(companyId) {
  return useQuery(
    ["transaction-dashboard", companyId],
    () => transactionsApi.dashboard(companyId).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function usePaymentAnalytics(companyId) {
  return useQuery(
    ["payment-analytics", companyId],
    () => transactionsApi.paymentAnalytics({ companyId }).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useBudgetSummary(companyId, month) {
  return useQuery(
    ["budget-summary", companyId, month],
    () => transactionsApi.budgetSummary(companyId, month).then((r) => r.data.data),
    { enabled: !!companyId }
  );
}

export function useSetBudget() {
  const queryClient = useQueryClient();
  return useMutation(transactionsApi.setBudget, {
    onSuccess: () => {toast.success("Budget saved.");queryClient.invalidateQueries("budget-summary");},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not save budget."));}
  });
}

export function useDeleteBudget() {
  const queryClient = useQueryClient();
  return useMutation((id) => transactionsApi.deleteBudget(id), {
    onSuccess: () => {toast.success("Budget deleted.");queryClient.invalidateQueries("budget-summary");},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not delete budget."));}
  });
}

export function useTransactions(params) {
  return useQuery(
    ["transactions", params],
    () => transactionsApi.list(params).then((r) => r.data),
    { keepPreviousData: true }
  );
}

export function useTransaction(id) {
  return useQuery(
    ["transaction", id],
    () => transactionsApi.detail(id).then((r) => r.data.data),
    { enabled: !!id }
  );
}

function invalidateTransactions(queryClient) {
  queryClient.invalidateQueries("transactions");
  queryClient.invalidateQueries("transaction-dashboard");
}

export function useCreateTransaction() {
  const queryClient = useQueryClient();
  return useMutation((payload) => transactionsApi.create(payload), {
    onSuccess: () => {toast.success("Transaction added.");invalidateTransactions(queryClient);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not create transaction."));}
  });
}

export function useUpdateTransaction(id) {
  const queryClient = useQueryClient();
  return useMutation((payload) => transactionsApi.update(id, payload), {
    onSuccess: () => {toast.success("Transaction updated.");invalidateTransactions(queryClient);queryClient.invalidateQueries(["transaction", id]);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not update transaction."));}
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation((id) => transactionsApi.remove(id), {
    onSuccess: () => {toast.success("Transaction deleted.");invalidateTransactions(queryClient);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not delete transaction."));}
  });
}

export function useBulkDeleteTransactions() {
  const queryClient = useQueryClient();
  return useMutation((ids) => transactionsApi.bulkDelete(ids), {
    onSuccess: () => {toast.success("Selected transactions deleted.");invalidateTransactions(queryClient);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Bulk delete failed."));}
  });
}

export function useBulkUpdateTransactions() {
  const queryClient = useQueryClient();
  return useMutation(
    ({ ids, fields }) =>
    transactionsApi.bulkUpdate(ids, fields),
    {
      onSuccess: () => {toast.success("Selected transactions updated.");invalidateTransactions(queryClient);},
      onError: (error) => {toast.error(getApiErrorMessage(error, "Bulk update failed."));}
    }
  );
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

export async function exportTransactionsCsv(params) {
  try {
    const response = await transactionsApi.exportCsv(params);
    downloadBlob(response.data, "transactions.csv");
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not export transactions."));
  }
}

export async function exportTransactionsXlsx(params) {
  try {
    const response = await transactionsApi.exportXlsx(params);
    downloadBlob(response.data, "transactions.xlsx");
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not export transactions."));
  }
}

export async function exportSelectedTransactionsXlsx(ids) {
  try {
    const response = await transactionsApi.exportSelectedXlsx(ids);
    downloadBlob(response.data, "transactions-selected.xlsx");
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not export selected transactions."));
  }
}



export function useImportTransactionsFile() {
  const queryClient = useQueryClient();
  return useMutation(({ companyId, file }) => transactionsApi.importFile(companyId, file), {
    onSuccess: (res) => {
      const results = res.data.data;
      const successCount = results.filter((r) => r.success).length;
      if (successCount === results.length) {
        toast.success(`Imported ${successCount} of ${results.length} rows.`);
      } else {
        toast.error(`Imported ${successCount} of ${results.length} rows — ${results.length - successCount} failed.`);
      }
      invalidateTransactions(queryClient);
    },
    onError: (error) => {toast.error(getApiErrorMessage(error, "Import failed."));}
  });
}

export function useTransactionTags() {
  return useQuery(["transaction-tags"], () => transactionsApi.tags().then((r) => r.data.data));
}

export function useRecurringPatterns(params = {}) {
  const filters = useWorkspaceFilters(params);
  const queryKey = useWorkspaceQueryKey(["recurring-patterns", filters]);
  return useQuery(
    queryKey,
    () => transactionsApi.recurring(filters).then((r) => r.data.data)
  );
}

export function useDetectRecurringPatterns() {
  const queryClient = useQueryClient();
  return useMutation((companyId) => transactionsApi.detectRecurring(companyId), {
    onSuccess: (res) => {
      const patterns = res.data.data;
      toast.success(`Detected ${patterns.length} recurring pattern${patterns.length === 1 ? "" : "s"}.`);
      queryClient.invalidateQueries("recurring-patterns");
    },
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not run recurring-transaction detection."));}
  });
}

// --- Categories ------------------------------------------------------------

export function useCategories(type) {
  return useQuery(["categories", type], () => categoriesApi.list(type).then((r) => r.data.data));
}

export function useCreateCategory() {
  const queryClient = useQueryClient();
  return useMutation(categoriesApi.create, {
    onSuccess: () => {toast.success("Category created.");queryClient.invalidateQueries("categories");},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not create category."));}
  });
}

export function useDeleteCategory() {
  const queryClient = useQueryClient();
  return useMutation((id) => categoriesApi.remove(id), {
    onSuccess: () => {toast.success("Category deleted.");queryClient.invalidateQueries("categories");},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not delete category."));}
  });
}

// --- Vendors / Customers ---------------------------------------------------

function usePartyList(kind, params) {
  const client = kind === "vendors" ? vendorsApi : customersApi;
  return useQuery(
    [kind, params],
    () => client.list(params).then((r) => r.data),
    { keepPreviousData: true }
  );
}

export const useVendors = (params) => usePartyList("vendors", params);
export const useCustomers = (params) => usePartyList("customers", params);

export function useParty(kind, id) {
  const client = kind === "vendors" ? vendorsApi : customersApi;
  return useQuery(
    [kind, "detail", id],
    () => client.detail(id).then((r) => r.data.data),
    { enabled: !!id }
  );
}

export function useCreateParty(kind) {
  const client = kind === "vendors" ? vendorsApi : customersApi;
  const queryClient = useQueryClient();
  const { selectedClient, selectedCompany } = useWorkspace();
  return useMutation((payload) => client.create({ ...payload, client_id: selectedClient?.id, company_id: selectedCompany?.id }), {
    onSuccess: () => {toast.success(`${kind === "vendors" ? "Vendor" : "Customer"} created.`);queryClient.invalidateQueries(kind);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not save."));}
  });
}

export function useUpdateParty(kind, id) {
  const client = kind === "vendors" ? vendorsApi : customersApi;
  const queryClient = useQueryClient();
  return useMutation((payload) => client.update(id, payload), {
    onSuccess: () => {toast.success("Saved.");queryClient.invalidateQueries(kind);queryClient.invalidateQueries([kind, "detail", id]);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not save."));}
  });
}

export function useDeleteParty(kind) {
  const client = kind === "vendors" ? vendorsApi : customersApi;
  const queryClient = useQueryClient();
  return useMutation((id) => client.remove(id), {
    onSuccess: () => {toast.success("Deleted.");queryClient.invalidateQueries(kind);},
    onError: (error) => {toast.error(getApiErrorMessage(error, "Could not delete."));}
  });
}
// Stub for import error report download (import pipeline feature)
export async function downloadImportErrorReport(jobId) {
  // Feature removed � import pipeline was simplified
  console.warn("downloadImportErrorReport is not available in this version.");
}
