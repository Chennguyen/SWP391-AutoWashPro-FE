"use client";

import { useState, useSyncExternalStore } from "react";
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
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
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

function subscribeAuthState(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }

  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function getIsUnverifiedSnapshot() {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem("is_unverified") === "true";
}

function getServerIsUnverifiedSnapshot() {
  return false;
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
  const isUnverified = useSyncExternalStore(
    subscribeAuthState,
    getIsUnverifiedSnapshot,
    getServerIsUnverifiedSnapshot
  );

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
                  <Button
                    key={href}
                    type="button"
                    variant="ghost"
                    className="h-10 gap-2 bg-white/5 px-3 leading-none text-white/50 opacity-40 select-none"
                    disabled
                    title="Tài khoản chưa xác thực FaceID"
                  >
                    <Icon data-icon="inline-start" style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden />
                    <span className="block leading-none">{label}</span>
                    <Lock data-icon="inline-end" className="ml-1 text-white/40" />
                  </Button>
                );
              }

              return (
                <Button
                  key={href}
                  nativeButton={false}
                  render={<Link href={href} />}
                  variant="ghost"
                  className={cn(
                    "h-10 gap-2 px-3 leading-none duration-150",
                    active ? "bg-[#CDB390]" : "hover:bg-white/10"
                  )}
                  style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon
                    data-icon="inline-start"
                    style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.6)" }}
                    aria-hidden
                  />
                  <span className="block leading-none">{label}</span>
                </Button>
              );
            })}
          </nav>

          {/* Right: logout + hamburger */}
          <div className="flex items-center gap-2">
            <NotificationBell />
            <Button
              type="button"
              variant="ghost"
              onClick={handleLogout}
              className="hidden h-10 gap-2 px-3 leading-none text-red-400 duration-150 hover:bg-red-500/10 hover:text-red-300 lg:flex"
              style={{ color: "#f87171" }}
            >
              <LogOut data-icon="inline-start" aria-hidden />
              <span className="block leading-none">Đăng xuất</span>
            </Button>

            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => setMobileOpen(true)}
              className="text-slate-400 hover:bg-white/10 hover:text-white lg:hidden"
              aria-label="Mở menu"
            >
              <Menu aria-hidden />
            </Button>
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
        <div className="flex items-center justify-between px-6 py-5">
          <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase text-white">
            AUTOWASH <span style={{ color: "#CDB390" }}>PRO</span>
          </Link>
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={() => setMobileOpen(false)}
            className="text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Đóng menu"
          >
            <X aria-hidden />
          </Button>
        </div>
        <Separator className="bg-white/10" />

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto px-3 py-4" aria-label="Điều hướng chính">
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
                <Button
                  key={href}
                  type="button"
                  variant="ghost"
                  className="h-10 justify-between gap-3 bg-white/5 px-3 leading-none text-white/50 opacity-40 select-none"
                  disabled
                  title="Tài khoản chưa xác thực FaceID"
                >
                  <span className="flex items-center gap-3 leading-none">
                    <Icon data-icon="inline-start" style={{ color: "rgba(255,255,255,0.4)" }} aria-hidden />
                    <span className="block leading-none">{label}</span>
                  </span>
                  <Lock data-icon="inline-end" className="text-white/40" />
                </Button>
              );
            }

            return (
              <Button
                key={href}
                nativeButton={false}
                render={<Link href={href} />}
                variant="ghost"
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "h-10 justify-start gap-3 px-3 leading-none duration-150",
                  active ? "bg-[#CDB390]" : "hover:bg-white/10"
                )}
                style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.85)" }}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  data-icon="inline-start"
                  style={{ color: active ? "#ffffff" : "rgba(255,255,255,0.6)" }}
                  aria-hidden
                />
                <span className="block leading-none">{label}</span>
              </Button>
            );
          })}
        </nav>

        <Separator className="bg-white/10" />
        <div className="px-3 py-4">
          <Button
            type="button"
            variant="ghost"
            onClick={() => { setMobileOpen(false); handleLogout(); }}
            className="h-10 w-full justify-start gap-3 px-3 leading-none text-red-400 duration-150 hover:bg-red-500/10 hover:text-red-300"
          >
            <LogOut data-icon="inline-start" aria-hidden />
            <span className="block leading-none">Đăng xuất</span>
          </Button>
        </div>
      </aside>
    </>
  );
}
