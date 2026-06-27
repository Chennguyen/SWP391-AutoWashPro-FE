"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  CalendarPlus,
  Clock,
  Ban,
  CheckCircle2,
  Award,
  Gift,
  ShieldCheck,
  ShieldAlert,
  Info,
  Check,
  Percent,
} from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { NotificationType } from "@/features/notifications/services";

const ICON_MAP: Record<NotificationType, any> = {
  BookingCreated: CalendarPlus,
  BookingReminder: Clock,
  BookingCancelled: Ban,
  BookingCompleted: CheckCircle2,
  TierUpgraded: Award,
  RewardRedeemed: Gift,
  IdentityApproved: ShieldCheck,
  IdentityRejected: ShieldAlert,
  SystemAlert: Info,
};

const COLOR_MAP: Record<NotificationType, string> = {
  BookingCreated: "text-blue-500 bg-blue-50 border-blue-100",
  BookingReminder: "text-amber-500 bg-amber-50 border-amber-100",
  BookingCancelled: "text-red-500 bg-red-50 border-red-100",
  BookingCompleted: "text-emerald-500 bg-emerald-50 border-emerald-100",
  TierUpgraded: "text-purple-500 bg-purple-50 border-purple-100",
  RewardRedeemed: "text-teal-500 bg-teal-50 border-teal-100",
  IdentityApproved: "text-emerald-500 bg-emerald-50 border-emerald-100",
  IdentityRejected: "text-rose-500 bg-rose-50 border-rose-100",
  SystemAlert: "text-sky-500 bg-sky-50 border-sky-100",
};

export function getNotificationDetails(type: NotificationType, message: string | undefined | null, title: string | undefined | null) {
  const msgStr = typeof message === "string" ? message : "";
  const titleStr = typeof title === "string" ? title : "";
  
  const isPromo =
    type === "SystemAlert" &&
    (msgStr.toLowerCase().includes("khuyến mãi") ||
      msgStr.toLowerCase().includes("chương trình") ||
      titleStr.toLowerCase().includes("khuyến mãi") ||
      titleStr.toLowerCase().includes("chương trình") ||
      msgStr.toLowerCase().includes("promotion") ||
      titleStr.toLowerCase().includes("promotion"));

  if (isPromo) {
    return {
      Icon: Percent,
      colorClass: "text-orange-500 bg-orange-50 border-orange-100",
    };
  }

  const Icon = (type && ICON_MAP[type]) || Info;
  const colorClass = (type && COLOR_MAP[type]) || "text-slate-500 bg-slate-50 border-slate-100";

  return { Icon, colorClass };
}

function getNotificationCategoryName(type: NotificationType): string {
  switch (type) {
    case "BookingCreated": return "Đặt lịch";
    case "BookingReminder": return "Nhắc lịch";
    case "BookingCancelled": return "Hủy lịch";
    case "BookingCompleted": return "Hoàn thành";
    case "TierUpgraded": return "Thành viên";
    case "RewardRedeemed": return "Phần thưởng";
    case "IdentityApproved":
    case "IdentityRejected":
      return "Xác thực";
    case "SystemAlert": return "Hệ thống";
    default: return "Thông báo";
  }
}

function formatRelativeTime(dateString: string): string {
  if (!dateString) return "Vừa xong";
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffSecs < 60) return "Vừa xong";
  if (diffMins < 60) return `${diffMins} phút trước`;
  if (diffHours < 24) return `${diffHours} giờ trước`;
  if (diffDays < 30) return `${diffDays} ngày trước`;
  return date.toLocaleDateString("vi-VN");
}

export function NotificationBell() {
  const { notifications, unreadCount, markAsRead, markAllAsRead } = useNotifications();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Đóng dropdown khi click bên ngoài
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleItemClick(id: string, type: NotificationType) {
    // 1. Đánh dấu đã đọc
    void markAsRead(id);
    setIsOpen(false);

    // 2. Chuyển hướng trang tương ứng dựa vào loại thông báo
    startTransition(() => {
      if (
        type === "BookingCreated" ||
        type === "BookingReminder" ||
        type === "BookingCompleted" ||
        type === "BookingCancelled"
      ) {
        // Kiểm tra xem hiện tại đang ở Admin hay Customer để nhảy trang đúng
        const isAdmin = window.location.pathname.startsWith("/admin");
        if (isAdmin) {
          router.push("/admin/bookings");
        } else {
          router.push("/customer/history");
        }
      } else if (type === "TierUpgraded") {
        router.push("/customer/profile");
      }
    });
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Nút quả chuông */}
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="relative rounded-lg p-2 text-slate-400 hover:bg-white/10 hover:text-white transition-colors"
        aria-label="Thông báo"
      >
        <Bell size={20} />
        {mounted && unreadCount > 0 && (
          <span className="absolute right-1.5 top-1.5 flex h-2.5 w-2.5">
            <span className="notif-red-dot-ping absolute inline-flex h-full w-full animate-ping rounded-full opacity-75"></span>
            <span className="notif-red-dot relative inline-flex h-2.5 w-2.5 rounded-full"></span>
          </span>
        )}
      </button>

      {/* Bảng thông báo dropdown */}
      {isOpen && (
        <div className="notif-dropdown-panel absolute right-0 mt-2 z-50 w-80 sm:w-96 rounded-xl p-2 shadow-2xl animate-in fade-in-50 slide-in-from-top-1 duration-200">
          <div className="flex items-center justify-between border-b border-slate-100 px-3 py-2">
            <h4 className="notif-dropdown-title text-sm font-bold">Thông báo</h4>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={markAllAsRead}
                className="notif-mark-all-read inline-flex items-center gap-1 text-xs font-semibold"
              >
                <Check size={12} />
                Đánh dấu đã đọc tất cả
              </button>
            )}
          </div>

          <div className="notif-list-container mt-2 max-h-[360px] overflow-y-auto divide-y scrollbar-thin">
            {notifications.length === 0 ? (
              <div className="py-8 text-center text-xs text-slate-400">
                Không có thông báo nào.
              </div>
            ) : (
              notifications.map((item) => {
                const { Icon, colorClass } = getNotificationDetails(item.type, item.message, item.title);
                return (
                  <button
                    key={item.id}
                    onClick={() => handleItemClick(item.id, item.type)}
                    className={cn(
                      "notif-item-button flex w-full items-start gap-3 text-xs transition duration-150",
                      !item.isRead ? "unread" : ""
                    )}
                  >
                    <span
                      className={cn(
                        "notif-icon-wrapper flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border text-sm",
                        colorClass
                      )}
                    >
                      <Icon size={16} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <p className="notif-item-title truncate text-xs font-bold">{item.title}</p>
                        {!item.isRead && (
                          <span className="notif-unread-dot h-1.5 w-1.5 shrink-0 rounded-full" />
                        )}
                      </div>
                      <p className="notif-item-message mt-0.5 text-[11px] leading-relaxed break-words">
                        {item.message}
                      </p>
                      <p className="notif-item-time mt-1 text-[10px]">
                        {getNotificationCategoryName(item.type)} • {formatRelativeTime(item.createdAt)}
                      </p>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
