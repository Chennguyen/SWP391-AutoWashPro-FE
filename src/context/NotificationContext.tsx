"use client";

import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  useCallback,
  ReactNode,
} from "react";
import { HubConnection, HubConnectionBuilder } from "@microsoft/signalr";
import {
  getNotifications,
  updateNotificationStatus,
  HUB_URL,
  type NotificationItem,
} from "@/lib/api/notification";

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

const NotificationContext = createContext<NotificationContextProps | undefined>(undefined);

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function readToken(): string {
  if (typeof window === "undefined") return "";
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [toasts, setToasts] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const connectionRef = useRef<HubConnection | null>(null);

  // Tính số thông báo chưa đọc
  const unreadCount = notifications.filter((n) => !n.isRead).length;

  // Lấy danh sách lịch sử thông báo ban đầu từ REST API
  const loadNotifications = useCallback(async (authToken: string) => {
    if (!authToken) return;
    setLoading(true);
    setError(null);
    try {
      const data = await getNotifications(authToken);
      // Sắp xếp thông báo mới nhất lên đầu
      setNotifications(data.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
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
    connection.on("ReceiveNotification", (notification: NotificationItem) => {
      // 1. Thêm vào danh sách thông báo trên giao diện
      setNotifications((prev) => {
        // Kiểm tra xem thông báo đã tồn tại chưa để tránh trùng lặp
        if (prev.some((n) => n.id === notification.id)) return prev;
        return [notification, ...prev];
      });

      // 2. Thêm vào danh sách Toast nổi để trượt lên bên trái màn hình
      setToasts((prev) => {
        if (prev.some((t) => t.id === notification.id)) return prev;
        return [...prev, notification];
      });

      // 3. Nếu là thông báo thăng hạng thành viên, trigger cập nhật lại thông tin cá nhân
      if (notification.type === "TierUpgraded") {
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
        notifications,
        unreadCount,
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

export function useNotifications() {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error("useNotifications must be used within a NotificationProvider");
  }
  return context;
}
