import { useEffect, useState } from "react";
import Button from "../ui/Button";
import { authApi } from "../../features/auth/auth.api";
import { getApiErrorMessage } from "../../lib/api-error";
import type { VerificationType } from "../../features/auth/auth.types";

type Props = {
  email: string;
  type: VerificationType;
};

export default function SendOtpButton({ email, type }: Props) {
  const [countdown, setCountdown] = useState(0);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (!countdown) return;
    const timer = setTimeout(() => setCountdown((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  const handleSendOtp = async () => {
    if (!email) {
      setMessage("Vui lòng nhập email trước khi gửi OTP.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      await authApi.sendOtp({ email, type });
      setMessage("OTP đã được gửi tới email của bạn.");
      setCountdown(60);
    } catch (error) {
      setMessage(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="otp-box">
      <Button
        type="button"
        onClick={handleSendOtp}
        loading={loading}
        disabled={countdown > 0}
        variant="secondary"
      >
        {countdown > 0 ? `Gửi lại sau ${countdown}s` : "Gửi OTP"}
      </Button>
      {message && <p className="otp-message">{message}</p>}
    </div>
  );
}
