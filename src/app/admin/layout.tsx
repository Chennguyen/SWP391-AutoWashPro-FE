"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AdminSidebar } from "@/components/admin/AdminSidebar";

function getStoredRole() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("role") ?? "";
}

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      const role = getStoredRole();

      if (!role) {
        router.replace("/auth/login");
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
      <main className="flex min-h-screen items-center justify-center bg-slate-50 text-sm font-medium text-slate-500">
        Đang kiểm tra quyền truy cập...
      </main>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 lg:flex">
      <AdminSidebar />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
