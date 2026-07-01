"use client";

import { useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  LayoutDashboard,
  CalendarPlus,
  History,
  Info,
  Menu,
  X,
  LogOut,
  Clock,
  Lock,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { NotificationBell } from "@/features/notifications/components/notification-bell";

const NAV_ITEMS = [
  { label: "Trang chủ",         icon: LayoutDashboard, href: "/customer" },
  { label: "Thông tin cá nhân", icon: Info,             href: "/customer/profile" },
  { label: "Đặt lịch",          icon: CalendarPlus,    href: "/customer/booking" },
  { label: "Lịch đang hoạt động", icon: Clock,          href: "/customer/history?tab=active" },
  { label: "Lịch sử rửa xe",    icon: History,         href: "/customer/history?tab=history" },
];

/**
 * Remove every auth key from localStorage then notify all useSyncExternalStore
 * subscribers listening on the "autowash-auth" custom event.
 */
function clearAuthSession() {
  ["token", "role", "userId", "email", "firstName", "lastName"].forEach((k) =>
    window.localStorage.removeItem(k)
  );
  window.dispatchEvent(new Event("autowash-auth"));
}

/**
 * Thành phần (Component) DashboardSidebar
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab") || "active";
  const [isUnverified, setIsUnverified] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsUnverified(window.localStorage.getItem("is_unverified") === "true");
    }
  }, []);

  function handleLogout() {
    clearAuthSession();
    // router.refresh() invalidates Next.js Router Cache so the next user
    // always gets a fresh React tree, not a cached version of the previous session.
    router.refresh();
    router.replace("/sign-in");
  }

  return (
    <>
      {/* ── TOP NAV BAR ── */}
      <header className="sticky top-0 z-40 w-full bg-[#050505] border-b border-white/10 shadow-sm">
        <div className="flex items-center justify-between px-4 md:px-6 h-14">
          {/* Brand */}
          <Link
            href="/"
            className="text-sm font-bold tracking-[0.2em] uppercase shrink-0"
            style={{ color: "#ffffff" }}
          >
            AUTOWASH <span style={{ color: "#CDB390" }}>PRO</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1" aria-label="Điều hướng chính">
            {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
              let active = false;
              if (href.includes("?")) {
                const [path, query] = href.split("?");
                const tabValue = new URLSearchParams(query).get("tab");
                active = pathname === path && currentTab === tabValue;
              } else {
                active =
                  href === "/customer"
                    ? pathname === "/customer"
                    : pathname === href || pathname.startsWith(href + "/");
              }

              const isLocked = isUnverified && (href.startsWith("/customer/booking") || href.startsWith("/customer/history"));
              if (isLocked) {
                return (
                  <div
                    key={href}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none bg-white/5 text-white/50"
                    title="Tài khoản chưa xác thực FaceID"
                  >
                    <Icon size={15} style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden />
                    <span>{label}</span>
                    <Lock size={12} className="ml-1 text-white/40" />
                  </div>
                );
              }

              return (
                <Link
                  key={href}
                  href={href}
                  className={cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-150",
                    active ? "bg-[#CDB390]" : "hover:bg-white/10"
                  )}
                  style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    size={15}
                    style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.6)" }}
                    aria-hidden
                  />
                  {label}
                </Link>
              );
            })}
          </nav>

          {/* Right: logout + hamburger */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <button
              type="button"
              onClick={handleLogout}
              className="hidden lg:flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium hover:bg-red-500/10 transition-all duration-150"
              style={{ color: "#f87171" }}
            >
              <LogOut size={15} aria-hidden />
              Đăng xuất
            </button>

            <button
              onClick={() => setMobileOpen(true)}
              className="lg:hidden p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              aria-label="Mở menu"
            >
              <Menu size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* ── MOBILE OVERLAY ── */}
      {mobileOpen ? (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      ) : null}

      {/* ── MOBILE DRAWER ── */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#050505] border-r border-white/10 shadow-xl transition-transform duration-300 flex flex-col",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase text-white">
            AUTOWASH <span style={{ color: "#CDB390" }}>PRO</span>
          </Link>
          <button
            onClick={() => setMobileOpen(false)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto" aria-label="Điều hướng chính">
          {NAV_ITEMS.map(({ label, icon: Icon, href }) => {
            let active = false;
            if (href.includes("?")) {
              const [path, query] = href.split("?");
              const tabValue = new URLSearchParams(query).get("tab");
              active = pathname === path && currentTab === tabValue;
            } else {
              active =
                href === "/customer"
                  ? pathname === "/customer"
                  : pathname === href || pathname.startsWith(href + "/");
            }

            const isLocked = isUnverified && (href.startsWith("/customer/booking") || href.startsWith("/customer/history"));
            if (isLocked) {
              return (
                <div
                  key={href}
                  className="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium opacity-40 cursor-not-allowed select-none bg-white/5 text-white/50"
                  title="Tài khoản chưa xác thực FaceID"
                >
                  <span className="flex items-center gap-3">
                    <Icon size={16} style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden />
                    {label}
                  </span>
                  <Lock size={13} className="text-white/40" />
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
                  active ? "bg-[#CDB390]" : "hover:bg-white/10"
                )}
                style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  size={16}
                  style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.6)" }}
                  aria-hidden
                />
                {label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-4 border-t border-white/10">
          <button
            type="button"
            onClick={() => { setMobileOpen(false); handleLogout(); }}
            className="flex w-full items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all duration-150"
          >
            <LogOut size={16} aria-hidden />
            Đăng xuất
          </button>
        </div>
      </aside>
    </>
  );
}
