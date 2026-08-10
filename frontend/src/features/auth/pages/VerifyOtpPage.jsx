import { useEffect, useState } from "react";
import { useLocation, useNavigate, Link } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { authApi } from "../api";
import { getApiErrorMessage } from "@/lib/axios";

export default function VerifyOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/register", { replace: true });
    }
  }, [email, navigate]);

  if (!email) {
    return null;
  }

  const onSubmit = async () => {
    if (otp.length !== 6) {
      setError("Enter the complete 6-digit code");
      return;
    }
    setError(undefined);
    setIsSubmitting(true);
    try {
      await authApi.verifyOtp(email, otp);
      toast.success("Email verified. You can log in now.");
      navigate("/login");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid or expired OTP."));
    } finally {
      setIsSubmitting(false);
    }
  };

  const onResend = async () => {
    setIsResending(true);
    try {
      await authApi.resendOtp(email);
      toast.success("A new OTP has been sent.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Could not resend OTP."));
    } finally {
      setIsResending(false);
    }
  };

  return (
    <AuthLayout title="Verify your email" subtitle={`We sent a 6-digit code to ${email}`}>
      <div className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} error={error} />
        <Button onClick={onSubmit} className="w-full" isLoading={isSubmitting}>
          Verify email
        </Button>
        <p className="text-center text-sm text-slate-500">
          Didn&apos;t get the code?{" "}
          <button onClick={onResend} disabled={isResending} className="font-semibold text-accent-dark hover:text-accent dark:text-accent dark:hover:text-accent-light transition-colors duration-300 disabled:opacity-50">
            Resend OTP
          </button>
        </p>
        <p className="text-center text-sm text-slate-400">
          <Link to="/login" className="hover:text-slate-600 dark:hover:text-slate-300 transition-colors duration-300">Back to sign in</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
