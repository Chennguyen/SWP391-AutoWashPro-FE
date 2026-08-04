"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  CalendarDays,
  CarFront,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  Clock3,
  LoaderCircle,
  MapPin,
  RefreshCw,
  UserRound,
  X,
} from "lucide-react";
import {
  getAdminBookings,
  getBranches,
  type AdminBooking,
  type AdminBranch,
  type BookingStatus,
} from "@/features/admin/services";
import { AdminError, AdminPageHeader, AdminShell } from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import { useCheckInAdminBookingMutation } from "@/features/admin/hooks/useAdmin";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";
import { Button } from "@/components/ui/button";
import { getBooking } from "@/features/booking/booking-service";
import { BookingPriceSummary } from "@/features/booking/components/booking-price-summary";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import { getLoyaltySettings, type LoyaltyPointsConfig } from "@/features/loyalty/loyalty-admin-service";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;
const BUSINESS_TIMEZONE_OFFSET = "+07:00";

function todayISO() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatTime(value: string) {
  if (!value) return "-";
  const match = value.match(/T?(\d{1,2}):(\d{2})/);
  if (match) {
    return `${match[1].padStart(2, "0")}:${match[2]}`;
  }
  return value;
}

function formatBookingDate(value: string) {
  if (!value) return "-";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[3]}/${match[2]}/${match[1]}`;
}

function getBookingStartTimestamp(booking: AdminBooking): number | null {
  const dateMatch = booking.startTime.match(/(\d{4})-(\d{2})-(\d{2})/) ??
    booking.bookingDate.match(/(\d{4})-(\d{2})-(\d{2})/);
  const timeMatch = booking.startTime.match(/T?(\d{1,2}):(\d{2})(?::(\d{2}))?/);

  if (!dateMatch || !timeMatch) return null;

  const [, year, month, day] = dateMatch;
  const [, hour, minute, second = "00"] = timeMatch;
  const timezone = booking.startTime.match(/(Z|[+-]\d{2}:\d{2})$/i)?.[1] ??
    BUSINESS_TIMEZONE_OFFSET;
  const isoValue = `${year}-${month}-${day}T${hour.padStart(2, "0")}:${minute}:${second}${timezone}`;
  const timestamp = Date.parse(isoValue);

  return Number.isNaN(timestamp) ? null : timestamp;
}

function formatDateTime(value?: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

const STATUS_LABEL: Record<string, string> = {
  Pending: "Chờ xác nhận",
  Confirmed: "Đã xác nhận",
  CheckIn: "Check-in",
  InProgress: "Đang rửa",
  Completed: "Hoàn thành",
  Cancelled: "Đã hủy",
};

function statusBadge(status: string) {
  const colors: Record<string, string> = {
    Pending: "border-amber-200 bg-amber-50 text-amber-700",
    Confirmed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CheckIn: "border-indigo-200 bg-indigo-50 text-indigo-700",
    InProgress: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Completed: "border-emerald-200 bg-emerald-50 text-emerald-700",
    Cancelled: "border-red-200 bg-red-50 text-red-600",
  };
  return (
    <span
      className={`inline-block rounded-full border px-2.5 py-0.5 text-xs font-semibold ${colors[status] ?? "border-slate-200 bg-slate-50 text-slate-600"}`}
    >
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

function BookingDetailModal({
  booking: initialBooking,
  onClose,
  onCheckIn,
}: {
  booking: AdminBooking;
  onClose: () => void;
  onCheckIn: (booking: AdminBooking) => void;
}) {
  const token = useAdminToken();
  const [configs, setConfigs] = useState<LoyaltyPointsConfig | null>(null);
  const [detailedBooking, setDetailedBooking] = useState<AdminBooking | null>(null);
  const [now, setNow] = useState(() => Date.now());

  const booking = detailedBooking ?? initialBooking;

  const checkInStartAt = getBookingStartTimestamp(booking);
  const isBeforeCheckInTime = checkInStartAt !== null && now < checkInStartAt;
  const checkInTooltipId = `check-in-tooltip-${booking.id}`;

  useEffect(() => {
    if (!token) return;
    let active = true;
    async function loadAuxData() {
      try {
        const [settings, fullDetail] = await Promise.all([
          getLoyaltySettings(token).catch(() => null),
          getBooking(token, initialBooking.id).catch(() => null),
        ]);
        if (!active) return;
        if (settings) setConfigs(settings);
        if (fullDetail) {
          const detailReason =
            fullDetail.cancelReason?.trim() ||
            (fullDetail as any).reason?.trim() ||
            (fullDetail as any).Reason?.trim() ||
            (fullDetail as any).cancellationReason?.trim() ||
            (fullDetail as any).CancellationReason?.trim();

          setDetailedBooking((prev) => ({
            ...initialBooking,
            ...(prev ?? {}),
            cancelReason: detailReason || initialBooking.cancelReason,
            note: fullDetail.cancelReason || initialBooking.note,
            serviceBasePrice: fullDetail.serviceBasePrice ?? initialBooking.serviceBasePrice,
            vehicleSurcharge: fullDetail.vehicleSurcharge ?? initialBooking.vehicleSurcharge,
            basePrice: fullDetail.basePrice ?? initialBooking.basePrice,
            discountAmount: fullDetail.discountAmount ?? initialBooking.discountAmount,
            finalPrice: fullDetail.finalPrice ?? initialBooking.finalPrice,
          }));
        }
      } catch {
        // Fallback
      }
    }
    void loadAuxData();
    return () => { active = false; };
  }, [token, initialBooking.id]);

  useEffect(() => {
    if (checkInStartAt === null) return;

    const remaining = checkInStartAt - Date.now();
    if (remaining <= 0) return;

    const timeoutId = window.setTimeout(
      () => setNow(Date.now()),
      Math.min(remaining + 100, 60_000),
    );
    return () => window.clearTimeout(timeoutId);
  }, [checkInStartAt, now]);

  const customerBooking: CustomerBooking = useMemo(() => {
    const baseP = booking.basePrice ?? ((configs?.basePrice ?? 100000) + (booking.vehicleSurcharge ?? (configs?.suvBasePrice ?? 60000)));
    const finalP = booking.finalPrice ?? 128000;
    const discA = booking.discountAmount ?? (baseP > finalP ? baseP - finalP : 0);

    return {
      id: booking.id,
      branchName: booking.branchName,
      vehicleLicensePlate: booking.vehiclePlate,
      vehicleType: booking.vehicleType,
      bookingDate: booking.bookingDate,
      startTime: booking.startTime,
      endTime: booking.endTime,
      status: booking.status,
      basePrice: baseP,
      discountAmount: discA,
      finalPrice: finalP,
      serviceBasePrice: booking.serviceBasePrice,
      vehicleSurcharge: booking.vehicleSurcharge,
    };
  }, [booking, configs]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section className="relative flex max-h-[85vh] w-full max-w-2xl flex-col overflow-hidden rounded-lg border border-slate-200 bg-white shadow-2xl" aria-modal="true" role="dialog">
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Chi tiết lịch đặt</p>
            <h3 className="mt-1 text-lg font-bold text-slate-950">{booking.customerName || "Khách hàng"}</h3>
            <p className="mt-0.5 text-sm text-slate-500">
              {booking.branchName || "-"} · {booking.vehiclePlate || "-"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X size={18} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</p>
              <p className="mt-1 font-semibold text-slate-950">{booking.customerName || "-"}</p>
              {booking.customerEmail?.trim() ? (
                <p className="text-sm text-slate-500">{booking.customerEmail}</p>
              ) : null}
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Biển số xe</p>
              <p className="mt-1 font-mono text-base font-bold text-slate-800">{booking.vehiclePlate || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chi nhánh</p>
              <p className="mt-1 font-semibold text-slate-800">{booking.branchName || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Trạng thái</p>
              <div className="mt-1">{statusBadge(booking.status)}</div>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ngày đặt</p>
              <p className="mt-1 text-slate-800">{booking.bookingDate || "-"}</p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khung giờ rửa</p>
              <p className="mt-1 text-slate-800">
                {booking.endTime
                  ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}`
                  : formatTime(booking.startTime)}
              </p>
            </div>
            {booking.note?.trim() ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</p>
                <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
                  {booking.note}
                </p>
              </div>
            ) : null}
            {booking.createdAt?.trim() ? (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian tạo</p>
                <p className="mt-1 text-slate-800">{formatDateTime(booking.createdAt)}</p>
              </div>
            ) : null}
            {booking.status === "Cancelled" || booking.status === "Đã hủy" ? (
              <div className="sm:col-span-2">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Lý do hủy</p>
                <p className="mt-1 text-sm font-medium text-slate-800">
                  {booking.cancelReason?.trim()
                    ? booking.cancelReason
                    : booking.note?.trim() && !booking.note.toLowerCase().includes("hệ thống tự động hủy")
                      ? booking.note
                      : "Hệ thống tự động hủy lịch do quá thời hạn giữ chỗ/khung giờ hẹn rửa xe mà khách hàng không đến check-in."}
                </p>
              </div>
            ) : null}
          </div>

          <div className="border-t border-slate-200 pt-4">
            <BookingPriceSummary
              booking={customerBooking}
              isLoading={false}
              error={null}
              depositRate={configs?.paymentDeposite ?? 30}
              configs={configs}
            />
          </div>
        </div>

        {booking.status === "Confirmed" ? (
          <div className="flex shrink-0 justify-end border-t border-slate-200 bg-white px-5 py-4">
            <span
              className={cn(
                "group relative inline-flex",
                isBeforeCheckInTime && "cursor-not-allowed",
              )}
              tabIndex={isBeforeCheckInTime ? 0 : undefined}
              aria-describedby={isBeforeCheckInTime ? checkInTooltipId : undefined}
            >
              <Button
                type="button"
                disabled={isBeforeCheckInTime}
                onClick={() => onCheckIn(booking)}
                className="bg-[var(--gold-primary)] font-bold text-[#17130f] hover:bg-[#cdb78d] focus-visible:ring-[rgba(188,163,116,0.35)] disabled:bg-[#5b4e37] disabled:text-[#a09c94] disabled:opacity-100"
              >
                <CheckCircle2 data-icon="inline-start" aria-hidden />
                Check-in
              </Button>

              {isBeforeCheckInTime ? (
                <span
                  id={checkInTooltipId}
                  role="tooltip"
                  className="pointer-events-none invisible absolute right-0 bottom-full z-10 mb-2 w-max max-w-[260px] translate-y-1 rounded-[8px] border border-[rgba(188,163,116,0.25)] bg-[#161619] px-3 py-2 text-center text-xs leading-5 font-medium text-[#fffdf9] opacity-0 shadow-xl transition duration-150 group-hover:visible group-hover:translate-y-0 group-hover:opacity-100 group-focus-visible:visible group-focus-visible:translate-y-0 group-focus-visible:opacity-100"
                >
                  Chưa đến thời điểm check-in. Có thể check-in từ {formatTime(booking.startTime)} ngày {formatBookingDate(booking.bookingDate)}.
                </span>
              ) : null}
            </span>
          </div>
        ) : null}
      </section>
    </div>
  );
}

