import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { useCreateParty } from "../hooks";
import toast from "react-hot-toast";

export function PartyCreateModal({ open, onClose, kind, label, onSuccess }) {
  const { register, handleSubmit, reset, setFocus, formState: { errors } } = useForm();
  const createMutation = useCreateParty(kind);

  useEffect(() => {
    if (open) {
      reset();
      setTimeout(() => setFocus("name"), 100);
    }
  }, [open, reset, setFocus]);

  const onSubmit = (values) => {
    // Format GST if provided
    const payload = {
      ...values,
      gst_number: values.gst_number ? values.gst_number.toUpperCase().trim() : "",
      email: values.email?.trim() || "",
      phone: values.phone?.trim() || "",
      address: values.address?.trim() || "",
      notes: values.notes?.trim() || "",
    };

    createMutation.mutate(payload, {
      onSuccess: (res) => {
        const createdParty = res?.data || res;
        toast.success(`${label} created successfully.`);
        onClose();
        if (onSuccess) {
          onSuccess(createdParty);
        }
      },
      onError: (error) => {
        const msg = error.response?.data?.message || "Failed to create.";
        toast.error(msg);
      }
    });
  };

  return (
    <Modal open={open} onClose={onClose} title={`Create ${label}`}>
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input 
          label="Name *" 
          {...register("name", { 
            required: "Name is required", 
            validate: (value) => value.trim().length > 0 || "Name cannot be empty"
          })} 
          error={errors.name?.message} 
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input 
            label="Email (optional)" 
            type="email" 
            {...register("email", {
              pattern: {
                value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
                message: "Invalid email address"
              }
            })}
            error={errors.email?.message} 
          />
          <Input 
            label="Phone (optional)" 
            {...register("phone")} 
          />
        </div>
        <Input 
          label="GST Number (optional)" 
          {...register("gst_number", {
            pattern: {
              value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i,
              message: "Invalid GST format (e.g., 22AAAAA0000A1Z5)"
            }
          })}
          error={errors.gst_number?.message}
          className="uppercase"
        />
        <Input label="Address (optional)" {...register("address")} />
        <Input label="Notes (optional)" {...register("notes")} />

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose}>Cancel</Button>
          <Button type="submit" isLoading={createMutation.isLoading}>
            Create {label}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
