import { useState, useRef, useEffect } from "react";
import { UserSquare2, Search, Check, AlertCircle } from "lucide-react";
import { useClients } from "@/features/clients/hooks";
import { useWorkspace } from "@/hooks/useWorkspace";
import { useDebounce } from "@/lib/useDebounce";

export function ClientSwitcher() {
  const { selectedClient, switchClient } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const debouncedSearch = useDebounce(search, 300);
  const containerRef = useRef(null);

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

  useEffect(() => {
    if (isOpen) setSearch("");
  }, [isOpen]);

  const { data: clientsData, isLoading } = useClients({ 
    page: 1, 
    page_size: 100, 
    search: debouncedSearch || undefined 
  });
  
  const clients = clientsData?.data || [];

  const handleSelect = async (client) => {
    setIsOpen(false);
    if (client.id !== selectedClient?.id) {
      await switchClient(client.id);
    }
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium transition ${
          isOpen
            ? "border-accent-dark bg-accent-dark/5 text-accent-dark dark:border-accent-light dark:bg-accent-light/10 dark:text-accent-light"
            : "border-slate-200 bg-white text-ink-900 hover:bg-slate-50 dark:border-ink-700 dark:bg-ink-900 dark:text-slate-100 dark:hover:bg-ink-800"
        }`}
      >
        <UserSquare2 size={16} className={isOpen ? "text-accent-dark dark:text-accent-light" : "text-slate-400"} />
        <span className="max-w-[150px] truncate sm:max-w-[200px]">
          {selectedClient ? selectedClient.full_name : "Select Client"}
        </span>
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-2 w-72 rounded-xl border border-slate-100 bg-white p-2 shadow-popover dark:border-ink-800 dark:bg-ink-900 z-50 flex flex-col max-h-[400px]">
          <div className="mb-2 px-1">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Select Client
            </h3>
          </div>
          <div className="relative mb-2 shrink-0">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              autoFocus
              type="text"
              placeholder="Search clients..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-md border border-slate-200 bg-slate-50 py-1.5 pl-9 pr-3 text-sm text-ink-900 placeholder:text-slate-400 focus:border-accent-dark focus:outline-none focus:ring-1 focus:ring-accent-dark dark:border-ink-700 dark:bg-ink-950 dark:text-slate-100 dark:placeholder:text-slate-500"
            />
          </div>
          <div className="flex-1 overflow-y-auto pr-1">
            {isLoading ? (
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
                    onClick={() => handleSelect(client)}
                    className="flex w-full items-center justify-between rounded-md px-2 py-2 text-left text-sm transition hover:bg-slate-100 dark:hover:bg-ink-800 group"
                  >
                    <span className={`truncate ${selectedClient?.id === client.id ? "font-medium text-accent-dark dark:text-accent-light" : "text-ink-900 dark:text-slate-100"}`}>
                      {client.full_name}
                    </span>
                    {selectedClient?.id === client.id && (
                      <Check size={14} className="text-accent-dark dark:text-accent-light shrink-0" />
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
