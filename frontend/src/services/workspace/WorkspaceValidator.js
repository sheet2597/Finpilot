export const WorkspaceValidator = {
  /**
   * Validates if the selected company actually belongs to the selected client.
   * If a company doesn't match the client, it returns a fallback company or null.
   */
  validateSelection: (clientId, companyId, availableCompanies) => {
    if (!clientId) return null;
    
    // Filter companies that belong to this client
    // Note: The backend API usually only returns companies for the requested client anyway,
    // but this adds an extra layer of frontend safety.
    const clientCompanies = availableCompanies.filter(c => c.client_id === clientId || !c.client_id);
    
    if (clientCompanies.length === 0) {
      return null;
    }

    const isValid = clientCompanies.some(c => c.id === companyId);
    
    if (isValid) {
      return companyId;
    }

    // Fallback to the first available company for this client
    return clientCompanies[0].id;
  },
  
  isValidWorkspace: (clientId, companyId) => {
    return Boolean(clientId && companyId);
  }
};
