"use client";

import type { ApiError } from "@/lib/api-error";
import { useAuthStore } from "@/stores/auth-store";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { logoutUser } from "../services";

export function useLogoutMutation() {
  const queryClient = useQueryClient();
  const router = useRouter();

  return useMutation<void, ApiError, void>({
    mutationFn: logoutUser,
    onSettled: () => {
      // Vẫn kết thúc phiên phía client nếu phiên server đã hết hạn hoặc API lỗi.
      useAuthStore.getState().clearAuthData();
      window.localStorage.removeItem("firstName");
      window.localStorage.removeItem("lastName");
      queryClient.clear();
      router.replace("/sign-in");
      router.refresh();
    },
  });
}
