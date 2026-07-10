"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo,
  ReactNode,
} from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import {
  getNotifications,
  updateNotificationStatus,
  HUB_URL,
  type NotificationItem,
  type NotificationType,
} from "@/features/notifications/services";

interface NotificationContextProps {
  notifications: NotificationItem[];
  unreadCount: number;
  toasts: NotificationItem[];
  loading: boolean;
  error: string | null;
  dismissToast: (id: string) => void;
  markAsRead: (id: string) => void;
  markAllAsRead: () => void;
}

export const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function readToken(): string {
  if (typeof window === "undefined") return "";
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function formatPromotionMessage(message: string, promotionsList: any[]): string {
  if (!message) return "";
  const promoRegex = /^New promotion available:\s*(.+?)\.\s*Valid until\s*(\d{2}\/\d{2}\/\d{4})/i;
  const match = message.match(promoRegex);
  if (!match) return message;

  const promoName = match[1].trim();
  const endDateStr = match[2];

  const promo = promotionsList.find(
    (p) => p.name?.toLowerCase().trim() === promoName.toLowerCase()
  );

  let discountText = "";
  let startDateFormatted = "";
  let endDateFormatted = endDateStr;

  if (promo) {
    if (promo.discountType === "Percentage") {
      discountText = `${promo.discountValue}%`;
    } else {
      discountText = `${promo.discountValue.toLocaleString("vi-VN")}đ`;
    }

    if (promo.startDate) {
      try {
        const startD = new Date(promo.startDate);
        const today = new Date();
        startD.setHours(0, 0, 0, 0);
        today.setHours(0, 0, 0, 0);

        if (startD.getTime() === today.getTime()) {
          startDateFormatted = "hôm nay";
        } else {
          const dd = String(startD.getDate()).padStart(2, "0");
          const mm = String(startD.getMonth() + 1).padStart(2, "0");
          const yyyy = startD.getFullYear();
          startDateFormatted = `${dd}/${mm}/${yyyy}`;
        }
      } catch {
        startDateFormatted = "hôm nay";
      }
    }

    if (promo.endDate) {
      try {
        const endD = new Date(promo.endDate);
        const dd = String(endD.getDate()).padStart(2, "0");
        const mm = String(endD.getMonth() + 1).padStart(2, "0");
        const yyyy = endD.getFullYear();
        endDateFormatted = `${dd}/${mm}/${yyyy}`;
      } catch {
        // use default
      }
    }
  }

  if (!discountText) {
    return `chương trình khuyến mãi ${promoName} từ hôm nay đến hết ngày ${endDateStr}`;
  }

  return `chương trình khuyến mãi ${promoName} giảm ${discountText} từ ${startDateFormatted || "hôm nay"} đến hết ngày ${endDateFormatted}`;
}

function translateBookingNotification(title: string, message: string): { title: string, message: string } {
  let translatedTitle = title;
  let translatedMessage = message;

  const titleLower = title.toLowerCase().trim();
  if (titleLower === "booking confirmed" || titleLower === "booking created") {
    translatedTitle = "Đặt lịch thành công";
  } else if (titleLower === "booking reminder" || titleLower === "reminder") {
    translatedTitle = "Nhắc nhở lịch hẹn";
  } else if (titleLower === "booking cancelled") {
    translatedTitle = "Lịch hẹn đã hủy";
  } else if (titleLower === "booking completed") {
    translatedTitle = "Dịch vụ hoàn thành";
  } else if (titleLower === "booking updated") {
    translatedTitle = "Cập nhật lịch hẹn";
  }

  const confirmRegex1 = /Your booking at\s+(.+?)\s+has been confirmed for\s+(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})/i;
  const confirmRegex2 = /New booking created for\s+(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+at\s+(.+?)\./i;
  const reminderRegex1 = /Friendly reminder:\s*You have a booking at\s+(.+?)\s+scheduled for\s+(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})/i;
  const cancelRegex1 = /Your booking at\s+(.+?)\s+for\s+(\d{2}:\d{2})\s+(\d{2}\/\d{2}\/\d{4})\s+has been cancelled/i;
  const completeRegex1 = /Your wash service at\s+(.+?)\s+has been completed\.\s*Thank you!/i;

  if (confirmRegex1.test(message)) {
    const match = message.match(confirmRegex1);
    if (match) {
      const [, branch, time, date] = match;
      translatedMessage = `Lịch đặt của bạn tại ${branch} đã được xác nhận vào lúc ${time} ngày ${date}.`;
    }
  } else if (confirmRegex2.test(message)) {
    const match = message.match(confirmRegex2);
    if (match) {
      const [, time, date, branch] = match;
      translatedMessage = `Lịch đặt mới được tạo vào lúc ${time} ngày ${date} tại ${branch}.`;
    }
  } else if (reminderRegex1.test(message)) {
    const match = message.match(reminderRegex1);
    if (match) {
      const [, branch, time, date] = match;
      translatedMessage = `Nhắc nhở: Bạn có lịch hẹn rửa xe tại ${branch} vào lúc ${time} ngày ${date}.`;
    }
  } else if (cancelRegex1.test(message)) {
    const match = message.match(cancelRegex1);
    if (match) {
      const [, branch, time, date] = match;
      translatedMessage = `Lịch đặt của bạn tại ${branch} vào lúc ${time} ngày ${date} đã bị hủy.`;
    }
  } else if (completeRegex1.test(message)) {
    const match = message.match(completeRegex1);
    if (match) {
      const [, branch] = match;
      translatedMessage = `Dịch vụ rửa xe của bạn tại ${branch} đã hoàn thành. Cảm ơn quý khách!`;
    }
  } else {
    translatedMessage = message
      .replace(/Your booking at/gi, "Lịch đặt của bạn tại")
      .replace(/has been confirmed for/gi, "đã được xác nhận vào lúc")
      .replace(/scheduled for/gi, "được đặt lịch lúc")
      .replace(/has been completed/gi, "đã hoàn thành")
      .replace(/has been cancelled/gi, "đã bị hủy")
      .replace(/Friendly reminder:/gi, "Nhắc nhở thân thiện:")
      .replace(/You have a booking at/gi, "Bạn có lịch đặt tại")
      .replace(/New booking created for/gi, "Lịch đặt mới được tạo vào")
      .replace(/at /gi, "tại ")
      .replace(/Thank you!/gi, "Cảm ơn quý khách!");
  }

  return { title: translatedTitle, message: translatedMessage };
}

