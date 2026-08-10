import { useEffect, useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { useQuery } from "react-query";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { documentsApi } from "@/features/documents/api";
import { Plus } from "lucide-react";

import { useCategories, useCreateTransaction, useUpdateTransaction, useVendors, useCustomers, useTransactionTags } from "../hooks";
import { AttachmentPreviewModal } from "./AttachmentPreviewModal";
import { PartyCreateModal } from "./PartyCreateModal";

const typeOptions = [
{ value: "income", label: "Income" },
{ value: "expense", label: "Expense" },
{ value: "transfer", label: "Transfer" },
{ value: "adjustment", label: "Adjustment" },
{ value: "refund", label: "Refund" },
{ value: "investment", label: "Investment" },
{ value: "loan", label: "Loan" },
{ value: "salary", label: "Salary" },
{ value: "tax", label: "Tax" },
{ value: "other", label: "Other" }];


const paymentMethodOptions = [
{ value: "bank_transfer", label: "Bank Transfer" },
{ value: "net_banking", label: "Net Banking" },
{ value: "cash", label: "Cash" },
{ value: "cheque", label: "Cheque" },
{ value: "credit_card", label: "Credit Card" },
{ value: "debit_card", label: "Debit Card" },
{ value: "upi", label: "UPI" },
{ value: "wallet", label: "Wallet" },
{ value: "other", label: "Other" }];


const statusOptions = [
{ value: "completed", label: "Completed" },
{ value: "pending", label: "Pending" },
{ value: "cancelled", label: "Cancelled" }];





























export function TransactionFormModal({ open, onClose, companyOptions, transaction }) {
  const isEdit = !!transaction;
  const { register, handleSubmit, watch, reset, control, setValue, formState: { errors } } = useForm();
  const { data: categories } = useCategories();
  const { data: vendorsData } = useVendors({ page: 1, page_size: 100 });
  const { data: customersData } = useCustomers({ page: 1, page_size: 100 });
  const { data: tagOptions } = useTransactionTags();
  const createMutation = useCreateTransaction();
  const updateMutation = useUpdateTransaction(transaction?.id || "");
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [selectedTags, setSelectedTags] = useState([]);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [vendorModalOpen, setVendorModalOpen] = useState(false);
  const [customerModalOpen, setCustomerModalOpen] = useState(false);

  const toggleTag = (tag) => {
    setSelectedTags((prev) => prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]);
  };

  const companyId = watch("company_id");
  const { data: documentsData } = useQuery(
    ["transaction-form-documents", companyId],
    () => documentsApi.list({ company_id: companyId, status: "active", page_size: 100 }).then((r) => r.data.data),
    { enabled: !!companyId }
  );

  useEffect(() => {
    if (open) {
      setDuplicateWarning(null);
      const canonical = tagOptions?.canonical || [];
      const existingTags = transaction?.tags || [];
      setSelectedTags(existingTags.filter((t) => canonical.includes(t.toLowerCase())));
      reset(
        transaction ?
        {
          date: transaction.date, amount: String(transaction.amount), type: transaction.type,
          category_id: transaction.category_id, description: transaction.description,
          company_id: transaction.company_id, vendor_id: transaction.vendor_id || "",
          customer_id: transaction.customer_id || "", payment_method: transaction.payment_method,
          reference_number: transaction.reference_number, invoice_number: transaction.invoice_number || "",
          gst_amount: String(transaction.gst_amount || 0),
          tds_amount: String(transaction.tds_amount || 0), document_id: transaction.document_id || "",
          status: transaction.status,
          extra_tags: existingTags.filter((t) => !canonical.includes(t.toLowerCase())).join(", "),
          notes: transaction.notes
        } :
        {
          date: new Date().toISOString().slice(0, 10), amount: "", type: "expense", category_id: "",
          description: "", company_id: companyOptions[0]?.value || "", vendor_id: "", customer_id: "",
          payment_method: "bank_transfer", reference_number: "", invoice_number: "", gst_amount: "0", tds_amount: "0",
          document_id: "", status: "completed", extra_tags: "", notes: ""
        }
      );
    }
  }, [open, transaction, reset, companyOptions, tagOptions]);

  const onSubmit = (values) => {
    const extraTags = values.extra_tags.split(",").map((t) => t.trim()).filter(Boolean);
    const payload = {
      ...values,
      vendor_id: values.vendor_id || null,
      customer_id: values.customer_id || null,
      document_id: values.document_id || null,
      tags: Array.from(new Set([...selectedTags, ...extraTags]))
    };
    delete payload.extra_tags;

    const onSuccessClose = (res) => {
      const duplicates = res?.data?.data?.possible_duplicates;
      if (!isEdit && duplicates && duplicates.length > 0) {
        const reasons = Array.from(new Set(duplicates.flatMap((d) => d.reasons)));
        setDuplicateWarning(`This looks similar to ${duplicates.length} existing transaction${duplicates.length > 1 ? "s" : ""} (${reasons.join(", ").toLowerCase()}). Saved anyway — review for duplicates if this wasn't intentional.`);
        return;
      }
      onClose();
    };

    if (isEdit) {
      updateMutation.mutate(payload, { onSuccess: () => onClose() });
    } else {
      createMutation.mutate(payload, { onSuccess: onSuccessClose });
    }
  };

  const isLoading = createMutation.isLoading || updateMutation.isLoading;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Edit transaction" : "Add transaction"} wide>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {duplicateWarning &&
        <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:bg-amber-500/10 dark:text-amber-400">{duplicateWarning}</p>
        }
        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Date" type="date" {...register("date", { required: true })} error={errors.date && "Required"} />
          <Input label="Amount" type="number" step="0.01" {...register("amount", { required: true, min: 0.01 })} error={errors.amount && "Enter a valid amount"} />
          <Controller name="type" control={control} render={({ field }) => <Select label="Type" options={typeOptions} {...field} />} />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="category_id" control={control}
            render={({ field }) =>
            <Select label="Category" options={[{ value: "", label: "Select category" }, ...(categories || []).map((c) => ({ value: c.id, label: `${c.name} (${c.type})` }))]} {...field} />
            } />
          
          <Controller
            name="company_id" control={control}
            render={({ field }) => <Select label="Company" options={companyOptions} {...field} />} />
          
        </div>

        <Input label="Description" {...register("description")} />

        <div className="grid gap-4 sm:grid-cols-2">
          <Controller
            name="vendor_id" control={control}
            render={({ field }) =>
            <Select 
              label={
                <div className="flex w-full items-center justify-between">
                  <span>Vendor (optional)</span>
                  <button type="button" onClick={() => setVendorModalOpen(true)} className="flex items-center gap-1 text-xs font-medium text-accent-dark hover:underline dark:text-accent-light">
                    <Plus size={12} /> New
                  </button>
                </div>
              } 
              options={[{ value: "", label: "None" }, ...(vendorsData?.data || []).map((v) => ({ value: v.id, label: v.name }))]} 
              {...field} 
            />
            } />
          
          <Controller
            name="customer_id" control={control}
            render={({ field }) =>
            <Select 
              label={
                <div className="flex w-full items-center justify-between">
                  <span>Customer (optional)</span>
                  <button type="button" onClick={() => setCustomerModalOpen(true)} className="flex items-center gap-1 text-xs font-medium text-accent-dark hover:underline dark:text-accent-light">
                    <Plus size={12} /> New
                  </button>
                </div>
              } 
              options={[{ value: "", label: "None" }, ...(customersData?.data || []).map((c) => ({ value: c.id, label: c.name }))]} 
              {...field} 
            />
            } />
          
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Controller name="payment_method" control={control} render={({ field }) => <Select label="Payment method" options={paymentMethodOptions} {...field} />} />
          <Input label="Reference number" {...register("reference_number")} />
          <Input label="Invoice number" {...register("invoice_number")} />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Controller name="status" control={control} render={({ field }) => <Select label="Status" options={statusOptions} {...field} />} />
          <Input label="GST amount" type="number" step="0.01" {...register("gst_amount")} />
          <Input label="TDS amount" type="number" step="0.01" {...register("tds_amount")} />
        </div>

        <Controller
          name="document_id" control={control}
          render={({ field }) =>
          <div>
              <Select
              label="Linked document (optional)"
              options={[{ value: "", label: companyId ? "None" : "Select a company first" }, ...(documentsData || []).map((d) => ({ value: d.id, label: d.filename }))]}
              {...field} />
            
              {field.value &&
            <button type="button" className="mt-1.5 text-xs font-medium text-accent-dark hover:underline" onClick={() => setPreviewOpen(true)}>
                  Preview attachment
                </button>
            }
            </div>
          } />
        
        <AttachmentPreviewModal documentId={watch("document_id") || null} open={previewOpen} onClose={() => setPreviewOpen(false)} />

        <div>
          <label className="mb-1.5 block text-sm font-medium text-ink-700 dark:text-slate-300">Tags</label>
          <div className="flex flex-wrap gap-2">
            {(tagOptions?.canonical || []).map((tag) =>
            <button
              type="button"
              key={tag}
              onClick={() => toggleTag(tag)}
              className={`rounded-full px-3 py-1 text-xs font-medium capitalize transition ${
              selectedTags.includes(tag) ?
              "bg-accent-dark text-white" :
              "bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"}`
              }>
              
                {tag}
              </button>
            )}
          </div>
          <Input className="mt-2" label="Custom tags (comma-separated, optional)" {...register("extra_tags")} />
        </div>
        <Input label="Notes" {...register("notes")} />

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={isLoading}>{isEdit ? "Save changes" : "Add transaction"}</Button>
        </div>
      </form>

      <PartyCreateModal 
        open={vendorModalOpen} 
        onClose={() => setVendorModalOpen(false)} 
        kind="vendors" 
        label="Vendor" 
        onSuccess={(created) => setValue("vendor_id", created.id)} 
      />
      <PartyCreateModal 
        open={customerModalOpen} 
        onClose={() => setCustomerModalOpen(false)} 
        kind="customers" 
        label="Customer" 
        onSuccess={(created) => setValue("customer_id", created.id)} 
      />
    </Modal>);

}