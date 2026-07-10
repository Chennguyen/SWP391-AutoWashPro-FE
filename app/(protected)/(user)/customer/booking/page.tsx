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
    <main className="booking-brand-surface min-h-[calc(100dvh-3.5rem)] w-full bg-background px-4 py-5 text-foreground md:px-6 lg:py-8">
      <BookingWizard />
    </main>
  );
}
