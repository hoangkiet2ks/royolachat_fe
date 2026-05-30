export type VerificationType = "REGISTER" | "FORGOT_PASSWORD" | "DISABLE_2FA";

export type LoginBody = {
  email: string;
  password: string;
  totpCode?: string;
};

export type LoginResponse = {
  require2FA?: boolean;
  accessToken?: string;
  refreshToken?: string;
  userId?: number;
  name?: string;
  email?: string;
  avatar?: string | null;
  phoneNumber?: string;
  appRole?: string;
  is2FAEnabled?: boolean;
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
  is2FAEnabled: boolean;
};

export type UpdateAvatarResponse = UserResponse;
export type UpdatePhoneResponse = UserResponse;

export type TwoFactorSetupResponse = {
  secret: string;
  uri: string;
};

export type DisableTwoFactorBody = {
  totpCode?: string;
  code?: string;
};
