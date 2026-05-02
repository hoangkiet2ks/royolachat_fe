import { Link, useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import AuthShell from "../components/auth/AuthShell";
import TextInput from "../components/ui/TextInput";
import PasswordInput from "../components/ui/PasswordInput";
import FieldError from "../components/ui/FieldError";
import Button from "../components/ui/Button";
import {
  loginSchema,
  type LoginFormValues,
} from "../features/auth/auth.schemas";
import { authApi } from "../features/auth/auth.api";
import { getApiErrorMessage } from "../lib/api-error";
import { useState } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const onSubmit = async (values: LoginFormValues) => {
    try {
      setLoading(true);
      setServerError("");

      const res = await authApi.login(values);

      setSession({
        accessToken: res.data.accessToken,
        refreshToken: res.data.refreshToken,
        userId: res.data.userId,
        name: res.data.name,
        email: res.data.email,
        avatar: res.data.avatar,
        phoneNumber: res.data.phoneNumber,
      });

      navigate("/dashboard");
    } catch (error) {
      setServerError(getApiErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setGoogleLoading(true);
      const res = await authApi.getGoogleLink();
      window.location.href = res.data.url;
    } catch (error) {
      setServerError(getApiErrorMessage(error));
      setGoogleLoading(false);
    }
  };

  return (
    <AuthShell
      title="Đăng nhập"
      subtitle="Chào mừng quay lại. Đăng nhập để tiếp tục sử dụng hệ thống."
      footer={
        <p>
          Chưa có tài khoản? <Link to="/register">Tạo tài khoản</Link>
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

        <PasswordInput
          label="Mật khẩu"
          placeholder="••••••••"
          {...register("password")}
        />
        <FieldError message={errors.password?.message} />

        <div className="row-between">
          <span />
          <Link to="/forgot-password" className="text-link">
            Quên mật khẩu?
          </Link>
        </div>

        {serverError && <div className="server-error">{serverError}</div>}

        <Button type="submit" loading={loading}>
          Đăng nhập
        </Button>

        <div className="divider">
          <span>hoặc</span>
        </div>

        <Button
          type="button"
          variant="ghost"
          onClick={handleGoogleLogin}
          loading={googleLoading}
        >
          Đăng nhập với Google
        </Button>
      </form>
    </AuthShell>
  );
}
