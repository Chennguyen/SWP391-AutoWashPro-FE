"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Calendar } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getBookings, getSlots } from "@/lib/api/booking";
import type { BookingSlot, CustomerBooking } from "@/types/booking";

const SLOT_INTERVAL_MINUTES = 15;

function generateSlots(openTime = "08:00", closeTime = "17:00"): string[] {
  const slots: string[] = [];

  let [startHour, startMinute] = (openTime || "08:00").split(":").map(Number);
  let [endHour, endMinute] = (closeTime || "17:00").split(":").map(Number);

  if (Number.isNaN(startHour) || startHour < 0 || startHour > 23) startHour = 8;
  if (Number.isNaN(startMinute) || startMinute < 0 || startMinute > 59) startMinute = 0;
  if (Number.isNaN(endHour) || endHour < 0 || endHour > 23) endHour = 17;
  if (Number.isNaN(endMinute) || endMinute < 0 || endMinute > 59) endMinute = 0;

  let currentMinutes = startHour * 60 + startMinute;
  const endMinutes = endHour * 60 + endMinute;

  while (currentMinutes < endMinutes) {
    const h = Math.floor(currentMinutes / 60);
    const m = currentMinutes % 60;
    slots.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    currentMinutes += SLOT_INTERVAL_MINUTES;
  }

  return slots;
}

