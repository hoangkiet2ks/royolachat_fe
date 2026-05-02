export type AuthSession = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  name?: string;
  email?: string;
  avatar?: string | null;
  phoneNumber?: string;
  createdAt?: string;
  birthday?: string;
  banner?: string | null;
};

const AUTH_STORAGE_KEY = "ecommerce_auth_session";

export function getStoredSession(): AuthSession | null {
  const raw = localStorage.getItem(AUTH_STORAGE_KEY);
  if (!raw) return null;

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    return null;
  }
}

export function setStoredSession(session: AuthSession) {
  localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(session));
}

export function clearStoredSession() {
  localStorage.removeItem(AUTH_STORAGE_KEY);
}