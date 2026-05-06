import axios, { type InternalAxiosRequestConfig } from "axios";
import {
  clearStoredSession,
  getStoredSession,
  setStoredSession,
} from "./storage";

const baseURL = "https://18.141.211.167.nip.io"; // Hardcode để chắc chắn

export const http = axios.create({
  baseURL,
});

http.interceptors.request.use((config) => {
  // Chỉ set Content-Type nếu không phải FormData
  if (!(config.data instanceof FormData) && !config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }

  const session = getStoredSession();
  if (session?.accessToken) {
    config.headers.Authorization = `Bearer ${session.accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let subscribers: Array<(token: string | null) => void> = [];

function notifySubscribers(token: string | null) {
  subscribers.forEach((callback) => callback(token));
  subscribers = [];
}

http.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & {
      _retry?: boolean;
    };

    const status = error.response?.status;
    const session = getStoredSession();
    const requestUrl = originalRequest?.url || "";

    const shouldSkipRefresh =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh-token") ||
      requestUrl.includes("/auth/register") ||
      requestUrl.includes("/auth/otp") ||
      requestUrl.includes("/auth/forgot-password") ||
      requestUrl.includes("/auth/google-link");

    if (status !== 401 || originalRequest._retry || shouldSkipRefresh) {
      return Promise.reject(error);
    }

    if (!session?.refreshToken) {
      clearStoredSession();
      return Promise.reject(error);
    }

    if (isRefreshing) {
      return new Promise((resolve, reject) => {
        subscribers.push((newAccessToken) => {
          if (!newAccessToken) {
            reject(error);
            return;
          }

          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          resolve(http(originalRequest));
        });
      });
    }

    originalRequest._retry = true;
    isRefreshing = true;

    try {
      const refreshResponse = await axios.post(
        `${baseURL}/auth/refresh-token`,
        { refreshToken: session.refreshToken },
        {
          headers: {
            "Content-Type": "application/json",
          },
        },
      );

      const newSession = {
        accessToken: refreshResponse.data.accessToken,
        refreshToken: refreshResponse.data.refreshToken,
        userId: refreshResponse.data.userId,
        name: refreshResponse.data.name,
        email: refreshResponse.data.email,
        avatar: refreshResponse.data.avatar,
        phoneNumber: refreshResponse.data.phoneNumber,
      };

      setStoredSession(newSession);
      notifySubscribers(newSession.accessToken);

      originalRequest.headers.Authorization = `Bearer ${newSession.accessToken}`;

      return http(originalRequest);
    } catch (refreshError) {
      notifySubscribers(null);
      clearStoredSession();
      window.location.href = "/login";
      return Promise.reject(refreshError);
    } finally {
      isRefreshing = false;
    }
  },
);
