"use client";

import { BookingCard } from "@/features/booking/components/booking-card";
import { ApiError } from "@/lib/api-error";
import { cancelBooking, checkInBooking, getBookings } from "@/features/booking/booking-service";
import { getMyVerificationStatus } from "@/features/users/customer-service";
import {
  getLoyaltySettings,
  type LoyaltyPointsConfig,
} from "@/features/loyalty/loyalty-admin-service";
import { getVehicles } from "@/features/booking/vehicle-service";
import { getWallet, topUpWallet, type Wallet } from "@/features/users/wallet-service";
import {
  canCheckIn,
  formatDateOnly,
  formatTimeRange,
  getServerTokenSnapshot,
  getTokenSnapshot,
  isCancelledStatus,
  isCompletedStatus,
  isUpcomingStatus,
  minutesUntilBooking,
  statusStyle,
  subscribeToToken,
  toISODate,
} from "@/features/booking/utils";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import type { Vehicle } from "@/features/booking/types/vehicle-types";
import {
  AlertCircle,
  ArrowLeft,
  CalendarDays,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  MapPin,
  Plus,
  RefreshCw,
  WalletCards,
  Wrench,
  XCircle,
} from "lucide-react";
import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
} from "react";

const UPCOMING_PREVIEW_COUNT = 3;
const CANCEL_CUTOFF_MINUTES = 30;

// ─── Cancel Modal ───────────────────────────────────────────────────────────────

