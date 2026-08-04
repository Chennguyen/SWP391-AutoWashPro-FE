"use client";

import {
  useCancelBookingMutation,
  useGetBookingQuery,
} from "@/features/booking/hooks/useBookings";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import {
  formatCancellationPolicyMessage,
  formatDateOnly,
  formatTimeRange,
  isCancelledStatus,
  isCompletedStatus,
  statusStyle,
} from "@/features/booking/utils";
import {
  getLoyaltySettings,
  type LoyaltyPointsConfig,
} from "@/features/loyalty/loyalty-admin-service";
import { ApiError } from "@/lib/api-error";
import {
  AlertCircle,
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  Tag,
  X,
  XCircle,
} from "lucide-react";
import { useEffect, useState } from "react";
import { BookingPriceSummary } from "./booking-price-summary";
import { CancelModal } from "./upcoming-booking-panel";

interface BookingDetailModalProps {
  booking: CustomerBooking;
  token: string;
  onClose: () => void;
  onChanged?: () => void | Promise<void>;
  onRequestCancel?: (booking: CustomerBooking) => void;
}

/**
 * Thành phần (Component) BookingDetailModal
 *
 * Chức năng: Thành phần giao diện hiển thị chi tiết đặt lịch (Modal chi tiết lịch sử).
 * Thiết kế: Tương đương với giao diện chi tiết ở Dashboard (Hình 3), bao gồm bảng tính tiền và action.
 */
