import { api } from "@/lib/axios";
import { WorkspaceStorage } from "./WorkspaceStorage";
import { WorkspaceValidator } from "./WorkspaceValidator";
import { WorkspaceEvents } from "./WorkspaceEvents";

export const WorkspaceManager = {
  /**
   * Initializes the workspace by loading clients, companies, and restoring the last selection.
   */
  initialize: async () => {
    try {
      const [clientsRes, companiesRes] = await Promise.all([
        api.get("/clients", { params: { page_size: 100 } }),
        api.get("/companies", { params: { page_size: 1000 } })
      ]);

      const availableClients = clientsRes.data?.data || [];
      const availableCompanies = companiesRes.data?.data || [];

      let savedClientId = WorkspaceStorage.getClientId();
      let savedCompanyId = WorkspaceStorage.getCompanyId();

      // If no saved client, default to the first available client
      if (!savedClientId && availableClients.length > 0) {
        savedClientId = availableClients[0].id;
      }

      // Validate the saved company against the client
      savedCompanyId = WorkspaceValidator.validateSelection(savedClientId, savedCompanyId, availableCompanies);

      if (savedClientId && savedCompanyId) {
        WorkspaceStorage.saveWorkspace(savedClientId, savedCompanyId);
        WorkspaceEvents.emitWorkspaceChanged(savedClientId, savedCompanyId);
      } else {
        WorkspaceStorage.clear();
      }

      return {
        selectedClient: availableClients.find(c => c.id === savedClientId) || null,
        selectedCompany: availableCompanies.find(c => c.id === savedCompanyId) || null,
        availableClients,
        availableCompanies,
      };
    } catch (error) {
      console.error("Failed to initialize workspace:", error);
      return { selectedClient: null, selectedCompany: null, availableClients: [], availableCompanies: [] };
    }
  },

  /**
   * Fetches companies specifically for a client, bypassing the global cache 
   * if we need a fresh list for the switcher.
   */
  getCompaniesForClient: async (clientId) => {
    if (!clientId) return [];
    try {
      const res = await api.get("/companies", { params: { client_id: clientId, page_size: 1000 } });
      return res.data?.data || [];
    } catch (error) {
      console.error("Failed to fetch companies for client", error);
      return [];
    }
  }
};
