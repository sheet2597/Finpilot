import { useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";

const clientTypeOptions = [
  { value: "Individual", label: "Individual" },
  { value: "Company", label: "Company" },
];

const statusOptions = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
];

export function ClientFormModal({ open, onClose, onSubmit, isSubmitting, defaultValues }) {
  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm({
    defaultValues: defaultValues || {
      full_name: "",
      client_type: "Individual",
      pan_number: "",
      gstin: "",
      phone: "",
      email: "",
      address: "",
      notes: "",
      status: "active",
    },
  });

  useEffect(() => {
    if (open) {
      if (defaultValues) {
        reset(defaultValues);
      } else {
        reset({
          full_name: "",
          client_type: "Individual",
          pan_number: "",
          gstin: "",
          phone: "",
          email: "",
          address: "",
          notes: "",
          status: "active",
        });
      }
    }
  }, [open, defaultValues, reset]);

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={defaultValues ? "Edit Client" : "Add New Client"}
      description={defaultValues ? "Update client details." : "Enter client information to add them to your firm."}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="mt-4 space-y-4">
        <Input
          label="Full Name / Company Name *"
          placeholder="Client Name"
          error={errors.full_name?.message}
          {...register("full_name", { required: "Name is required" })}
        />

        <div className="grid grid-cols-2 gap-4">
          <Controller
            control={control}
            name="client_type"
            rules={{ required: "Type is required" }}
            render={({ field }) => (
              <Select label="Client Type *" options={clientTypeOptions} error={errors.client_type?.message} {...field} />
            )}
          />
          <Controller
            control={control}
            name="status"
            rules={{ required: "Status is required" }}
            render={({ field }) => (
              <Select label="Status *" options={statusOptions} error={errors.status?.message} {...field} />
            )}
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="PAN Number" placeholder="ABCDE1234F" error={errors.pan_number?.message} {...register("pan_number")} required match="^[A-Z]{5}[0-9]{4}[A-Z]{1}$"/>
          <Input label="GSTIN" placeholder="22AAAAA0000A1Z5" error={errors.gstin?.message} {...register("gstin")} required match="^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$"/>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input label="Phone" placeholder="+91 9876543210" error={errors.phone?.message} {...register("phone")} />
          <Input label="Email" type="email" placeholder="client@example.com" error={errors.email?.message} {...register("email")} />
        </div>

        <Input label="Address" placeholder="Full address" error={errors.address?.message} {...register("address")} />
        <Input label="Notes" placeholder="Additional details..." error={errors.notes?.message} {...register("notes")} />

        <div className="mt-6 flex justify-end gap-3">
          <Button type="button" variant="secondary" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {defaultValues ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
