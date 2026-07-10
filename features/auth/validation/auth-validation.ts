import { z } from "zod";

export const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu.")
    .min(6, "Mật khẩu phải từ 6 ký tự."),
});

export type LoginFields = z.infer<typeof loginSchema>;

export const signupSchema = z
  .object({
    firstName: z.string().min(1, "Vui lòng nhập tên."),
    lastName: z.string().min(1, "Vui lòng nhập họ."),
    email: z
      .string()
      .min(1, "Vui lòng nhập email.")
      .email("Email không hợp lệ."),
    phone: z
      .string()
      .min(1, "Vui lòng nhập số điện thoại.")
      .regex(/^(0|\+84)[0-9]{8,10}$/, "Số điện thoại không hợp lệ."),
    cccd: z
      .string()
      .min(1, "Vui lòng nhập số CCCD.")
      .regex(/^[0-9]{9,12}$/, "Số CCCD phải từ 9–12 chữ số."),
    password: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu.")
      .min(6, "Mật khẩu phải từ 6 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu."),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Mật khẩu không khớp.",
    path: ["confirmPassword"],
  });

export type SignupFields = z.infer<typeof signupSchema>;
