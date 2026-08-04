import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  const formatVND = (amount: number) =>
    new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
      maximumFractionDigits: 0,
    }).format(amount);

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

      <Card className="mt-6 w-full max-w-md text-left" size="sm">
        <CardHeader>
          <CardTitle>Chi tiết thanh toán từ hệ thống</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Giá gốc</span>
            <span className="font-medium text-foreground">{formatVND(result.basePrice)}</span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Tổng giảm giá</span>
            <span className="font-medium text-destructive">
              -{formatVND(result.discountAmount)}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-foreground">Thành tiền</span>
            <span className="font-semibold text-foreground">{formatVND(result.finalPrice)}</span>
          </div>
          <Separator />
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="text-muted-foreground">Số tiền đã cọc (30%)</span>
            <span className="font-medium text-foreground">
              {formatVND(Math.round(result.finalPrice * 0.3))}
            </span>
          </div>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-foreground">Tổng tiền phải trả khi check-in</span>
            <span className="font-semibold text-foreground">
              {formatVND(Math.max(result.finalPrice - Math.round(result.finalPrice * 0.3), 0))}
            </span>
          </div>
        </CardContent>
      </Card>

      <p className="mt-4 max-w-md text-xs leading-5 text-muted-foreground">
        Nếu bạn chọn dùng điểm, điểm chỉ được trừ khi check-in và thanh toán thành công.
      </p>

      <Link
        className={buttonVariants({ className: "mt-8", size: "lg" })}
        href="/customer#upcoming-booking"
      >
        Xem lịch đặt sắp tới
      </Link>
    </div>
  );
}
