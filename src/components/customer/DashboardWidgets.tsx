"use client";

import { useState, useEffect } from "react";
import {
  Star,
  AlertTriangle,
  CalendarDays,
  Car,
  CheckCircle2,
  ArrowRight,
  CalendarPlus,
  Gift,
  History,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import Link from "next/link";
import { getVehicles } from "@/lib/api/vehicle";

// ─── Mock Data ────────────────────────────────────────────────────────────────
const CUSTOMER = {
  name: "John",
  email: "john@autowash.pro",
  avatar: "JD",
  tier: "Platinum Member",
  points: 12450,
  progress: 83,
  milestone: 15000,
  expiringPoints: 450,
  expiringDays: 30,
};

const UPCOMING_BOOKING = {
  service: "Ultimate Detail Package",
  date: "24 tháng 10, 2026",
  time: "10:30 SA",
  vehicle: "59X1-123.45",
  status: "Đã xác nhận",
};

const REWARDS = [
  { name: "Hút bụi nội thất miễn phí", points: 2500 },
  { name: "Giảm $10 lần rửa tiếp theo", points: 5000 },
  { name: "Nâng cấp đánh bóng cao cấp", points: 8000 },
];

const WASH_HISTORY = [
  {
    date: "12/10/2026",
    service: "Platinum Detail",
    vehicle: "59X1-123.45",
    price: "$129.99",
    pts: "+258 pts",
  },
  {
    date: "28/09/2026",
    service: "Basic Wash",
    vehicle: "59X1-123.45",
    price: "$29.99",
    pts: "+60 pts",
  },
  {
    date: "10/09/2026",
    service: "Exterior Wash",
    vehicle: "59X1-123.45",
    price: "$19.99",
    pts: "+40 pts",
  },
];

const VEHICLE = {
  name: "Honda Civic 2022",
  plate: "59X1-123.45",
  lastWash: "12/10/2026",
  nextWash: "Còn 10 ngày",
};

const QUICK_ACTIONS = [
  { label: "Đặt lịch", icon: CalendarPlus, href: "/customer/booking" },
  { label: "Đổi điểm", icon: Gift, href: "/customer/info?tab=loyalty" },
  { label: "Lịch sử", icon: History, href: "/customer/history" },
  { label: "Xe của tôi", icon: Car, href: "/customer/info?tab=vehicles" },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

export function DashboardHeader() {
  const [name, setName] = useState(CUSTOMER.name);
  const [showVehicleNotice, setShowVehicleNotice] = useState(false);

  useEffect(() => {
    function updateName() {
      const email = window.localStorage.getItem("email");
      if (email) {
        const username = email.split("@")[0];
        const capitalized = username.charAt(0).toUpperCase() + username.slice(1);
        setName(capitalized);
      } else {
        setName(CUSTOMER.name);
      }
    }

    // Initial check
    updateName();

    // Listen for auth changes
    window.addEventListener("autowash-auth", updateName);
    return () => window.removeEventListener("autowash-auth", updateName);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function updateVehicleNotice() {
      const rawToken = window.localStorage.getItem("token") ?? "";
      const token = rawToken.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();

      if (!token) {
        if (!cancelled) setShowVehicleNotice(false);
        return;
      }

      try {
        const vehicles = await getVehicles(token, 1, 1);
        if (!cancelled) setShowVehicleNotice(vehicles.length === 0);
      } catch {
        if (!cancelled) setShowVehicleNotice(false);
      }
    }

    void updateVehicleNotice();

    window.addEventListener("autowash-auth", updateVehicleNotice);
    return () => {
      cancelled = true;
      window.removeEventListener("autowash-auth", updateVehicleNotice);
    };
  }, []);

  return (
    <header className="mb-8">
      {showVehicleNotice ? (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-800">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
          <span className="text-amber-800">
            bạn nên đăng ký xe tại mục tài khoản cá nhân trước khi đặt lịch
          </span>
        </div>
      ) : null}
      <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
        Chào mừng trở lại, <span className="text-[#2563EB]">{name}</span>
      </h1>
      <p className="text-sm text-slate-500 mt-0.5">
        Đây là tổng quan chăm sóc xe của bạn.
      </p>
    </header>
  );
}

export function MembershipPanel() {
  const [info, setInfo] = useState<{
    tier: string;
    points: number;
    progress: number;
    milestone: number | null;
    nextTierName: string | null;
    discountPercent?: number;
    prioritySlot?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const raw = window.localStorage.getItem("token") ?? "";
      const token = raw.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
      if (!token) { setLoading(false); return; }
      try {
        const { getLoyaltyInfo } = await import("@/lib/api/loyalty");
        const data = await getLoyaltyInfo(token);
        const nextWashes = data.nextTierRequiredWashes;
        const progress =
          nextWashes && nextWashes > 0
            ? Math.min(100, Math.round((data.totalWashes / nextWashes) * 100))
            : 100;
        setInfo({
          tier: data.tier?.name ?? "Member",
          points: data.points,
          progress,
          milestone: nextWashes,
          nextTierName: data.nextTierName,
          discountPercent: data.tier?.benefits?.discountPercent,
          prioritySlot: data.tier?.benefits?.prioritySlotBooking,
        });
      } catch {
        // silent — widget không crash nếu API lỗi
      } finally {
        setLoading(false);
      }
    }
    void load();

    function onAuth() { setLoading(true); setInfo(null); void load(); }
    window.addEventListener("autowash-auth", onAuth);
    return () => window.removeEventListener("autowash-auth", onAuth);
  }, []);

  return (
    <section
      className="bg-slate-900 rounded-2xl p-6 text-white col-span-2"
      aria-label="Hạng thành viên"
    >
      {/* Top row */}
      <div className="flex flex-wrap items-start justify-between gap-4 mb-5">
        <div>
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
            Hạng hiện tại
          </p>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-bold text-white">
              {loading ? (
                <span className="inline-block h-7 w-32 animate-pulse rounded bg-slate-700" />
              ) : (
                info?.tier ?? "Member"
              )}
            </h2>
            <Sparkles size={18} className="text-yellow-400" />
          </div>
        </div>
        <div className="text-right">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
            Điểm hiện có
          </p>
          {loading ? (
            <span className="inline-block h-9 w-24 animate-pulse rounded bg-slate-700" />
          ) : (
            <p className="text-3xl font-bold text-white">
              {(info?.points ?? 0).toLocaleString("vi-VN")}
              <span className="text-base font-normal text-slate-400 ml-1">điểm</span>
            </p>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {!loading && info?.nextTierName && (
        <div className="mb-2">
          <div className="flex justify-between text-xs text-slate-400 mb-2">
            <span>Tiến trình đến {info.nextTierName} ({(info.milestone ?? 0).toLocaleString("vi-VN")} lần rửa)</span>
            <span className="font-semibold text-white">{info.progress}%</span>
          </div>
          <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#2563EB] to-[#3B82F6] rounded-full transition-all duration-500"
              style={{ width: `${info.progress}%` }}
              role="progressbar"
              aria-valuenow={info.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>
      )}

      {/* Tier benefits */}
      <div className="mt-5 pt-5 border-t border-slate-700">
        <p className="text-xs font-semibold tracking-widest uppercase text-slate-500 mb-3">
          Quyền lợi của bạn
        </p>
        <div className="flex flex-wrap gap-2">
          {loading ? (
            [1, 2].map((i) => (
              <span key={i} className="inline-block h-6 w-28 animate-pulse rounded-full bg-slate-700" />
            ))
          ) : (
            <>
              {info?.discountPercent ? (
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
                  Giảm {info.discountPercent}% mỗi lần rửa
                </span>
              ) : null}
              {info?.prioritySlot ? (
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
                  Ưu tiên đặt slot cao điểm
                </span>
              ) : null}
              {!info?.discountPercent && !info?.prioritySlot && (
                <span className="px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-medium text-slate-300">
                  Tích điểm mỗi lần rửa xe
                </span>
              )}
            </>
          )}
        </div>
        <Link
          href="/customer/info?tab=loyalty"
          className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-blue-400 hover:text-blue-300 transition"
        >
          Xem điểm & đổi thưởng <ChevronRight size={13} />
        </Link>
      </div>
    </section>
  );
}


export function UpcomingBookingPanel() {
  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-6 flex flex-col"
      aria-label="Lịch đặt sắp tới"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Lịch đặt sắp tới</h2>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold border border-emerald-200">
          <CheckCircle2 size={11} />
          {UPCOMING_BOOKING.status}
        </span>
      </div>

      <h3 className="text-base font-bold text-slate-900 mb-4">
        {UPCOMING_BOOKING.service}
      </h3>

      <div className="space-y-2.5 flex-1">
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <CalendarDays size={14} className="text-slate-400 shrink-0" />
          <span>
            {UPCOMING_BOOKING.date} lúc {UPCOMING_BOOKING.time}
          </span>
        </div>
        <div className="flex items-center gap-2.5 text-sm text-slate-600">
          <Car size={14} className="text-slate-400 shrink-0" />
          <span>{UPCOMING_BOOKING.vehicle}</span>
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-2">
        <button className="w-full py-2.5 px-4 rounded-xl bg-[#2563EB] text-white text-sm font-semibold hover:bg-[#1D4ED8] transition-colors">
          Xem chi tiết
        </button>
        <button className="w-full py-2.5 px-4 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">
          Đổi lịch
        </button>
      </div>
    </section>
  );
}

export function QuickActions() {
  return (
    <section aria-label="Thao tác nhanh">
      <h2 className="text-sm font-semibold text-slate-900 mb-3">Thao tác nhanh</h2>
      <div className="grid grid-cols-4 gap-3">
        {QUICK_ACTIONS.map(({ label, icon: Icon, href }) => (
          <Link
            key={label}
            href={href}
            className="flex flex-col items-center gap-2.5 py-4 px-2 bg-white rounded-xl border border-slate-200 text-slate-700 hover:border-[#2563EB]/30 hover:bg-[#EFF6FF] hover:text-[#2563EB] transition-all duration-150 group"
          >
            <div className="w-9 h-9 rounded-xl bg-slate-100 group-hover:bg-[#DBEAFE] flex items-center justify-center transition-colors">
              <Icon size={16} className="text-slate-500 group-hover:text-[#2563EB] transition-colors" />
            </div>
            <span className="text-xs font-medium text-center leading-tight">{label}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function RewardsSection() {
  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-6"
      aria-label="Phần thưởng hiện có"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Phần thưởng hiện có</h2>
        <Star size={15} className="text-amber-400" />
      </div>
      <div className="space-y-3">
        {REWARDS.map(({ name, points }) => (
          <div
            key={name}
            className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0"
          >
            <div>
              <p className="text-sm font-medium text-slate-800">{name}</p>
              <p className="text-xs text-[#2563EB] font-medium mt-0.5">
                {points.toLocaleString()} điểm
              </p>
            </div>
            <button className="shrink-0 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-[#EFF6FF] hover:border-[#2563EB]/30 hover:text-[#2563EB] transition-all duration-150">
              Đổi thưởng
            </button>
          </div>
        ))}
      </div>
    </section>
  );
}

export function WashHistoryTable() {
  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-6"
      aria-label="Lịch sử rửa xe gần đây"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Lịch sử rửa xe</h2>
        <Link
          href="/customer/history"
          className="flex items-center gap-1 text-xs font-semibold text-[#2563EB] hover:underline"
        >
          Xem tất cả
          <ChevronRight size={13} />
        </Link>
      </div>
      {/* Table wrapper for horizontal scroll on small screens */}
      <div className="overflow-x-auto -mx-1">
        <table className="w-full text-sm min-w-[460px]">
          <thead>
            <tr className="text-left border-b border-slate-100">
              {["Ngày", "Dịch vụ", "Xe", "Giá", "Điểm"].map((col) => (
                <th
                  key={col}
                  className="pb-2.5 pr-4 text-xs font-semibold uppercase tracking-wide text-slate-400 whitespace-nowrap"
                >
                  {col}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {WASH_HISTORY.map((row) => (
              <tr key={row.date + row.service} className="hover:bg-slate-50/60 transition-colors">
                <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">{row.date}</td>
                <td className="py-3 pr-4 font-medium text-slate-800 whitespace-nowrap">{row.service}</td>
                <td className="py-3 pr-4 text-slate-500 whitespace-nowrap text-xs">{row.vehicle}</td>
                <td className="py-3 pr-4 text-slate-700 font-medium whitespace-nowrap">{row.price}</td>
                <td className="py-3 font-semibold text-emerald-600 whitespace-nowrap">{row.pts}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export function VehicleSummary() {
  return (
    <section
      className="bg-white rounded-2xl border border-slate-200 p-6"
      aria-label="Tóm tắt xe"
    >
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-slate-900">Xe chính</h2>
        <Link
          href="/customer/info?tab=vehicles"
          className="flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#2563EB] transition-colors"
        >
          Quản lý <ArrowRight size={12} />
        </Link>
      </div>

      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
          <Car size={22} className="text-slate-500" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 truncate">{VEHICLE.name}</p>
          <p className="text-xs text-slate-500 font-mono mt-0.5">{VEHICLE.plate}</p>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Lần rửa cuối</p>
          <p className="text-sm font-semibold text-slate-700">{VEHICLE.lastWash}</p>
        </div>
        <div>
          <p className="text-xs text-slate-400 mb-0.5">Rửa tiếp theo</p>
          <p className="text-sm font-semibold text-amber-600">{VEHICLE.nextWash}</p>
        </div>
      </div>
    </section>
  );
}
