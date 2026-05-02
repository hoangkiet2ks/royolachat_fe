import { Navigate, Route, Routes } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import DashboardPage from "./pages/DashboardPage";
import OAuthGoogleCallbackPage from "./pages/OAuthGoogleCallbackPage";
import ProtectedRoute from "./routes/ProtectedRoute";
import GlobalCallHandler from "./components/call/GlobalCallHandler";
import { useAuth } from "./context/AuthContext";

export default function App() {
  const { isAuthenticated } = useAuth();

  return (
    <>
      {/* Global Call Handler - Nhận cuộc gọi ở mọi trang */}
      {isAuthenticated && <GlobalCallHandler />}

      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/forgot-password" element={<ForgotPasswordPage />} />
        <Route
          path="/oauth-google-callback"
          element={<OAuthGoogleCallbackPage />}
        />

        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
      </Routes>
    </>
  );
}
