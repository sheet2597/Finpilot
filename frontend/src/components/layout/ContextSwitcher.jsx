import { useState, useRef, useEffect } from "react";
import { Building2, Search, ChevronRight, ChevronLeft, Check, AlertCircle } from "lucide-react";
import { useClients } from "@/features/clients/hooks";
import { useCompanies } from "@/features/companies/hooks";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDebounce } from "@/lib/useDebounce";

export function ContextSwitcher() {
  const { selectedCompany, switchCompany } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState("clients"); // "clients" | "companies"
  const [selectedClient, setSelectedClient] = useState(null);
  
  const [clientSearch, setClientSearch] = useState("");
  const debouncedClientSearch = useDebounce(clientSearch, 300);
  
  const [companySearch, setCompanySearch] = useState("");
  const debouncedCompanySearch = useDebounce(companySearch, 300);
  
  const containerRef = useRef(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    const handleEsc = (e) => {
      if (e.key === "Escape") setIsOpen(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [isOpen]);

  // Reset state when opened
  useEffect(() => {
    if (isOpen) {
      if (selectedCompany?.client_id) {
        setSelectedClient({ id: selectedCompany.client_id, full_name: selectedCompany.client_name });
        setView("companies");
      } else {
        setView("clients");
      }
      setClientSearch("");
      setCompanySearch("");
    }
  }, [isOpen, selectedCompany]);

  const { data: clientsData, isLoading: clientsLoading } = useClients({ 
    page: 1, 
    page_size: 100, 
    search: debouncedClientSearch || undefined 
  });
  
  const { data: companiesData, isLoading: companiesLoading } = useCompanies({ 
    page: 1, 
    page_size: 100, 
    client_id: selectedClient?.id,
    search: debouncedCompanySearch || undefined 
  });

  const clients = clientsData?.data || [];
  const companies = companiesData?.data || [];

  const handleClientSelect = (client) => {
    setSelectedClient(client);
    setCompanySearch("");
    setView("companies");
  };

  const handleCompanySelect = async (company) => {
    setIsOpen(false);
    if (company.id !== selectedCompany?.id) {
      await switchCompany(company.id);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
          isOpen
            ? "border-accent-dark bg-accent-dark/5 text-accent-dark dark:border-accent-light dark:bg-accent-light/10 dark:text-accent-light"
            : "border-slate-200 bg-white text-ink-900 hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-100 dark:hover:bg-ink-800"
        }`}
      >
        <Building2 size={16} className={isOpen ? "text-accent-dark dark:text-accent-light" : "text-slate-400"} />
        <span className="max-w-[150px] truncate sm:max-w-[200px]">
          {selectedCompany ? selectedCompany.name : "Select Context"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 origin-top-left rounded-xl border border-slate-100 bg-white p-2 shadow-popover dark:border-ink-800 dark:bg-ink-900 z-50 overflow-hidden flex flex-col max-h-[400px]">
          
          {/* Header */}
          <div className="mb-2 flex items-center px-1">
            {view === "companies" && (
              <button
                onClick={() => setView("clients")}
                className="mr-2 rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-ink-900 dark:hover:bg-ink-800 dark:hover:text-slate-100 transition"
                aria-label="Back to Clients"
              >
                <ChevronLeft size={16} />
              </button>
            )}
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 flex-1 truncate">
              {view === "clients" ? "Select Client" : selectedClient?.full_name || "Select Company"}
            </h3>
          </div>

          {/* Search */}
          <div className="relative mb-2 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder={`Search ${view}...`}
              value={view === "clients" ? clientSearch : companySearch}
              onChange={(e) => view === "clients" ? setClientSearch(e.target.value) : setCompanySearch(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-ink-900 placeholder:text-slate-400 focus:border-accent-dark focus:outline-none focus:ring-1 focus:ring-accent-dark dark:border-ink-700 dark:bg-ink-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>

          {/* List */}
          <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-200 dark:scrollbar-thumb-ink-700 pr-1">
            {view === "clients" ? (
              clientsLoading ? (
                <div className="space-y-1 p-1">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-slate-100 dark:bg-ink-800" />)}
                </div>
              ) : clients.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                  <AlertCircle size={20} className="text-slate-300 dark:text-slate-600" />
                  No clients found
                </div>
              ) : (
                <div className="space-y-0.5">
                  {clients.map(client => (
                    <button
                      key={client.id}
                      onClick={() => handleClientSelect(client)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm text-ink-900 hover:bg-slate-100 dark:text-slate-100 dark:hover:bg-ink-800 transition"
                    >
                      <span className="truncate">{client.full_name}</span>
                      <ChevronRight size={14} className="text-slate-400 shrink-0" />
                    </button>
                  ))}
                </div>
              )
            ) : (
              companiesLoading ? (
                <div className="space-y-1 p-1">
                  {[1, 2, 3].map(i => <div key={i} className="h-8 animate-pulse rounded bg-slate-100 dark:bg-ink-800" />)}
                </div>
              ) : companies.length === 0 ? (
                <div className="py-8 text-center text-sm text-slate-500 flex flex-col items-center gap-2">
                  <AlertCircle size={20} className="text-slate-300 dark:text-slate-600" />
                  No companies found
                </div>
              ) : (
                <div className="space-y-0.5">
                  {companies.map(company => (
                    <button
                      key={company.id}
                      onClick={() => handleCompanySelect(company)}
                      className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-ink-800 group"
                    >
                      <span className={`truncate ${selectedCompany?.id === company.id ? "font-medium text-accent-dark dark:text-accent-light" : "text-ink-900 dark:text-slate-100"}`}>
                        {company.name}
                      </span>
                      {selectedCompany?.id === company.id && (
                        <Check size={14} className="text-accent-dark dark:text-accent-light shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              )
            )}
          </div>
        </div>
      )}
    </div>
  );
}
