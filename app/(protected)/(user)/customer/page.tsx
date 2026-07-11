import { DashboardHeader } from "@/features/users/components/dashboard-widgets";
import { CustomerDashboardOverview } from "@/features/users/components/customer-dashboard-overview";

/**
 * Trang (Page) CustomerDashboardPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/page.tsx
 */
export default function CustomerDashboardPage() {
  return (
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <DashboardHeader />
      <CustomerDashboardOverview />
    </main>
  );
}
