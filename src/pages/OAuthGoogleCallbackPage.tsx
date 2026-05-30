import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { authApi } from "../features/auth/auth.api";
import { setStoredSession } from "../lib/storage";

export default function OAuthGoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();
  const calledRef = useRef(false);

  // 1. Lấy data trực tiếp từ params
  const accessToken = params.get("accessToken");
  const refreshToken = params.get("refreshToken");
  const userId = params.get("userId");
  const errorMessage = params.get("errorMessage");

  // 2. Tính toán message trực tiếp, KHÔNG cần dùng useState
  let message = "Đang xử lý đăng nhập Google...";
  if (errorMessage) {
    message = decodeURIComponent(errorMessage);
  } else if (!accessToken || !refreshToken || !userId) {
    message = "Không nhận được dữ liệu đăng nhập từ Google.";
  }

  // 3. Chỉ dùng useEffect cho việc chuyển trang và lưu dữ liệu (Side-effects)
  useEffect(() => {
    if (calledRef.current) return;

    if (!errorMessage && accessToken && refreshToken && userId) {
      calledRef.current = true;

      const basicSession = {
        accessToken,
        refreshToken,
        userId: Number(userId),
      };

      // Tạm thời lưu token vào storage để authApi có thể dùng
      setStoredSession(basicSession);

      // Fetch thêm thông tin user
      authApi.getCurrentUser()
        .then((res) => {
          const data = res.data as any;
          setSession({
            ...basicSession,
            name: data.name,
            email: data.email,
            avatar: data.avatar,
            phoneNumber: data.phoneNumber,
            is2FAEnabled: data.is2FAEnabled,
          });
          navigate("/dashboard", { replace: true });
        })
        .catch(() => {
          // Fallback nếu có lỗi lấy thông tin
          setSession(basicSession);
          navigate("/dashboard", { replace: true });
        });
    }
  }, [errorMessage, accessToken, refreshToken, userId, navigate, setSession]);

  return (
    <div className="callback-page">
      <div className="callback-card">
        {/* Có thể ẩn spinner nếu có lỗi */}
        {message === "Đang xử lý đăng nhập Google..." && (
          <div className="spinner" />
        )}
        <h2>Google OAuth Callback</h2>
        <p>{message}</p>
      </div>
    </div>
  );
}
