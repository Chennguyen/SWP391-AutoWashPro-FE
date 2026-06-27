import { useMutation } from "@tanstack/react-query";
import { validateVoucher } from "../voucher-service";
import type { VoucherValidation } from "../types/booking-types";
import type { ApiError } from "@/lib/api-error";

export function useValidateVoucherMutation(token: string, userId: string) {
  return useMutation<
    VoucherValidation,
    ApiError,
    { code: string; totalAmount: number }
  >({
    mutationFn: async ({ code, totalAmount }) => {
      if (!token) throw new Error("Authentication token is required");
      if (!userId) throw new Error("User ID is required");
      return await validateVoucher(token, userId, code, totalAmount);
    },
  });
}
