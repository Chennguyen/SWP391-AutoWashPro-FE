import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { BookingResult } from "@/features/booking/types/booking-types";

interface BookingSuccessStepProps {
  result: BookingResult;
}

/**
 * Thành phần (Component) BookingSuccessStep
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function BookingSuccessStep({ result }: BookingSuccessStepProps) {
  void result;

  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center">
      <div className="flex size-20 items-center justify-center rounded-full bg-muted">
        <CheckCircle2 className="text-primary" aria-hidden />
      </div>

      <h2 className="mt-6 text-2xl font-semibold text-foreground">
        Đặt lịch thành công
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
        Lịch rửa xe của bạn đã được tạo. Bạn có thể xem lại trong mục lịch đặt
        sắp tới ở trang chủ.
      </p>

      <Button
        className="mt-8"
        size="lg"
        render={<Link href="/customer#upcoming-booking" />}
      >
        Xem lịch đặt sắp tới
      </Button>
    </div>
  );
}
