import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import AuthShell from "../components/auth/AuthShell";
import TextInput from "../components/ui/TextInput";
import PasswordInput from "../components/ui/PasswordInput";
import FieldError from "../components/ui/FieldError";
import Button from "../components/ui/Button";
import SendOtpButton from "../components/auth/SendOtpButton";
import { authApi } from "../features/auth/auth.api";
import { getApiErrorMessage } from "../lib/api-error";
import {
  forgotPasswordSchema,
  type ForgotPasswordFormValues,
} from "../features/auth/auth.schemas";

export default function ForgotPasswordPage() {
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: "",
      code: "",
      newPassword: "",
      confirmNewPassword: "",
    },
  });

  const email = watch("email");

  const onSubmit = async (values: ForgotPasswordFormValues) => {
    try {
      setLoading(true);
      setServerError("");
      setSuccessMessage("");

      await authApi.forgotPassword(values);
      setSuccessMessage("Đổi mật khẩu thành công. Bạn có thể đăng nhập lại.");
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Quên mật khẩu"
      subtitle="Nhập email, OTP và mật khẩu mới để khôi phục tài khoản."
      footer={
        <p>
          Quay lại <Link to="/login">đăng nhập</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />

        <div className="otp-inline">
          <div className="otp-field">
            <TextInput
              label="Mã OTP"
              placeholder="123456"
              {...register("code")}
            />
            <FieldError message={errors.code?.message} />
          </div>

          <SendOtpButton email={email} type="FORGOT_PASSWORD" />
        </div>

        <PasswordInput
          label="Mật khẩu mới"
          placeholder="••••••••"
          {...register("newPassword")}
        />
        <FieldError message={errors.newPassword?.message} />

        <PasswordInput
          label="Xác nhận mật khẩu mới"
          placeholder="••••••••"
          {...register("confirmNewPassword")}
        />
        <FieldError message={errors.confirmNewPassword?.message} />

        {serverError && <div className="server-error">{serverError}</div>}
        {successMessage && (
          <div className="server-success">{successMessage}</div>
        )}

        <Button type="submit" loading={loading}>
          Cập nhật mật khẩu
        </Button>
      </form>
    </AuthShell>
  );
}
