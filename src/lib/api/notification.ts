import { apiBase, handleApiResponse } from "./api-error";

export type NotificationType =
  | "BookingCreated"
  | "BookingReminder"
  | "BookingCancelled"
  | "BookingCompleted"
  | "TierUpgraded"
  | "RewardRedeemed"
  | "IdentityApproved"
  | "IdentityRejected"
  | "SystemAlert";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: string;
};

export type GetNotificationsParams = {
  type?: NotificationType;
  isRead?: boolean;
  page?: number;
  pageSize?: number;
};

const BACKEND_BASE = "https://autowashpro-deploy-latest.onrender.com";
export const HUB_URL = `${BACKEND_BASE}/notificationHub`;

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

/**
 * Lấy danh sách lịch sử thông báo của người dùng.
 */
export async function getNotifications(
  token: string,
  params?: GetNotificationsParams
): Promise<NotificationItem[]> {
  const url = new URL(`${apiBase() || BACKEND_BASE}/api/v1/notifications`);
  
  const page = params?.page ?? 1;
  const pageSize = params?.pageSize ?? 100;
  
  url.searchParams.append("page", String(page));
  url.searchParams.append("pageSize", String(pageSize));

  if (params) {
    if (params.type) url.searchParams.append("type", params.type);
    if (params.isRead !== undefined) url.searchParams.append("isRead", String(params.isRead));
  }

  const res = await fetch(url.toString(), {
    method: "GET",
    cache: "no-store",
    headers: authHeaders(token),
  });

  const body = await handleApiResponse<any>(res);
  // Hỗ trợ bóc tách mảng linh hoạt cho cả dữ liệu phân trang và dữ liệu thô
  const d = body?.data ?? body?.Data ?? body;
  if (d && typeof d === "object") {
    if (Array.isArray(d.items)) return d.items;
    if (Array.isArray(d.Items)) return d.Items;
    if (Array.isArray(d.data)) return d.data;
    if (Array.isArray(d.Data)) return d.Data;
  }
  if (Array.isArray(d)) return d;
  if (Array.isArray(body)) return body;
  return [];
}

/**
 * Cập nhật trạng thái đã đọc của một hoặc tất cả thông báo.
 */
export async function updateNotificationStatus(
  token: string,
  ids: string[],
  isRead: boolean,
  markAll = false
): Promise<void> {
  const url = `${apiBase() || BACKEND_BASE}/api/v1/notifications/status`;
  const res = await fetch(url, {
    method: "PATCH",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify({
      ids: ids.length > 0 ? ids : null,
      isRead,
      markAll,
    }),
  });

  await handleApiResponse<unknown>(res);
}
