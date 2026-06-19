"use client";

import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import {
  CalendarDays,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  RefreshCw,
  XCircle,
  ArrowLeft,
  Banknote,
  Wrench,
  ChevronRight,
} from "lucide-react";
import Link from "next/link";
import { ApiError } from "@/lib/api/api-error";
import { cancelBooking, checkInBooking, getBookings } from "@/lib/api/booking";
import { getMyVerificationStatus } from "@/lib/api/customer";
import type { CustomerBooking } from "@/types/booking";
import {
  subscribeToToken,
  getTokenSnapshot,
  getServerTokenSnapshot,
  toISODate,
  formatDateOnly,
  formatTimeRange,
  statusStyle,
  isCancelledStatus,
  isCompletedStatus,
  isUpcomingStatus,
  canCheckIn,
  minutesUntilBooking,
} from "@/lib/booking-helpers";
import { BookingCard } from "@/components/customer/booking/BookingCard";

const UPCOMING_PREVIEW_COUNT = 3;
const CANCEL_CUTOFF_MINUTES = 30;



// ─── Cancel Modal ───────────────────────────────────────────────────────────────

function CancelModal({
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
          Mã lịch: <span className="font-mono font-semibold text-slate-700">{bookingId}</span>
        </p>

        <div className="mt-4">
          <label htmlFor="cancel-reason" className="mb-1.5 block text-sm font-medium text-slate-700">
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

function CheckInConfirmModal({
  booking,
  onConfirm,
  onClose,
  loading,
}: {
  booking: CustomerBooking;
  onConfirm: () => void;
  onClose: () => void;
  loading: boolean;
}) {
  const servicePrice = booking.totalPrice ?? 100000;
  const depositAmount = Math.round(servicePrice * 0.3);
  const remainingAmount = servicePrice - depositAmount;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4"
      role="dialog"
      aria-modal="true"
      aria-label="Xác nhận Check-in"
    >
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Xác nhận Check-in</h3>
        <p className="mt-1 text-sm text-slate-500">
          Vui lòng thanh toán phần còn lại tại quầy để bắt đầu dịch vụ.
        </p>

        <div className="mt-5 space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex justify-between text-sm text-slate-600">
            <span>Tổng tiền dịch vụ:</span>
            <span className="font-semibold text-slate-900">{servicePrice.toLocaleString("vi-VN")}₫</span>
          </div>
          <div className="flex justify-between text-sm text-emerald-600">
            <span>Đã đặt cọc (30%):</span>
            <span className="font-semibold">-{depositAmount.toLocaleString("vi-VN")}₫</span>
          </div>
          <div className="flex justify-between border-t border-slate-200 pt-3 text-base font-bold text-slate-900">
            <span>Cần thanh toán thêm:</span>
            <span className="text-blue-600">{remainingAmount.toLocaleString("vi-VN")}₫</span>
          </div>
        </div>

        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={loading}
            className="rounded-xl bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
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

  const minutesToBooking = minutesUntilBooking(booking);
  const canCancelByTime = minutesToBooking === null || minutesToBooking > CANCEL_CUTOFF_MINUTES;
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
        setCancelError(err instanceof Error ? err.message : "Không thể check-in booking.");
      }
    } finally {
      setCheckingIn(false);
    }
  }

  async function handleConfirmCancel(reason: string) {
    if (!reason) return;
    if (!canCancelByTime) {
      setCancelError(`Không thể hủy vì lịch còn dưới ${CANCEL_CUTOFF_MINUTES} phút nữa.`);
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
        setCancelError(err instanceof Error ? err.message : "Không thể hủy lịch, vui lòng thử lại.");
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
          <h3 className="mt-2 text-xl font-black text-slate-950">{booking.branchName}</h3>
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
          <p className="mt-1 text-sm font-bold text-slate-950">{formatDateOnly(booking)}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Clock size={13} aria-hidden />
            Giờ
          </div>
          <p className="mt-1 text-sm font-bold text-slate-950">{formatTimeRange(booking)}</p>
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
            <p className="mt-1 text-sm font-bold text-slate-950">{booking.serviceName}</p>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-2.5 sm:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <MapPin size={13} aria-hidden />
            Mã lịch
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-slate-950">{booking.id}</p>
        </div>
      </div>

      {/* ── Bảng Chi tiết Thanh toán (flat list — giống lúc đặt lịch) ── */}
      {(() => {
        /* Ưu tiên sử dụng FinalPrice từ backend nếu có, nếu không thì fallback về totalPrice hoặc 100.000₫ */
        const finalPrice = booking.finalPrice ?? booking.totalPrice ?? 100_000;
        const basePrice = booking.basePrice ?? 100_000;
        // Tổng giảm giá (promotion + voucher gộp chung — do backend trả về 1 trường)
        const discountAmount = booking.discountAmount ?? 0;
        // Suy luận phụ phí xe: nếu finalPrice > basePrice - discount thì có phụ phí
        // surcharge = (finalPrice + discountAmount) - basePrice (số dương nếu có phụ phí)
        const surcharge = Math.max(0, finalPrice + discountAmount - basePrice);
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
                <span className="font-medium text-slate-700">{basePrice.toLocaleString("vi-VN")} ₫</span>
              </div>

              {/* Phụ phí dòng xe (không in đậm, màu thường) */}
              {surcharge > 0 && (
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Phụ phí dòng xe</span>
                  <span className="font-normal text-slate-700">
                    +{surcharge.toLocaleString("vi-VN")}₫
                  </span>
                </div>
              )}

              {/* Tổng cộng giảm giá (cộng gộp promotion + voucher) */}
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-slate-600">Tổng cộng giảm giá</span>
                  <p className="text-xs text-slate-400 font-normal">(Đã cộng khuyến mãi và voucher)</p>
                </div>
                {discountAmount > 0 ? (
                  <span className="font-medium" style={{ color: "#EE4D2D" }}>
                    -{discountAmount.toLocaleString("vi-VN")}₫
                  </span>
                ) : (
                  <span className="font-medium text-slate-700">0₫</span>
                )}
              </div>

              {/* Số tiền phải cọc (30%) */}
              <div className="flex justify-between text-sm">
                <div>
                  <span className="text-slate-600">Số tiền phải cọc (30%)</span>
                  <p className="text-xs text-slate-400">Bạn phải cọc trước 30% để giữ slot</p>
                </div>
                <span className="font-medium text-slate-700">
                  -{depositAmount.toLocaleString("vi-VN")}₫
                </span>
              </div>

              {/* Dashed divider */}
              <div className="border-t border-dashed border-slate-200" />

              {/* Tổng tiền phải trả khi check-in */}
              <div className="flex justify-between text-sm">
                <span className="font-semibold text-slate-800">Tổng tiền phải trả khi check-in</span>
                <span className="font-bold text-slate-950">
                  {remainingAmount.toLocaleString("vi-VN")}₫
                </span>
              </div>
            </div>
          </div>
        );
      })()}

      {cancelError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {!canCancelByTime && !isCancelledStatus(booking.status) && !isCompletedStatus(booking.status) ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Không thể hủy vì lịch còn dưới {CANCEL_CUTOFF_MINUTES} phút nữa.
        </div>
      ) : null}

      {/* Actions */}
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
          onClose={() => { setShowCheckInModal(false); setCancelError(null); }}
          loading={checkingIn}
        />
      )}

      {showCancelModal && (
        <CancelModal
          bookingId={booking.id}
          onConfirm={handleConfirmCancel}
          onClose={() => { setShowCancelModal(false); setCancelError(null); }}
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

      if (verification.status === "Pending" || verification.status === "Rejected") {
        setBookings([]);
        setLoading(false);
        return;
      }

      const from = new Date();
      from.setDate(from.getDate() - 1);
      const to = new Date();
      to.setDate(to.getDate() + 60);

      const next = await getBookings(token, toISODate(from), toISODate(to), 1, 50);
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
        setError(err instanceof Error ? err.message : "Không thể tải lịch đặt sắp tới.");
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

  if (status === "Pending" || status === "Rejected") {
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
            {showDetail ? "Chi tiết lịch đặt." : "Bấm vào lịch để xem thông tin chi tiết."}
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
            <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
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
            <div key={i} className="h-20 animate-pulse rounded-lg bg-slate-100" />
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
      {authChecked && token && !loading && !error && showDetail && selectedBooking ? (
        <BookingDetailPanel
          booking={selectedBooking}
          onBack={handleBack}
          onChanged={handleBookingChanged}
          token={token}
        />
      ) : null}

      {/* List view */}
      {authChecked && token && !loading && !error && !showDetail && bookings.length > 0 ? (
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
