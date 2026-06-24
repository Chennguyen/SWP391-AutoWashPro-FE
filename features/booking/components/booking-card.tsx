"use client";

import { CalendarDays, Car } from "lucide-react";
import type { CustomerBooking } from "@/features/booking/booking-types";
import { formatBookingDateTime, statusStyle } from "@/features/booking/utils";

interface BookingCardProps {
  booking: CustomerBooking;
  onClick?: (booking: CustomerBooking) => void;
  /** If true, renders as a non-interactive div (e.g. in history list) */
  static?: boolean;
}

export function BookingCard({ booking, onClick, static: isStatic }: BookingCardProps) {
  const content = (
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-bold text-slate-950">{booking.branchName || "Chi nhánh"}</p>
        {booking.branchAddress ? (
          <p className="mt-0.5 truncate text-xs text-slate-400">{booking.branchAddress}</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1">
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarDays size={13} className="shrink-0" aria-hidden />
            <span>{formatBookingDateTime(booking)}</span>
          </div>
          <div className="flex items-center gap-1.5 text-sm text-slate-500">
            <Car size={13} className="shrink-0" aria-hidden />
            <span>{booking.vehicleLicensePlate || "Xe đã chọn"}</span>
          </div>
        </div>
        {booking.id ? (
          <p className="mt-1 font-mono text-[11px] text-slate-400 truncate">#{booking.id}</p>
        ) : null}
      </div>
      <span
        className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusStyle(booking.status)}`}
      >
        {booking.status}
      </span>
    </div>
  );

  if (isStatic) {
    return (
      <div className="w-full rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        {content}
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onClick?.(booking)}
      className="w-full rounded-xl border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40 hover:shadow-sm"
    >
      {content}
    </button>
  );
}
