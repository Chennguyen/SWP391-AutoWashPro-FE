import { apiBase, handleApiResponse } from "@/lib/api-error";

import { NotificationType, NotificationItem, GetNotificationsParams } from "./types/notification-types";
export { type NotificationType, type NotificationItem, type GetNotificationsParams };

const BACKEND_BASE = "https://autowashpro-deploy-latest-90f6.onrender.com";
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
  const d = body?.data ?? body?.Data ?? body;
  let rawList: any[] = [];
  if (d && typeof d === "object" && !Array.isArray(d)) {
    if (Array.isArray(d.items)) rawList = d.items;
    else if (Array.isArray(d.Items)) rawList = d.Items;
    else if (Array.isArray(d.data)) rawList = d.data;
    else if (Array.isArray(d.Data)) rawList = d.Data;
  } else if (Array.isArray(d)) {
    rawList = d;
  } else if (Array.isArray(body)) {
    rawList = body;
  } else {
    return [];
  }

  return rawList.map((r: any) => ({
    id: String(r?.id ?? r?.Id ?? ""),
    title: String(r?.title ?? r?.Title ?? ""),
    message: String(r?.message ?? r?.Message ?? r?.content ?? r?.Content ?? ""),
    type: String(r?.type ?? r?.Type ?? "SystemAlert") as NotificationType,
    isRead: Boolean(r?.isRead ?? r?.IsRead ?? false),
    createdAt: String(r?.createdAt ?? r?.CreatedAt ?? ""),
  }));
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
