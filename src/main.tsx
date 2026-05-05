import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { AuthProvider } from "./context/AuthContext";
import { CallProvider } from "./context/CallContext";
import "./styles/index.css";

// Xử lý nút Back vật lý Android (Capacitor)
async function setupAndroidBackButton() {
  // Chỉ chạy trong môi trường Capacitor (Android/iOS), không phải browser
  if (!(window as any).Capacitor?.isNativePlatform?.()) return;
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const capacitorApp = (window as any).Capacitor?.Plugins?.App;
    if (!capacitorApp) return;

    capacitorApp.addListener('backButton', ({ canGoBack }: { canGoBack: boolean }) => {
      const modals = document.querySelectorAll('[data-modal="true"]');
      if (modals.length > 0) {
        window.dispatchEvent(new CustomEvent('androidBackButton'));
        return;
      }
      if (canGoBack) {
        window.history.back();
      } else {
        capacitorApp.exitApp();
      }
    });

    capacitorApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (isActive) {
        window.dispatchEvent(new CustomEvent('appResumed'));
      }
    });
  } catch {
    // Không phải môi trường Capacitor — bỏ qua
  }
}

setupAndroidBackButton();

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CallProvider>
          <App />
        </CallProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>,
);
