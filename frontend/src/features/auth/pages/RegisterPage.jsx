import { useState } from "react";
import { useForm } from "react-hook-form";
import { useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { Eye, EyeOff } from "lucide-react";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "../api";
import { getApiErrorMessage } from "@/lib/axios";



export default function RegisterPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  const password = watch("password");

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      await authApi.register(values);
      toast.success("Account created. Check your email for the OTP.");
      navigate("/verify-otp", { state: { email: values.email } });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not create your account."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create your account" subtitle="Set up secure access in a couple of minutes.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Full name"
          placeholder="Jane Doe"
          error={errors.full_name?.message}
          {...register("full_name", { required: "Full name is required" })}
        />

        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", {
            required: "Email is required",
            pattern: { value: /^\S+@\S+\.\S+$/, message: "Enter a valid email address" },
          })}
        />

        <div className="grid grid-cols-2 gap-4">
          <div className="relative">
            <Input
              label="Password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password", {
                required: "Password is required",
                minLength: { value: 8, message: "At least 8 characters" },
              })}
            />
            <button
              type="button"
              aria-label={showPassword ? "Hide password" : "Show password"}
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200 transition-colors duration-300"
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
          <div className="relative">
            <Input
              label="Confirm password"
              type={showConfirmPassword ? "text" : "password"}
              placeholder="••••••••"
              error={errors.confirm_password?.message}
              {...register("confirm_password", {
                required: "Please confirm your password",
                validate: (v) => v === password || "Passwords do not match",
              })}
            />
            <button
              type="button"
              aria-label={showConfirmPassword ? "Hide confirm password" : "Show confirm password"}
              onClick={() => setShowConfirmPassword((v) => !v)}
              className="absolute right-3 top-[34px] text-slate-400 hover:text-slate-200 transition-colors duration-300"
            >
              {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Mobile number"
            placeholder="+1 555 000 0000"
            error={errors.mobile_number?.message}
            {...register("mobile_number", { required: "Mobile number is required" })}
          />
          <Input
            label="Country"
            placeholder="United States"
            error={errors.country?.message}
            {...register("country", { required: "Country is required" })}
          />
        </div>

        <Input
          label="State"
          placeholder="California"
          error={errors.state?.message}
          {...register("state", { required: "State is required" })}
        />



        <label className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400 transition-colors duration-300">
          <input type="checkbox" className="mt-0.5" {...register("accept_terms", { required: "You must accept the terms" })} />
          I agree to the Terms of Service and Privacy Policy
        </label>
        {errors.accept_terms && <p className="field-error">{errors.accept_terms.message}</p>}

        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Create account
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link to="/login" className="font-semibold text-accent-dark hover:text-accent dark:text-accent dark:hover:text-accent-light transition-colors duration-300">
          Sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
