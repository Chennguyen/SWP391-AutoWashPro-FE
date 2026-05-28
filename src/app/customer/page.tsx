import {
  DashboardHeader,
  MembershipPanel,
} from "@/components/customer/DashboardWidgets";
import { UpcomingBookingPanel } from "@/components/customer/UpcomingBookingPanel";

export default function CustomerDashboardPage() {
  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <DashboardHeader />

      <div className="space-y-6">
        <UpcomingBookingPanel />
      </div>
    </main>
  );
}
