import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { authApi } from "../features/auth/auth.api";
import type { AuthSession } from "../lib/storage";
import { useCallback } from "react";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "../lib/storage";

type AuthContextType = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  setSession: (session: AuthSession) => void;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setSessionState(stored);
      // Fetch lại thông tin user mới nhất từ server (để sync birthday, banner, v.v.)
      authApi.getCurrentUser().then((res) => {
        const data = res.data as any;
        if (data) {
          const updated: AuthSession = {
            ...stored,
            name: data.name ?? stored.name,
            email: data.email ?? stored.email,
            avatar: data.avatar ?? stored.avatar,
            banner: data.banner ?? stored.banner,
            phoneNumber: data.phoneNumber ?? stored.phoneNumber,
            createdAt: data.createdAt ?? stored.createdAt,
            birthday: data.birthday ?? stored.birthday,
            is2FAEnabled: data.is2FAEnabled ?? stored.is2FAEnabled,
          };
          setStoredSession(updated);
          setSessionState(updated);
        }
      }).catch(() => {
        // Bỏ qua lỗi nếu token hết hạn
      });
    }
    setIsLoading(false);
  }, []);

  const setSession = useCallback((nextSession: AuthSession) => {
    setStoredSession(nextSession);
    setSessionState(nextSession);
  }, []);

  const logout = useCallback(async () => {
    const current = getStoredSession();

    try {
      if (current?.refreshToken) {
        await authApi.logout(current.refreshToken);
      }
    } catch {
      // ignore logout API error
    } finally {
      clearStoredSession();
      setSessionState(null);
    }
  }, []);

  const value = useMemo(
    () => ({
      session,
      isAuthenticated: Boolean(session?.accessToken),
      setSession,
      logout,
    }),
    [session, setSession, logout],
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }
  return context;
}
