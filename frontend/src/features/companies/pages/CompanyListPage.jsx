import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { useWorkspace } from "@/hooks/useWorkspace";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDebounce } from "@/lib/useDebounce";
import { useCompanies, useCreateCompany, useDeleteCompany } from "../hooks";
import { useClients } from "../../clients/hooks";
import { CompanyFormModal } from "../components/CompanyFormModal";

const businessTypeFilterOptions = [
  { value: "", label: "All business types" },
  { value: "individual", label: "Individual" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
  { value: "huf", label: "HUF" },
  { value: "other", label: "Other" },
];

const statusFilterOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const sortOptions = [
  { value: "created_at", label: "Newest first" },
  { value: "name", label: "Name" },
  { value: "financial_year", label: "Financial year" },
];

function ProductTourModal({ onClose }) {
  const [step, setStep] = useState(0);

  const steps = [
    {
      title: "Welcome to FinPilot Tour",
      description: "This guide introduces the core modules: company setup, transactions, tax center, and ML predictions.",
    },
    {
      title: "1. Dashboard Overview",
      description: "Your home dashboard shows income, expenses, tax liability, and key metrics for your active company.",
    },
    {
      title: "2. ML Models",
      description: "Train models for expense categorization, duplicate detection, compliance risk, and forecasts from the ML Models page.",
    },
    {
      title: "3. Tax & Analytics",
      description: "Use the Tax Center for GST and income tax calculations, and Analytics for reports and executive dashboards.",
    },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-ink-950 p-6 text-left shadow-xl">
        <h3 className="font-display text-xl font-bold text-white">{steps[step].title}</h3>
        <p className="mt-3 text-sm text-slate-300 leading-relaxed">{steps[step].description}</p>
        
        <div className="mt-8 flex items-center justify-between">
          <button onClick={onClose} className="text-xs text-slate-500 hover:text-slate-300">
            Skip Tour
          </button>
          
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="secondary" onClick={() => setStep(step - 1)}>
                Previous
              </Button>
            )}
            {step < steps.length - 1 ? (
              <Button onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : (
              <Button onClick={onClose}>
                Finish
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function WelcomeExperience({ onCreateCompany }) {
  return (
    <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-slate-100 sm:text-4xl">
          No Companies Found
        </h1>
        <p className="mx-auto max-w-xl text-lg text-slate-500 dark:text-slate-400">
          Create the first Company for one of your Clients.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={onCreateCompany}>+ Create Company</Button>
      </div>
    </div>
  );
}

function NoClientsExperience() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-4xl py-12 px-4 sm:px-6 lg:px-8 text-center">
      <div className="space-y-4">
        <h1 className="font-display text-3xl font-extrabold tracking-tight text-ink-900 dark:text-slate-100 sm:text-4xl">
          No Clients Found
        </h1>
        <p className="mx-auto max-w-xl text-lg text-slate-500 dark:text-slate-400">
          Every Company must belong to a Client.<br />
          Create your first Client before adding Companies.
        </p>
      </div>

      <div className="mt-8 flex justify-center">
        <Button onClick={() => navigate("/clients")}>+ Add First Client</Button>
      </div>
    </div>
  );
}

export default function CompanyListPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const { selectedClient } = useWorkspace();
  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isFetching } = useCompanies({
    page, page_size: 10, search: debouncedSearch || undefined,
    business_type: businessType || undefined, status: status || undefined, sort_by: sortBy,
    client_id: selectedClient?.id,
  });

  const { data: clientsData, isLoading: isLoadingClients } = useClients({ page_size: 1 });
  const hasClients = clientsData?.pagination?.total > 0;

  const createMutation = useCreateCompany();
  const deleteMutation = useDeleteCompany();

  const companies = data?.data || [];
  const pagination = data?.pagination;

  const handleCreate = async (values) => {
    try {
      await createMutation.mutateAsync(values);
      setCreateOpen(false);
    } catch (e) {
      // Error is already handled centrally by useCreateCompany
    }
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Companies</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage the companies in your workspace.</p>
        </div>
        {hasClients && <Button onClick={() => setCreateOpen(true)}>+ New company</Button>}
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by name, client, GST, or PAN" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              options={businessTypeFilterOptions}
              value={businessType}
              onChange={(e) => { setBusinessType(e.target.value); setPage(1); }}
              className="min-w-[10rem]"
            />
            <Select
              options={statusFilterOptions}
              value={status}
              onChange={(e) => { setStatus(e.target.value); setPage(1); }}
              className="min-w-[9rem]"
            />
            <Select options={sortOptions} value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="min-w-[9rem]" />
          </div>
        </div>

        {isLoading || isLoadingClients ? (
          <TableSkeleton cols={7} />
        ) : !hasClients ? (
          <NoClientsExperience />
        ) : companies.length === 0 ? (
          <WelcomeExperience onCreateCompany={() => setCreateOpen(true)} />
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr>
                  <th className="px-4 py-3">Company</th>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Industry</th>
                  <th className="px-4 py-3">Financial year</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Created</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {companies.map((company) => (
                  <tr key={company.id} tabIndex={0} onKeyDown={(e) => e.key === "Enter" && navigate(`/companies/${company.id}`)} className="cursor-pointer hover:bg-surface-muted dark:hover:bg-ink-800" onClick={() => navigate(`/companies/${company.id}`)}>
                    <td className="flex items-center gap-3 px-4 py-3">
                      {company.logo_url ? (
                        <img src={company.logo_url} alt="" className="h-8 w-8 rounded-lg object-cover" />
                      ) : (
                        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-light text-xs font-semibold text-accent-dark">
                          {company.name.slice(0, 2).toUpperCase()}
                        </span>
                      )}
                      <span className="font-medium text-ink-900 dark:text-slate-100">{company.name}</span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300 font-medium">{company.client_name || "Unknown"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.gst_number || company.pan_number || "N/A"}</td>
                    <td className="px-4 py-3 capitalize text-slate-600 dark:text-slate-300">{company.business_type.replace(/_/g, " ")}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{company.financial_year}</td>
                    <td className="px-4 py-3"><Badge status={company.status} /></td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400">{new Date(company.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => setDeleteTarget(company.id)}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-500/10"
                        aria-label={`Delete company ${company.name}`}
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M3 6h18M8 6V4a1 1 0 011-1h6a1 1 0 011 1v2m2 0-1 14a1 1 0 01-1 1H7a1 1 0 01-1-1L5 6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />}
      </Card>

      <CompanyFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isLoading}
        serverError={createMutation.error}
        initialClientId={selectedClient?.id}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete company"
        description="This will remove the company from your active list. This action can be reviewed by an administrator later, but the company will disappear from your workspace."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
