import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-error";

import { forgotPasswordService } from "../services";
import type { ResetPasswordRequest, ResetPasswordResponse } from "../types";

export function useResetPasswordMutation() {
  return useMutation<ResetPasswordResponse, ApiError, ResetPasswordRequest>({
    mutationFn: (payload) => forgotPasswordService.resetPassword(payload),
  });
}
