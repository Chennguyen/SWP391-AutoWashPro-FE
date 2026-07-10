import { useMutation } from "@tanstack/react-query";
import { registerUser } from "../services";
import { ApiError } from "@/lib/api-error";
import { RegisterPayload, RegisterResult } from "../types/auth-types";

export function useRegister() {
  return useMutation<RegisterResult, ApiError, RegisterPayload>({
    mutationFn: async (payload) => {
      return await registerUser(payload);
    },
  });
}
