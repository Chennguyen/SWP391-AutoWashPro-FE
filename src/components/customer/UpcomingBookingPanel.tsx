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
} from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { cancelBooking, checkInBooking, getBookings } from "@/lib/api/booking";
import type { CustomerBooking } from "@/types/booking";

const CANCEL_CUTOFF_MINUTES = 30;

// ─── Token helpers ─────────────────────────────────────────────────────────────

function subscribeToToken(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function normalizeStoredToken(value: string): string {
  const withoutBearer = value.trim().replace(/^Bearer\s+/i, "");
  if (
    (withoutBearer.startsWith('"') && withoutBearer.endsWith('"')) ||
    (withoutBearer.startsWith("'") && withoutBearer.endsWith("'"))
  ) {
    return withoutBearer.slice(1, -1).trim();
  }
  return withoutBearer;
}

function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function getServerTokenSnapshot(): string | null {
  return null;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

function toISODate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function extractISODate(value = ""): string {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match?.[0] ?? "";
}

function extractHHMM(value = ""): string {
  const match = value.match(/T?(\d{1,2}):(\d{2})/);
  if (!match) {
    return "";
  }

  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function hasTimezone(value: string): boolean {
  return /(?:z|[+-]\d{2}:\d{2})$/i.test(value.trim());
}

function parseBookingDateTime(value = ""): Date | null {
  if (!value) return null;

  // The backend might append a timezone indicator like "Z" to what is actually
  // the local time (e.g. 13:00 gets saved and returned as 13:00:00Z).
  // If we let the browser parse the 'Z', it will apply a +07:00 shift (becoming 20:00).
  // Therefore, we strip the timezone and strictly parse the nominal date and time.
  const normalizedValue = value.replace(/(?:z|[+-]\d{2}:\d{2})$/i, "");

  const date = extractISODate(normalizedValue);
  if (!date) return null;

  const [year = "0", month = "1", day = "1"] = date.split("-");
  const [hour = "0", minute = "0"] = extractHHMM(normalizedValue).split(":");
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );

  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function getBookingDate(booking: CustomerBooking): Date | null {
  const source = booking.startTime || booking.bookingDate;
  return parseBookingDateTime(source);
}

function getBookingEndDate(booking: CustomerBooking): Date | null {
  if (!booking.endTime) return null;
  return parseBookingDateTime(booking.endTime);
}

function formatBookingDate(booking: CustomerBooking): string {
  const date = getBookingDate(booking);
  if (!date) return booking.startTime || booking.bookingDate || "Chưa có thời gian";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateOnly(booking: CustomerBooking): string {
  const date = getBookingDate(booking);
  if (!date) return booking.bookingDate || "Chưa có ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function formatTimeOnly(booking: CustomerBooking): string {
  const date = getBookingDate(booking);
  if (!date) return booking.startTime || "Chưa có giờ";
  return date.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
}

function formatBookingTimeRange(booking: CustomerBooking): string {
  const start = getBookingDate(booking);
  if (!start) return booking.startTime || "Chua co gio";

  const startText = formatTimeOnly(booking);
  const end = getBookingEndDate(booking);
  if (!end) return startText;

  const endText = end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${startText} - ${endText}`;
}

// ─── Status badge ──────────────────────────────────────────────────────────────

function statusStyle(status: string): string {
  const s = status.toLowerCase();
  if (s.includes("cancel") || s.includes("hủy"))
    return "border-red-200 bg-red-50 text-red-700";
  if (s.includes("complete") || s.includes("xong") || s.includes("done"))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  return "border-blue-200 bg-blue-50 text-blue-700";
}

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

function isCancelledStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized.includes("cancel") || normalized.includes("hủy") || normalized.includes("huy");
}

function isCompletedStatus(status: string): boolean {
  const normalized = normalizeStatus(status);
  return normalized.includes("complete") || normalized.includes("done") || normalized.includes("xong");
}

function canCheckIn(status: string): boolean {
  return normalizeStatus(status) === "confirmed";
}

function minutesUntilBooking(booking: CustomerBooking): number | null {
  const date = getBookingDate(booking);
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / 60_000);
}

// ─── Cancel modal ──────────────────────────────────────────────────────────────

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

// ─── Detail panel ──────────────────────────────────────────────────────────────

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
  const [cancelling, setCancelling] = useState(false);
  const [checkingIn, setCheckingIn] = useState(false);
  const [cancelError, setCancelError] = useState<string | null>(null);

  const canCancel =
    !booking.status.toLowerCase().includes("cancel") &&
    !booking.status.toLowerCase().includes("hủy") &&
    !booking.status.toLowerCase().includes("complete");
  const minutesToBooking = minutesUntilBooking(booking);
  const canCancelByTime = minutesToBooking === null || minutesToBooking > CANCEL_CUTOFF_MINUTES;
  const canCancelByLifecycle =
    canCancel &&
    canCancelByTime &&
    !isCancelledStatus(booking.status) &&
    !isCompletedStatus(booking.status);
  const showCheckIn = canCheckIn(booking.status);

  async function handleCheckIn() {
    setCheckingIn(true);
    setCancelError(null);
    try {
      await checkInBooking(token, booking.id);
      await onChanged();
    } catch (err) {
      setCancelError(err instanceof Error ? err.message : "Không thể check-in booking.");
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
      setCancelError(err instanceof Error ? err.message : "Không thể hủy lịch, vui lòng thử lại.");
    } finally {
      setCancelling(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-5">
      {/* Back button */}
      <button
        type="button"
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm font-semibold text-slate-600 hover:text-slate-900 transition"
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
        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <CalendarDays size={13} aria-hidden />
            Ngày
          </div>
          <p className="mt-2 font-bold text-slate-950">{formatDateOnly(booking)}</p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Clock size={13} aria-hidden />
            Giờ
          </div>
          <p className="mt-2 font-bold text-slate-950">
            {formatBookingTimeRange(booking)}
          </p>
        </div>

        <div className="rounded-lg bg-slate-50 p-4">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <Car size={13} aria-hidden />
            Xe
          </div>
          <p className="mt-2 font-bold text-slate-950">
            {booking.vehicleLicensePlate || "Xe đã chọn"}
          </p>
        </div>

        {booking.serviceName && (
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Wrench size={13} aria-hidden />
              Dịch vụ
            </div>
            <p className="mt-2 font-bold text-slate-950">{booking.serviceName}</p>
          </div>
        )}

        {booking.totalPrice !== undefined && (
          <div className="rounded-lg bg-slate-50 p-4">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
              <Banknote size={13} aria-hidden />
              Tổng tiền
            </div>
            <p className="mt-2 font-bold text-slate-950">
              {booking.totalPrice.toLocaleString("vi-VN")}₫
            </p>
          </div>
        )}

        <div className="rounded-lg bg-slate-50 p-4 sm:col-span-2">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
            <MapPin size={13} aria-hidden />
            Mã lịch
          </div>
          <p className="mt-2 font-mono font-bold text-slate-950">{booking.id}</p>
        </div>
      </div>

      {/* Cancel error */}
      {cancelError && (
        <div role="alert" className="mt-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {cancelError}
        </div>
      )}

      {canCancel && !canCancelByTime ? (
        <div className="mt-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Không thể hủy vì lịch còn dưới {CANCEL_CUTOFF_MINUTES} phút nữa.
        </div>
      ) : null}

      {/* Actions */}
      {showCheckIn ? (
        <div className="mt-5">
          <button
            type="button"
            onClick={() => void handleCheckIn()}
            disabled={checkingIn || cancelling}
            className="inline-flex items-center gap-2 rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <CheckCircle2 size={16} aria-hidden />
            {checkingIn ? "Đang check-in..." : "Check-in"}
          </button>
        </div>
      ) : null}
      {canCancelByLifecycle && (
        <div className={showCheckIn ? "mt-3" : "mt-5"}>
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

// ─── Main panel ────────────────────────────────────────────────────────────────

export function UpcomingBookingPanel() {
  const tokenSnapshot = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const [bookings, setBookings] = useState<CustomerBooking[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showDetail, setShowDetail] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selectedBooking = useMemo(
    () => bookings.find((b) => b.id === selectedId) ?? null,
    [bookings, selectedId],
  );

  const loadBookings = useCallback(async () => {
    if (!token) return;
    const from = new Date();
    const to = new Date();
    to.setDate(to.getDate() + 30);
    setLoading(true);
    setError(null);
    try {
      const next = await getBookings(token, toISODate(from), toISODate(to), 1, 20);
      setBookings(next);
      setSelectedId((cur) => {
        if (cur && next.some((b) => b.id === cur)) return cur;
        return next[0]?.id ?? null;
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
      {authChecked && token && error ? (
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
          {bookings.map((booking) => (
            <button
              key={booking.id}
              type="button"
              onClick={() => handleSelectBooking(booking)}
              className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold text-slate-950">{booking.branchName}</p>
                  <div className="mt-2 flex items-center gap-2 text-sm text-slate-500">
                    <CalendarDays size={14} className="shrink-0" aria-hidden />
                    <span>{formatBookingDate(booking)}</span>
                  </div>
                  <div className="mt-1 flex items-center gap-2 text-sm text-slate-500">
                    <Car size={14} className="shrink-0" aria-hidden />
                    <span>{booking.vehicleLicensePlate || "Xe đã chọn"}</span>
                  </div>
                </div>
                <span
                  className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}
                >
                  {booking.status}
                </span>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
