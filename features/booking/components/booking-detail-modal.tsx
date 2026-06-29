"use client";

import { X, CalendarDays, Car, MapPin, Clock, Tag, Hash, AlertCircle, CheckCircle2, XCircle } from "lucide-react";
import { useState, useEffect, useMemo, useCallback } from "react";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import type { Vehicle } from "@/features/booking/types/vehicle-types";
import { getVehicles } from "@/features/booking/vehicle-service";
import { getLoyaltySettings, type LoyaltyPointsConfig } from "@/features/loyalty/loyalty-admin-service";
import { useCheckInBookingMutation, useCancelBookingMutation } from "@/features/booking/hooks/useBookings";
import { ApiError } from "@/lib/api-error";
import {
  formatDateOnly,
  formatTimeRange,
  statusStyle,
  isCancelledStatus,
  isCompletedStatus,
  canCheckIn,
} from "@/features/booking/utils";
import { CheckInConfirmModal, CancelModal } from "./upcoming-booking-panel";

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
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [configs, setConfigs] = useState<LoyaltyPointsConfig | null>(null);

  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const checkInMutation = useCheckInBookingMutation(token);
  const cancelMutation = useCancelBookingMutation(token);

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function loadAuxData() {
      try {
        const [vehiclesList, settings] = await Promise.all([
          getVehicles(token, 1, 100).catch(() => []),
          getLoyaltySettings(token).catch(() => null),
        ]);
        if (active) {
          setVehicles(vehiclesList);
          setConfigs(settings);
        }
      } catch (err) {
        console.warn("Failed to load auxiliary data in BookingDetailModal:", err);
      }
    }
    void loadAuxData();
    return () => {
      active = false;
    };
  }, [token]);

  const canCancelByTime = (() => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const bookingDate = new Date(booking.bookingDate);
      bookingDate.setHours(0, 0, 0, 0);

      const diffTime = bookingDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays >= 1;
    } catch {
      return false;
    }
  })();

  const canCancelByLifecycle =
    canCancelByTime &&
    !isCancelledStatus(booking.status) &&
    !isCompletedStatus(booking.status);

  const showCheckInBtn = canCheckIn(booking.status);

  async function handleCheckIn() {
    if (!token) return;
    setCheckingIn(true);
    setActionError(null);
    try {
      await checkInMutation.mutateAsync(booking.id);
      setShowCheckInModal(false);
      onClose();
      if (onChanged) await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setActionError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
      } else {
        setActionError(err instanceof Error ? err.message : "Không thể check-in booking.");
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleConfirmCancel(reason: string) {
    if (!token || !reason) return;
    if (!canCancelByTime) {
      setActionError(
        "Không thể hủy vì lịch đặt đã quá gần thời gian hẹn (chỉ được hủy trước ngày hẹn tối thiểu 1 ngày)."
      );
      return;
    }
    setCancelling(true);
    setActionError(null);
    try {
      await cancelMutation.mutateAsync({ id: booking.id, cancelReason: reason });
      setShowCancelModal(false);
      onClose();
      if (onChanged) await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setActionError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
      } else {
        setActionError(err instanceof Error ? err.message : "Không thể hủy lịch, vui lòng thử lại.");
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
    { icon: Car, label: "Biển số xe", value: booking.vehicleLicensePlate || "—" },
    { icon: CalendarDays, label: "Ngày", value: formatDateOnly(booking) },
    { icon: Clock, label: "Giờ", value: formatTimeRange(booking) },
    booking.serviceName
      ? { icon: Tag, label: "Dịch vụ", value: booking.serviceName }
      : null,
  ].filter(Boolean) as Array<{ icon: typeof MapPin; label: string; value: string }>;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
        onClick={(e) => {
          if (e.target === e.currentTarget && !checkingIn && !cancelling) onClose();
        }}
        role="dialog"
        aria-modal="true"
        aria-label="Chi tiết đặt lịch"
      >
        <div className="relative w-full max-w-xl rounded-2xl bg-white shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
          {/* Header */}
          <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-6 py-4 shrink-0">
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
              disabled={checkingIn || cancelling}
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
                  booking.status
                )}`}
              >
                <CheckCircle2 size={12} aria-hidden />
                {booking.status}
              </span>
            </div>

            {/* Detail rows */}
            <div className="grid gap-3">
              {rows.map(({ icon: Icon, label, value }) => (
                <div key={label} className="flex items-start gap-3">
                  <Icon size={15} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
                  <span className="w-24 shrink-0 text-sm text-slate-500">{label}</span>
                  <span className="text-sm font-semibold text-slate-900">{value}</span>
                </div>
              ))}
            </div>

            {/* Payment Details breakdown (Image 3 logic) */}
            {(() => {
              const finalPrice = booking.finalPrice ?? booking.totalPrice ?? 100_000;
              const basePrice = booking.basePrice ?? configs?.basePrice ?? 100_000;
              const suvSurcharge = configs?.suvBasePrice ?? 30_000;
              const sedanSurcharge = configs?.sedanBasePrice ?? 0;

              const bookingVehicle = vehicles.find((v) => {
                const vPlate = v.licensePlate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                const bPlate = booking.vehicleLicensePlate.replace(/[^A-Za-z0-9]/g, "").toUpperCase();
                return vPlate === bPlate;
              });
              const vehicleType = bookingVehicle?.vehicleType;

              let isSUV = false;
              let isSedan = false;

              if (vehicleType) {
                isSUV = vehicleType === "SUV";
                isSedan = vehicleType === "SEDAN";
              } else {
                const lowerPlate = booking.vehicleLicensePlate.toLowerCase();
                if (lowerPlate.includes("suv")) {
                  isSUV = true;
                } else if (lowerPlate.includes("sedan")) {
                  isSedan = true;
                } else {
                  const diff = Math.max(0, (booking.totalPrice ?? finalPrice) - basePrice);
                  if (Math.abs(diff - suvSurcharge) < Math.abs(diff - sedanSurcharge)) {
                    isSUV = true;
                  } else {
                    isSedan = true;
                  }
                }
              }

              const surcharge = isSUV ? suvSurcharge : isSedan ? sedanSurcharge : 0;
              const originalPrice = basePrice + surcharge;

              const totalDiscount = Math.max(0, originalPrice - finalPrice);
              const voucherDiscount = booking.discountAmount ?? 0;
              const promotionDiscount = Math.max(0, totalDiscount - voucherDiscount);

              const depositAmount = Math.round(finalPrice * 0.3);
              const remainingAmount = finalPrice - depositAmount;

              return (
                <div className="rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
                  <div className="px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      Chi tiết thanh toán
                    </p>
                  </div>
                  <div className="px-4 py-3 space-y-2.5">
                    {/* Giá dịch vụ gốc */}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Giá dịch vụ gốc</span>
                      <span className="font-medium text-slate-700">
                        {basePrice.toLocaleString("vi-VN")} ₫
                      </span>
                    </div>

                    {/* Phụ phí dòng xe */}
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        Phụ phí dòng xe ({isSUV ? "SUV" : isSedan ? "Sedan" : "Khác"})
                      </span>
                      <span className="font-normal text-slate-700">
                        +{surcharge.toLocaleString("vi-VN")}₫
                      </span>
                    </div>

                    {/* Ưu đãi giảm giá */}
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-slate-600">Ưu đãi giảm giá</span>
                        <p className="text-xs text-slate-400 font-normal">
                          (Khuyến mãi từ hệ thống)
                        </p>
                      </div>
                      {promotionDiscount > 0 ? (
                        <span className="font-medium text-red-600">
                          -{promotionDiscount.toLocaleString("vi-VN")}₫
                        </span>
                      ) : (
                        <span className="font-medium text-slate-700">0đ</span>
                      )}
                    </div>

                    {/* Voucher */}
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-slate-600">Voucher</span>
                        <p className="text-xs text-slate-400 font-normal">
                          (Mã giảm giá đã áp dụng)
                        </p>
                      </div>
                      {voucherDiscount > 0 ? (
                        <span className="font-medium text-red-600">
                          -{voucherDiscount.toLocaleString("vi-VN")}₫
                        </span>
                      ) : (
                        <span className="font-medium text-slate-700">0đ</span>
                      )}
                    </div>

                    {/* Số tiền phải cọc */}
                    <div className="flex justify-between text-sm">
                      <div>
                        <span className="text-slate-600">Số tiền phải cọc (30%)</span>
                        <p className="text-xs text-slate-400">
                          Bạn phải cọc trước 30% để giữ slot
                        </p>
                      </div>
                      <span className="font-medium text-slate-700">
                        -{depositAmount.toLocaleString("vi-VN")}₫
                      </span>
                    </div>

                    {/* Divider */}
                    <div className="border-t border-dashed border-slate-200" />

                    {/* Tổng tiền phải trả khi check-in */}
                    <div className="flex justify-between text-sm">
                      <span className="font-semibold text-slate-800">
                        Tổng tiền phải trả khi check-in
                      </span>
                      <span className="font-bold text-slate-950">
                        {remainingAmount.toLocaleString("vi-VN")}₫
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()}

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
                Chỉ có thể tự hủy lịch trước ngày đặt hẹn tối thiểu 1 ngày.
              </div>
            ) : null}

            {/* Cancel reason (if already cancelled) */}
            {isCancelledStatus(booking.status) && booking.cancelReason ? (
              <div className="flex items-start gap-2 rounded-lg border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle size={15} className="mt-0.5 shrink-0" aria-hidden />
                <span>Lý do hủy: {booking.cancelReason}</span>
              </div>
            ) : null}
          </div>

          {/* Footer Actions (Image 3 logic) */}
          <div className="border-t border-slate-100 px-6 py-4 bg-slate-50 flex flex-col gap-2 shrink-0">
            {/* Check-in action button */}
            {showCheckInBtn ? (
              <button
                type="button"
                onClick={() => setShowCheckInModal(true)}
                disabled={checkingIn || cancelling}
                className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <CheckCircle2 size={16} aria-hidden />
                Check-in
              </button>
            ) : null}

            {/* Cancel action button */}
            {canCancelByLifecycle ? (
              <button
                type="button"
                onClick={() => setShowCancelModal(true)}
                disabled={checkingIn || cancelling}
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
              disabled={checkingIn || cancelling}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>

      {/* Sub-modals */}
      {showCheckInModal && (
        <CheckInConfirmModal
          booking={booking}
          onConfirm={handleCheckIn}
          onClose={() => {
            setShowCheckInModal(false);
            setActionError(null);
          }}
          loading={checkingIn}
          token={token}
        />
      )}

      {showCancelModal && (
        <CancelModal
          bookingId={booking.id}
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
