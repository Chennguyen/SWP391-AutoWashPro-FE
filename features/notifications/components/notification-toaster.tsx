"use client";

import {
  X,
  CalendarPlus,
  Clock,
  Ban,
  CheckCircle2,
  Award,
  Gift,
  ShieldCheck,
  ShieldAlert,
  Info,
} from "lucide-react";
import { useNotifications } from "@/features/notifications/context";
import { cn } from "@/lib/utils";
import type { NotificationType, NotificationItem } from "@/features/notifications/services";
import { getNotificationDetails } from "./notification-bell";

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

function ToastCard({ item, onDismiss }: { item: NotificationItem; onDismiss: (id: string) => void }) {
  const { Icon, colorClass } = getNotificationDetails(item.type, item.message, item.title);

  return (
    <article
      className={cn(
        "notif-toast-card flex w-full items-start gap-3 shadow-xl backdrop-blur-md",
        "animate-in slide-in-from-right-10 fade-in-50 duration-300"
      )}
      role="alert"
    >
      <span
        className={cn(
          "notif-icon-wrapper flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border text-sm",
          colorClass
        )}
      >
        <Icon size={18} />
      </span>

      <div className="min-w-0 flex-1">
        <h5 className="notif-toast-title text-xs font-black">{item.title}</h5>
        <p className="notif-toast-message mt-1 text-[11px] leading-relaxed break-words">{item.message}</p>
      </div>

      <button
        type="button"
        onClick={() => onDismiss(item.id)}
        className="notif-toast-close rounded-lg p-1 transition-colors shrink-0"
        aria-label="Đóng"
      >
        <X size={14} />
      </button>
    </article>
  );
}

export function NotificationToaster() {
  const { toasts, dismissToast } = useNotifications();

  if (toasts.length === 0) return null;

  return (
    <div
      className="notif-toast-container fixed bottom-4 right-4 z-[99] flex flex-col gap-2 max-w-sm w-[calc(100%-2rem)]"
      aria-live="assertive"
      aria-label="Thông báo nổi"
    >
      {toasts.map((toast) => (
        <ToastCard key={toast.id} item={toast} onDismiss={dismissToast} />
      ))}
    </div>
  );
}