function addMinutes(time: string, minutes: number) {
  const [hour = "0", minute = "0"] = time.split(":");
  const total = Number(hour) * 60 + Number(minute) + minutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;

  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function formatSlotRange(slot: string, serverSlots: BookingSlot[]) {
  const matchingSlot = serverSlots.find((serverSlot) => serverSlot.time === slot);
  return `${slot}-${matchingSlot?.endTime ?? addMinutes(slot, SLOT_INTERVAL_MINUTES)}`;
}

function todayISO(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Tính ngày cuối cùng được đặt lịch dựa trên số ngày đặt trước tối đa.
 * Nếu priorityBookingDays = 0 thì không giới hạn (trả về null).
 */
function calcMaxDateISO(priorityBookingDays: number): string | null {
  if (priorityBookingDays <= 0) return null;
  const max = new Date();
  max.setDate(max.getDate() + priorityBookingDays);
  const year = max.getFullYear();
  const month = String(max.getMonth() + 1).padStart(2, "0");
  const day = String(max.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function nowHHMM(): string {
  const now = new Date();
  return `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
}

function normalizeText(value: unknown = ""): string {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

function normalizeId(value: unknown = ""): string {
  return String(value ?? "").replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
}

function extractDate(value = ""): string {
  const clean = value.trim();
  const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const viMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (viMatch) {
    const [, day = "", month = "", year = ""] = viMatch;
    return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
  }

  return "";
}

function extractHHMM(value = ""): string {
  const match = value.match(/T?(\d{1,2}):(\d{2})/);
  if (!match) return "";
  return `${match[1].padStart(2, "0")}:${match[2]}`;
}

function isActiveBooking(booking: CustomerBooking): boolean {
  const status = normalizeText(booking.status || "");
  const isCancelled =
    status.includes("cancel") ||
    status.includes("huy") ||
    status.includes("da huy") ||
    status.includes("reject") ||
    status.includes("fail") ||
    status.includes("tu choi");

  if (isCancelled) return false;

  return Boolean(booking.id || booking.startTime);
}

function toMinutes(time: string): number | null {
  const normalized = extractHHMM(time);
  if (!normalized) return null;

  const [hour = "0", minute = "0"] = normalized.split(":");
  const total = Number(hour) * 60 + Number(minute);
  return Number.isFinite(total) ? total : null;
}

function slotsCoveredByBooking(booking: CustomerBooking): string[] {
  // Fall back to bookingDate if startTime is empty (backend may embed time there)
  const startRaw = booking.startTime || booking.bookingDate || "";
  const start = toMinutes(startRaw);
  if (start === null) return [];

  const end = toMinutes(booking.endTime ?? "");
  const safeEnd = end !== null && end > start ? end : start + SLOT_INTERVAL_MINUTES;
  const slots: string[] = [];

  for (let minute = start; minute < safeEnd; minute += SLOT_INTERVAL_MINUTES) {
    const hourText = String(Math.floor(minute / 60)).padStart(2, "0");
    const minuteText = String(minute % 60).padStart(2, "0");
    slots.push(`${hourText}:${minuteText}`);
  }

  return slots;
}

function matchesBranch(booking: CustomerBooking, branchId: string, branchName: string): boolean {
  const bookingBranchId = normalizeId(booking.branchId ?? "");
  const selectedBranchId = normalizeId(branchId);
  const sameBranchById =
    bookingBranchId.length > 0 &&
    selectedBranchId.length > 0 &&
    bookingBranchId === selectedBranchId;
  const bookingBranchName = normalizeText(booking.branchName);
  const selectedBranchName = normalizeText(branchName);
  const sameBranchByName =
    bookingBranchName.length > 0 &&
    selectedBranchName.length > 0 &&
    (bookingBranchName === selectedBranchName ||
      bookingBranchName.includes(selectedBranchName) ||
      selectedBranchName.includes(bookingBranchName));

  return sameBranchById || sameBranchByName;
}

function matchesDate(booking: CustomerBooking, date: string): boolean {
  return (
    extractDate(booking.bookingDate) === date ||
    extractDate(booking.startTime) === date ||
    extractDate(booking.endTime ?? "") === date
  );
}

interface SlotStepProps {
  token: string;
  branchId: string;
  branchName: string;
  openTime: string;
  closeTime: string;
  notice: string | null;
  forcedDisabledSlots: string[];
  /** Số ngày đặt trước tối đa theo hạng thành viên. 0 = không giới hạn. */
  priorityBookingDays: number;
  selectedDate: string;
  selectedSlot: string;
  onDateChange: (date: string) => void;
  onSlotChange: (slot: string) => void;
  onNext: () => void;
  onBack: () => void;
  onUnauthorized: () => void;
}

/**
 * Thành phần (Component) SlotStep
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function SlotStep({
  token,
  branchId,
  branchName,
  openTime,
  closeTime,
  notice,
  forcedDisabledSlots,
  priorityBookingDays,
  selectedDate,
  selectedSlot,
  onDateChange,
  onSlotChange,
  onNext,
  onBack,
  onUnauthorized,
}: SlotStepProps) {
  const allSlots = useMemo(() => generateSlots(openTime, closeTime), [openTime, closeTime]);
  const [serverSlots, setServerSlots] = useState<BookingSlot[]>([]);
  const [occupiedSlots, setOccupiedSlots] = useState<Set<string>>(() => new Set());
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const today = todayISO();
  const maxDate = useMemo(() => calcMaxDateISO(priorityBookingDays), [priorityBookingDays]);
  const effectiveDate = selectedDate || today;
  const currentHHMM = nowHHMM();
  const slotByTime = useMemo(() => {
    return new Map(serverSlots.map((slot) => [slot.time, slot]));
  }, [serverSlots]);
  const slotsToRender = serverSlots.length > 0 ? serverSlots.map((slot) => slot.time) : allSlots;

  const isDisabled = useCallback(
    (slot: string): boolean => {
      const apiSlot = slotByTime.get(slot);
      const forcedDisabled = forcedDisabledSlots.includes(`${effectiveDate}|${slot}`);

      if (forcedDisabled) return true;
      if (serverSlots.length > 0 && !apiSlot) return true;
      if (apiSlot?.available === false) return true;
      if (occupiedSlots.has(slot)) return true;
      if (effectiveDate === today && slot <= currentHHMM) return true;

      return false;
    },
    [
      currentHHMM,
      effectiveDate,
      forcedDisabledSlots,
      occupiedSlots,
      serverSlots.length,
      slotByTime,
      today,
    ],
  );

  const loadSlots = useCallback(async () => {
    if (!branchId || !effectiveDate) return;

    // Kiểm tra ngày vượt quá giới hạn hạng thành viên
    if (maxDate && effectiveDate > maxDate) {
      setError(
        `Hạng của bạn chỉ cho phép đặt lịch trước tối đa ${priorityBookingDays} ngày. Vui lòng chọn lại ngày phù hợp.`,
      );
      setServerSlots([]);
      setOccupiedSlots(new Set());
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const [nextSlots, sameDayBookings] = await Promise.all([
        getSlots(token, branchId, effectiveDate),
        getBookings(token, effectiveDate, effectiveDate, 1, 100),
      ]);
      const bookedTimes = sameDayBookings
        .filter(
          (booking) =>
            matchesBranch(booking, branchId, branchName) &&
            matchesDate(booking, effectiveDate) &&
            isActiveBooking(booking),
        )
        .flatMap(slotsCoveredByBooking)
        .filter(Boolean);

      setServerSlots(nextSlots);
      setOccupiedSlots(new Set(bookedTimes));
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized();
        return;
      }

      setError(loadError instanceof Error ? loadError.message : "Không thể tải slot.");
    } finally {
      setLoading(false);
    }
  }, [branchId, branchName, effectiveDate, maxDate, priorityBookingDays, onUnauthorized, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadSlots();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadSlots]);

  useEffect(() => {
    if (selectedSlot && isDisabled(selectedSlot)) {
      onSlotChange("");
    }
  }, [isDisabled, onSlotChange, selectedSlot]);

  function handleDateChange(date: string) {
    onDateChange(date);
    onSlotChange("");
  }

  function handleNext() {
    if (!selectedDate) {
      onDateChange(effectiveDate);
    }
    onNext();
  }

  const hasAnyAvailable = slotsToRender.some((slot) => !isDisabled(slot));

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Ngày và khung giờ</h2>
      </div>

      <div>
        <label htmlFor="booking-date" className="mb-2 block text-sm font-semibold text-slate-700">
          Ngày đặt hẹn <span className="text-orange-500">*</span>
        </label>
        <div className="relative">
          <input
            id="booking-date"
            type="date"
            min={today}
            max={maxDate ?? undefined}
            value={effectiveDate}
            onChange={(event) => handleDateChange(event.target.value)}
            className="w-full rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm text-slate-950 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          />
          <Calendar size={18} className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
        </div>
        {maxDate ? (
          <p className="mt-1.5 text-xs text-slate-500">
            ⚠️ Hạng thành viên của bạn chỉ được đặt trước tối đa{" "}
            <span className="font-semibold text-orange-600">{priorityBookingDays} ngày</span>
            {" "}(tới hết ngày{" "}
            <span className="font-semibold">
              {new Date(maxDate + "T00:00:00").toLocaleDateString("vi-VN")}
            </span>
            ).
          </p>
        ) : null}
      </div>

      <div className="rounded-lg border border-orange-200 bg-orange-50 px-4 py-3 text-sm text-orange-800">
        Mỗi slot chỉ nhận 1 xe. Các slot màu xám là đã kín hoặc đã qua.
      </div>

      {loading ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {Array.from({ length: 12 }).map((_, index) => (
            <div key={index} className="h-14 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {notice && !error ? (
        <div role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {notice}
        </div>
      ) : null}

      {!loading && !error ? (
        <div>
          <p className="mb-3 text-sm font-semibold text-slate-800">
            Chọn slot trống <span className="text-orange-500">*</span>
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {slotsToRender.map((slot) => {
              const disabled = isDisabled(slot);
              const selected = selectedSlot === slot;

              return (
                <button
                  key={slot}
                  type="button"
                  onClick={() => !disabled && onSlotChange(slot)}
                  disabled={disabled}
                  aria-disabled={disabled}
                  aria-pressed={selected}
                  title={disabled ? "Slot này không khả dụng" : undefined}
                  className={`h-14 rounded-lg border text-base font-bold transition ${
                    selected
                      ? "border-slate-950 bg-slate-950 text-white shadow-sm"
                      : disabled
                        ? "pointer-events-none cursor-not-allowed border-[#3A3A40] bg-[#2B2B30] text-[#817D76] opacity-60"
                        : "border-slate-200 bg-white text-slate-950 hover:border-slate-400"
                  }`}
                >
                  {formatSlotRange(slot, serverSlots)}
                </button>
              );
            })}
          </div>
          {!hasAnyAvailable ? (
            <p className="mt-4 text-center text-sm text-slate-500">
              Không còn slot trống cho ngày này. Vui lòng chọn ngày khác.
            </p>
          ) : null}
          <p className="mt-4 text-sm text-slate-500">
            Những slot màu xám là đã kín hoặc không đủ khoảng trống.
          </p>
        </div>
      ) : null}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Quay lại
        </button>
        <button
          type="button"
          onClick={handleNext}
          disabled={!selectedSlot}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
