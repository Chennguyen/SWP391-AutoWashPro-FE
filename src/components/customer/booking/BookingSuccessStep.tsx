import Link from "next/link";
import { CheckCircle2 } from "lucide-react";
import type { BookingResult } from "@/types/booking";

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
  const displayCode = result.confirmationCode ?? result.bookingId;

  return (
    <div className="flex min-h-96 flex-col items-center justify-center text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <CheckCircle2 size={44} className="text-emerald-500" aria-hidden />
      </div>

      <h2 className="mt-6 text-2xl font-black text-slate-950">
        Đặt lịch thành công
      </h2>
      <p className="mt-2 max-w-md text-sm leading-6 text-slate-500">
        Lịch rửa xe của bạn đã được tạo. Bạn có thể xem lại trong mục lịch đặt
        sắp tới ở trang chủ.
      </p>

      {displayCode ? (
        <div className="mt-6 rounded-lg border border-slate-200 bg-slate-50 px-6 py-4">
          <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
            Mã đặt lịch
          </p>
          <p className="mt-1 font-mono text-lg font-black tracking-wide text-slate-950">
            {displayCode}
          </p>
        </div>
      ) : null}

      <Link
        href="/customer#upcoming-booking"
        className="mt-8 rounded-lg bg-slate-950 px-7 py-3 text-sm font-bold !text-white transition hover:bg-slate-800"
      >
        Xem lịch đặt sắp tới
      </Link>
    </div>
  );
}
