"use client";

import { useState } from "react";
import {
  LayoutDashboard,
  CalendarPlus,
  CalendarCheck,
  Star,
  History,
  Car,
  User,
  LogOut,
  Menu,
  X,
} from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";

const NAV_ITEMS = [
  { label: "Dashboard", icon: LayoutDashboard, href: "/customer", active: true },
  { label: "Đặt lịch", icon: CalendarPlus, href: "/customer/book" },
  { label: "Lịch đặt của tôi", icon: CalendarCheck, href: "/customer/bookings" },
  { label: "Điểm thưởng", icon: Star, href: "/customer/loyalty" },
  { label: "Lịch sử rửa xe", icon: History, href: "/customer/history" },
  { label: "Xe của tôi", icon: Car, href: "/customer/vehicles" },
  { label: "Hồ sơ", icon: User, href: "/customer/profile" },
];

interface SidebarContentProps {
  onClose?: () => void;
}

function SidebarContent({ onClose }: SidebarContentProps) {
  return (
    <div className="flex flex-col h-full text-slate-300" style={{ color: '#cbd5e1' }}>
      {/* Brand */}
      <div className="flex items-center justify-between px-6 py-5 border-b border-white/10">
        <Link href="/" className="text-sm font-bold tracking-[0.2em] uppercase" style={{ color: '#ffffff' }}>
          AUTOWASH <span className="text-[#2563EB]" style={{ color: '#2563EB' }}>PRO</span>
        </Link>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors lg:hidden"
            aria-label="Đóng menu"
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5" aria-label="Điều hướng chính">
        {NAV_ITEMS.map(({ label, icon: Icon, href, active }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150",
              active
                ? "bg-[#2563EB]"
                : "hover:bg-white/5"
            )}
            style={{ color: active ? '#ffffff' : '#94a3b8' }}
          >
            <Icon
              size={16}
              style={{ color: active ? '#ffffff' : '#64748b' }}
            />
            {label}
          </Link>
        ))}
      </nav>
    </div>
  );
}

export function DashboardSidebar() {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile toggle button */}
      <button
        onClick={() => setMobileOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white border border-slate-200 shadow-sm text-slate-700 hover:bg-slate-50 transition-colors"
        aria-label="Mở menu"
      >
        <Menu size={20} />
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="lg:hidden fixed inset-0 z-40 bg-black/30 backdrop-blur-sm"
          onClick={() => setMobileOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={cn(
          "lg:hidden fixed top-0 left-0 z-50 h-full w-64 bg-[#050505] border-r border-white/10 shadow-xl transition-transform duration-300",
          mobileOpen ? "translate-x-0" : "-translate-x-full"
        )}
        aria-label="Sidebar"
      >
        <SidebarContent onClose={() => setMobileOpen(false)} />
      </aside>

      {/* Desktop sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-56 xl:w-60 shrink-0 bg-[#050505] border-r border-white/10 min-h-screen sticky top-0">
        <SidebarContent />
      </aside>
    </>
  );
}
