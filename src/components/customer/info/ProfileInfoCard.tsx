// Server Component — static profile display, read-only.
// When real auth is available, receive user data as props from the page.
//
// TODO: Update button below is UI-only.
// Implement edit functionality when PATCH /users/me endpoint is available.

import { User, Mail, Phone, Pencil } from "lucide-react";

interface ProfileInfoCardProps {
  name: string;
  email: string;
  phone?: string;
  membershipTier?: string;
  points?: number;
}

const TIER_COLORS: Record<string, string> = {
  BRONZE: "bg-amber-700/20 text-amber-600 border-amber-700/30",
  SILVER: "bg-slate-400/20 text-slate-400 border-slate-400/30",
  GOLD:   "bg-yellow-500/20 text-yellow-500 border-yellow-500/30",
  DIAMOND:"bg-cyan-400/20 text-cyan-400 border-cyan-400/30",
};

/**
 * Thành phần (Component) ProfileInfoCard
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function ProfileInfoCard({
  name,
  email,
  phone,
  membershipTier = "BRONZE",
  points = 0,
}: ProfileInfoCardProps) {
  const tierColor = TIER_COLORS[membershipTier] ?? TIER_COLORS["BRONZE"];
  const initial = name.charAt(0).toUpperCase();

  return (
    <section
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      aria-label="Thông tin cá nhân"
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <User size={16} className="text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-700">Thông tin cá nhân</h2>
        </div>

        {/* TODO: Wire up edit action when PATCH /users/me is available */}
        <button
          type="button"
          disabled
          title="Chức năng đang phát triển"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-400 border border-slate-200 cursor-not-allowed select-none"
          aria-label="Chỉnh sửa thông tin cá nhân (chưa khả dụng)"
        >
          <Pencil size={12} aria-hidden />
          Chỉnh sửa
        </button>
      </div>

      {/* Card body */}
      <div className="p-6 flex flex-col sm:flex-row gap-6 items-start">
        {/* Avatar */}
        <div
          className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center text-white text-2xl font-bold shrink-0 select-none"
          aria-hidden
        >
          {initial}
        </div>

        {/* Info fields */}
        <div className="flex-1 min-w-0 space-y-3">
          {/* Name + tier */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-xl font-bold text-slate-900">{name}</p>
            <span
              className={`text-[11px] font-semibold tracking-widest uppercase px-2.5 py-0.5 rounded-full border ${tierColor}`}
            >
              {membershipTier}
            </span>
          </div>

          {/* Email */}
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Mail size={14} className="text-slate-300 shrink-0" aria-hidden />
            <span>{email}</span>
          </div>

          {/* Phone */}
          {phone && (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Phone size={14} className="text-slate-300 shrink-0" aria-hidden />
              <span>{phone}</span>
            </div>
          )}
        </div>

        {/* Points */}
        <div className="shrink-0 text-center sm:text-right sm:pl-6 sm:border-l sm:border-slate-100">
          <div className="text-3xl font-extrabold text-slate-900 tabular-nums">
            {points.toLocaleString("vi-VN")}
          </div>
          <div className="text-xs font-semibold tracking-widest uppercase text-slate-400 mt-0.5">
            Điểm thưởng
          </div>
        </div>
      </div>
    </section>
  );
}
