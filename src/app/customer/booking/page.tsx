import { BookingWizard } from "@/components/customer/booking/BookingWizard";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Đặt lịch rửa xe - AutoWash Pro",
  description: "Đặt lịch rửa xe nhanh chóng, chọn chi nhánh, xe và khung giờ phù hợp.",
};

/**
 * Trang (Page) CustomerBookingPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/booking/page.tsx
 */
export default function CustomerBookingPage() {
  return (
    <main className="mx-auto w-full max-w-5xl p-4 md:p-6 lg:p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-950">Đặt lịch rửa xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Làm theo các bước để hoàn tất đặt lịch của bạn.
        </p>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm md:p-8">
        <BookingWizard />
      </div>
    </main>
  );
}
