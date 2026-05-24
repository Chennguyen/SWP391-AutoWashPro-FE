"use client";

import { useState, useEffect, useMemo } from "react";
import { getSlots } from "@/lib/api/booking";
import type { BookingSlot } from "@/types/booking";
import { Calendar } from "lucide-react";

// ─── Slot generation ──────────────────────────────────────────────────────────

function generateAllSlots(): string[] {
  const slots: string[] = [];
  for (let h = 8; h < 17; h++) {
    for (let m = 0; m < 60; m += 15) {
      slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  // 08:00 … 16:45
  return slots;
}

function todayISO(): string {
  return new Date().toISOString().split("T")[0];
}

function toDateInput(date: string): string {
  return date; // already "YYYY-MM-DD"
}

// ─── Component ────────────────────────────────────────────────────────────────

interface SlotStepProps {
  token: string;
  branchId: string;
  selectedDate: string;      // "YYYY-MM-DD"
  selectedSlot: string;      // "HH:mm"
  onDateChange: (d: string) => void;
  onSlotChange: (s: string) => void;
  onNext: () => void;
  onBack: () => void;
}

export function SlotStep({
  token,
  branchId,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  onNext,
  onBack,
}: SlotStepProps) {
  const allSlots = useMemo(() => generateAllSlots(), []);
  const [bookedSlots, setBookedSlots] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const effectiveDate = selectedDate || today;

  // Fetch available slots whenever branchId or date changes
  useEffect(() => {
    let cancelled = false;
    if (!branchId || !effectiveDate) return;

    setLoading(true);
    setError(null);

    getSlots(token, branchId, effectiveDate)
      .then((slots: BookingSlot[]) => {
        if (cancelled) return;
        const booked = new Set(
          slots.filter((s) => !s.available).map((s) => s.time)
        );
        setBookedSlots(booked);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Không thể tải slot.");
      })
      .finally(() => { if (!cancelled) setLoading(false); });

    return () => { cancelled = true; };
  }, [branchId, effectiveDate, token]);

  // Disable past slots for today
  const nowHHMM = useMemo(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  }, []);

  function isDisabled(slot: string): boolean {
    if (bookedSlots.has(slot)) return true;
    if (effectiveDate === today && slot <= nowHHMM) return true;
    return false;
  }

  const hasAnyAvailable = allSlots.some((s) => !isDisabled(s));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Chọn ngày và giờ</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Chọn ngày và khung giờ bạn muốn đưa xe đến rửa.
        </p>
      </div>

      {/* Date picker */}
      <div>
        <label htmlFor="booking-date" className="block text-sm font-medium text-slate-700 mb-1">
          <Calendar size={14} className="inline mr-1.5" aria-hidden />
          Ngày đặt lịch
        </label>
        <input
          id="booking-date"
          type="date"
          min={today}
          value={effectiveDate}
          onChange={(e) => {
            onDateChange(e.target.value);
            onSlotChange(""); // reset slot when date changes
          }}
          className="w-full sm:w-56 rounded-xl border border-slate-200 px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 bg-white"
        />
      </div>

      {/* Slot grid */}
      {loading && (
        <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
          {Array.from({ length: 36 }).map((_, i) => (
            <div key={i} className="h-10 rounded-xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && !hasAnyAvailable && (
        <div className="py-12 text-center">
          <p className="text-slate-500 font-medium">Không còn slot trống cho ngày này.</p>
          <p className="text-slate-400 text-sm mt-1">Vui lòng chọn ngày khác.</p>
        </div>
      )}

      {!loading && !error && hasAnyAvailable && (
        <>
          <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-2">
            {allSlots.map((slot) => {
              const disabled = isDisabled(slot);
              const selected = selectedSlot === slot;
              return (
                <button
                  key={slot}
                  onClick={() => !disabled && onSlotChange(slot)}
                  disabled={disabled}
                  aria-pressed={selected}
                  aria-label={`Slot ${slot}${disabled ? " (đã đặt hoặc đã qua)" : ""}`}
                  className={`py-2.5 text-xs font-semibold rounded-xl border transition-all
                    ${selected
                      ? "bg-slate-900 text-white border-slate-900"
                      : disabled
                      ? "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed line-through"
                      : "bg-white text-slate-700 border-slate-200 hover:border-slate-400"
                    }`}
                >
                  {slot}
                </button>
              );
            })}
          </div>

          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-900 inline-block" /> Đã chọn
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-slate-50 border border-slate-200 inline-block" /> Đã đặt / Đã qua
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-white border border-slate-300 inline-block" /> Khả dụng
            </span>
          </div>
        </>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          ← Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!selectedSlot}
          className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}
