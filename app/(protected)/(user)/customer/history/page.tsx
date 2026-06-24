"use client";

import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { getBookings } from "@/features/booking/booking-service";
import type { CustomerBooking } from "@/features/booking/booking-types";
import {
  subscribeToToken,
  getTokenSnapshot,
  getServerTokenSnapshot,
  toISODate,
  extractISODate,
  isUpcomingStatus,
  isCompletedStatus,
  isCancelledStatus,
} from "@/features/booking/utils";
import { BookingDetailModal } from "@/features/booking/components/booking-detail-modal";
import { CancelBookingModal } from "@/features/booking/components/cancel-booking-modal";
import { BookingHistoryFilter } from "@/features/booking/components/booking-history-filter";
import { BookingHistoryList } from "@/features/booking/components/booking-history-list";

const PAGE_SIZE = 5;

/**
 * Trang (Page) BookingHistoryPage
 *
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/history/page.tsx
 */
export default function BookingHistoryPage() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Đang tải lịch sử...</div>}>
      <BookingHistoryPageContent />
    </Suspense>
  );
}

function BookingHistoryPageContent() {
  const tokenSnapshot = useSyncExternalStore(subscribeToToken, getTokenSnapshot, getServerTokenSnapshot);
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const router = useRouter();
  const searchParams = useSearchParams();
  const selectId = searchParams.get("selectId");

  const [allBookings, setAllBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Sub tab state driven by URL tab query param
  const tabParam = searchParams.get("tab");
  const subTab = tabParam === "history" ? "history" : "active";

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

  // Client-side filter by tab and date
  const filtered = allBookings.filter((b) => {
    // 1. Filter by tab
    const isTabMatch = subTab === "active"
      ? isUpcomingStatus(b.status)
      : (isCompletedStatus(b.status) || isCancelledStatus(b.status));

    if (!isTabMatch) return false;

    // 2. Filter by date range (only if history tab is selected)
    if (subTab === "history") {
      const source = b.startTime || b.bookingDate || "";
      const dateStr = extractISODate(source);
      if (!dateStr) return true;
      return dateStr >= fromDate && dateStr <= toDate;
    }

    return true;
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

  // Auto-select booking from URL param selectId
  useEffect(() => {
    if (selectId && allBookings.length > 0) {
      const found = allBookings.find((b) => b.id === selectId);
      if (found) {
        setDetailBooking(found);
        
        // Check if we need to switch tab URL to match the booking status
        const isUpcoming = isUpcomingStatus(found.status);
        const expectedTab = isUpcoming ? "active" : "history";
        if (subTab !== expectedTab) {
          const params = new URLSearchParams(searchParams.toString());
          params.set("tab", expectedTab);
          router.replace(`/customer/history?${params.toString()}`);
        }
      }
    }
  }, [selectId, allBookings, subTab, router, searchParams]);

  // Reset to page 1 when tab or filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [subTab, fromDate, toDate]);

  function handlePageChange(page: number) {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  // Dynamic titles and descriptions based on subTab
  const pageTitle = subTab === "active" ? "Lịch đang hoạt động" : "Lịch sử rửa xe";
  const pageDescription = subTab === "active"
    ? "Theo dõi các lịch hẹn rửa xe đang diễn ra của bạn."
    : "Xem lại toàn bộ lịch sử rửa xe của bạn.";

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-4xl mx-auto w-full">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
        <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
      </div>

      {/* Date filter / Refresh bar */}
      {subTab === "history" ? (
        <BookingHistoryFilter
          fromDate={fromDate}
          toDate={toDate}
          loading={loading}
          token={token}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onRefresh={loadBookings}
        />
      ) : (
        <div className="mb-5 flex justify-end">
          <button
            onClick={loadBookings}
            disabled={loading || !token}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
            Tải lại
          </button>
        </div>
      )}

      {/* Booking list (handles all states: not-logged-in / loading / error / empty / list) */}
      <BookingHistoryList
        authChecked={authChecked}
        token={token}
        loading={loading}
        error={error}
        filtered={filtered}
        paginated={paginated}
        currentPage={currentPage}
        totalPages={totalPages}
        pageSize={PAGE_SIZE}
        onBookingClick={(clicked) => setDetailBooking(clicked)}
        onPageChange={handlePageChange}
        emptyMessage={
          subTab === "active"
            ? "Bạn không có lịch hẹn nào đang hoạt động."
            : "Không có lịch đặt nào trong khoảng thời gian này."
        }
      />

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
