import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/customer/DashboardSidebar";

export default function CustomerLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen bg-background-outer text-slate-900">
      <DashboardSidebar />

      {/* Main content wrapper */}
      <div className="flex-1 min-w-0">
        {children}
      </div>
    </div>
  );
}
