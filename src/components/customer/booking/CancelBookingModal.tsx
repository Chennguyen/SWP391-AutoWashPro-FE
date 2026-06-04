"use client";

import { FormEvent, useState } from "react";
import { X, AlertCircle } from "lucide-react";
import type { CustomerBooking } from "@/types/booking";
import { cancelBooking } from "@/lib/api/booking";
import { ApiError } from "@/lib/api/api-error";

interface CancelBookingModalProps {
  booking: CustomerBooking;
  token: string;
  onClose: () => void;
  onSuccess: () => void;
}

/**
 * Thành phần (Component) CancelBookingModal
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function CancelBookingModal({
  booking,
  token,
  onClose,
  onSuccess,
}: CancelBookingModalProps) {
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    const trimmed = reason.trim();
    if (!trimmed) {
      setError("Vui lòng nhập lý do hủy.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await cancelBooking(token, booking.id, trimmed);
      onSuccess();
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 401) {
          setError("Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.");
        } else {
          setError(err.message || "Hủy đặt lịch thất bại. Vui lòng thử lại.");
        }
      } else {
        setError("Không thể kết nối máy chủ. Vui lòng thử lại.");
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget && !loading) onClose();
      }}
      role="dialog"
      aria-modal="true"
      aria-label="Hủy đặt lịch"
    >
      <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-6 py-4">
          <h2 className="text-lg font-bold text-slate-950">Xác nhận hủy đặt lịch</h2>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            aria-label="Đóng"
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <form onSubmit={handleSubmit} noValidate>
          {/* Body */}
          <div className="px-6 py-5 space-y-4">
            {/* Booking summary */}
            <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm">
              <p className="font-semibold text-slate-900">{booking.branchName}</p>
              <p className="mt-0.5 text-slate-500">{booking.vehicleLicensePlate}</p>
            </div>

            {/* Warning */}
            <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
              <span>
                Lưu ý: Bạn chỉ có thể hủy booking trong ngày hôm nay.
                Tiền cọc sẽ được hoàn lại vào ví sau khi hủy thành công.
              </span>
            </div>

            {/* Reason input */}
            <div className="flex flex-col gap-1.5">
              <label
                htmlFor="cancel-reason"
                className="text-sm font-semibold text-slate-800"
              >
                Lý do hủy <span className="text-red-500">*</span>
              </label>
              <textarea
                id="cancel-reason"
                rows={3}
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  if (error) setError(null);
                }}
                placeholder="Nhập lý do hủy đặt lịch..."
                disabled={loading}
                className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none placeholder:text-slate-400 focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
              />
              {error ? (
                <p role="alert" className="text-sm text-red-600">
                  {error}
                </p>
              ) : null}
            </div>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-3 border-t border-slate-100 px-6 py-4">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="rounded-lg border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Giữ lại
            </button>
            <button
              type="submit"
              disabled={loading || !reason.trim()}
              className="rounded-lg bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Đang hủy..." : "Xác nhận hủy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
