import { CustomerInfoPanel } from "@/components/customer/info/CustomerInfoPanel";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Thông tin cá nhân - AutoWash Pro",
  description: "Quản lý xe và ví của khách hàng AutoWash Pro.",
};

/**
 * Trang (Page) CustomerInfoPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/info/page.tsx
 */
export default function CustomerInfoPage() {
  return (
    <main className="mx-auto w-full max-w-6xl p-4 md:p-6 lg:p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-normal text-slate-950">Thông tin cá nhân</h1>
        <p className="mt-1 text-sm text-slate-500">
          Quản lý thông tin xe và ví của bạn.
        </p>
      </div>

      <CustomerInfoPanel />
    </main>
  );
}
