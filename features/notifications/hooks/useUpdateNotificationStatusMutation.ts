import { useMutation, useQueryClient } from "@tanstack/react-query";
import { updateNotificationStatus } from "../services";
import { ApiError } from "@/lib/api-error";

export interface UpdateNotificationStatusPayload {
  ids: string[];
  isRead: boolean;
  markAll?: boolean;
}

export function useUpdateNotificationStatusMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, UpdateNotificationStatusPayload>({
    mutationFn: async (payload) => {
      if (!token) return;
      await updateNotificationStatus(token, payload.ids, payload.isRead, payload.markAll);
    },
    onSuccess: () => {
      // Invalidate notifications queries to trigger refetch
      void queryClient.invalidateQueries({ queryKey: ["notifications", token] });
    },
  });
}
