import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Skeleton } from "@/components/ui/Skeleton";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { useParty, useUpdateParty, useDeleteParty } from "../hooks";





export function PartyDetailPage({ kind }) {
  const { partyId } = useParams();
  const navigate = useNavigate();
  const { data: party, isLoading } = useParty(kind, partyId);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ name: "", gst_number: "", email: "", phone: "", address: "" });
  const [deleteOpen, setDeleteOpen] = useState(false);

  const updateMutation = useUpdateParty(kind, partyId || "");
  const deleteMutation = useDeleteParty(kind);
  const label = kind === "vendors" ? "Vendor" : "Customer";

  if (isLoading || !party) {
    return <div className="space-y-6"><Skeleton className="h-8 w-48" /><Skeleton className="h-64" /></div>;
  }

  const startEditing = () => {
    setForm({ name: party.name, gst_number: party.gst_number, email: party.email, phone: party.phone, address: party.address });
    setEditing(true);
  };

  return (
    <div className="space-y-6">
      <button onClick={() => navigate(`/${kind}`)} className="text-sm font-medium text-slate-500 hover:text-ink-900 dark:hover:text-slate-100">
        &larr; Back to {label}s
      </button>

      <div className="flex items-center justify-between">
        <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">{party.name}</h1>
        <div className="flex gap-2">
          <Button variant="secondary" onClick={startEditing}>Edit</Button>
          <Button className="!bg-red-600 hover:!bg-red-700" onClick={() => setDeleteOpen(true)}>Delete</Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Details</h3>
          {editing ?
          <div className="space-y-3">
              <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              <Input label="GST number" value={form.gst_number} onChange={(e) => setForm({ ...form, gst_number: e.target.value.toUpperCase() })} />
              <Input label="Email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              <Input label="Phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              <Input label="Address" value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} />
              <div className="flex justify-end gap-2 pt-1">
                <Button variant="secondary" onClick={() => setEditing(false)}>Cancel</Button>
                <Button isLoading={updateMutation.isLoading} onClick={() => updateMutation.mutate(form, { onSuccess: () => setEditing(false) })}>Save</Button>
              </div>
            </div> :

          <dl className="space-y-2 text-sm">
              <Row label="GST number">{party.gst_number || "—"}</Row>
              <Row label="Email">{party.email || "—"}</Row>
              <Row label="Phone">{party.phone || "—"}</Row>
              <Row label="Address">{party.address || "—"}</Row>
            </dl>
          }
        </Card>

        <Card className="lg:col-span-2">
          <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">Transaction history</h3>
          {!party.transaction_history?.length ?
          <p className="text-sm text-slate-500">No transactions linked to this {label.toLowerCase()} yet.</p> :

          <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-100 text-xs uppercase tracking-wide text-slate-400 dark:border-ink-800">
                <tr><th className="py-2">Date</th><th className="py-2">Description</th><th className="py-2 text-right">Amount</th></tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-ink-800">
                {party.transaction_history.map((tx) =>
              <tr key={tx.id}>
                    <td className="py-2 text-slate-600 dark:text-slate-300">{new Date(tx.date).toLocaleDateString()}</td>
                    <td className="py-2 text-ink-900 dark:text-slate-100">{tx.description || "—"}</td>
                    <td className="py-2 text-right font-medium text-ink-900 dark:text-slate-100">
                      {new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 }).format(tx.amount)}
                    </td>
                  </tr>
              )}
              </tbody>
            </table>
          }
        </Card>
      </div>

      <ConfirmDialog
        open={deleteOpen}
        title={`Delete ${label.toLowerCase()}`}
        description="This cannot be undone."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={() => partyId && deleteMutation.mutate(partyId, { onSuccess: () => navigate(`/${kind}`) })}
        onCancel={() => setDeleteOpen(false)} />
      
    </div>);

}

function Row({ label, children }) {
  return (
    <div className="flex items-center justify-between gap-4">
      <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="text-right text-ink-900 dark:text-slate-100">{children}</dd>
    </div>);

}