import { z } from "zod";

export function getTodayUtcDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

export const optionalDateOfBirthSchema = z
  .string()
  .superRefine((value, context) => {
    if (!value) return;

    if (!z.iso.date().safeParse(value).success) {
      context.addIssue({
        code: "custom",
        message: "Ngày sinh không hợp lệ.",
      });
      return;
    }

    if (value > getTodayUtcDateString()) {
      context.addIssue({
        code: "custom",
        message: "Ngày sinh không được lớn hơn ngày hiện tại.",
      });
    }
  });

export function formatDateOfBirth(value?: string | null): string {
  if (!value) return "Chưa cập nhật";

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;

  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}