const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  "Confirmed",
  "InProgress",
  "Completed",
  "Cancelled",
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Thành phần (Component) AdminBookingsPage
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminBookingsPage() {
  const token = useAdminToken();
  const checkInMutation = useCheckInAdminBookingMutation(token);
  const { showToast } = useNotifications();
  const [date, setDate] = useState(todayISO());
  const [branchId, setBranchId] = useState("");
  const [status, setStatus] = useState<BookingStatus | "">("");
  const [searchTerm, setSearchTerm] = useState("");
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [bookings, setBookings] = useState<AdminBooking[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [pageIndex, setPageIndex] = useState(1);
  const [loading, setLoading] = useState(false);
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedBooking, setSelectedBooking] = useState<AdminBooking | null>(null);
  const [checkInBooking, setCheckInBooking] = useState<AdminBooking | null>(null);

  const filteredBookings = useMemo(() => {
    const keyword = normalizeSearch(searchTerm);
    if (!keyword) return bookings;
    return bookings.filter((booking) => {
      const haystack = [booking.customerName, booking.customerEmail, booking.vehiclePlate]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(keyword);
    });
  }, [bookings, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  function getPageNumbers(): number[] {
    const visiblePageCount = Math.min(3, totalPages);
    const maxStartPage = totalPages - visiblePageCount + 1;
    const startPage = Math.min(
      Math.max(1, pageIndex - 1),
      maxStartPage,
    );

    return Array.from(
      { length: visiblePageCount },
      (_, index) => startPage + index,
    );
  }

  const loadBranches = useCallback(async () => {
    if (!token) return;
    try {
      const nextBranches = await getBranches(token, { isActive: true });
      setBranches(nextBranches);
    } catch {
      setBranches([]);
    }
  }, [token]);

  const loadBookings = useCallback(
    async (page = pageIndex) => {
      if (!token) return null;
      setLoading(true);
      setError(null);
      try {
        const result = await getAdminBookings(token, {
          BranchId: branchId || undefined,
          Date: date || undefined,
          Status: status || undefined,
          PageIndex: page,
          PageSize: PAGE_SIZE,
        });
        setBookings(result.items);
        setTotalCount(result.totalCount);
        return result.items;
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch đặt.");
        return null;
      } finally {
        setLoading(false);
      }
    },
    [branchId, date, status, token, pageIndex],
  );

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBookings(pageIndex), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBookings, pageIndex]);

  useEffect(() => {
    if (!autoRefresh) return;
    const interval = setInterval(() => void loadBookings(pageIndex), 30000);
    return () => clearInterval(interval);
  }, [autoRefresh, loadBookings, pageIndex]);

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageIndex(1);
    void loadBookings(1);
  }

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setPageIndex(clamped);
  }

  function openCheckInDialog(booking: AdminBooking) {
    setSelectedBooking(null);
    setCheckInBooking(booking);
  }

  async function handleConfirmCheckIn() {
    if (!checkInBooking || checkInMutation.isPending) return;

    const bookingId = checkInBooking.id;
    try {
      const result = await checkInMutation.mutateAsync(bookingId);

      if (result.status === "InProgress") {
        showToast({
          title: "Check-in thành công",
          message: result.message || "Booking đã chuyển sang trạng thái đang rửa.",
          type: "BookingCompleted",
        });
      } else {
        showToast({
          title: "Check-in không thành công",
          message: result.message || "Booking không thể chuyển sang trạng thái đang rửa.",
          type: result.status === "Cancelled" ? "BookingCancelled" : "SystemAlert",
          tone: "error",
        });
      }

      setCheckInBooking(null);
      setSelectedBooking(null);
      await loadBookings(pageIndex);
    } catch (checkInError) {
      showToast({
        title: "Không thể check-in",
        message:
          checkInError instanceof Error
            ? checkInError.message
            : "Không thể check-in booking. Vui lòng thử lại.",
        type: "SystemAlert",
        tone: "error",
      });

      const refreshedBookings = await loadBookings(pageIndex);
      if (refreshedBookings) {
        const refreshedBooking = refreshedBookings.find((booking) => booking.id === bookingId);
        if (!refreshedBooking || refreshedBooking.status !== "Confirmed") {
          setCheckInBooking(null);
          setSelectedBooking(null);
        } else {
          setCheckInBooking(refreshedBooking);
        }
      }
    }
  }

  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(pageIndex * PAGE_SIZE, totalCount);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Quản lý lịch đặt"
        description="Theo dõi booking theo ngày, chi nhánh và trạng thái."
        actions={
          <label className="flex cursor-pointer select-none items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50">
            <input
              type="checkbox"
              checked={autoRefresh}
              onChange={(e) => setAutoRefresh(e.target.checked)}
              className="h-4 w-4 accent-blue-600"
            />
            Tự động làm mới (30s)
          </label>
        }
      />

      <form onSubmit={handleFilter} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row">
        <input
          type="date"
          value={date}
          onChange={(event) => setDate(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm biển số, khách hàng, email"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-56"
        />
        <select
          value={branchId}
          onChange={(event) => setBranchId(event.target.value)}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-56"
        >
          <option value="">Tất cả chi nhánh</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value as BookingStatus | "")}
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-44"
        >
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>{STATUS_LABEL[item] ?? item}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Lọc
        </button>
      </form>

      {error ? <AdminError message={error} onRetry={() => void loadBookings(pageIndex)} /> : null}

      <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
          <h2 className="font-bold text-slate-950">Danh sách booking</h2>
          {totalCount > 0 && (
            <span className="text-xs text-slate-500">
              Hiển thị {startItem}-{endItem} trong số {totalCount} booking
            </span>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-sm">
            <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Khách hàng</th>
                <th className="px-4 py-3">Chi nhánh</th>
                <th className="px-4 py-3">Xe</th>
                <th className="px-4 py-3">Ngày / Giờ</th>
                <th className="px-4 py-3">Trạng thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={22} aria-hidden />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-12 text-center text-slate-500">
                    Chưa có booking phù hợp.
                  </td>
                </tr>
              ) : (
                filteredBookings.map((booking) => (
                  <tr
                    key={booking.id}
                    className="cursor-pointer hover:bg-slate-50 focus-within:bg-slate-50"
                    tabIndex={0}
                    onClick={() => setSelectedBooking(booking)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        setSelectedBooking(booking);
                      }
                    }}
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-950">{booking.customerName}</p>
                      {booking.customerEmail?.trim() ? (
                        <p className="text-xs text-slate-500">{booking.customerEmail}</p>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{booking.branchName}</td>
                    <td className="px-4 py-3 font-mono text-sm font-semibold text-slate-700">{booking.vehiclePlate || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">
                      <p>{booking.bookingDate}</p>
                      <p className="text-xs text-slate-400">
                        {booking.endTime ? `${formatTime(booking.startTime)} - ${formatTime(booking.endTime)}` : formatTime(booking.startTime)}
                      </p>
                    </td>
                    <td className="px-4 py-3">{statusBadge(booking.status)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {(pageIndex > 1 || bookings.length > 0) && (
          <nav
            className="mt-6 mb-4 flex items-center justify-center gap-1"
            aria-label="Phân trang lịch đặt"
          >
            <Button
              type="button"
              variant="outline"
              size="icon-lg"
              onClick={() => goToPage(1)}
              disabled={pageIndex === 1 || loading}
              aria-label="Về trang đầu"
              className="border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            >
              <ChevronsLeft aria-hidden />
            </Button>

            {/* Prev */}
            <button
              type="button"
              onClick={() => goToPage(pageIndex - 1)}
              disabled={pageIndex === 1 || loading}
              aria-label="Trang trước"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronLeft size={16} />
            </button>

            {/* Page numbers */}
            {getPageNumbers().map((page) => (
              <button
                key={page}
                type="button"
                onClick={() => goToPage(page)}
                disabled={loading}
                aria-label={`Trang ${page}`}
                aria-current={page === pageIndex ? "page" : undefined}
                className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition",
                  page === pageIndex
                    ? "border-blue-600 bg-blue-600 text-white"
                    : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
                )}
              >
                {page}
              </button>
            ))}

            {/* Next */}
            <button
              type="button"
              onClick={() => goToPage(pageIndex + 1)}
              disabled={pageIndex >= totalPages || loading}
              aria-label="Trang sau"
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
            >
              <ChevronRight size={16} />
            </button>
          </nav>
        )}
      </section>

      {selectedBooking ? (
        <BookingDetailModal
          booking={selectedBooking}
          onClose={() => setSelectedBooking(null)}
          onCheckIn={openCheckInDialog}
        />
      ) : null}

      <Dialog
        open={checkInBooking !== null}
        onOpenChange={(open) => {
          if (!open && !checkInMutation.isPending) {
            setCheckInBooking(null);
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          overlayClassName="bg-black/70 backdrop-blur-[3px]"
          className="admin-brand-surface gap-0 overflow-hidden rounded-[16px] border border-[var(--border-box)] bg-[var(--background-main)] p-0 text-[var(--text-light)] shadow-[0_28px_80px_rgba(0,0,0,0.52)] ring-0 [font-family:Arial,Helvetica,sans-serif] sm:max-w-[576px]"
        >
          <DialogHeader className="relative gap-0 border-b border-[var(--border-box)] px-[20px] py-[20px] pr-[60px] sm:px-[24px] sm:py-[24px] sm:pr-[64px]">
            <div className="mb-[16px] flex size-[40px] items-center justify-center rounded-[12px] bg-[rgba(188,163,116,0.12)] text-[var(--gold-primary)] ring-1 ring-[rgba(188,163,116,0.28)]">
              <CheckCircle2 className="size-[20px]" aria-hidden />
            </div>
            <DialogTitle className="text-[22px] leading-[28px] font-bold tracking-[-0.01em] text-[var(--text-light)] sm:text-[24px]">
              Xác nhận check-in
            </DialogTitle>
            <DialogDescription className="mt-[6px] max-w-[448px] text-[14px] leading-[22px] text-[var(--text-secondary)]">
              Kiểm tra đúng khách hàng, phương tiện và lịch hẹn trước khi tiếp tục.
            </DialogDescription>
            <DialogClose
              className="absolute top-[16px] right-[16px] inline-flex size-[36px] items-center justify-center rounded-[10px] text-[var(--text-secondary)] outline-none transition hover:bg-white/5 hover:text-[var(--text-light)] focus-visible:ring-2 focus-visible:ring-[var(--gold-primary)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background-main)] disabled:pointer-events-none disabled:opacity-50 sm:top-[20px] sm:right-[20px]"
              disabled={checkInMutation.isPending}
              aria-label="Đóng"
            >
              <X className="size-[20px]" aria-hidden />
            </DialogClose>
          </DialogHeader>

          {checkInBooking ? (
            <div className="px-[20px] py-[20px] sm:px-[24px]">
              <div className="grid gap-x-[24px] gap-y-[20px] rounded-[12px] border border-[var(--border-box)] bg-[var(--background-outer)] p-[16px] sm:grid-cols-2 sm:p-[20px]">
                <div className="flex min-w-0 items-start gap-[12px]">
                  <UserRound className="mt-[2px] size-[16px] shrink-0 text-[var(--gold-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">Khách hàng</p>
                    <p className="mt-[4px] truncate text-[14px] leading-[20px] font-semibold text-[var(--text-light)]">
                      {checkInBooking.customerName || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-[12px]">
                  <CarFront className="mt-[2px] size-[16px] shrink-0 text-[var(--gold-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">Biển số xe</p>
                    <p className="mt-[4px] truncate text-[14px] leading-[20px] font-bold text-[var(--text-light)] [font-family:ui-monospace,SFMono-Regular,Menlo,Monaco,Consolas,monospace]">
                      {checkInBooking.vehiclePlate || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-[12px] sm:col-span-2">
                  <MapPin className="mt-[2px] size-[16px] shrink-0 text-[var(--gold-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">Chi nhánh</p>
                    <p className="mt-[4px] truncate text-[14px] leading-[20px] font-semibold text-[var(--text-light)]">
                      {checkInBooking.branchName || "Chưa cập nhật"}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-[12px]">
                  <CalendarDays className="mt-[2px] size-[16px] shrink-0 text-[var(--gold-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">Ngày hẹn</p>
                    <p className="mt-[4px] text-[14px] leading-[20px] font-semibold text-[var(--text-light)]">
                      {formatBookingDate(checkInBooking.bookingDate)}
                    </p>
                  </div>
                </div>

                <div className="flex min-w-0 items-start gap-[12px]">
                  <Clock3 className="mt-[2px] size-[16px] shrink-0 text-[var(--gold-primary)]" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-[12px] leading-[16px] font-semibold text-[var(--text-secondary)]">Khung giờ</p>
                    <p className="mt-[4px] whitespace-nowrap text-[14px] leading-[20px] font-semibold text-[var(--text-light)]">
                      {checkInBooking.endTime
                        ? `${formatTime(checkInBooking.startTime)} - ${formatTime(checkInBooking.endTime)}`
                        : formatTime(checkInBooking.startTime)}
                    </p>
                  </div>
                </div>
              </div>

              <p className="mt-[16px] rounded-[12px] border border-[rgba(188,163,116,0.28)] bg-[rgba(188,163,116,0.09)] px-[16px] py-[12px] text-[14px] leading-[20px] text-[#d8c49f]">
                Booking sẽ chuyển sang trạng thái <span className="font-semibold">Đang rửa</span> ngay sau khi check-in.
              </p>
            </div>
          ) : null}

          <DialogFooter className="m-0 grid grid-cols-1 gap-[8px] rounded-none border-t border-[var(--border-box)] bg-[#121214] px-[20px] py-[16px] sm:flex sm:px-[24px]">
            <Button
              type="button"
              variant="outline"
              disabled={checkInMutation.isPending}
              onClick={() => setCheckInBooking(null)}
              className="h-[40px] border-[var(--border-box)] bg-transparent px-[16px] text-[14px] font-semibold text-[var(--text-body)] hover:border-[rgba(188,163,116,0.45)] hover:bg-white/5 hover:text-[var(--text-light)]"
            >
              Hủy
            </Button>
            <Button
              type="button"
              disabled={checkInMutation.isPending}
              aria-busy={checkInMutation.isPending}
              onClick={() => void handleConfirmCheckIn()}
              className="h-[40px] bg-[var(--gold-primary)] px-[16px] text-[14px] font-bold text-[#17130f] hover:bg-[#cdb78d] focus-visible:border-[var(--gold-primary)] focus-visible:ring-[rgba(188,163,116,0.35)]"
            >
              {checkInMutation.isPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden />
              ) : (
                <CheckCircle2 data-icon="inline-start" aria-hidden />
              )}
              {checkInMutation.isPending ? "Đang check-in..." : "Xác nhận check-in"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </AdminShell>
  );
}
