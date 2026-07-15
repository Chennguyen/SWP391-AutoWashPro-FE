"use client";

import { Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { RefreshCw, Clock, XCircle, CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { getBookings } from "@/features/booking/booking-service";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import {
  subscribeToToken,
  getTokenSnapshot,
  getServerTokenSnapshot,
  toISODate,
  extractISODate,
  isUpcomingStatus,
  isCompletedStatus,
  isCancelledStatus,
  statusStyle,
  getBookingStartDate,
  getBookingEndDate,
  formatTimeRange,
} from "@/features/booking/utils";
import { BookingDetailModal } from "@/features/booking/components/booking-detail-modal";
import { CancelBookingModal } from "@/features/booking/components/cancel-booking-modal";
import { BookingHistoryFilter } from "@/features/booking/components/booking-history-filter";
import { BookingHistoryList } from "@/features/booking/components/booking-history-list";
import { BookingCustomerSummary } from "@/features/booking/components/booking-customer-summary";
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { vi } from "date-fns/locale/vi";
import "react-big-calendar/lib/css/react-big-calendar.css";

const PAGE_SIZE = 5;

const locales = {
  "vi": vi,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

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

interface CustomToolbarProps {
  date: Date;
  label: string;
  onNavigate: (action: "PREV" | "NEXT" | "TODAY") => void;
  view: string;
  onView: (view: string) => void;
}

function CustomToolbar({ date, label, onNavigate, view, onView }: CustomToolbarProps) {
  let displayLabel = label.replace(/\s+(\d{4})$/, ", $1");

  if (view === "day") {
    const days = ["Chủ nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
    const dayName = days[date.getDay()];
    const d = String(date.getDate()).padStart(2, "0");
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const y = date.getFullYear();
    displayLabel = `${dayName}, ngày ${d}, tháng ${m}, năm ${y}`;
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-5 gap-4 w-full">
      {/* Tiêu đề */}
      <div className="flex items-center gap-3.5 flex-wrap">
        <span className="text-slate-100 font-bold text-lg capitalize shrink-0">
          {displayLabel}
        </span>
      </div>
      
      {/* Nút điều hướng */}
      <div className="flex items-center gap-3 self-end sm:self-auto">
        {view === "day" && (
          <button
            type="button"
            onClick={() => onView("month")}
            className="text-[#bca374] hover:text-white border border-[#bca374]/30 hover:border-[#bca374] bg-[#bca374]/10 hover:bg-[#bca374]/20 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
          >
            Quay lại
          </button>
        )}

        {view !== "day" && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => onNavigate("PREV")}
              className="border border-white/10 text-slate-300 hover:text-white hover:border-[#bca374] hover:bg-white/5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Trước
            </button>
            <button
              type="button"
              onClick={() => onNavigate("NEXT")}
              className="border border-white/10 text-slate-300 hover:text-white hover:border-[#bca374] hover:bg-white/5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer"
            >
              Tiếp
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function BookingHistoryPageContent() {
  const tokenSnapshot = useSyncExternalStore(subscribeToToken, getTokenSnapshot, getServerTokenSnapshot);
  const token = tokenSnapshot ?? "";
  const authChecked = tokenSnapshot !== null;

  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("is_unverified") === "true") {
      router.replace("/customer");
    }
  }, [router]);

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

  // Calendar states (initialize on mount to avoid Next.js SSR timezone/date hydration mismatch)
  const [calendarDate, setCalendarDate] = useState<Date | null>(null);
  const [calendarView, setCalendarView] = useState<any>("month");

  useEffect(() => {
    setCalendarDate(new Date());
  }, []);

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

  const calendarEvents = filtered.map((b) => {
    const start = getBookingStartDate(b) || new Date();
    const end = getBookingEndDate(b) || new Date(start.getTime() + 30 * 60_000);
    return {
      id: b.id,
      title: `${b.branchName} - ${b.vehicleLicensePlate}`,
      start,
      end,
      resource: b,
    };
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
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
        {/* Cột trái: Khung thông tin cá nhân */}
        <BookingCustomerSummary className="lg:col-span-1 lg:sticky lg:top-20" />

        {/* Cột phải: Nội dung lịch sử */}
        <div className="lg:col-span-3 space-y-6">
          {/* Header & Refresh row */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-black text-slate-900">{pageTitle}</h1>
              <p className="mt-1 text-sm text-slate-500">{pageDescription}</p>
            </div>
            {subTab === "active" && (
              <button
                onClick={loadBookings}
                disabled={loading || !token}
                className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-blue-700 disabled:opacity-50 shrink-0 self-start sm:self-auto"
              >
                <RefreshCw size={14} className={loading ? "animate-spin" : ""} aria-hidden />
                Tải lại
              </button>
            )}
          </div>

          {/* Date filter (Only for history tab) */}
          {subTab === "history" && (
            <BookingHistoryFilter
              fromDate={fromDate}
              toDate={toDate}
              loading={loading}
              token={token}
              onFromDateChange={setFromDate}
              onToDateChange={setToDate}
              onRefresh={loadBookings}
            />
          )}

          {/* Booking list (handles all states: not-logged-in / loading / error / empty / list) */}
          {subTab === "active" && authChecked && token && !loading && !error ? (
            <div className="h-auto min-h-[600px] w-full bg-[#161619] border border-white/10 rounded-2xl p-4 overflow-visible">
              {calendarDate && (
                <Calendar
                  localizer={localizer}
                  events={calendarEvents}
                  startAccessor="start"
                  endAccessor="end"
                  culture="vi"
                  date={calendarDate}
                  onNavigate={(date) => setCalendarDate(date)}
                  view={calendarView}
                  onView={(view) => setCalendarView(view)}
                  views={["month", "day"]}
                  onDrillDown={(date) => {
                    setCalendarDate(date);
                    setCalendarView("day");
                  }}
                  messages={{
                    next: "Tiếp",
                    previous: "Trước",
                    today: "Hôm nay",
                    month: "Tháng",
                    day: "Ngày",
                    noEventsInRange: "Không có lịch đặt nào.",
                  }}
                  components={{
                    toolbar: (props) => (
                      <CustomToolbar
                        {...props}
                        view={calendarView}
                        onView={setCalendarView}
                      />
                    ),
                    event: ({ event }) => {
                      const booking = event.resource as CustomerBooking;
                      const isProgress = booking.status.toLowerCase().includes("progress");
                      const isCancel = isCancelledStatus(booking.status);
                      const timeStr = booking.startTime.split("T")[1]?.slice(0, 5) || booking.startTime.slice(0, 5);
                      
                      if (calendarView === "day") {
                        const timeRange = formatTimeRange(booking);
                        return (
                          <div
                            className={`w-full h-full rounded-lg py-1.5 px-3 border flex flex-col justify-center gap-1 ${statusStyle(booking.status)}`}
                            title={`${booking.branchName} - ${booking.vehicleLicensePlate} (${timeRange})`}
                          >
                            <div className="flex items-center">
                              <span className="font-bold text-slate-100 text-xs truncate">
                                {timeRange} — {booking.vehicleLicensePlate}
                              </span>
                            </div>
                            <div className="text-xs text-slate-400 font-medium truncate">
                              {booking.branchName}
                            </div>
                          </div>
                        );
                      }

                      return (
                        <div
                          className={`w-fit max-w-full h-fit rounded-lg px-2.5 py-1 text-xs font-semibold border truncate flex items-center ${statusStyle(booking.status)}`}
                          title={`${booking.branchName} - ${booking.vehicleLicensePlate} (${timeStr})`}
                        >
                          <span className="truncate">
                            {timeStr} - {booking.vehicleLicensePlate}
                          </span>
                        </div>
                      );
                    }
                  }}
                  onSelectEvent={(event) => setDetailBooking(event.resource)}
                  className="w-full h-full text-sm"
                />
              )}
            </div>
          ) : (
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
          )}
        </div>
      </div>

      {/* Detail modal */}
      {detailBooking ? (
        <BookingDetailModal
          booking={detailBooking}
          token={token}
          onClose={() => setDetailBooking(null)}
          onChanged={loadBookings}
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
