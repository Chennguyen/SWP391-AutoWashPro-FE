import { useMutation } from "@tanstack/react-query";

import { ApiError } from "@/lib/api-error";

import { forgotPasswordService } from "../services";
import type { ForgotPasswordRequest, ForgotPasswordResponse } from "../types";

export function useForgotPasswordMutation() {
  return useMutation<ForgotPasswordResponse, ApiError, ForgotPasswordRequest>({
    mutationFn: (payload) => forgotPasswordService.forgotPassword(payload),
  });
}
