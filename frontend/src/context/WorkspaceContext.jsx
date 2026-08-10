
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from "react";
import { WorkspaceManager } from "@/services/workspace/WorkspaceManager";
import { WorkspaceStorage } from "@/services/workspace/WorkspaceStorage";
import { WorkspaceValidator } from "@/services/workspace/WorkspaceValidator";
import { WorkspaceEvents } from "@/services/workspace/WorkspaceEvents";
import { useAuth } from "@/features/auth/AuthContext";

const WorkspaceContext = createContext();

export function WorkspaceProvider({ children }) {
  const { user } = useAuth();
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [availableClients, setAvailableClients] = useState([]);
  const [availableCompanies, setAvailableCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState(null);

  const initWorkspace = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await WorkspaceManager.initialize();
      setAvailableClients(data.availableClients);
      setAvailableCompanies(data.availableCompanies);
      setSelectedClient(data.selectedClient);
      setSelectedCompany(data.selectedCompany);
      setInitialized(true);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      initWorkspace();
    } else {
      setSelectedClient(null);
      setSelectedCompany(null);
      setAvailableClients([]);
      setAvailableCompanies([]);
      setInitialized(false);
    }
  }, [user, initWorkspace]);

  const switchClient = useCallback(async (clientId) => {
    const client = availableClients.find(c => c.id === clientId);
    if (!client) return;

    // We fetch fresh companies for this new client, or filter available if they are all loaded
    const clientCompanies = availableCompanies.filter(c => c.client_id === clientId || !c.client_id);
    
    // Choose the first company automatically, or none
    const firstCompany = clientCompanies[0] || null;

    setSelectedClient(client);
    setSelectedCompany(firstCompany);

    WorkspaceStorage.saveWorkspace(client.id, firstCompany?.id);
    WorkspaceEvents.emitWorkspaceChanged(client.id, firstCompany?.id);
  }, [availableClients, availableCompanies]);

  const switchCompany = useCallback((companyId) => {
    if (!selectedClient) return;

    const company = availableCompanies.find(c => c.id === companyId);
    if (!company) return;

    setSelectedCompany(company);
    WorkspaceStorage.saveWorkspace(selectedClient.id, company.id);
    WorkspaceEvents.emitWorkspaceChanged(selectedClient.id, company.id);
  }, [selectedClient, availableCompanies]);

  const restoreWorkspace = useCallback(async () => {
    await initWorkspace();
  }, [initWorkspace]);

  const refreshWorkspace = useCallback(async () => {
    await initWorkspace();
  }, [initWorkspace]);

  const clearWorkspace = useCallback(() => {
    WorkspaceStorage.clear();
    setSelectedClient(null);
    setSelectedCompany(null);
    WorkspaceEvents.emitWorkspaceCleared();
  }, []);

  const value = useMemo(() => ({
    selectedClient,
    selectedCompany,
    availableClients,
    availableCompanies,
    loading,
    initialized,
    error,
    switchClient,
    switchCompany,
    restoreWorkspace,
    refreshWorkspace,
    clearWorkspace
  }), [
    selectedClient,
    selectedCompany,
    availableClients,
    availableCompanies,
    loading,
    initialized,
    error,
    switchClient,
    switchCompany,
    restoreWorkspace,
    refreshWorkspace,
    clearWorkspace
  ]);

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
}
