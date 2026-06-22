import { DashboardHeader } from "@/components/customer/DashboardWidgets";
import { DashboardRankWidget } from "@/components/customer/DashboardRankWidget";
import { UpcomingBookingPanel } from "@/components/customer/UpcomingBookingPanel";

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

      <div className="space-y-6">
        <DashboardRankWidget />
        <UpcomingBookingPanel />
      </div>
    </main>
  );
}
