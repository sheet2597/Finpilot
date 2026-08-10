const CLIENT_KEY = "workspace_client_id";
const COMPANY_KEY = "workspace_company_id";

export const WorkspaceStorage = {
  getClientId: () => {
    try {
      return localStorage.getItem(CLIENT_KEY) || null;
    } catch {
      return null;
    }
  },

  getCompanyId: () => {
    try {
      return localStorage.getItem(COMPANY_KEY) || null;
    } catch {
      return null;
    }
  },

  saveWorkspace: (clientId, companyId) => {
    try {
      if (clientId) localStorage.setItem(CLIENT_KEY, clientId);
      else localStorage.removeItem(CLIENT_KEY);

      if (companyId) localStorage.setItem(COMPANY_KEY, companyId);
      else localStorage.removeItem(COMPANY_KEY);
    } catch (err) {
      console.warn("Failed to persist workspace state", err);
    }
  },

  clear: () => {
    try {
      localStorage.removeItem(CLIENT_KEY);
      localStorage.removeItem(COMPANY_KEY);
    } catch (err) {
      console.warn("Failed to clear workspace state", err);
    }
  }
};
