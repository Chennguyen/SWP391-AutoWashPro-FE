// BookingSuccessStep — pure display, no interactivity needed
// (lives inside a Client Component parent, but is itself stateless)

import type { BookingResult } from "@/types/booking";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

interface BookingSuccessStepProps {
  result: BookingResult;
}

export function BookingSuccessStep({ result }: BookingSuccessStepProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center space-y-6">
      {/* Icon */}
      <div className="w-20 h-20 rounded-full bg-emerald-100 flex items-center justify-center">
        <CheckCircle2 size={44} className="text-emerald-500" />
      </div>

      {/* Heading */}
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 mb-2">
          Đặt lịch thành công! 🎉
        </h2>
        <p className="text-slate-500 text-sm leading-relaxed max-w-sm mx-auto">
          Thông tin đặt lịch đã được gửi đến tài khoản của bạn. Chúng tôi sẽ xác nhận lịch hẹn sớm nhất.
        </p>
      </div>

      {/* Booking ID */}
      {result.bookingId && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl px-6 py-4">
          <p className="text-xs font-semibold tracking-widest uppercase text-slate-400 mb-1">
            Mã đặt lịch
          </p>
          <p className="text-lg font-extrabold text-slate-900 font-mono tracking-widest">
            {result.confirmationCode ?? result.bookingId}
          </p>
        </div>
      )}

      {/* CTAs */}
      <div className="flex flex-col sm:flex-row gap-3 w-full sm:w-auto">
        <Link
          href="/customer/bookings"
          className="px-7 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all text-center"
        >
          Xem lịch sử đặt lịch
        </Link>
        <Link
          href="/customer"
          className="px-7 py-3 rounded-full border border-slate-200 text-slate-700 text-sm font-semibold hover:bg-slate-50 transition-all text-center"
        >
          Quay về trang chính
        </Link>
      </div>
    </div>
  );
}
