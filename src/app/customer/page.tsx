import {
  DashboardHeader,
  MembershipPanel,
  UpcomingBookingPanel,
  QuickActions,
  RewardsSection,
  WashHistoryTable,
  VehicleSummary,
} from "@/components/customer/DashboardWidgets";

export default function CustomerDashboardPage() {
  return (
    <main className="p-4 md:p-6 lg:p-8 max-w-7xl mx-auto w-full">
      <DashboardHeader />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column: Membership & Booking (takes 2 columns on large screens) */}
        <div className="lg:col-span-2 space-y-6">
          <MembershipPanel />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <UpcomingBookingPanel />
            <QuickActions />
          </div>

          <WashHistoryTable />
        </div>

        {/* Right Column: Rewards & Vehicles */}
        <div className="space-y-6">
          <RewardsSection />
          <VehicleSummary />
        </div>
      </div>
    </main>
  );
}
