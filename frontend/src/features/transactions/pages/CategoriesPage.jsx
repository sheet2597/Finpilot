import { useState } from "react";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Skeleton } from "@/components/ui/Skeleton";
import { useCategories, useCreateCategory, useDeleteCategory } from "../hooks";

const typeOptions = [{ value: "income", label: "Income" }, { value: "expense", label: "Expense" }];

export default function CategoriesPage() {
  const { data: categories, isLoading } = useCategories();
  const [createOpen, setCreateOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const createMutation = useCreateCategory();
  const deleteMutation = useDeleteCategory();
  const [form, setForm] = useState({ name: "", type: "expense", color: "#6366F1", icon: "tag", description: "" });

  const income = (categories || []).filter((c) => c.type === "income");
  const expense = (categories || []).filter((c) => c.type === "expense");

  const handleCreate = () => {
    createMutation.mutate(form, {
      onSuccess: () => {setCreateOpen(false);setForm({ name: "", type: "expense", color: "#6366F1", icon: "tag", description: "" });}
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ink-900 dark:text-slate-100">Categories</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Default categories are shared across every account; custom categories are just yours.</p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>+ Add category</Button>
      </div>

      {isLoading ?
      <div className="grid gap-6 sm:grid-cols-2">
          <Skeleton className="h-64" /><Skeleton className="h-64" />
        </div> :

      <div className="grid gap-6 sm:grid-cols-2">
          <CategoryGroup title="Income categories" categories={income} onDelete={setDeleteTarget} />
          <CategoryGroup title="Expense categories" categories={expense} onDelete={setDeleteTarget} />
        </div>
      }

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="Add category">
        <div className="space-y-3">
          <Input label="Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <Select label="Type" options={typeOptions} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })} />
          <div className="flex items-center gap-3">
            <label className="label">Color</label>
            <input type="color" value={form.color} onChange={(e) => setForm({ ...form, color: e.target.value })} className="h-9 w-16 rounded border border-slate-200 dark:border-ink-700" />
          </div>
          <Input label="Description (optional)" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
        </div>
        <div className="mt-4 flex justify-end gap-3">
          <Button variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
          <Button isLoading={createMutation.isLoading} disabled={!form.name} onClick={handleCreate}>Save</Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        title="Delete category"
        description="Categories that are already used by a transaction can't be deleted."
        confirmLabel="Delete"
        destructive
        isLoading={deleteMutation.isLoading}
        onConfirm={() => deleteTarget && deleteMutation.mutate(deleteTarget, { onSuccess: () => setDeleteTarget(null) })}
        onCancel={() => setDeleteTarget(null)} />
      
    </div>);

}

function CategoryGroup({ title, categories, onDelete }) {
  return (
    <Card>
      <h3 className="mb-3 font-display text-base font-semibold text-ink-900 dark:text-slate-100">{title}</h3>
      <ul className="space-y-2">
        {categories.map((category) =>
        <li key={category.id} className="flex items-center justify-between rounded-lg px-2 py-1.5 hover:bg-surface-muted dark:hover:bg-ink-800">
            <span className="flex items-center gap-2 text-sm text-ink-900 dark:text-slate-100">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: category.color }} />
              {category.name}
              {category.is_default && <span className="text-xs text-slate-400">(default)</span>}
            </span>
            {!category.is_default &&
          <button onClick={() => onDelete(category.id)} className="text-xs font-medium text-red-500 hover:underline">Delete</button>
          }
          </li>
        )}
      </ul>
    </Card>);

}