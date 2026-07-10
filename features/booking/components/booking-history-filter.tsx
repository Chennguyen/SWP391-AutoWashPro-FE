"use client";

import { RefreshCw, SlidersHorizontal } from "lucide-react";

interface BookingHistoryFilterProps {
  fromDate: string;
  toDate: string;
  loading: boolean;
  token: string;
  onFromDateChange: (date: string) => void;
  onToDateChange: (date: string) => void;
  onRefresh: () => void;
}

/**
 * Component BookingHistoryFilter
 *
 * Chức năng: Hiển thị bộ lọc theo ngày (từ ngày / đến ngày) và nút tải lại dữ liệu.
 * Sử dụng trong trang lịch sử đặt lịch của khách hàng.
 */
export function BookingHistoryFilter({
  fromDate,
  toDate,
  loading,
  token,
  onFromDateChange,
  onToDateChange,
  onRefresh,
}: BookingHistoryFilterProps) {
  return (
    <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <SlidersHorizontal size={16} className="text-slate-400 shrink-0 mt-auto mb-1" aria-hidden />
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Từ ngày
        </label>
        <input
          type="date"
          value={fromDate}
          max={toDate}
          onChange={(e) => onFromDateChange(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <div className="flex flex-col gap-1">
        <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
          Đến ngày
        </label>
        <input
          type="date"
          value={toDate}
          min={fromDate}
          onChange={(e) => onToDateChange(e.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
        />
      </div>
      <button
        onClick={onRefresh}
        disabled={loading || !token}
        className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
      >
        <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
        Tải lại
      </button>
    </div>
  );
}
