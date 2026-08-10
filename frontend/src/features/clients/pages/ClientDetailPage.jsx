import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useClient, useUpdateClient, useDeleteClient } from "../hooks";
import { useCreateCompany } from "../../companies/hooks";
import { ClientFormModal } from "../components/ClientFormModal";
import { CompanyFormModal } from "../../companies/components/CompanyFormModal";

export default function ClientDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { data: client, isLoading } = useClient(id);
  const updateMutation = useUpdateClient();
  const deleteMutation = useDeleteClient();
  const createCompanyMutation = useCreateCompany();

  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [createCompanyOpen, setCreateCompanyOpen] = useState(false);

  if (isLoading) {
    return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-slate-200 border-t-accent"></div></div>;
  }

  if (!client) {
    return <div className="py-12 text-center text-slate-500">Client not found.</div>;
  }

  const handleUpdate = (values) => {
    updateMutation.mutate({ id, payload: values }, { onSuccess: () => setEditOpen(false) });
  };

  const handleDelete = () => {
    deleteMutation.mutate(id, { onSuccess: () => navigate("/clients") });
  };

  const handleCreateCompany = (values) => {
    createCompanyMutation.mutate(values, { onSuccess: () => setCreateCompanyOpen(false) });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="secondary" onClick={() => navigate("/clients")}>&larr; Back</Button>
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100 flex items-center gap-3">
              {client.full_name} <Badge status={client.status} />
            </h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {client.client_type} &middot; Added {new Date(client.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit Details</Button>
          <Button variant="danger" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 space-y-4">
          <h3 className="font-semibold text-lg border-b pb-2 dark:border-ink-800">Client Information</h3>
          <div className="text-sm space-y-3">
            <div>
              <span className="text-slate-500 block">PAN Number</span>
              <span className="font-medium">{client.pan_number || "Not provided"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">GSTIN</span>
              <span className="font-medium">{client.gstin || "Not provided"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Phone</span>
              <span className="font-medium">{client.phone || "Not provided"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Email</span>
              <span className="font-medium">{client.email || "Not provided"}</span>
            </div>
            <div>
              <span className="text-slate-500 block">Address</span>
              <span className="font-medium">{client.address || "Not provided"}</span>
            </div>
          </div>
        </Card>

        <Card className="md:col-span-2 space-y-4">
          <div className="flex items-center justify-between border-b pb-2 dark:border-ink-800">
            <h3 className="font-semibold text-lg">Companies</h3>
            <Button size="sm" onClick={() => setCreateCompanyOpen(true)}>+ Add Company</Button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-6">
            <div className="bg-slate-50 dark:bg-ink-800 p-4 rounded-lg">
              <p className="text-slate-500 text-xs uppercase font-medium">Total Companies</p>
              <p className="text-2xl font-bold mt-1">{client.statistics?.total_companies || 0}</p>
            </div>
            <div className="bg-slate-50 dark:bg-ink-800 p-4 rounded-lg">
              <p className="text-slate-500 text-xs uppercase font-medium">Total Documents</p>
              <p className="text-2xl font-bold mt-1">{client.statistics?.total_documents || 0}</p>
            </div>
            <div className="bg-slate-50 dark:bg-ink-800 p-4 rounded-lg">
              <p className="text-slate-500 text-xs uppercase font-medium">Total Transactions</p>
              <p className="text-2xl font-bold mt-1">{client.statistics?.total_transactions || 0}</p>
            </div>
            <div className="bg-slate-50 dark:bg-ink-800 p-4 rounded-lg">
              <p className="text-slate-500 text-xs uppercase font-medium">Compliance Score</p>
              <p className="text-2xl font-bold mt-1 text-emerald-500">{client.statistics?.compliance_score || 0}%</p>
            </div>
          </div>

          <div className="space-y-3">
            {client.companies && client.companies.length > 0 ? (
              client.companies.map(c => (
                <div key={c.id} className="flex justify-between items-center p-3 border dark:border-ink-800 rounded-lg">
                  <div>
                    <p className="font-medium">{c.name}</p>
                    <p className="text-xs text-slate-500">GST: {c.gst_number}</p>
                  </div>
                  <Button variant="secondary" size="sm" onClick={() => navigate(`/companies/${c.id}`)}>Open</Button>
                </div>
              ))
            ) : (
              <p className="text-slate-500 text-sm">No companies associated with this client.</p>
            )}
          </div>
        </Card>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <div className="flex items-center justify-between border-b pb-2 mb-4 dark:border-ink-800">
            <h3 className="font-semibold text-lg">Recent Documents</h3>
            <Button variant="secondary" size="sm" onClick={() => navigate("/documents")}>View All</Button>
          </div>
          <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 dark:bg-ink-800 rounded-lg">
            No recent documents uploaded.
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between border-b pb-2 mb-4 dark:border-ink-800">
            <h3 className="font-semibold text-lg">Recent Transactions</h3>
            <Button variant="secondary" size="sm" onClick={() => navigate("/transactions")}>View All</Button>
          </div>
          <div className="text-center py-6 text-slate-500 text-sm bg-slate-50 dark:bg-ink-800 rounded-lg">
            No recent transactions logged.
          </div>
        </Card>
      </div>

      <ClientFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isLoading}
        defaultValues={client}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete client"
        description="Are you sure you want to delete this client? This will not delete their associated companies, but it will sever the connection."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />

      <CompanyFormModal
        open={createCompanyOpen}
        onClose={() => setCreateCompanyOpen(false)}
        onSubmit={handleCreateCompany}
        isSubmitting={createCompanyMutation.isLoading}
        initialClientId={id}
      />
    </div>
  );
}
