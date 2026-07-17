"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/features/admin/components/admin-sidebar";
import { NotificationProvider } from "@/features/notifications/context";
import { NotificationToaster } from "@/features/notifications/components/notification-toaster";

function getStoredRole() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("role") ?? "";
}

/**
 * Bố cục (Layout) AdminLayout
 * 
 * Chức năng: Định nghĩa khung bố cục chung (Layout Template) cho hệ thống AutoWash Pro.
 * Vai trò: Quản lý cấu trúc bao bọc giao diện chung cho các trang con.
 */
export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const role = getStoredRole();

      if (!role) {
        router.replace("/sign-in");
        return;
      }

      if (role.toLowerCase() !== "admin") {
        router.replace("/customer");
        return;
      }

      setAuthorized(true);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [router]);

  if (!authorized) {
    return (
      <main className="admin-app-shell admin-brand-surface flex min-h-dvh items-center justify-center bg-background-outer text-sm font-medium text-muted-foreground">
        Đang kiểm tra quyền truy cập...
      </main>
    );
  }

  return (
    <NotificationProvider>
      <div className="admin-app-shell admin-brand-surface min-h-dvh bg-background-outer text-foreground lg:flex">
        <a
          href="#admin-main"
          className="sr-only rounded-md bg-primary px-3 py-2 text-primary-foreground focus:not-sr-only focus:fixed focus:left-3 focus:top-3"
        >
          Đi đến nội dung chính
        </a>
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <NotificationToaster />
    </NotificationProvider>
  );
}
