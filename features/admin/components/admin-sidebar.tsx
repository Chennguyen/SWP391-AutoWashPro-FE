"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
  WalletCards,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/features/notifications/components/notification-bell";
import { useLogoutMutation } from "@/features/auth/hooks/useLogout";

const NAV_GROUPS = [
  {
    label: "Tổng quan",
    items: [{ label: "Tổng quan", icon: LayoutDashboard, href: "/admin" }],
  },
  {
    label: "Vận hành",
    items: [
      { label: "Chi nhánh", icon: Building2, href: "/admin/branches" },
      { label: "Lịch đặt", icon: CalendarCheck, href: "/admin/bookings" },
    ],
  },
  {
    label: "Khách hàng",
    items: [{ label: "Người dùng", icon: Users, href: "/admin/users" }],
  },
  {
    label: "Tăng trưởng",
    items: [
      { label: "Chương trình Loyalty", icon: Award, href: "/admin/loyalty-config" },
      { label: "Doanh thu", icon: WalletCards, href: "/admin/revenue" },
    ],
  },
  {
    label: "Hệ thống",
    items: [
      { label: "Cấu hình hệ thống", icon: Settings, href: "/admin/system-config" },
      { label: "Báo cáo", icon: BarChart3, href: "/admin/reports" },
    ],
  },
];

/**
 * Thành phần (Component) AdminSidebar
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const logoutMutation = useLogoutMutation();

  function isActive(href: string) {
    if (href === "/admin") return pathname === "/admin";
    return pathname === href || pathname.startsWith(`${href}/`);
  }

  function handleLogout() {
    logoutMutation.mutate();
  }

  const nav = (
    <nav className="flex flex-col gap-5" aria-label="Điều hướng quản trị">
      {NAV_GROUPS.map((group) => (
        <section key={group.label} className="flex flex-col gap-1.5" aria-label={group.label}>
          <p
            className="px-3 text-[0.65rem] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
          >
            {group.label}
          </p>
          <div className="flex flex-col gap-1">
            {group.items.map(({ label, icon: Icon, href }) => {
              const active = isActive(href);
              return (
                <Link
                  key={href}
                  href={href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-l-2 border-transparent px-3 py-2 text-sm font-medium text-sidebar-foreground/75 transition-colors duration-200 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60",
                    active && "border-sidebar-primary bg-sidebar-accent text-sidebar-accent-foreground",
                  )}
                  aria-current={active ? "page" : undefined}
                  data-active={active ? "true" : "false"}
                >
                  <Icon size={17} strokeWidth={1.8} aria-hidden />
                  <span>{label}</span>
                </Link>
              );
            })}
          </div>
        </section>
      ))}
    </nav>
  );

  return (
    <>
      <header className="sticky top-0 z-40 flex h-14 items-center justify-between border-b border-sidebar-border bg-sidebar px-4 text-sidebar-foreground lg:hidden">
        <Link href="/admin" className="admin-brand-wordmark text-sm font-black tracking-[0.22em]">
          AUTOWASH <span className="text-primary">PRO</span>
        </Link>
        <div className="flex items-center gap-2">
          <NotificationBell />
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="rounded-lg p-2 text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
            aria-label="Mở menu quản trị"
          >
            <Menu size={20} aria-hidden />
          </button>
        </div>
      </header>

      <aside
        data-admin-sidebar
        className="sticky top-0 hidden h-dvh w-[248px] shrink-0 border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground lg:flex lg:flex-col"
      >
        <div className="flex items-center justify-between px-2 py-2">
          <Link href="/admin" className="admin-brand-wordmark">
            <p className="text-sm font-black tracking-[0.24em] text-sidebar-foreground">
              AUTOWASH <span className="text-primary">PRO</span>
            </p>
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Quản trị hệ thống
            </p>
          </Link>
          <NotificationBell align="start" />
        </div>
        <div className="mt-7 min-h-0 flex-1 overflow-y-auto pb-4">{nav}</div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:pointer-events-none disabled:opacity-50"
        >
          <LogOut size={17} strokeWidth={1.8} aria-hidden />
          {logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
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
          "fixed left-0 top-0 z-50 flex h-full w-[248px] flex-col border-r border-sidebar-border bg-sidebar px-3 py-4 text-sidebar-foreground shadow-2xl transition-transform duration-200 lg:hidden",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
        )}
        data-admin-sidebar
        aria-label="Admin sidebar"
      >
        <div className="flex items-center justify-between px-2 py-3">
          <Link href="/admin" className="admin-brand-wordmark text-sm font-black tracking-[0.22em]">
            AUTOWASH <span className="text-primary">PRO</span>
          </Link>
          <button
            type="button"
            onClick={() => setMobileOpen(false)}
            className="rounded-lg p-2 text-sidebar-foreground/75 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring/60"
            aria-label="Đóng menu quản trị"
          >
            <X size={18} aria-hidden />
          </button>
        </div>
        <div className="mt-5 min-h-0 flex-1 overflow-y-auto pb-4">{nav}</div>
        <button
          type="button"
          onClick={handleLogout}
          disabled={logoutMutation.isPending}
          className="mt-auto flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-destructive/40 disabled:pointer-events-none disabled:opacity-50"
        >
          <LogOut size={17} strokeWidth={1.8} aria-hidden />
          {logoutMutation.isPending ? "Đang đăng xuất..." : "Đăng xuất"}
        </button>
      </aside>
    </>
  );
}
