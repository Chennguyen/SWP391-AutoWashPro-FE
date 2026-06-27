"use client";

import type { CustomerBooking } from "@/features/booking/types/booking-types";
import { BookingCard } from "@/features/booking/components/booking-card";
import { BookingHistoryPagination } from "@/features/booking/components/booking-history-pagination";

interface BookingHistoryListProps {
  authChecked: boolean;
  token: string;
  loading: boolean;
  error: string | null;
  filtered: CustomerBooking[];
  paginated: CustomerBooking[];
  currentPage: number;
  totalPages: number;
  pageSize: number;
  onBookingClick: (booking: CustomerBooking) => void;
  onPageChange: (page: number) => void;
  emptyMessage?: string;
}

/**
 * Component BookingHistoryList
 *
 * Chức năng: Hiển thị toàn bộ nội dung chính của trang lịch sử đặt lịch bao gồm:
 * - Trạng thái chưa đăng nhập
 * - Skeleton loading (đang tải dữ liệu)
 * - Thông báo lỗi
 * - Danh sách trống (không có kết quả)
 * - Danh sách BookingCard và phân trang
 */
export function BookingHistoryList({
  authChecked,
  token,
  loading,
  error,
  filtered,
  paginated,
  currentPage,
  totalPages,
  pageSize,
  onBookingClick,
  onPageChange,
  emptyMessage,
}: BookingHistoryListProps) {
  // Chưa đăng nhập
  if (!authChecked || !token) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
        Vui lòng đăng nhập để xem lịch sử.
      </div>
    );
  }

  // Đang tải
  if (loading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
        ))}
      </div>
    );
  }

  // Lỗi
  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  // Không có kết quả
  if (filtered.length === 0) {
    return (
      <div className="rounded-xl border border-dashed border-slate-200 py-16 text-center text-sm text-slate-500">
        {emptyMessage || "Không có lịch đặt nào trong khoảng thời gian này."}
      </div>
    );
  }

  // Danh sách booking + phân trang
  return (
    <>
      <p className="mb-3 text-xs font-medium text-slate-400">
        Hiển thị {(currentPage - 1) * pageSize + 1}–
        {Math.min(currentPage * pageSize, filtered.length)} / {filtered.length} lịch đặt
      </p>

      <div className="space-y-3">
        {paginated.map((b) => (
          <BookingCard
            key={b.id}
            booking={b}
            onClick={(clicked) => onBookingClick(clicked)}
          />
        ))}
      </div>

      <BookingHistoryPagination
        currentPage={currentPage}
        totalPages={totalPages}
        onPageChange={onPageChange}
      />
    </>
  );
}
