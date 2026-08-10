import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { useCountries, useStates, useCities } from "@/hooks/useLocationData";
import { useClients } from "../../clients/hooks";

const businessTypeOptions = [
  { value: "individual", label: "Individual" },
  { value: "sole_proprietorship", label: "Sole Proprietorship" },
  { value: "partnership", label: "Partnership" },
  { value: "llp", label: "LLP" },
  { value: "private_limited", label: "Private Limited" },
  { value: "public_limited", label: "Public Limited" },
  { value: "huf", label: "HUF" },
  { value: "other", label: "Other" },
];

export function CompanyFormModal({ open, onClose, onSubmit, isSubmitting, initialValues, initialClientId, serverError }) {
  const {
    register,
    handleSubmit,
    reset,
    watch,
    setError,
    formState: { errors },
  } = useForm({
    values: initialValues
      ? {
          name: initialValues.name,
          client_id: initialValues.client_id || initialClientId,
          business_type: initialValues.business_type,
          gst_number: initialValues.gst_number,
          pan_number: initialValues.pan_number,
          cin: initialValues.cin,
          address: initialValues.address,
          country: initialValues.country,
          state: initialValues.state,
          city: initialValues.city,
          pincode: initialValues.pincode,
          financial_year: initialValues.financial_year,
          currency: initialValues.currency,
        }
      : {
          client_id: initialClientId,
        },
  });

  const submit = async (values) => {
    await onSubmit(values);
  };

  useEffect(() => {
    if (!open) reset();
  }, [open, reset]);

  useEffect(() => {
    if (serverError?.response?.data?.errors) {
      Object.entries(serverError.response.data.errors).forEach(([field, messages]) => {
        setError(field, { type: "server", message: messages[0] });
      });
    }
  }, [serverError, setError]);

  const selectedCountry = watch("country");
  const selectedState = watch("state");

  const { data: countries = [], isLoading: isLoadingCountries } = useCountries();
  const { data: states = [], isLoading: isLoadingStates } = useStates(selectedCountry);
  const { data: cities = [], isLoading: isLoadingCities } = useCities(selectedCountry, selectedState);
  const { data: clientsData, isLoading: isLoadingClients } = useClients({ page_size: 100 });
  const clientsList = clientsData?.data || [];

  // Automatically preselect if only one client exists and no initialClientId is provided
  useEffect(() => {
    if (open && clientsList.length === 1 && !initialValues && !initialClientId) {
      reset({ ...watch(), client_id: clientsList[0].id });
    }
  }, [open, clientsList, initialValues, initialClientId, reset]);

  const handleClose = () => {
    reset();
    onClose();
  };

  return (
    <Modal open={open} onClose={handleClose} title={initialValues ? "Edit company" : "Create company"} wide>
      <form onSubmit={handleSubmit(submit)} className="space-y-4">
        {!initialClientId && (
          <Select
            label="Client *"
            placeholder={isLoadingClients ? "Loading clients..." : "Select Client"}
            options={clientsList.map(c => ({ value: c.id, label: c.full_name }))}
            error={errors.client_id?.message}
            {...register("client_id", { required: "Client is required" })}
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Company name *" error={errors.name?.message} {...register("name", { required: "Company name is required" })} />
          <Select
            label="Business type *"
            placeholder="Select type"
            options={businessTypeOptions}
            error={errors.business_type?.message}
            {...register("business_type", { required: "Business type is required" })}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <Input required
            label="GST number"
            placeholder="29ABCDE1234F2Z5"
            hint="Format Example: 22ABCDE1234F1Z5"
            error={errors.gst_number?.message}
            {...register("gst_number", { 
              required: "GST number is required",
              pattern: {
                value: /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[0-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/i,
                message: "Format should match GSTIN (e.g. 22ABCDE1234F1Z5)"
              },
              onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
            })}
          />
          <Input required
            label="PAN number"
            placeholder="ABCDE1234F"
            hint="Format Example: ABCDE1234F"
            error={errors.pan_number?.message}
            {...register("pan_number", { 
              required: "PAN number is required",
              pattern: {
                value: /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/i,
                message: "Format should match PAN (e.g. ABCDE1234F)"
              },
              onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
            })}
          />
        </div>

        <Input 
          label="CIN (optional)" 
          placeholder="U12345GJ2025PTC000001"
          hint="Format Example: U12345GJ2025PTC000001"
          error={errors.cin?.message}
          {...register("cin", {
            pattern: {
              value: /^[LU]{1}[0-9]{5}[A-Z]{2}[0-9]{4}[A-Z]{3}[0-9]{6}$/i,
              message: "Format should match CIN (e.g. U12345GJ2025PTC000001)"
            },
            onChange: (e) => { e.target.value = e.target.value.toUpperCase(); }
          })}
        />
        <Input label="Address" error={errors.address?.message} {...register("address", { required: "Address is required" })} />

        <div className="grid gap-4 sm:grid-cols-3">
          <Select 
            label="Country" 
            placeholder={isLoadingCountries ? "Loading..." : "Select Country"} 
            options={countries.map(c => ({ value: c, label: c }))} 
            error={errors.country?.message} 
            {...register("country", { required: "Required" })} 
          />
          <Select 
            label="State" 
            placeholder={!selectedCountry ? "Select Country First" : isLoadingStates ? "Loading..." : "Select State"} 
            options={states.map(s => ({ value: s, label: s }))} 
            error={errors.state?.message} 
            {...register("state", { required: "Required" })} 
          />
          <Select 
            label="City" 
            placeholder={!selectedState ? "Select State First" : isLoadingCities ? "Loading..." : "Select City"} 
            options={cities.map(c => ({ value: c, label: c }))} 
            error={errors.city?.message} 
            {...register("city", { required: "Required" })} 
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <Input label="Pincode" error={errors.pincode?.message} {...register("pincode", { required: "Required" })} />
          <Input
            label="Financial year"
            placeholder="2024-2025"
            error={errors.financial_year?.message}
            {...register("financial_year", { required: "Required" })}
          />
          <Input
            label="Currency"
            placeholder="INR"
            error={errors.currency?.message}
            {...register("currency", { required: "Required" })}
          />
        </div>

        {initialValues && (
          <div className="grid gap-4 sm:grid-cols-3">
            <Select
              label="Status"
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" },
              ]}
              {...register("status")}
            />
          </div>
        )}

        <div>
          <label className="label">Company logo</label>
          <input type="file" accept="image/*" className="input-base" {...register("logo")} />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button type="button" variant="secondary" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" isLoading={isSubmitting}>
            {initialValues ? "Save changes" : "Create company"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
