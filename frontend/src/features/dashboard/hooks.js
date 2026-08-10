import { useQuery } from "react-query";
import { useWorkspaceFilters, useWorkspaceQueryKey } from "@/hooks/useWorkspaceFilters";
import { dashboardApi } from "./api";

export function useDashboardSummary(params = {}) {
  const filters = useWorkspaceFilters(params);
  const queryKey = useWorkspaceQueryKey(["dashboard-summary", filters]);
  return useQuery(
    queryKey,
    () => dashboardApi.summary(filters).then((r) => r.data.data)
  );
}
