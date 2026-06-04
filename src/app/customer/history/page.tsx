"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { ChevronLeft, ChevronRight, RefreshCw, SlidersHorizontal } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getBookings } from "@/lib/api/booking";
import type { CustomerBooking } from "@/types/booking";
import {
  subscribeToToken,
  getTokenSnapshot,
  getServerTokenSnapshot,
  toISODate,
  extractISODate,
} from "@/lib/booking-helpers";
import { BookingCard } from "@/components/customer/booking/BookingCard";
import { BookingDetailModal } from "@/components/customer/booking/BookingDetailModal";
import { CancelBookingModal } from "@/components/customer/booking/CancelBookingModal";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 5;

/**
 * Trang (Page) BookingHistoryPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/history/page.tsx
 */
export default function BookingHistoryPage() {
  const tokenSnapshot = useSyncExternalStore(subscribeToToken, getTokenSnapshot, getServerTokenSnapshot);
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const [allBookings, setAllBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal state
  const [detailBooking, setDetailBooking] = useState<CustomerBooking | null>(null);
  const [cancelBooking, setCancelBooking] = useState<CustomerBooking | null>(null);

  // Date filter defaults: last 3 months → today
  const today = toISODate(new Date());
  const threeMonthsAgo = toISODate(new Date(Date.now() - 90 * 24 * 60 * 60 * 1000));
  const [fromDate, setFromDate] = useState(threeMonthsAgo);
  const [toDate, setToDate] = useState(today);

  // Pagination
  const [currentPage, setCurrentPage] = useState(1);

  // ⚡ FIX: Clear stale data immediately when token changes (account switch / logout)
  useEffect(() => {
    setAllBookings([]);
    setCurrentPage(1);
    setError(null);
  }, [token]);

  // Client-side filter by date for instant UX
  const filtered = allBookings.filter((b) => {
    const source = b.startTime || b.bookingDate || "";
    const dateStr = extractISODate(source);
    if (!dateStr) return true;
    return dateStr >= fromDate && dateStr <= toDate;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const loadBookings = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const farPast = toISODate(new Date(Date.now() - 365 * 24 * 60 * 60 * 1000));
      const farFuture = toISODate(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000));
      // fetch: no-store so we always get fresh data (handled inside getBookings)
      const data = await getBookings(token, farPast, farFuture, 1, 200);
      setAllBookings(data);
      setCurrentPage(1);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        setError("Phiên đăng nhập đã hết hạn.");
      } else {
        setError(err instanceof Error ? err.message : "Không thể tải lịch sử đặt lịch.");
      }
    } finally {
      setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    if (!authChecked || !token) return;
    void loadBookings();
  }, [authChecked, loadBookings, token]);

  // Reset to page 1 when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [fromDate, toDate]);

  function handlePageChange(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function getPageNumbers(): number[] {
    const delta = 2;
    const start = Math.max(1, currentPage - delta);
    const end = Math.min(totalPages, currentPage + delta);
    const pages: number[] = [];
    for (let i = start; i <= end; i++) pages.push(i);
    return pages;
  }

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">Lịch sử rửa xe</h1>
        <p className="mt-1 text-sm text-slate-500">Xem toàn bộ lịch đặt rửa xe của bạn.</p>
      </div>

      {/* Date filter */}
      <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <SlidersHorizontal size={16} className="text-slate-400 shrink-0 mt-auto mb-1" aria-hidden />
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Từ ngày
          </label>
          <input
            type="date"
            value={fromDate}
            max={toDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Đến ngày
          </label>
          <input
            type="date"
            value={toDate}
            min={fromDate}
            onChange={(e) => setToDate(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={loadBookings}
          disabled={loading || !token}
          className="ml-auto flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
          Tải lại
        </button>
      </div>

      {/* Not logged in */}
      {!authChecked || !token ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
          Vui lòng đăng nhập để xem lịch sử.
        </div>
      ) : null}

      {/* Loading */}
      {authChecked && token && loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
          ))}
        </div>
      ) : null}

      {/* Error */}
      {authChecked && token && !loading && error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {/* Empty */}
      {authChecked && token && !loading && !error && filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
          Không có lịch đặt nào trong khoảng thời gian này.
        </div>
      ) : null}

      {/* Booking list */}
      {authChecked && token && !loading && !error && filtered.length > 0 ? (
        <>
          <p className="mb-3 text-xs font-medium text-slate-400">
            Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–
            {Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} lịch đặt
          </p>

          <div className="space-y-3">
            {paginated.map((b) => (
              <BookingCard
                key={b.id}
                booking={b}
                onClick={(clicked) => setDetailBooking(clicked)}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 ? (
            <nav
              className="mt-6 flex items-center justify-center gap-1"
              aria-label="Phân trang lịch sử"
            >
              {/* Prev */}
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                aria-label="Trang trước"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronLeft size={16} />
              </button>

              {/* Page numbers */}
              {getPageNumbers().map((page) => (
                <button
                  key={page}
                  onClick={() => handlePageChange(page)}
                  aria-label={`Trang ${page}`}
                  aria-current={page === currentPage ? "page" : undefined}
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-lg border text-sm font-medium transition",
                    page === currentPage
                      ? "border-blue-600 bg-blue-600 text-white"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50",
                  )}
                >
                  {page}
                </button>
              ))}

              {/* Next */}
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                aria-label="Trang sau"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <ChevronRight size={16} />
              </button>
            </nav>
          ) : null}
        </>
      ) : null}

      {/* Detail modal */}
      {detailBooking ? (
        <BookingDetailModal
          booking={detailBooking}
          onClose={() => setDetailBooking(null)}
          onRequestCancel={(b) => {
            setDetailBooking(null);
            setCancelBooking(b);
          }}
        />
      ) : null}

      {/* Cancel modal */}
      {cancelBooking ? (
        <CancelBookingModal
          booking={cancelBooking}
          token={token}
          onClose={() => setCancelBooking(null)}
          onSuccess={() => {
            setCancelBooking(null);
            setDetailBooking(null);
            void loadBookings();
          }}
        />
      ) : null}
    </main>
  );
}
