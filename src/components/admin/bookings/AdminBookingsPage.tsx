"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { BadgeCheck, Ban, CalendarDays, RefreshCw } from "lucide-react";
import {
  cancelAdminBooking,
  completeBooking,
  getAdminBookings,
  getBookingSlots,
  getBranches,
  type AdminBooking,
  type AdminBookingSlot,
  type AdminBranch,
  type BookingStatus,
} from "@/lib/api/admin";
import { AdminError, AdminPageHeader, AdminShell } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";

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
  const [slots, setSlots] = useState<AdminBookingSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotLoading, setSlotLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const filteredBookings = useMemo(() => {
    const keyword = normalizeSearch(searchTerm);
    if (!keyword) {
      return bookings;
    }

    return bookings.filter((booking) => {
      const haystack = [
        booking.customerName,
        booking.customerEmail,
        booking.vehiclePlate,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return haystack.includes(keyword);
    });
  }, [bookings, searchTerm]);

  const loadBranches = useCallback(async () => {
    if (!token) return;
    try {
      const nextBranches = await getBranches(token, { isActive: true });
      setBranches(nextBranches);
      setBranchId((current) => current || nextBranches[0]?.id || "");
    } catch {
      setBranches([]);
    }
  }, [token]);

  const loadBookings = useCallback(async () => {
    if (!token || !date) return;
    setLoading(true);
    setError(null);
    try {
      const result = await getAdminBookings(token, {
        BranchId: branchId || undefined,
        Date: date,
        Status: status || undefined,
        PageIndex: 1,
        PageSize: 20,
      });
      setBookings(result.items);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải lịch đặt.");
    } finally {
      setLoading(false);
    }
  }, [branchId, date, status, token]);

  const loadSlots = useCallback(async () => {
    if (!token || !branchId || !date) return;
    setSlotLoading(true);
    try {
      const result = await getBookingSlots(token, {
        BranchId: branchId,
        Date: date,
        PageIndex: 1,
        PageSize: 50,
      });
      setSlots(result.items);
    } catch {
      setSlots([]);
    } finally {
      setSlotLoading(false);
    }
  }, [branchId, date, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadBookings();
      void loadSlots();
    }, 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBookings, loadSlots]);

  async function handleComplete(booking: AdminBooking) {
    const note = window.prompt("Ghi chú hoàn thành", "Đã rửa sạch") ?? "";
    try {
      await completeBooking(token, booking.id, note);
      await loadBookings();
      await loadSlots();
    } catch (completeError) {
      window.alert(completeError instanceof Error ? completeError.message : "Không thể hoàn thành booking.");
    }
  }

  async function handleCancel(booking: AdminBooking) {
    const reason = window.prompt("Lý do hủy", "Khách không đến");
    if (!reason) return;
    try {
      await cancelAdminBooking(token, booking.id, reason);
      await loadBookings();
      await loadSlots();
    } catch (cancelError) {
      window.alert(cancelError instanceof Error ? cancelError.message : "Không thể hủy booking.");
    }
  }

  function handleFilter(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadBookings();
    void loadSlots();
  }

  return (
    <AdminShell>
      <AdminPageHeader
        title="Quản lý lịch đặt"
        description="Theo dõi booking theo ngày, chi nhánh và xử lý hoàn thành/hủy lịch."
      />

      <form onSubmit={handleFilter} className="mb-4 flex flex-col gap-3 rounded-lg border border-slate-200 bg-white p-3 md:flex-row">
        <input type="date" value={date} onChange={(event) => setDate(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
        <input
          type="search"
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          placeholder="Tìm biển số, khách hàng, email"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-64"
        />
        <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-72">
          <option value="">Tất cả chi nhánh</option>
          {branches.map((branch) => (
            <option key={branch.id} value={branch.id}>{branch.name}</option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value as BookingStatus | "")} className="rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 md:min-w-44">
          <option value="">Tất cả trạng thái</option>
          {BOOKING_STATUS_OPTIONS.map((item) => (
            <option key={item} value={item}>{item}</option>
          ))}
        </select>
        <button type="submit" className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">
          Lọc
        </button>
      </form>

      {error ? <AdminError message={error} onRetry={loadBookings} /> : null}

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_340px]">
        <section className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="border-b border-slate-200 px-4 py-3">
            <h2 className="font-bold text-slate-950">Danh sách booking</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[840px] text-left text-sm">
              <thead className="bg-slate-50 text-xs font-black uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Khách hàng</th>
                  <th className="px-4 py-3">Chi nhánh</th>
                  <th className="px-4 py-3">Xe</th>
                  <th className="px-4 py-3">Giờ</th>
                  <th className="px-4 py-3">Trạng thái</th>
                  <th className="px-4 py-3 text-right">Hành động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500"><RefreshCw className="mx-auto mb-2 animate-spin text-blue-600" size={22} aria-hidden />Đang tải dữ liệu...</td></tr>
                ) : filteredBookings.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-slate-500">Chưa có booking phù hợp.</td></tr>
                ) : filteredBookings.map((booking) => (
                  <tr key={booking.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3"><p className="font-semibold text-slate-950">{booking.customerName}</p><p className="text-xs text-slate-500">{booking.customerEmail || "-"}</p></td>
                    <td className="px-4 py-3 text-slate-600">{booking.branchName}</td>
                    <td className="px-4 py-3 text-slate-600">{booking.vehiclePlate || "-"}</td>
                    <td className="px-4 py-3 text-slate-600">{formatTime(booking.startTime)}</td>
                    <td className="px-4 py-3 text-slate-600">{booking.status}</td>
                    <td className="px-4 py-3 text-right">
                      <button type="button" onClick={() => void handleComplete(booking)} className="rounded-lg p-2 text-slate-500 hover:bg-emerald-50 hover:text-emerald-600" title="Hoàn thành"><BadgeCheck size={16} aria-hidden /></button>
                      <button type="button" onClick={() => void handleCancel(booking)} className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600" title="Hủy"><Ban size={16} aria-hidden /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-3 flex items-center gap-2">
            <CalendarDays size={18} className="text-blue-600" aria-hidden />
            <h2 className="font-bold text-slate-950">Slot trong ngày</h2>
          </div>
          {slotLoading ? (
            <div className="py-10 text-center text-sm text-slate-500">Đang tải slot...</div>
          ) : slots.length === 0 ? (
            <div className="py-10 text-center text-sm text-slate-500">Chưa có dữ liệu slot.</div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {slots.map((slot, index) => (
                <div key={slot.id ?? `${slot.time}-${index}`} className={`rounded-lg border px-3 py-2 text-sm font-semibold ${slot.isAvailable ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-500"}`}>
                  {formatTime(slot.time || slot.startTime || "")}
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
