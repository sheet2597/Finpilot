import { useState } from "react";
import { useForm } from "react-hook-form";
import { Link, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "../api";
import { getApiErrorMessage } from "@/lib/axios";

export default function ForgotPasswordPage() {
  const navigate = useNavigate();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm();

  const onSubmit = async ({ email }) => {
    setIsSubmitting(true);
    try {
      await authApi.forgotPassword(email);
      toast.success("OTP sent to your email.");
      navigate("/verify-reset-otp", { state: { email } });
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not send reset OTP."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Forgot password" subtitle="Enter your email and we'll send you a reset code.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="Email address"
          type="email"
          placeholder="you@example.com"
          error={errors.email?.message}
          {...register("email", { required: "Email is required" })}
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Send OTP
        </Button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-500">
        <Link to="/login" className="font-semibold text-accent-dark hover:text-accent dark:text-accent dark:hover:text-accent-light transition-colors duration-300">
          Back to sign in
        </Link>
      </p>
    </AuthLayout>
  );
}