export function BookingDetailModal({
  booking,
  token,
  onClose,
  onChanged,
}: BookingDetailModalProps) {
  const [configs, setConfigs] = useState<LoyaltyPointsConfig | null>(null);

  const [showCancelModal, setShowCancelModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const cancelMutation = useCancelBookingMutation(token);
  const detailQuery = useGetBookingQuery(token, booking.id);
  const resolvedBooking = detailQuery.data ?? booking;

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function loadAuxData() {
      try {
        const settings = await getLoyaltySettings(token).catch(() => null);
        if (active) {
          setConfigs(settings);
        }
      } catch (err) {
        console.warn(
          "Failed to load auxiliary data in BookingDetailModal:",
          err,
        );
      }
    }
    void loadAuxData();
    return () => {
      active = false;
    };
  }, [token]);

  const cancellationDeadlineHours = configs?.cancellationDeadlineHours ?? 72;

  const canCancelByTime = (() => {
    try {
      const bookingDateTime = new Date(booking.bookingDate);
      if (booking.startTime) {
        const [hours, minutes] = booking.startTime.split(":").map(Number);
        if (Number.isFinite(hours) && Number.isFinite(minutes)) {
          bookingDateTime.setHours(hours, minutes, 0, 0);
        }
      }

      const diffMs = bookingDateTime.getTime() - Date.now();
      const diffHours = diffMs / (1000 * 60 * 60);

      return diffHours >= cancellationDeadlineHours;
    } catch {
      return false;
    }
  })();

  const canCancelByLifecycle =
    canCancelByTime &&
    !isCancelledStatus(booking.status) &&
    !isCompletedStatus(booking.status);
  const cancellationPolicyMessage = formatCancellationPolicyMessage(
    configs?.cancellationDeadlineHours,
  );

  async function handleConfirmCancel(reason: string) {
    if (!token || !reason) return;
    if (!canCancelByTime) {
      setActionError(
        `Không thể hủy vì lịch đặt đã quá gần thời gian hẹn. ${cancellationPolicyMessage}`,
      );
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      await cancelMutation.mutateAsync({
        id: booking.id,
        cancelReason: reason,
      });
      setShowCancelModal(false);
      onClose();
      if (onChanged) await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setActionError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
      } else {
        setActionError(
          err instanceof Error
            ? err.message
            : "Không thể hủy lịch, vui lòng thử lại.",
        );
      }
    } finally {
      setCancelling(false);
    }
  }

  // Rows for main info
  const rows = [
    { icon: MapPin, label: "Chi nhánh", value: booking.branchName },
    booking.branchAddress
      ? { icon: MapPin, label: "Địa chỉ", value: booking.branchAddress }
      : null,
    {
      icon: Car,
      label: "Biển số xe",
      value: booking.vehicleLicensePlate || "—",
    },
    { icon: CalendarDays, label: "Ngày", value: formatDateOnly(booking) },
    { icon: Clock, label: "Giờ", value: formatTimeRange(booking) },
    booking.serviceName
      ? { icon: Tag, label: "Dịch vụ", value: booking.serviceName }
      : null,
  ].filter(Boolean) as Array<{
    icon: typeof MapPin;
    label: string;
    value: string;
  }>;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !cancelling) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đặt lịch"
      >
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 shrink-0">
            <div>
              <h2 className="text-lg font-bold text-slate-950">
                Chi tiết đặt lịch
              </h2>
              <p className="mt-0.5 text-xs font-medium text-slate-500">
                {booking.branchName || "Chi nhánh"} · {formatDateOnly(booking)}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              disabled={cancelling}
              aria-label="Đóng"
              className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700 disabled:opacity-50"
            >
              <X size={18} aria-hidden />
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="overflow-y-auto px-6 py-4 flex-1 space-y-4">
            {/* Status badge */}
            <div>
              <span
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(
                  resolvedBooking.status,
                )}`}
              >
                {(() => {
                  const s = resolvedBooking.status.toLowerCase();
                  if (
                    s.includes("cancel") ||
                    s.includes("hủy") ||
                    s.includes("huy")
                  ) {
                    return <XCircle size={12} aria-hidden />;
                  }
                  if (s.includes("progress")) {
                    return <Clock size={12} aria-hidden />;
                  }
                  return <CheckCircle2 size={12} aria-hidden />;
                })()}
                {resolvedBooking.status}
              </span>
            </div>

            {/* Detail rows */}
            <div className="grid gap-3">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon
                    size={15}
                    className="mt-0.5 shrink-0 text-slate-400"
                    aria-hidden
                  />
                  <span className="w-24 shrink-0 text-sm text-slate-500">
                    {label}
                  </span>
                  <span className="text-sm font-semibold text-slate-900">
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <BookingPriceSummary
              booking={detailQuery.data}
              isLoading={detailQuery.isLoading}
              error={detailQuery.error}
              depositRate={configs?.paymentDeposite ?? 30}
              configs={configs}
              onRetry={() => void detailQuery.refetch()}
            />

            {/* Error message */}
            {actionError && (
              <div
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
              >
                {actionError}
              </div>
            )}

            {/* Warning if unable to cancel */}
            {!canCancelByTime &&
            !isCancelledStatus(booking.status) &&
            !isCompletedStatus(booking.status) ? (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {cancellationPolicyMessage}
              </div>
            ) : null}

            {/* Cancel reason (if already cancelled) */}
            {isCancelledStatus(booking.status) ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle
                  size={15}
                  className="mt-0.5 shrink-0"
                  aria-hidden
                />
                <span>Lý do hủy: {booking.cancelReason}</span>
              </div>
            ) : null}
          </div>

          {/* Footer Actions (Image 3 logic) */}
          <div className="border-t border-slate-100 px-6 py-4 bg-white flex flex-col gap-2 shrink-0">
            {/* Cancel action button */}
            {canCancelByLifecycle ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={cancelling}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <XCircle size={16} aria-hidden />
                Hủy lịch này
              </button>
            ) : null}

            {/* Close button */}
            <button
              type="button"
              onClick={onClose}
              disabled={cancelling}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showCancelModal && (
        <CancelModal
          onConfirm={handleConfirmCancel}
          onClose={() => {
            setShowCancelModal(false);
            setActionError(null);
          }}
          loading={cancelling}
        />
      )}
    </>
  );
}
