"use client";

import { useEffect, useState } from "react";
import { DashboardHeader } from "@/features/users/components/dashboard-widgets";
import { UpcomingBookingPanel } from "@/features/booking/components/upcoming-booking-panel";
import { BookingCustomerSummary } from "@/features/booking/components/booking-customer-summary";

/**
 * Trang (Page) CustomerDashboardPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/page.tsx
 */
export default function CustomerDashboardPage() {
  const [isUnverified, setIsUnverified] = useState(false);

  useEffect(() => {
    if (typeof window !== "undefined") {
      setIsUnverified(window.localStorage.getItem("is_unverified") === "true");
    }
  }, []);

  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
        {/* Cột trái: Khung thông tin cá nhân (Ẩn nếu tài khoản chưa xác thực) */}
        {!isUnverified && (
          <div className="lg:col-span-1 lg:sticky lg:top-6">
            <BookingCustomerSummary />
          </div>
        )}

        {/* Cột phải: Lịch đang hoạt động (Chiếm toàn bộ chiều rộng nếu chưa xác thực) */}
        <div className={isUnverified ? "lg:col-span-4 space-y-6" : "lg:col-span-3 space-y-6"}>
          <UpcomingBookingPanel />
        </div>
      </div>
    </main>
  );
}
