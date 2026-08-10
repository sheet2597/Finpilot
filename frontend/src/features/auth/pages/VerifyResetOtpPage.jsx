import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import toast from "react-hot-toast";
import { AuthLayout } from "@/components/layout/AuthLayout";
import { OtpInput } from "@/components/ui/OtpInput";
import { Button } from "@/components/ui/Button";
import { authApi } from "../api";
import { getApiErrorMessage } from "@/lib/axios";

export default function VerifyResetOtpPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const email = location.state?.email;

  const [otp, setOtp] = useState("");
  const [error, setError] = useState();
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!email) {
      navigate("/forgot-password", { replace: true });
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
      const { data } = await authApi.verifyResetOtp(email, otp);
      navigate("/reset-password", { state: { email, resetToken: data.data?.reset_token } });
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Invalid or expired OTP."));
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Verify reset code" subtitle={`Enter the 6-digit code sent to ${email}`}>
      <div className="space-y-6">
        <OtpInput value={otp} onChange={setOtp} error={error} />
        <Button onClick={onSubmit} className="w-full" isLoading={isSubmitting}>
          Verify code
        </Button>
      </div>
    </AuthLayout>
  );
}
