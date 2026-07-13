import { z } from "zod";

export const forgotPasswordSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
});

export type ForgotPasswordFields = z.infer<typeof forgotPasswordSchema>;

export const verifyOtpSchema = z.object({
  otp: z
    .string()
    .trim()
    .min(1, "Vui lòng nhập mã OTP.")
    .regex(/^\d{6}$/, "Mã OTP phải gồm đúng 6 chữ số."),
});

export type VerifyOtpFields = z.infer<typeof verifyOtpSchema>;

export const resetPasswordSchema = z
  .object({
    newPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu mới.")
      .min(8, "Mật khẩu phải có ít nhất 8 ký tự.")
      .regex(/[a-z]/, "Mật khẩu phải có ít nhất một chữ thường.")
      .regex(/[A-Z]/, "Mật khẩu phải có ít nhất một chữ hoa.")
      .regex(/\d/, "Mật khẩu phải có ít nhất một chữ số.")
      .regex(/[@$!%*?&]/, "Mật khẩu phải có ít nhất một ký tự đặc biệt.")
      .regex(
        /^[A-Za-z\d@$!%*?&]+$/,
        "Mật khẩu chỉ được dùng chữ cái, chữ số và ký tự @$!%*?&.",
      ),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .superRefine((data, context) => {
    if (data.newPassword !== data.confirmPassword) {
      context.addIssue({
        code: "custom",
        message: "Mật khẩu xác nhận không khớp.",
        path: ["confirmPassword"],
      });
    }
  });

export type ResetPasswordFields = z.infer<typeof resetPasswordSchema>;
