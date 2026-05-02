import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Email không hợp lệ"),
  password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
});

export const updatePhoneSchema = z.object({
  phoneNumber: z
    .string()
    .min(10, "Số điện thoại tối thiểu 10 số")
    .max(11, "Số điện thoại tối đa 11 số")
    .regex(/^[0-9]+$/, "Số điện thoại chỉ được chứa số"),
});

export type UpdatePhoneFormValues = z.infer<typeof updatePhoneSchema>;

export const registerSchema = z
  .object({
    name: z.string().min(1, "Vui lòng nhập họ tên"),
    email: z.string().email("Email không hợp lệ"),
    phoneNumber: z.string().min(1, "Vui lòng nhập số điện thoại"),
    password: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmPassword: z.string().min(6, "Vui lòng nhập xác nhận mật khẩu"),
    code: z.string().length(6, "OTP phải đủ 6 ký tự"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmPassword"],
  });

export const forgotPasswordSchema = z
  .object({
    email: z.string().email("Email không hợp lệ"),
    code: z.string().length(6, "OTP phải đủ 6 ký tự"),
    newPassword: z.string().min(6, "Mật khẩu tối thiểu 6 ký tự"),
    confirmNewPassword: z.string().min(6, "Vui lòng nhập xác nhận mật khẩu"),
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: "Mật khẩu xác nhận không khớp",
    path: ["confirmNewPassword"],
  });

export type LoginFormValues = z.infer<typeof loginSchema>;
export type RegisterFormValues = z.infer<typeof registerSchema>;
export type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;