"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Ban, ChevronLeft, ChevronRight, LogIn, RefreshCw, X } from "lucide-react";
import {
  cancelAdminBooking,
  completeBooking,
  checkInAdminBooking,
  getAdminBookings,
  getBranches,
  type AdminBooking,
  type AdminBranch,
  type BookingStatus,
} from "@/lib/api/admin";
import { AdminError, AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";

const PAGE_SIZE = 5;

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
    Confirmed: "border-blue-200 bg-blue-50 text-blue-700",
    CheckIn: "border-indigo-200 bg-indigo-50 text-indigo-700",
    InProgress: "border-violet-200 bg-violet-50 text-violet-700",
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
  booking,
  onClose,
}: {
  booking: AdminBooking;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
      <section className="w-full max-w-2xl rounded-lg border border-slate-200 bg-white shadow-2xl" aria-modal="true" role="dialog">
        <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
          <div>
            <p className="text-xs font-black uppercase tracking-wide text-slate-500">Chi tiết lịch đặt</p>
            <h3 className="mt-1 font-mono text-lg font-bold text-slate-950">{booking.id || "-"}</h3>
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

        <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Khách hàng</p>
            <p className="mt-1 font-semibold text-slate-950">{booking.customerName || "-"}</p>
            <p className="text-sm text-slate-500">{booking.customerEmail || "-"}</p>
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
          <div className="sm:col-span-2">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Ghi chú</p>
            <p className="mt-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              {booking.note || "-"}
            </p>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Thời gian tạo</p>
            <p className="mt-1 text-slate-800">{formatDateTime(booking.createdAt)}</p>
          </div>
        </div>
      </section>
    </div>
  );
}

const BOOKING_STATUS_OPTIONS: BookingStatus[] = [
  "Pending",
  "Confirmed",
  "CheckIn",
  "InProgress",
  "Completed",
  "Cancelled",
];

function normalizeSearch(value: string): string {
  return value.trim().toLowerCase();
}

export function AdminBookingsPage() {
  const token = useAdminToken();
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
      if (!token) return;
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
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch đặt.");
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

  async function handleCheckIn(booking: AdminBooking) {
    if (!window.confirm(`Xác nhận khách hàng đã đến check-in cho xe ${booking.vehiclePlate}?`)) return;
    try {
      await checkInAdminBooking(token, booking.id);
      await loadBookings(pageIndex);
    } catch (checkInError) {
      window.alert(checkInError instanceof Error ? checkInError.message : "Không thể check-in booking.");
    }
  }

  async function handleComplete(booking: AdminBooking) {
    const note = window.prompt("Ghi chú hoàn thành", "Đã rửa sạch") ?? "";
    try {
      await completeBooking(token, booking.id, note);
      await loadBookings(pageIndex);
    } catch (completeError) {
      window.alert(completeError instanceof Error ? completeError.message : "Không thể hoàn thành booking.");
    }
  }

  async function handleCancel(booking: AdminBooking) {
    const reason = window.prompt("Lý do hủy", "Khách không đến");
    if (!reason) return;
    try {
      await cancelAdminBooking(token, booking.id, reason);
      await loadBookings(pageIndex);
    } catch (cancelError) {
      window.alert(cancelError instanceof Error ? cancelError.message : "Không thể hủy booking.");
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPageIndex(1);
    void loadBookings(1);
  }

  function goToPage(page: number) {
    const clamped = Math.max(1, Math.min(page, totalPages));
    setPageIndex(clamped);
  }

  const startItem = totalCount === 0 ? 0 : (pageIndex - 1) * PAGE_SIZE + 1;
  const endItem = Math.min(pageIndex * PAGE_SIZE, totalCount);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Quản lý lịch đặt"
        description="Theo dõi booking theo ngày, chi nhánh và xử lý hoàn thành/hủy lịch."
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
              Hiển thị {startItem}–{endItem} trong số {totalCount} booking
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
                <th className="px-4 py-3 text-right">Hành động</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={22} aria-hidden />
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : filteredBookings.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
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
                      <p className="text-xs text-slate-500">{booking.customerEmail || "-"}</p>
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
                    <td className="px-4 py-3 text-right" onClick={(event) => event.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        {booking.status === "Confirmed" || booking.status === "Pending" ? (
                          <button
                            type="button"
                            onClick={() => void handleCheckIn(booking)}
                            className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700 transition hover:bg-indigo-100"
                            title="Check-in khách đến"
                          >
                            <LogIn size={13} aria-hidden />
                            Check-in
                          </button>
                        ) : null}
                        {booking.status === "InProgress" || booking.status === "CheckIn" ? (
                          <button
                            type="button"
                            onClick={() => void handleComplete(booking)}
                            className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100"
                            title="Hoàn thành"
                          >
                            <BadgeCheck size={13} aria-hidden />
                            Hoàn thành
                          </button>
                        ) : null}
                        {booking.status !== "Completed" && booking.status !== "Cancelled" ? (
                          <button
                            type="button"
                            onClick={() => void handleCancel(booking)}
                            className="inline-flex items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                            title="Hủy"
                          >
                            <Ban size={13} aria-hidden />
                            Hủy
                          </button>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalCount > PAGE_SIZE && (
          <div className="flex items-center justify-between border-t border-slate-200 px-4 py-3">
            <p className="text-xs text-slate-500">
              Trang {pageIndex} / {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => goToPage(pageIndex - 1)}
                disabled={pageIndex <= 1 || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={15} aria-hidden />
                Trước
              </button>
              <button
                type="button"
                onClick={() => goToPage(pageIndex + 1)}
                disabled={pageIndex >= totalPages || loading}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                Sau
                <ChevronRight size={15} aria-hidden />
              </button>
            </div>
          </div>
        )}
      </section>

      {selectedBooking ? (
        <BookingDetailModal booking={selectedBooking} onClose={() => setSelectedBooking(null)} />
      ) : null}
    </AdminShell>
  );
}
