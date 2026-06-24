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
      <main className="flex min-h-screen items-center justify-center bg-background-outer text-sm font-medium text-slate-500">
        Đang kiểm tra quyền truy cập...
      </main>
    );
  }

  return (
    <NotificationProvider>
      <div className="min-h-screen bg-background-outer text-slate-900 lg:flex">
        <AdminSidebar />
        <div className="min-w-0 flex-1">{children}</div>
      </div>
      <NotificationToaster />
    </NotificationProvider>
  );
}
