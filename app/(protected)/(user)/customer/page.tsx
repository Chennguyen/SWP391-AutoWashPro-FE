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
  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8 items-start">
        {/* Cột trái: Khung thông tin cá nhân */}
        <div className="lg:col-span-1 lg:sticky lg:top-6">
          <BookingCustomerSummary />
        </div>

        {/* Cột phải: Lịch đang hoạt động */}
        <div className="lg:col-span-3 space-y-6">
          <UpcomingBookingPanel />
        </div>
      </div>
    </main>
  );
}
