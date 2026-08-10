import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { authApi } from "../api";
import { getApiErrorMessage } from "@/lib/axios";

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { email, resetToken } = location.state || {};
  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm();

  useEffect(() => {
    if (!email || !resetToken) {
      navigate("/forgot-password", { replace: true });
    }
  }, [email, resetToken, navigate]);

  if (!email || !resetToken) {
    return null;
  }

  const newPassword = watch("new_password");

  const onSubmit = async (values) => {
    setIsSubmitting(true);
    try {
      await authApi.resetPassword(email, resetToken, values.new_password, values.confirm_password);
      toast.success("Password reset. Please sign in.");
      navigate("/login");
    } catch (error) {
      toast.error(getApiErrorMessage(error, "Could not reset your password."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create a new password" subtitle="Make it something you haven't used before.">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New password"
          type="password"
          placeholder="••••••••"
          error={errors.new_password?.message}
          {...register("new_password", { required: "New password is required", minLength: { value: 8, message: "At least 8 characters" } })}
        />
        <Input
          label="Confirm new password"
          type="password"
          placeholder="••••••••"
          error={errors.confirm_password?.message}
          {...register("confirm_password", {
            required: "Please confirm your password",
            validate: (v) => v === newPassword || "Passwords do not match",
          })}
        />
        <Button type="submit" className="w-full" isLoading={isSubmitting}>
          Reset password
        </Button>
      </form>
    </AuthLayout>
  );
}
