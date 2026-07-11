import { CustomerInfoPanel } from "@/features/users/components/customer-info-panel";
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
    <main className="mx-auto w-full max-w-[1440px] px-4 pb-28 pt-6 sm:px-6 lg:px-8 lg:pt-8">
      <div className="mb-6 max-w-2xl">
        <p className="text-sm font-medium text-[#bca374]">Tài khoản AutoWash Pro</p>
        <h1 className="mt-1 text-3xl font-semibold tracking-tight text-slate-950 sm:text-4xl">
          Trung tâm tài khoản
        </h1>
        <p className="mt-2 text-sm leading-6 text-slate-500 sm:text-base">
          Quản lý hồ sơ, phương tiện, ví và quyền lợi thành viên của bạn.
        </p>
      </div>

      <CustomerInfoPanel />
    </main>
  );
}