function unwrapList(body: any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;

  const directList = body.items ?? body.Items ?? body.results ?? body.Results;
  if (Array.isArray(directList)) return directList;

  const dataPayload = body.data ?? body.Data;
  if (Array.isArray(dataPayload)) return dataPayload;

  if (dataPayload && typeof dataPayload === "object") {
    const nestedList = dataPayload.items ?? dataPayload.Items ?? dataPayload.results ?? dataPayload.Results;
    if (Array.isArray(nestedList)) return nestedList;
  }

  return [];
}

function toBoolean(val: any, fallback = true): boolean {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  if (s === "false" || s === "0") return false;
  if (s === "true" || s === "1") return true;
  return fallback;
}

async function fetchPromotions(token: string): Promise<any[]> {
  try {
    const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "https://autowashpro-deploy-latest-90f6.onrender.com";
    const params = new URLSearchParams({ pageSize: "100", pageIndex: "1" });
    
    let res = await fetch(`${apiBaseUrl}/api/v1/promotions/available?${params.toString()}`, {
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });
    
    if (!res.ok) {
      res = await fetch(`${apiBaseUrl}/Promotion/promotions?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    if (!res.ok) {
      res = await fetch(`${apiBaseUrl}/api/v1/promotions?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }

    if (!res.ok) {
      res = await fetch(`${apiBaseUrl}/Promotion/admin/promotions?${params.toString()}`, {
        cache: "no-store",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
    }
    
    if (!res.ok) return [];

    const text = await res.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = text;
      }
    }

    const rawList = unwrapList(body);
    return rawList.map((p: any) => ({
      id: String(p.id ?? p.Id ?? p.promotionId ?? p.PromotionId ?? ""),
      name: String(p.name ?? p.Name ?? "Khuyến mãi"),
      description: String(p.description ?? p.Description ?? ""),
      discountType: String(p.discountType ?? p.DiscountType ?? "FixedAmount"),
      discountValue: Number(p.discountValue ?? p.DiscountValue ?? 0),
      startDate: String(p.startDate ?? p.StartDate ?? p.startTime ?? p.StartTime ?? ""),
      endDate: String(p.endDate ?? p.EndDate ?? p.endTime ?? p.EndTime ?? ""),
      isGlobal: toBoolean(p.isGlobal ?? p.IsGlobal, !p.tierIds || p.tierIds.length === 0),
      isActive: toBoolean(p.isActive ?? p.IsActive, true),
    }));
  } catch (err) {
    console.warn("DEBUG [fetchPromotions] Error loading promotions for notifications:", err);
  }
  return [];
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promotions, setPromotions] = useState<any[]>([]);
  const promotionsRef = useRef<any[]>([]);

  useEffect(() => {
    promotionsRef.current = promotions;
  }, [promotions]);

  const connectionRef = useRef<HubConnection | null>(null);

  // Kiểm tra trạng thái tài khoản chưa xác thực để tiêm thông báo ảo
  const [isUnverified, setIsUnverified] = useState(false);

  useEffect(() => {
    function checkStatus() {
      if (typeof window !== "undefined") {
        setIsUnverified(window.localStorage.getItem("is_unverified") === "true");
      }
    }
    checkStatus();
    window.addEventListener("autowash-auth", checkStatus);
    window.addEventListener("storage", checkStatus);
    return () => {
      window.removeEventListener("autowash-auth", checkStatus);
      window.removeEventListener("storage", checkStatus);
    };
  }, []);

  const displayNotifications = useMemo(() => {
    if (!isUnverified) return notifications;

    if (notifications.some((n) => n.id === "virtual-pending-verification")) {
      return notifications;
    }

    const virtualNotif: NotificationItem = {
      id: "virtual-pending-verification",
      title: "Hệ thống xác thực",
      message: "Tài khoản đang được hệ thống xác thực, vui lòng đợi trong ít phút.",
      type: "SystemAlert",
      isRead: false,
      createdAt: new Date().toISOString(),
    };

    return [virtualNotif, ...notifications];
  }, [notifications, isUnverified]);

  const displayUnreadCount = displayNotifications.filter((n) => !n.isRead).length;

  // Lấy danh sách lịch sử thông báo ban đầu từ REST API
  const loadNotifications = useCallback(async (authToken: string) => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const promoData = await fetchPromotions(authToken);
      setPromotions(promoData);

      const data = await getNotifications(authToken);
      
      const formatted = data.map((n) => {
        let msg = n.message;
        let title = n.title;

        if (n.type === "SystemAlert" || !n.type || n.message.toLowerCase().startsWith("new promotion available") || String(n.type).toLowerCase().includes("promo")) {
          msg = formatPromotionMessage(n.message, promoData);
        }

        if (
          n.type === "BookingCreated" ||
          n.type === "BookingReminder" ||
          n.type === "BookingCancelled" ||
          n.type === "BookingCompleted"
        ) {
          const trans = translateBookingNotification(n.title, n.message);
          title = trans.title;
          msg = trans.message;
        }

        return {
          ...n,
          title,
          message: msg,
        };
      });

      // Sắp xếp thông báo mới nhất lên đầu
      setNotifications(formatted.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể tải thông báo.");
    } finally {
      setLoading(false);
    }
  }, []);

  // Đánh dấu 1 thông báo là đã đọc
  const markAsRead = useCallback(async (id: string) => {
    const currentToken = readToken();
    if (!currentToken) return;

    try {
      // Cập nhật State trước (Optimistic UI)
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );

      // Gọi API cập nhật Backend
      await updateNotificationStatus(currentToken, [id], true, false);
    } catch (err) {
      console.error("Lỗi khi cập nhật trạng thái thông báo:", err);
      // Tải lại nếu gặp lỗi để đồng bộ dữ liệu chuẩn
      void loadNotifications(currentToken);
    }
  }, [loadNotifications]);

  // Đánh dấu tất cả thông báo là đã đọc
  const markAllAsRead = useCallback(async () => {
    const currentToken = readToken();
    if (!currentToken) return;

    try {
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      await updateNotificationStatus(currentToken, [], true, true);
    } catch (err) {
      console.error("Lỗi khi đánh dấu đã đọc tất cả:", err);
      void loadNotifications(currentToken);
    }
  }, [loadNotifications]);

  // Đóng Toast thông báo nổi
  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Lắng nghe sự kiện đồng bộ Token của ứng dụng
  useEffect(() => {
    function syncToken() {
      const nextToken = readToken();
      setToken(nextToken);
      if (nextToken) {
        void loadNotifications(nextToken);
      } else {
        setNotifications([]);
        setToasts([]);
        setPromotions([]);
      }
    }

    syncToken();
    window.addEventListener("storage", syncToken);
    window.addEventListener("autowash-auth", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("autowash-auth", syncToken);
    };
  }, [loadNotifications]);

  // Khởi chạy kết nối SignalR Hub
  useEffect(() => {
    if (!token) {
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
      }
      return;
    }

    const connection = new HubConnectionBuilder()
      .withUrl(HUB_URL, {
        accessTokenFactory: () => token,
      })
      .withAutomaticReconnect()
      .build();

    connectionRef.current = connection;

    // Lắng nghe sự kiện nhận thông báo mới từ Server
    connection.on("ReceiveNotification", async (notification: any) => {
      // Chuẩn hóa cấu trúc notification từ SignalR
      const msg = String(notification?.message ?? notification?.Message ?? notification?.content ?? notification?.Content ?? "");
      const title = String(notification?.title ?? notification?.Title ?? "");
      const type = String(notification?.type ?? notification?.Type ?? "SystemAlert") as NotificationType;

      const promoRegex = /^New promotion available:\s*(.+?)\.\s*Valid until\s*(\d{2}\/\d{2}\/\d{4})/i;
      const isPromo = promoRegex.test(msg) || (
        (type === "SystemAlert" || String(type).toLowerCase().includes("promo")) && (
          msg.toLowerCase().includes("khuyến mãi") ||
          msg.toLowerCase().includes("chương trình") ||
          title.toLowerCase().includes("khuyến mãi") ||
          title.toLowerCase().includes("chương trình")
        )
      );

      let currentPromos = promotionsRef.current;
      if (isPromo) {
        try {
          currentPromos = await fetchPromotions(token);
          setPromotions(currentPromos);
        } catch (err) {
          console.warn("Failed to refresh promotions on new notification:", err);
        }
      }

      let finalMsg = msg;
      let finalTitle = title;

      if (type === "SystemAlert" || msg.toLowerCase().startsWith("new promotion available") || String(type).toLowerCase().includes("promo")) {
        finalMsg = formatPromotionMessage(msg, currentPromos);
      }

      if (
        type === "BookingCreated" ||
        type === "BookingReminder" ||
        type === "BookingCancelled" ||
        type === "BookingCompleted"
      ) {
        const trans = translateBookingNotification(title, msg);
        finalTitle = trans.title;
        finalMsg = trans.message;

        if (type === "BookingCancelled" && typeof window !== "undefined") {
          window.dispatchEvent(new Event("autowash-booking-cancelled"));
        }
      }

      const normalized: NotificationItem = {
        id: String(notification?.id ?? notification?.Id ?? ""),
        title: finalTitle,
        message: finalMsg,
        type: type,
        isRead: Boolean(notification?.isRead ?? notification?.IsRead ?? false),
        createdAt: String(notification?.createdAt ?? notification?.CreatedAt ?? new Date().toISOString()),
      };

      const formatted: NotificationItem = {
        ...normalized,
      };

      // 1. Thêm vào danh sách thông báo trên giao diện
      setNotifications((prev) => {
        // Kiểm tra xem thông báo đã tồn tại chưa để tránh trùng lặp
        if (prev.some((n) => n.id === formatted.id)) return prev;
        return [formatted, ...prev];
      });

      // 2. Thêm vào danh sách Toast nổi để trượt lên gọc phải màn hình
      setToasts((prev) => {
        if (prev.some((t) => t.id === formatted.id)) return prev;
        return [...prev, formatted];
      });

      // 3. Nếu là thông báo thăng hạng thành viên, trigger cập nhật lại thông tin cá nhân
      if (formatted.type === "TierUpgraded") {
        window.dispatchEvent(new Event("autowash-rank-upgrade"));
      }
    });

    // Bắt đầu kết nối
    connection
      .start()
      .then(() => {
        console.log("SignalR Connection established successfully.");
      })
      .catch((err) => {
        console.error("SignalR Connection failed to start:", err);
      });

    return () => {
      if (connectionRef.current) {
        void connectionRef.current.stop();
        connectionRef.current = null;
        console.log("SignalR Connection stopped.");
      }
    };
  }, [token]);

  return (
    <NotificationContext.Provider
      value={{
        notifications: displayNotifications,
        unreadCount: displayUnreadCount,
        toasts,
        loading,
        error,
        dismissToast,
        markAsRead,
        markAllAsRead,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
}
