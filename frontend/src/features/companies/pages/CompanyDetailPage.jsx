import { useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useCompany, useDeleteCompany, useUpdateCompany } from "../hooks";
import { CompanyFormModal } from "../components/CompanyFormModal";

export default function CompanyDetailPage() {
  const { companyId } = useParams();
  const navigate = useNavigate();
  const { data: company, isLoading } = useCompany(companyId);
  const updateMutation = useUpdateCompany(companyId);
  const deleteMutation = useDeleteCompany();
  const [editOpen, setEditOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (!company) return null;

  const handleUpdate = async (values) => {
    try {
      await updateMutation.mutateAsync(values);
      setEditOpen(false);
    } catch (e) {
      // Error is already handled centrally by useUpdateCompany
    }
  };

  const handleDelete = () => {
    deleteMutation.mutate(company.id, { onSuccess: () => navigate("/companies") });
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <Link to="/companies" className="text-sm font-medium text-accent-dark">
        &larr; Back to companies
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {company.logo_url ? (
            <img src={company.logo_url} alt="" className="h-14 w-14 rounded-xl2 object-cover" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-xl2 bg-accent-light text-lg font-semibold text-accent-dark">
              {company.name.slice(0, 2).toUpperCase()}
            </span>
          )}
          <div>
            <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{company.name}</h1>
            <div className="mt-1 flex items-center gap-2">
              <Badge status={company.status} />
              <span className="text-sm text-slate-500 dark:text-slate-400">{company.financial_year}</span>
            </div>
          </div>
        </div>

        {company.is_owner && (
          <div className="flex gap-2">
            <Button variant="secondary" onClick={() => setEditOpen(true)}>Edit</Button>
            <Button className="!bg-red-600 hover:!bg-red-700" onClick={() => setDeleteOpen(true)}>Delete</Button>
          </div>
        )}
      </div>

      <div className="grid gap-6 sm:grid-cols-3">
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Documents</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{company.documents_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Transactions</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{company.transactions_count}</p>
        </Card>
        <Card>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-400">Clients with access</p>
          <p className="mt-2 font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{company.clients_assigned_count ?? 0}</p>
        </Card>
      </div>

      <Card>
        <h3 className="font-display text-base font-semibold text-ink-900 dark:text-slate-100">Company information</h3>
        <dl className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Business type" value={company.business_type.replace(/_/g, " ")} />
          <Field label="GST number" value={company.gst_number} />
          <Field label="PAN number" value={company.pan_number} />
          <Field label="CIN" value={company.cin || "—"} />
          <Field label="Address" value={company.address} />
          <Field label="City / State / Country" value={`${company.city}, ${company.state}, ${company.country}`} />
          <Field label="Pincode" value={company.pincode} />
          <Field label="Currency" value={company.currency} />
          <Field label="Owner" value={company.owner?.full_name || company.owner_id} />
          <Field label="Last updated" value={new Date(company.updated_at).toLocaleString()} />
        </dl>
      </Card>

      <CompanyFormModal
        open={editOpen}
        onClose={() => setEditOpen(false)}
        onSubmit={handleUpdate}
        isSubmitting={updateMutation.isLoading}
        initialValues={company}
        serverError={updateMutation.error}
      />

      <ConfirmDialog
        open={deleteOpen}
        title="Delete company"
        description={`Are you sure you want to delete ${company.name}? This will remove it from your active companies.`}
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteOpen(false)}
      />
    </div>
  );
}

function Field({ label, value }) {
  return (
    <div>
      <dt className="text-xs font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-1 text-sm capitalize text-ink-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}
