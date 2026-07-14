"use client";

import { CircleAlert, X } from "lucide-react";
import { useNotifications } from "../hooks/useNotifications";
import { cn } from "@/lib/utils";
import type { NotificationItem } from "@/features/notifications/services";
import { getNotificationDetails } from "./notification-bell";

function ToastCard({ item, onDismiss }: { item: NotificationItem; onDismiss: (id: string) => void }) {
  const details = getNotificationDetails(item.type, item.message, item.title);
  const isError = item.tone === "error";
  const Icon = isError ? CircleAlert : details.Icon;
  const colorClass = isError
    ? "text-red-500 bg-red-50 border-red-100"
    : details.colorClass;

  return (
    <article
      data-tone={isError ? "error" : "default"}
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
