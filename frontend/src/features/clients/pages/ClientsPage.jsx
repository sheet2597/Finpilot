import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { TableSkeleton } from "@/components/ui/TableSkeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useDebounce } from "@/lib/useDebounce";
import { useClients, useCreateClient, useUpdateClient, useDeleteClient } from "../hooks";
import { ClientFormModal } from "../components/ClientFormModal";

const clientTypeFilterOptions = [
  { value: "", label: "All types" },
  { value: "Individual", label: "Individual" },
  { value: "Company", label: "Company" },
];

const statusFilterOptions = [
  { value: "", label: "All statuses" },
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

const sortOptions = [
  { value: "created_at", label: "Newest first" },
  { value: "full_name", label: "Name" },
];

export default function ClientsPage() {
  const navigate = useNavigate();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [clientType, setClientType] = useState("");
  const [status, setStatus] = useState("");
  const [sortBy, setSortBy] = useState("created_at");
  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search);

  const { data, isLoading, isFetching } = useClients({
    page,
    page_size: 10,
    search: debouncedSearch || undefined,
    client_type: clientType || undefined,
    status: status || undefined,
    sort_by: sortBy,
  });

  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();

  const clients = data?.data || [];
  const pagination = data?.pagination;

  const handleCreate = (values) => {
    createMutation.mutate(values, { onSuccess: () => setCreateOpen(false) });
  };

  const handleUpdate = (values) => {
    updateMutation.mutate({ id: editTarget.id, payload: values }, { onSuccess: () => setEditTarget(null) });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Clients</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Manage all clients in your CA workspace.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add Client</Button>
      </div>

      <Card className="!p-0">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 dark:border-ink-800 sm:flex-row sm:items-center sm:justify-between">
          <div className="w-full sm:max-w-xs">
            <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search by Client Name, PAN, GSTIN, Phone" />
          </div>
          <div className="flex flex-wrap gap-2">
            <Select
              options={clientTypeFilterOptions}
              value={clientType}
              onChange={(e) => { setClientType(e.target.value); setPage(1); }}
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

        {isLoading ? (
          <TableSkeleton cols={6} />
        ) : clients.length === 0 ? (
          <div className="mx-auto max-w-4xl py-12 px-4 text-center">
            <h2 className="font-display text-2xl font-bold tracking-tight text-ink-900 dark:text-slate-100">
              No Clients Found
            </h2>
            <p className="mt-2 text-slate-500 dark:text-slate-400">
              Manage all your clients from one place.<br />
              Create your first Client to begin managing Companies.
            </p>
            <div className="mt-6 flex justify-center">
              <Button onClick={() => setCreateOpen(true)}>+ Add First Client</Button>
            </div>
          </div>
        ) : (
          <div className={`overflow-x-auto ${isFetching ? "opacity-60" : ""}`}>
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr>
                  <th className="px-4 py-3">Client Name</th>
                  <th className="px-4 py-3">Client Type</th>
                  <th className="px-4 py-3">PAN</th>
                  <th className="px-4 py-3">GSTIN</th>
                  <th className="px-4 py-3">Companies</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-surface-muted dark:hover:bg-ink-800 transition-colors">
                    <td className="px-4 py-3 font-medium text-ink-900 dark:text-slate-100">{client.full_name}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{client.client_type}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{client.pan_number || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{client.gstin || "-"}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{client.statistics?.total_companies || 0}</td>
                    <td className="px-4 py-3"><Badge status={client.status} /></td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => navigate(`/clients/${client.id}`)}
                          className="text-xs font-medium text-accent hover:text-accent-dark transition"
                        >
                          View
                        </button>
                        <button
                          onClick={() => setEditTarget(client)}
                          className="text-xs font-medium text-slate-500 hover:text-ink-900 dark:hover:text-slate-200 transition"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => setDeleteTarget(client.id)}
                          className="text-xs font-medium text-red-500 hover:text-red-600 transition"
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {pagination && <Pagination page={pagination.page} totalPages={pagination.total_pages} onPageChange={setPage} />}
      </Card>

      <ClientFormModal
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        onSubmit={handleCreate}
        isSubmitting={createMutation.isLoading}
      />

      {editTarget && (
        <ClientFormModal
          open={!!editTarget}
          onClose={() => setEditTarget(null)}
          onSubmit={handleUpdate}
          isSubmitting={updateMutation.isLoading}
          defaultValues={editTarget}
        />
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete client"
        description="This will permanently delete this client and it will no longer be visible in your firm's dashboard."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
