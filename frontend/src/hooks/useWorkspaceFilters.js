
import { useWorkspace } from "@/context/WorkspaceContext";
import { useMemo } from "react";

/**
 * Automatically merges the current workspace identifiers into the given query parameters.
 * Use this inside every API hook to guarantee they are strictly scoped to the workspace.
 */
export function useWorkspaceFilters(params = {}) {
  const { selectedClient, selectedCompany } = useWorkspace();

  return useMemo(() => {
    const filters = { ...params };

    // Inject workspace filters if they are not explicitly overridden
    if (selectedClient?.id && filters.client_id === undefined) {
      filters.client_id = selectedClient.id;
    }
    
    if (selectedCompany?.id && filters.company_id === undefined) {
      filters.company_id = selectedCompany.id;
    }

    return filters;
  }, [params, selectedClient, selectedCompany]);
}

/**
 * Returns a consistent workspace cache key array for React Query.
 * Example: ["transactions", "workspace", clientId, companyId]
 */
export function useWorkspaceQueryKey(baseKey) {
  const { selectedClient, selectedCompany } = useWorkspace();
  
  return useMemo(() => {
    return [
      ...(Array.isArray(baseKey) ? baseKey : [baseKey]),
      "workspace",
      selectedClient?.id || "no-client",
      selectedCompany?.id || "no-company"
    ];
  }, [baseKey, selectedClient, selectedCompany]);
}
