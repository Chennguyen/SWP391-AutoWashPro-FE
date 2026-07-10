import { z } from "zod";

export const profileSchema = z.object({
  firstName: z.string().min(1, "Vui lòng nhập tên."),
  lastName: z.string().min(1, "Vui lòng nhập họ."),
  phone: z
    .string()
    .min(1, "Vui lòng nhập số điện thoại.")
    .regex(/^(0|\+84)[0-9]{8,10}$/, "Số điện thoại không hợp lệ."),
  cccd: z.string().min(1, "Vui lòng nhập số CCCD."),
});

export type ProfileFields = z.infer<typeof profileSchema>;

export const passwordSchema = z
  .object({
    currentPassword: z.string().min(1, "Vui lòng nhập mật khẩu hiện tại."),
    newPassword: z
      .string()
      .min(1, "Vui lòng nhập mật khẩu mới.")
      .min(6, "Mật khẩu mới phải từ 6 ký tự."),
    confirmPassword: z.string().min(1, "Vui lòng xác nhận mật khẩu mới."),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Mật khẩu mới không khớp.",
    path: ["confirmPassword"],
  });

export type PasswordFields = z.infer<typeof passwordSchema>;

export const vehicleSchema = z.object({
  licensePlate: z
    .string()
    .min(1, "Vui lòng nhập biển số xe.")
    .regex(/^[0-9]{2}[A-Z]-[0-9]{4,5}$/, "Biển số xe không đúng định dạng (ví dụ: 59A-12345 hoặc 59A-1234)."),
  brand: z.string().min(1, "Vui lòng chọn hãng xe."),
  model: z.string().min(1, "Vui lòng chọn dòng xe."),
  color: z.string().min(1, "Vui lòng chọn màu xe."),
  vehicleType: z.enum(["SEDAN", "SUV"]),
});

export type VehicleFields = z.infer<typeof vehicleSchema>;
