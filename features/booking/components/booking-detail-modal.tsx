"use client";

import { X, CalendarDays, Car, MapPin, Clock, Tag, Hash, AlertCircle } from "lucide-react";
import type { CustomerBooking } from "@/features/booking/booking-types";
import {
  formatDateOnly,
  formatTimeRange,
  statusStyle,
  isCancelledStatus,
  isCompletedStatus,
  minutesUntilBooking,
} from "@/features/booking/utils";

interface BookingDetailModalProps {
  booking: CustomerBooking;
  onClose: () => void;
  onRequestCancel: (booking: CustomerBooking) => void;
}

/** Booking nằm trong vòng 24h kể từ thời điểm hiện tại → còn cho phép hủy theo rule backend */
function canCancelBooking(booking: CustomerBooking): boolean {
  if (isCancelledStatus(booking.status)) return false;
  if (isCompletedStatus(booking.status)) return false;
  const statusLower = booking.status.trim().toLowerCase().replace(/[\s_-]+/g, "");
  if (statusLower === "inprogress" || statusLower.includes("progress")) return false;
  const minutes = minutesUntilBooking(booking);
  // Backend chỉ cho hủy khi booking trong ngày (< 1440 phút = 24h),
  // và phải còn thời gian (> 0 phút, chưa qua giờ hẹn)
  if (minutes === null) return false;
  return minutes > 0 && minutes <= 1440;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Thành phần (Component) BookingDetailModal
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function BookingDetailModal({
  booking,
  onClose,
  onRequestCancel,
}: BookingDetailModalProps) {
  const canCancel = canCancelBooking(booking);
  const statusLower = booking.status.trim().toLowerCase().replace(/[\s_-]+/g, "");
  const isInProgress = statusLower === "inprogress" || statusLower.includes("progress");

  const rows = [
    { icon: MapPin, label: "Chi nhánh", value: booking.branchName },
    booking.branchAddress
      ? { icon: MapPin, label: "Địa chỉ", value: booking.branchAddress }
      : null,
    { icon: Car, label: "Biển số xe", value: booking.vehicleLicensePlate || "—" },
    { icon: CalendarDays, label: "Ngày", value: formatDateOnly(booking) },
    { icon: Clock, label: "Giờ", value: formatTimeRange(booking) },
    booking.serviceName
      ? { icon: Tag, label: "Dịch vụ", value: booking.serviceName }
      : null,
    booking.totalPrice !== undefined
      ? { icon: Tag, label: "Tổng tiền", value: formatVND(booking.totalPrice) }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof MapPin; label: string; value: string }>;

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Chi tiết đặt lịch"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-950">Chi tiết đặt lịch</h2>
            {booking.id ? (
              <p className="mt-0.5 flex items-center gap-1 font-mono text-xs text-slate-400">
                <Hash size={11} aria-hidden />
                {booking.id}
              </p>
            ) : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        {/* Status badge */}
        <div className="px-6 pt-4">
          <span
            className={`inline-block rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}
          >
            {booking.status}
          </span>
        </div>

        {/* Detail rows */}
        <div className="grid gap-3 px-6 py-4">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
              <span className="w-24 shrink-0 text-sm text-slate-500">{label}</span>
              <span className="text-sm font-semibold text-slate-900">{value}</span>
            </div>
          ))}
        </div>

        {/* Cancel reason (if already cancelled) */}
        {isCancelledStatus(booking.status) && booking.cancelReason ? (
          <div className="mx-6 mb-4 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
            <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
            <span>Lý do hủy: {booking.cancelReason}</span>
          </div>
        ) : null}

        {/* Footer actions */}
        {!isInProgress ? (
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              Đóng
            </button>

            {canCancel ? (
              <button
                type="button"
                onClick={() => onRequestCancel(booking)}
                className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700"
              >
                Hủy đặt lịch
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
