import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { documentsApi } from "./api";

export function useDocumentDashboard(companyId) {
  return useQuery(["document-dashboard", companyId], () => documentsApi.dashboard(companyId).then((r) => r.data.data));
}

export function useDocuments(params) {
  return useQuery(["documents", params], () => documentsApi.list(params).then((r) => r.data), {
    keepPreviousData: true,
  });
}

export function useDocument(id) {
  return useQuery(["document", id], () => documentsApi.detail(id).then((r) => r.data.data), {
    enabled: !!id,
  });
}

export function useRenameDocument(id) {
  const queryClient = useQueryClient();
  return useMutation((filename) => documentsApi.rename(id, filename), {
    onSuccess: () => {
      toast.success("Document renamed.");
      queryClient.invalidateQueries("documents");
      queryClient.invalidateQueries(["document", id]);
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not rename document.")); },
  });
}

export function useUpdateDocumentCategory(id) {
  const queryClient = useQueryClient();
  return useMutation((category) => documentsApi.updateCategory(id, category), {
    onSuccess: () => {
      toast.success("Category updated.");
      queryClient.invalidateQueries("documents");
      queryClient.invalidateQueries(["document", id]);
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not update category.")); },
  });
}

export function useDeleteDocument() {
  const queryClient = useQueryClient();
  return useMutation((id) => documentsApi.remove(id), {
    onSuccess: () => {
      toast.success("Document deleted.");
      queryClient.invalidateQueries("documents");
      queryClient.invalidateQueries("document-dashboard");
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not delete document.")); },
  });
}

export function useArchiveDocuments() {
  const queryClient = useQueryClient();
  return useMutation((ids) => documentsApi.archive(ids), {
    onSuccess: () => {
      toast.success("Document archived.");
      queryClient.invalidateQueries("documents");
      queryClient.invalidateQueries("document-dashboard");
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not archive document.")); },
  });
}

export function useRestoreDocuments() {
  const queryClient = useQueryClient();
  return useMutation((ids) => documentsApi.restore(ids), {
    onSuccess: () => {
      toast.success("Document restored.");
      queryClient.invalidateQueries("documents");
      queryClient.invalidateQueries("document-dashboard");
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not restore document.")); },
  });
}

export async function downloadDocument(id, filename) {
  try {
    const response = await documentsApi.download(id);
    const url = window.URL.createObjectURL(new Blob([response.data]));
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  } catch (error) {
    toast.error(getApiErrorMessage(error, "Could not download document."));
  }
}
