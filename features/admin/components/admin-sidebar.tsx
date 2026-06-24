"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Users,
  X,
  Award,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

const NAV_ITEMS = [
  { label: "Tổng quan", icon: LayoutDashboard, href: "/admin" },
  { label: "Chi nhánh", icon: Building2, href: "/admin/branches" },
  { label: "Người dùng", icon: Users, href: "/admin/users" },
  { label: "Lịch đặt", icon: CalendarCheck, href: "/admin/bookings" },
  { label: "Cấu hình hệ thống", icon: Settings, href: "/admin/system-config" },
  { label: "Chương trình Loyalty", icon: Award, href: "/admin/loyalty-config" },
  { label: "Báo cáo", icon: BarChart3, href: "/admin/reports" },
];

function clearAuthSession() {
  window.localStorage.removeItem("token");
  window.localStorage.removeItem("role");
  window.localStorage.removeItem("userId");
  window.localStorage.removeItem("email");
  window.dispatchEvent(new Event("autowash-auth"));
}

/**
 * Thành phần (Component) AdminSidebar
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    clearAuthSession();
    router.replace("/sign-in");
  }

  const nav = (
    <nav className="space-y-1" aria-label="Admin navigation">
      {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
        const active = isActive(href);
        return (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-blue-600 text-white"
                : "text-slate-300 hover:bg-white/10 hover:text-white",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon size={17} aria-hidden />
            {label}
          </Link>
        );
      })}
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-white/10 bg-[#050505] px-4 text-white lg:hidden">
        <Link href="/admin" className="text-sm font-black tracking-[0.22em]">
          AUTOWASH <span className="text-blue-500">PRO</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Mở menu quản trị"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      <aside className="sticky top-0 hidden h-screen w-60 shrink-0 border-r border-white/10 bg-[#050505] p-4 text-white lg:flex lg:flex-col">
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/admin">
            <p className="text-sm font-black tracking-[0.24em]">
              AUTOWASH <span className="text-blue-500">PRO</span>
            </p>
            <p className="mt-1 text-xs font-semibold text-slate-400">
              Quản trị hệ thống
            </p>
          </Link>
          <NotificationBell />
        </div>
        <div className="mt-8">{nav}</div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={17} aria-hidden />
          Đăng xuất
        </button>
      </aside>

      {mobileOpen ? (
        <div
          className="fixed inset-0 z-50 bg-black/40 lg:hidden"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      <aside
        className={cn(
          "fixed left-0 top-0 z-50 flex h-full w-60 flex-col border-r border-white/10 bg-[#050505] p-4 text-white shadow-2xl transition-transform lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        aria-label="Admin sidebar"
      >
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/admin" className="text-sm font-black tracking-[0.22em]">
            AUTOWASH <span className="text-blue-500">PRO</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-slate-300 hover:bg-white/10 hover:text-white"
            aria-label="Đóng menu quản trị"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mt-6">{nav}</div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-semibold text-red-400 transition hover:bg-red-500/10 hover:text-red-300"
        >
          <LogOut size={17} aria-hidden />
          Đăng xuất
        </button>
      </aside>
    </>
  );
}
