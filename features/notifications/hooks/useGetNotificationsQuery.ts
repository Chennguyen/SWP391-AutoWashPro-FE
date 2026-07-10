import { useQuery } from "@tanstack/react-query";
import { getNotifications } from "../services";
import { GetNotificationsParams, NotificationItem } from "../types/notification-types";
import { ApiError } from "@/lib/api-error";

export function useGetNotificationsQuery(
  token: string,
  params?: GetNotificationsParams,
  options?: { enabled?: boolean }
) {
  return useQuery<NotificationItem[], ApiError>({
    queryKey: ["notifications", token, params],
    queryFn: async () => {
      if (!token) return [];
      return await getNotifications(token, params);
    },
    enabled: options?.enabled !== false && !!token,
    staleTime: 30000, // 30 seconds
  });
}
