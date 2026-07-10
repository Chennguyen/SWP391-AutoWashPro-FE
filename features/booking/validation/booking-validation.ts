import { z } from "zod";

export const createBookingSchema = z.object({
  branchId: z.string().min(1, "Vui lòng chọn chi nhánh."),
  vehicleId: z.string().min(1, "Vui lòng chọn phương tiện."),
  voucherId: z.string().nullable().optional(),
  bookingDate: z.string().min(1, "Vui lòng chọn ngày đặt lịch."),
  startTime: z.string().min(1, "Vui lòng chọn giờ đặt lịch."),
  redemPoint: z.boolean().default(false),
});

export type CreateBookingInput = z.infer<typeof createBookingSchema>;
