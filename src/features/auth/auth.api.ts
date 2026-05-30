import { http } from "../../lib/http";
import type {
  AuthorizationUrlResponse,
  ForgotPasswordBody,
  LoginBody,
  LoginResponse,
  RegisterBody,
  SendOtpBody,
  UpdateAvatarResponse,
  UpdatePhoneResponse,
  TwoFactorSetupResponse,
  DisableTwoFactorBody,
} from "./auth.types";

export const authApi = {
  login(body: LoginBody) {
    return http.post<LoginResponse>("/auth/login", body);
  },

  register(body: RegisterBody) {
    return http.post("/auth/register", body);
  },

  // Cập nhật Avatar
  updateAvatar(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return http.patch<UpdateAvatarResponse>("/auth/me/avatar", formData);
  },

  // Cập nhật Tên người dùng
  updateProfile(data: { name: string }) {
    return http.patch<{ message: string; name: string }>("/auth/me/profile", data);
  },

  // Cập nhật Banner
  updateBanner(file: File) {
    const formData = new FormData();
    formData.append("file", file);
    return http.patch<{ banner: string; message: string }>("/auth/me/banner", formData);
  },

  // Cập nhật Số điện thoại
  updatePhone(phoneNumber: string) {
    return http.patch<UpdatePhoneResponse>("/auth/me/phone", { phoneNumber });
  },

  // Cập nhật Ngày sinh
  updateBirthday(birthday: string) {
    return http.patch<{ message: string; birthday: string }>("/auth/me/birthday", { birthday });
  },

  // Đổi mật khẩu
  changePassword(oldPassword: string, newPassword: string) {
    return http.patch<{ message: string }>("/auth/me/password", { oldPassword, newPassword });
  },

  sendOtp(body: SendOtpBody) {
    return http.post("/auth/send-otp", body);
  },

  forgotPassword(body: ForgotPasswordBody) {
    return http.post("/auth/forgot-password", body);
  },

  getGoogleLink() {
    return http.get<AuthorizationUrlResponse>("/auth/google-link");
  },

  logout(refreshToken: string) {
    return http.post("/auth/logout", { refreshToken });
  },

  getCurrentUser() {
    return http.get<UserResponse>("/auth/me");
  },

  setupTwoFactorAuth() {
    return http.post<TwoFactorSetupResponse>("/auth/2fa/setup", {});
  },

  disableTwoFactorAuth(body: DisableTwoFactorBody) {
    return http.post<{ message: string }>("/auth/2fa/disable", body);
  },
};