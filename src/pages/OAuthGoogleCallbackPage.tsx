import { useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function OAuthGoogleCallbackPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setSession } = useAuth();

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
    if (!errorMessage && accessToken && refreshToken && userId) {
      setSession({
        accessToken,
        refreshToken,
        userId: Number(userId),
      });

      navigate("/dashboard", { replace: true });
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
