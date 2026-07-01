"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { BookingWizard } from "@/features/booking/components/booking-wizard";

/**
 * Trang (Page) CustomerBookingPage
 *
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/customer/booking/page.tsx
 */
export default function CustomerBookingPage() {
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined" && window.localStorage.getItem("is_unverified") === "true") {
      router.replace("/customer");
    }
  }, [router]);

  return (
    <main className="w-full px-4 py-6 md:px-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-950">Đặt lịch rửa xe</h1>
        <p className="mt-1 text-sm text-slate-500">
          Làm theo các bước để hoàn tất đặt lịch của bạn.
        </p>
      </div>

      <BookingWizard />
    </main>
  );
}

