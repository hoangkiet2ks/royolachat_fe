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
import { useState, useRef } from "react";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const [serverError, setServerError] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Thêm State cho 2FA
  const [require2FA, setRequire2FA] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [pendingCredentials, setPendingCredentials] =
    useState<LoginFormValues | null>(null);

  const confirmButtonRef = useRef<HTMLButtonElement>(null);

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

      // Build login payload - only include totpCode if it's provided
      const loginPayload: any = {
        email: values.email,
        password: values.password,
      };

      if (totpCode && totpCode.length === 6) {
        loginPayload.totpCode = totpCode;
      }

      const res = await authApi.login(loginPayload);

      if (res.data.require2FA) {
        setRequire2FA(true);
        setPendingCredentials(values);
        return;
      }

      setSession({
        accessToken: res.data.accessToken as string,
        refreshToken: res.data.refreshToken as string,
        userId: res.data.userId as number,
        name: res.data.name as string,
        email: res.data.email as string,
        avatar: res.data.avatar as string | null,
        phoneNumber: res.data.phoneNumber as string,
        is2FAEnabled: res.data.is2FAEnabled as boolean,
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
      <form
        className="form"
        onSubmit={(e) => {
          if (require2FA) {
            e.preventDefault();
          } else {
            handleSubmit(onSubmit)(e);
          }
        }}
      >
        {require2FA ? (
          <>
            <div
              style={{
                marginBottom: "16px",
                textAlign: "center",
                color: "var(--text-secondary)",
              }}
            >
              Tài khoản của bạn đã bật Xác thực 2 bước. <br />
              Vui lòng nhập mã 6 số từ ứng dụng Google Authenticator.
            </div>
            <TextInput
              label="Mã xác thực 2FA"
              type="text"
              placeholder="Nhập mã 6 số"
              maxLength={6}
              value={totpCode}
              onChange={(e) => setTotpCode(e.target.value)}
              onKeyPress={(e) => {
                if (
                  e.key === "Enter" &&
                  totpCode.length === 6 &&
                  pendingCredentials
                ) {
                  e.preventDefault();
                  confirmButtonRef.current?.click();
                }
              }}
              style={{
                textAlign: "center",
                letterSpacing: "8px",
                fontSize: "1.2rem",
                fontWeight: "bold",
              }}
            />
            {serverError && <div className="server-error">{serverError}</div>}

            <Button
              ref={confirmButtonRef}
              type="button"
              loading={loading}
              onClick={async () => {
                if (pendingCredentials && totpCode.length === 6) {
                  setServerError("");
                  setLoading(true);
                  try {
                    const loginPayload: any = {
                      email: pendingCredentials.email,
                      password: pendingCredentials.password,
                      totpCode: totpCode,
                    };
                    const res = await authApi.login(loginPayload);

                    setSession({
                      accessToken: res.data.accessToken as string,
                      refreshToken: res.data.refreshToken as string,
                      userId: res.data.userId as number,
                      name: res.data.name as string,
                      email: res.data.email as string,
                      avatar: res.data.avatar as string | null,
                      phoneNumber: res.data.phoneNumber as string,
                      is2FAEnabled: res.data.is2FAEnabled as boolean,
                    });
                    navigate("/dashboard");
                  } catch (error) {
                    setServerError(getApiErrorMessage(error));
                  } finally {
                    setLoading(false);
                  }
                }
              }}
              disabled={totpCode.length < 6}
            >
              Xác nhận
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setRequire2FA(false);
                setTotpCode("");
                setServerError("");
              }}
              style={{ marginTop: "12px" }}
            >
              Quay lại
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </form>
    </AuthShell>
  );
}