export function CancelModal({
  bookingId,
  onConfirm,
  onClose,
  loading,
}: {
  bookingId: string;
  onConfirm: (reason: string) => void;
  onClose: () => void;
  loading: boolean;
}) {
  const [reason, setReason] = useState("");

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận hủy lịch"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Hủy lịch đặt</h3>
        <p className="mt-1 text-sm text-slate-500">
          Mã lịch:{" "}
          <span className="font-mono font-semibold text-slate-700">
            {bookingId}
          </span>
        </p>

        <div className="mt-4">
          <label
            htmlFor="cancel-reason"
            className="mb-1.5 block text-sm font-medium text-slate-700"
          >
            Lý do hủy <span className="text-red-500">*</span>
          </label>
          <textarea
            id="cancel-reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ví dụ: Bận việc đột xuất nên không ghé được"
            disabled={loading}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
          />
        </div>

        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Không hủy
          </button>
          <button
            type="button"
            onClick={() => onConfirm(reason.trim())}
            disabled={loading || !reason.trim()}
            className="rounded-xl bg-red-600 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? "Đang hủy..." : "Xác nhận hủy"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Check-In Confirm Modal ──────────────────────────────────────────────────────

// ─── Check-In Confirm Modal ──────────────────────────────────────────────────────

export function CheckInConfirmModal({
  booking,
  onConfirm,
  onClose,
  loading,
  token,
}: {
  booking: CustomerBooking;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
  token: string;
}) {
  const finalPrice = booking.finalPrice ?? booking.totalPrice ?? 100000;
  const depositAmount = Math.round(finalPrice * 0.3);
  const remainingAmount = finalPrice - depositAmount;

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(true);
  const [topUpAmount, setTopUpAmount] = useState<number>(0);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);

  const walletBalance = wallet?.balance ?? 0;
  const insufficientBalance = !walletLoading && walletBalance < remainingAmount;
  const missingAmount = Math.max(0, remainingAmount - walletBalance);

  const fetchWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const w = await getWallet(token);
      setWallet(w);
    } catch (err) {
      console.error("Failed to load wallet in CheckInConfirmModal:", err);
    } finally {
      setWalletLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void fetchWallet();
  }, [fetchWallet]);

  // Set default top-up amount to missing amount when wallet balance loads and is insufficient
  useEffect(() => {
    if (!walletLoading && insufficientBalance && topUpAmount === 0) {
      setTopUpAmount(missingAmount);
    }
  }, [walletLoading, insufficientBalance, missingAmount, topUpAmount]);

  async function handleQuickTopUp(e: React.FormEvent) {
    e.preventDefault();
    if (topUpAmount <= 0) return;
    setTopUpLoading(true);
    setTopUpError(null);
    setTopUpSuccess(null);
    try {
      const nextWallet = await topUpWallet(token, topUpAmount);
      setWallet(nextWallet);
      setTopUpSuccess("Nạp tiền thành công!");
      setTopUpAmount(0);
      // Gửi sự kiện cập nhật ví ra toàn hệ thống
      window.dispatchEvent(
        new CustomEvent("autowash-wallet-updated", { detail: nextWallet }),
      );
    } catch (err) {
      setTopUpError(
        err instanceof Error
          ? err.message
          : "Nạp tiền thất bại, vui lòng thử lại.",
      );
    } finally {
      setTopUpLoading(false);
    }
  }

  const quickTopUpOptions = useMemo(() => {
    const list = [];
    if (missingAmount > 0) {
      list.push(missingAmount);
    }
    // Thêm các mệnh giá phổ biến lớn hơn missingAmount
    [50000, 100000, 200000, 500000].forEach((val) => {
      if (val > missingAmount) {
        list.push(val);
      }
    });
    return Array.from(new Set(list)).slice(0, 4);
  }, [missingAmount]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận Check-in"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl transition-all max-h-[90vh] overflow-y-auto">
        <h3 className="text-lg font-bold text-slate-900">Xác nhận Check-in</h3>
        <p className="mt-1 text-sm text-slate-500">
          Hệ thống sẽ thực hiện thanh toán phần còn lại từ ví của bạn.
        </p>

        {/* Thanh toán chi tiết */}
        <div className="mt-4 space-y-2.5 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Tổng tiền dịch vụ:</span>
            <span className="font-semibold text-slate-900">
              {finalPrice.toLocaleString("vi-VN")}₫
            </span>
          </div>
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Đã đặt cọc (30%):</span>
            <span className="font-semibold">
              -{depositAmount.toLocaleString("vi-VN")}₫
            </span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-2.5 text-base font-bold text-slate-900">
            <span>Cần thanh toán thêm:</span>
            <span className="text-blue-600">
              {remainingAmount.toLocaleString("vi-VN")}₫
            </span>
          </div>
        </div>

        {/* Ví khách hàng */}
        <div className="mt-4 flex items-center justify-between rounded-xl border border-slate-200 px-4 py-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <WalletCards size={16} className="text-slate-400" />
            <span>Số dư ví của bạn:</span>
          </div>
          <span className="font-bold text-slate-950">
            {walletLoading ? (
              <span className="text-slate-400 animate-pulse">Đang tải...</span>
            ) : (
              `${walletBalance.toLocaleString("vi-VN")}₫`
            )}
          </span>
        </div>

        {/* Cảnh báo không đủ tiền */}
        {insufficientBalance && (
          <div className="mt-4 flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0 text-amber-600" />
            <div className="space-y-1">
              <p className="font-semibold">Số dư ví không đủ để check-in</p>
              <p>
                Bạn cần nạp thêm tối thiểu{" "}
                <span className="font-bold">
                  {missingAmount.toLocaleString("vi-VN")}₫
                </span>{" "}
                để thanh toán phần còn lại.
              </p>
            </div>
          </div>
        )}

        {/* Khung nạp tiền nhanh */}
        {insufficientBalance && (
          <form
            onSubmit={handleQuickTopUp}
            className="mt-4 rounded-xl border border-slate-100 bg-slate-50/50 p-4"
          >
            <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-slate-400 mb-3">
              <Plus size={12} />
              Nạp tiền nhanh vào ví
            </div>

            <div className="flex gap-2">
              <div className="relative flex-1">
                <input
                  type="number"
                  min={1000}
                  step={1000}
                  value={topUpAmount || ""}
                  onChange={(e) => {
                    setTopUpSuccess(null);
                    setTopUpAmount(Number(e.target.value));
                  }}
                  disabled={topUpLoading}
                  placeholder="Nhập số tiền nạp"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-60"
                />
                <span className="absolute right-3 top-2 text-xs font-semibold text-slate-400">
                  ₫
                </span>
              </div>
              <button
                type="submit"
                disabled={topUpLoading || topUpAmount < 1000}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-bold text-white transition hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-60 shrink-0"
              >
                {topUpLoading ? "Đang nạp..." : "Nạp ngay"}
              </button>
            </div>

            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {quickTopUpOptions.map((amount) => (
                <button
                  key={amount}
                  type="button"
                  onClick={() => {
                    setTopUpSuccess(null);
                    setTopUpAmount(amount);
                  }}
                  disabled={topUpLoading}
                  className={`rounded-lg border px-2.5 py-1.5 text-xs font-bold transition disabled:cursor-not-allowed ${
                    topUpAmount === amount
                      ? "border-blue-600 bg-blue-50 text-blue-700"
                      : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {amount === missingAmount ? "Nạp đủ thiếu: " : ""}
                  {amount.toLocaleString("vi-VN")}₫
                </button>
              ))}
            </div>

            {topUpError && (
              <div
                role="alert"
                className="mt-2.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700"
              >
                {topUpError}
              </div>
            )}

            {topUpSuccess && (
              <div
                role="status"
                className="mt-2.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700"
              >
                {topUpSuccess}
              </div>
            )}
          </form>
        )}

        {/* Nút hành động */}
        <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading || topUpLoading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={
              loading || walletLoading || insufficientBalance || topUpLoading
            }
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition disabled:cursor-not-allowed disabled:opacity-50 ${
              insufficientBalance
                ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                : "bg-slate-950 hover:bg-slate-800"
            }`}
          >
            {loading ? "Đang xử lý..." : "Xác nhận Check-in"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Detail Panel ───────────────────────────────────────────────────────────────

function BookingDetailPanel({
  booking,
  onBack,
  onChanged,
  token,
}: {
  booking: CustomerBooking;
  onBack: () => void;
  onChanged: () => void | Promise<void>;
  token: string;
}) {
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showCheckInModal, setShowCheckInModal] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [configs, setConfigs] = useState<LoyaltyPointsConfig | null>(null);

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
        console.warn(
          "Failed to load auxiliary data in BookingDetailPanel:",
          err,
        );
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
    setCheckingIn(true);
    setCancelError(null);
    try {
      await checkInBooking(token, booking.id);
      setShowCheckInModal(false);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setCancelError("Đang xảy ra lỗi vui lòng quay lại sau");
      } else {
        setCancelError(
          err instanceof Error ? err.message : "Không thể check-in booking.",
        );
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleConfirmCancel(reason: string) {
    if (!reason) return;
    if (!canCancelByTime) {
      setCancelError(
        "Không thể hủy vì lịch đặt đã quá gần thời gian hẹn (chỉ được hủy trước ngày hẹn tối thiểu 1 ngày).",
      );
      return;
    }
    setCancelling(true);
    setCancelError(null);
    try {
      await cancelBooking(token, booking.id, reason);
      setShowCancelModal(false);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError && err.status >= 500) {
        setCancelError("Đang xảy ra lỗi vui lòng quay lại sau");
      } else {
        setCancelError(
          err instanceof Error
            ? err.message
            : "Không thể hủy lịch, vui lòng thử lại.",
        );
      }
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Back */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
      >
        <ArrowLeft size={15} aria-hidden />
        Danh sách lịch
      </button>

      {/* Status + Branch */}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}
          >
            <CheckCircle2 size={12} aria-hidden />
            {booking.status}
          </span>
          <h3 className="mt-2 text-xl font-black text-slate-950">
            {booking.branchName}
          </h3>
          {booking.branchAddress && (
            <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
              <MapPin size={13} aria-hidden />
              {booking.branchAddress}
            </p>
          )}
        </div>
      </div>

      {/* Detail grid */}
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDays size={13} aria-hidden />
            Ngày
          </div>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {formatDateOnly(booking)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Clock size={13} aria-hidden />
            Giờ
          </div>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {formatTimeRange(booking)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Car size={13} aria-hidden />
            Xe
          </div>
          <p className="mt-1 text-sm font-bold text-slate-950">
            {booking.vehicleLicensePlate || "Xe đã chọn"}
          </p>
        </div>

        {booking.serviceName && (
          <div className="rounded-lg bg-slate-50 p-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Wrench size={13} aria-hidden />
              Dịch vụ
            </div>
            <p className="mt-1 text-sm font-bold text-slate-950">
              {booking.serviceName}
            </p>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-2.5 sm:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <MapPin size={13} aria-hidden />
            Mã lịch
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-slate-950">
            {booking.id}
          </p>
        </div>
      </div>

      {(() => {
        const finalPrice = booking.finalPrice ?? booking.totalPrice ?? 100_000;
        const basePrice = booking.basePrice ?? configs?.basePrice ?? 100_000;
        const suvSurcharge = configs?.suvBasePrice ?? 30_000;
        const sedanSurcharge = configs?.sedanBasePrice ?? 0;

        const bookingVehicle = vehicles.find((v) => {
          const vPlate = v.licensePlate
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase();
          const bPlate = booking.vehicleLicensePlate
            .replace(/[^A-Za-z0-9]/g, "")
            .toUpperCase();
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
            const diff = Math.max(
              0,
              (booking.totalPrice ?? finalPrice) - basePrice,
            );
            if (
              Math.abs(diff - suvSurcharge) < Math.abs(diff - sedanSurcharge)
            ) {
              isSUV = true;
            } else {
              isSedan = true;
            }
          }
        }

        const surcharge = isSUV ? suvSurcharge : isSedan ? sedanSurcharge : 0;
        const originalPrice = basePrice + surcharge;

        // Tính toán giảm giá promotion và voucher
        const totalDiscount = Math.max(0, originalPrice - finalPrice);
        const voucherDiscount = booking.discountAmount ?? 0;
        const promotionDiscount = Math.max(0, totalDiscount - voucherDiscount);

        const depositAmount = Math.round(finalPrice * 0.3);
        const remainingAmount = finalPrice - depositAmount;

        return (
          <div className="mt-4 rounded-lg border border-slate-200 bg-white overflow-hidden">
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

              {/* Phụ phí dòng xe (sedan/SUV) */}
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
                  <span className="font-medium" style={{ color: "#EE4D2D" }}>
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
                  <span className="font-medium" style={{ color: "#EE4D2D" }}>
                    -{voucherDiscount.toLocaleString("vi-VN")}₫
                  </span>
                ) : (
                  <span className="font-medium text-slate-700">0đ</span>
                )}
              </div>

              {/* Số tiền phải cọc (30%) */}
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

              {/* Dashed divider */}
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

      {cancelError && (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
        >
          {cancelError}
        </div>
      )}

      {!canCancelByTime &&
      !isCancelledStatus(booking.status) &&
      !isCompletedStatus(booking.status) ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Chỉ có thể tự hủy lịch trước ngày đặt hẹn tối thiểu 1 ngày.
        </div>
      ) : null}

      {/* Actions */}
      {/* aahhihihihihihihih */}
      {showCheckInBtn ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => setShowCheckInModal(true)}
            disabled={checkingIn || cancelling}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={16} aria-hidden />
            Check-in
          </button>
        </div>
      ) : null}

      {canCancelByLifecycle && (
        <div className={showCheckInBtn ? "mt-3" : "mt-5"}>
          <button
            type="button"
            onClick={() => setShowCancelModal(true)}
            disabled={checkingIn || cancelling}
            className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <XCircle size={16} aria-hidden />
            Hủy lịch này
          </button>
        </div>
      )}

      {showCheckInModal && (
        <CheckInConfirmModal
          booking={booking}
          onConfirm={handleCheckIn}
          onClose={() => {
            setShowCheckInModal(false);
            setCancelError(null);
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
            setCancelError(null);
          }}
          loading={cancelling}
        />
      )}
    </div>
  );
}

// ─── Main Panel ─────────────────────────────────────────────────────────────────

/**
 * Thành phần (Component) UpcomingBookingPanel
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function UpcomingBookingPanel() {
  const tokenSnapshot = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [status, setStatus] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ⚡ FIX: Clear stale data immediately when token changes (account switch / logout)
  useEffect(() => {
    setBookings([]);
    setStatus(null);
    setSelectedId(null);
    setShowDetail(false);
    setError(null);
  }, [token]);



  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const loadBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // Kiểm tra trạng thái xác minh trước tiên
      const verification = await getMyVerificationStatus(token);
      setStatus(verification.status);

      if (
        verification.status === "Pending" ||
        verification.status === "Rejected"
      ) {
        setBookings([]);
        setLoading(false);
        return;
      }

      const from = new Date();
      from.setDate(from.getDate() - 1);
      const to = new Date();
      to.setDate(to.getDate() + 60);

      const next = await getBookings(
        token,
        toISODate(from),
        toISODate(to),
        1,
        50,
      );
      // Only upcoming (not cancelled / completed)
      const upcoming = next.filter((b) => isUpcomingStatus(b.status));
      setBookings(upcoming);
      setSelectedId((cur) => {
        if (cur && upcoming.some((b) => b.id === cur)) return cur;
        return upcoming[0]?.id ?? null;
      });
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Phiên đăng nhập đã hết hạn.");
      } else {
        setError(
          err instanceof Error
            ? err.message
            : "Không thể tải lịch đặt sắp tới.",
        );
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    if (!authChecked || !token) return;
    const id = window.setTimeout(() => void loadBookings(), 0);
    return () => window.clearTimeout(id);
  }, [authChecked, loadBookings, token]);

  // Lắng nghe sự kiện SignalR thông báo hủy lịch để tự động tải lại danh sách
  useEffect(() => {
    if (typeof window === "undefined") return;

    function handleBookingCancelled() {
      void loadBookings();
    }

    window.addEventListener("autowash-booking-cancelled", handleBookingCancelled);
    return () => {
      window.removeEventListener("autowash-booking-cancelled", handleBookingCancelled);
    };
  }, [loadBookings]);

  function handleSelectBooking(booking: CustomerBooking) {
    setSelectedId(booking.id);
    setShowDetail(true);
  }

  function handleBack() {
    setShowDetail(false);
  }

  async function handleBookingChanged() {
    await loadBookings();
  }

  const isUnverified =
    typeof window !== "undefined" &&
    window.localStorage.getItem("is_unverified") === "true";

  if (status === "Pending" || status === "Rejected" || isUnverified) {
    return null;
  }

  return (
    <section
      id="upcoming-booking"
      className="rounded-2xl border border-slate-200 bg-white p-6"
      aria-label="Lịch đặt sắp tới"
    >
      {/* Header */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold text-slate-950">Lịch đặt sắp tới</h2>
          <p className="mt-1 text-sm text-slate-500">
            {showDetail
              ? "Chi tiết lịch đặt."
              : "Bấm vào lịch để xem thông tin chi tiết."}
          </p>
        </div>
        {!showDetail && (
          <button
            type="button"
            onClick={loadBookings}
            disabled={loading || !token}
            title="Tải lại lịch đặt"
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw
              size={16}
              className={loading ? "animate-spin" : ""}
              aria-hidden
            />
            <span className="sr-only">Tải lại lịch đặt</span>
          </button>
        )}
      </div>

      {/* Not logged in */}
      {!authChecked || !token ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          Đăng nhập để xem lịch đặt sắp tới.
        </div>
      ) : null}

      {/* Loading skeleton */}
      {authChecked && token && loading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-20 animate-pulse rounded-lg bg-slate-100"
            />
          ))}
        </div>
      ) : null}

      {/* Error */}
      {authChecked && token && !loading && error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Empty */}
      {authChecked && token && !loading && !error && bookings.length === 0 ? (
        <div className="rounded-lg border border-dashed border-slate-200 py-12 text-center text-sm text-slate-500">
          Chưa có lịch đặt sắp tới.
        </div>
      ) : null}

      {/* Detail view */}
      {authChecked &&
      token &&
      !loading &&
      !error &&
      showDetail &&
      selectedBooking ? (
        <BookingDetailPanel
          booking={selectedBooking}
          onBack={handleBack}
          onChanged={handleBookingChanged}
          token={token}
        />
      ) : null}

      {/* List view */}
      {authChecked &&
      token &&
      !loading &&
      !error &&
      !showDetail &&
      bookings.length > 0 ? (
        <div className="space-y-3">
          {bookings.slice(0, UPCOMING_PREVIEW_COUNT).map((booking) => (
            <BookingCard
              key={booking.id}
              booking={booking}
              onClick={handleSelectBooking}
            />
          ))}

          <Link
            href="/customer/history?tab=active"
            className="flex w-full items-center justify-center gap-1.5 rounded-xl border border-dashed border-slate-300 py-2.5 text-sm font-medium text-slate-500 transition hover:border-blue-400 hover:bg-blue-50/40 hover:text-blue-600"
          >
            Xem tất cả lịch đặt
            <ChevronRight size={15} aria-hidden />
          </Link>
        </div>
      ) : null}
    </section>
  );
}
