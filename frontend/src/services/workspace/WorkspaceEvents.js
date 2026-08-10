export const WorkspaceEvents = {
  WORKSPACE_CHANGED: "workspace_changed",
  WORKSPACE_CLEARED: "workspace_cleared",

  emitWorkspaceChanged: (clientId, companyId) => {
    window.dispatchEvent(
      new CustomEvent(WorkspaceEvents.WORKSPACE_CHANGED, {
        detail: { clientId, companyId },
      })
    );
  },

  emitWorkspaceCleared: () => {
    window.dispatchEvent(new Event(WorkspaceEvents.WORKSPACE_CLEARED));
  },

  subscribe: (eventName, callback) => {
    window.addEventListener(eventName, callback);
    return () => window.removeEventListener(eventName, callback);
  },
};
