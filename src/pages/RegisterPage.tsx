import { Link, useNavigate } from "react-router-dom";
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
  registerSchema,
  type RegisterFormValues,
} from "../features/auth/auth.schemas";

export default function RegisterPage() {
  const navigate = useNavigate();
  const [serverError, setServerError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<RegisterFormValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      name: "",
      email: "",
      phoneNumber: "",
      password: "",
      confirmPassword: "",
      code: "",
    },
  });

  const email = watch("email");

  const onSubmit = async (values: RegisterFormValues) => {
    try {
      setLoading(true);
      setServerError("");
      setSuccessMessage("");

      await authApi.register(values);

      setSuccessMessage("Đăng ký thành công. Hãy đăng nhập để tiếp tục.");
      setTimeout(() => navigate("/login"), 1200);
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title="Tạo tài khoản"
      subtitle="Điền thông tin bên dưới để bắt đầu."
      footer={
        <p>
          Đã có tài khoản? <Link to="/login">Đăng nhập ngay</Link>
        </p>
      }
    >
      <form className="form" onSubmit={handleSubmit(onSubmit)}>
        <TextInput
          label="Họ và tên"
          placeholder="Nguyễn Văn A"
          {...register("name")}
        />
        <FieldError message={errors.name?.message} />

        <TextInput
          label="Email"
          type="email"
          placeholder="you@example.com"
          {...register("email")}
        />
        <FieldError message={errors.email?.message} />

        <TextInput
          label="Số điện thoại"
          placeholder="098xxxxxxx"
          {...register("phoneNumber")}
        />
        <FieldError message={errors.phoneNumber?.message} />

        <PasswordInput
          label="Mật khẩu"
          placeholder="••••••••"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />

        <PasswordInput
          label="Xác nhận mật khẩu"
          placeholder="••••••••"
          {...register("confirmPassword")}
        />
        <FieldError message={errors.confirmPassword?.message} />

        <div className="otp-inline">
          <div className="otp-field">
            <TextInput
              label="Mã OTP"
              placeholder="123456"
              {...register("code")}
            />
            <FieldError message={errors.code?.message} />
          </div>

          <SendOtpButton email={email} type="REGISTER" />
        </div>

        {serverError && <div className="server-error">{serverError}</div>}
        {successMessage && (
          <div className="server-success">{successMessage}</div>
        )}

        <Button type="submit" loading={loading}>
          Đăng ký
        </Button>
      </form>
    </AuthShell>
  );
}
