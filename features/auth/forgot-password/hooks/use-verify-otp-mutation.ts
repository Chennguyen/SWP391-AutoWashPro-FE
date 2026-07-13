import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-error";

import { forgotPasswordService } from "../services";
import type { VerifyOtpRequest, VerifyOtpResponse } from "../types";

export function useVerifyOtpMutation() {
  return useMutation<VerifyOtpResponse, ApiError, VerifyOtpRequest>({
    mutationFn: (payload) => forgotPasswordService.verifyOtp(payload),
  });
}
