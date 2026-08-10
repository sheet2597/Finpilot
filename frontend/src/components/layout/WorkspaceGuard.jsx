import { useWorkspace } from "@/hooks/useWorkspace";
import { useLocation, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/Button";
import { Building2, Users } from "lucide-react";

export function WorkspaceGuard({ children }) {
  const { selectedClient, selectedCompany, availableClients, availableCompanies, initialized } = useWorkspace();
  const location = useLocation();
  const navigate = useNavigate();

  // Do not block rendering until the workspace has finished initializing
  if (!initialized) {
    return null;
  }

  // Allow unrestricted access to the Client and Company management pages so users can resolve the empty states
  const isManagementRoute = location.pathname.startsWith("/clients") || location.pathname.startsWith("/companies");
  if (isManagementRoute) {
    return children;
  }

  // State 1: Absolutely no clients exist
  if (availableClients.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Users size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-slate-100">Welcome to your Workspace</h2>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          To get started, you need to create your first Client. Everything in this application runs within a specific Client and Company context.
        </p>
        <Button className="mt-8 gap-2" onClick={() => navigate("/clients")}>
          <Users size={16} /> Go to Clients
        </Button>
      </div>
    );
  }

  // State 2: Client exists, but no client selected
  if (!selectedClient) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Users size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-slate-100">Select a Client</h2>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          Please select a client from the top navigation bar to view their workspace.
        </p>
      </div>
    );
  }

  // State 3: Client selected, but they have absolutely no companies
  if (availableCompanies.length === 0) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Building2 size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-slate-100">No Companies Found</h2>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          The client <strong>{selectedClient.full_name}</strong> has no companies. You must create a company for this client to view dashboards and transactions.
        </p>
        <Button className="mt-8 gap-2" onClick={() => navigate("/companies")}>
          <Building2 size={16} /> Create Company
        </Button>
      </div>
    );
  }

  // State 4: Companies exist, but none selected (user might have cleared it manually)
  if (!selectedCompany) {
    return (
      <div className="flex h-full flex-col items-center justify-center p-8 text-center animate-fade-in">
        <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-accent/10 text-accent">
          <Building2 size={32} />
        </div>
        <h2 className="font-display text-2xl font-bold text-ink-900 dark:text-slate-100">Select a Company</h2>
        <p className="mt-2 max-w-md text-slate-500 dark:text-slate-400">
          Please select a company for <strong>{selectedClient.full_name}</strong> from the top navigation bar.
        </p>
      </div>
    );
  }

  // Safe to render workspace-dependent content
  return children;
}
