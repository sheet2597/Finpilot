import { useWorkspace } from "@/hooks/useWorkspace";
import { useMutation, useQuery, useQueryClient } from "react-query";
import toast from "react-hot-toast";
import { getApiErrorMessage } from "@/lib/axios";
import { companiesApi } from "./api";
import { useWorkspace as useCompanyCtx } from "@/hooks/useWorkspace";

export function useCompanies(params) {
  return useQuery(["companies", params], () => companiesApi.list(params).then((r) => r.data), {
    keepPreviousData: true,
  });
}

export function useCompany(id) {
  return useQuery(["company", id], () => companiesApi.detail(id).then((r) => r.data.data), {
    enabled: !!id,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();
  const { refreshWorkspace } = useWorkspace();
  return useMutation((values) => companiesApi.create(values), {
    onSuccess: () => {
      toast.success("Company created successfully.");
      queryClient.invalidateQueries("companies");
      queryClient.invalidateQueries("dashboard-summary");
      if (refreshWorkspace) refreshWorkspace().catch(() => {});
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not create company.")); },
  });
}

export function useUpdateCompany(id) {
  const queryClient = useQueryClient();
  return useMutation((values) => companiesApi.update(id, values), {
    onSuccess: () => {
      toast.success("Company updated successfully.");
      queryClient.invalidateQueries("companies");
      queryClient.invalidateQueries(["company", id]);
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not update company.")); },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();
  return useMutation((id) => companiesApi.remove(id), {
    onSuccess: () => {
      toast.success("Company deleted.");
      queryClient.invalidateQueries("companies");
      queryClient.invalidateQueries("dashboard-summary");
    },
    onError: (error) => { toast.error(getApiErrorMessage(error, "Could not delete company.")); },
  });
}
