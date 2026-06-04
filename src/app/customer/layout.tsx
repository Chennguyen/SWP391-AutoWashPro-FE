import { ReactNode } from "react";
import { DashboardSidebar } from "@/components/customer/DashboardSidebar";

/**
 * Bố cục (Layout) CustomerLayout
 * 
 * Chức năng: Định nghĩa khung bố cục chung (Layout Template) cho hệ thống AutoWash Pro.
 * Vai trò: Quản lý cấu trúc bao bọc giao diện chung cho các trang con.
 */
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
