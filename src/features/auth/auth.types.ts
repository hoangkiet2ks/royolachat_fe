export type VerificationType = "REGISTER" | "FORGOT_PASSWORD";

export type LoginBody = {
  email: string;
  password: string;
};

export type LoginResponse = {
  accessToken: string;
  refreshToken: string;
  userId: number;
  name: string;
  email: string;
  avatar: string | null;
  phoneNumber: string;
  appRole: string;
};

export type RegisterBody = {
  email: string;
  password: string;
  confirmPassword: string;
  name: string;
  phoneNumber: string;
  code: string;
};

export type SendOtpBody = {
  email: string;
  type: VerificationType;
};

export type ForgotPasswordBody = {
  email: string;
  code: string;
  newPassword: string;
  confirmNewPassword: string;
};

export type AuthorizationUrlResponse = {
  url: string;
};

export type UserResponse = {
  id: number;
  email: string;
  name: string;
  avatar: string | null;
  phoneNumber: string;
};

export type UpdateAvatarResponse = UserResponse;
export type UpdatePhoneResponse = UserResponse;

