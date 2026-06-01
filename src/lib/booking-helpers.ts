import type { CustomerBooking } from "@/types/booking";

// ─── Token ─────────────────────────────────────────────────────────────────────

export function subscribeToToken(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener("autowash-auth", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("autowash-auth", cb);
  };
}

export function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("token") ?? "";
  const withoutBearer = raw.trim().replace(/^Bearer\s+/i, "");
  // strip surrounding quotes
  const clean =
    (withoutBearer.startsWith('"') && withoutBearer.endsWith('"')) ||
    (withoutBearer.startsWith("'") && withoutBearer.endsWith("'"))
      ? withoutBearer.slice(1, -1).trim()
      : withoutBearer;
  return clean || null;
}

export function getServerTokenSnapshot(): string | null {
  return null;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function extractISODate(value = ""): string {
  const clean = value.trim();
  const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }

  return "";
}

function extractHHMM(value = ""): string {
  const m = value.match(/T?(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Strip timezone suffix before parsing so the browser treats the value as local
 * time — not UTC. Backend stores local time but may append "Z" or "+07:00".
 */
export function parseBookingDateTime(value = ""): Date | null {
  if (!value) return null;
  const normalized = value.replace(/(?:z|[+-]\d{2}:\d{2})$/i, "");
  const dateStr = extractISODate(normalized);
  if (!dateStr) return null;
  const [year = "0", month = "1", day = "1"] = dateStr.split("-");
  const [hour = "0", minute = "0"] = extractHHMM(normalized).split(":");
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function getBookingStartDate(booking: CustomerBooking): Date | null {
  return parseBookingDateTime(booking.startTime || booking.bookingDate);
}

export function getBookingEndDate(booking: CustomerBooking): Date | null {
  if (!booking.endTime) return null;
  return parseBookingDateTime(booking.endTime);
}

export function formatBookingDateTime(booking: CustomerBooking): string {
  const date = getBookingStartDate(booking);
  if (!date) return booking.startTime || booking.bookingDate || "Chưa có thời gian";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateOnly(booking: CustomerBooking): string {
  const date = getBookingStartDate(booking);
  if (!date) return booking.bookingDate || "Chưa có ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function formatTimeRange(booking: CustomerBooking): string {
  const start = getBookingStartDate(booking);
  if (!start) return booking.startTime || "Chưa có giờ";
  const startText = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const end = getBookingEndDate(booking);
  if (!end) return startText;
  const endText = end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${startText} - ${endText}`;
}

export function minutesUntilBooking(booking: CustomerBooking): number | null {
  const date = getBookingStartDate(booking);
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / 60_000);
}

// ─── Status helpers ─────────────────────────────────────────────────────────────

function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

export function isCancelledStatus(status: string): boolean {
  const s = normalizeStatus(status);
  return s.includes("cancel") || s.includes("hủy") || s.includes("huy");
}

export function isCompletedStatus(status: string): boolean {
  const s = normalizeStatus(status);
  return s.includes("complete") || s.includes("done") || s.includes("xong");
}

export function isUpcomingStatus(status: string): boolean {
  return !isCancelledStatus(status) && !isCompletedStatus(status);
}

export function canCheckIn(status: string): boolean {
  return normalizeStatus(status) === "confirmed";
}

export function statusStyle(status: string): string {
  const s = normalizeStatus(status);
  if (s.includes("cancel") || s.includes("hủy") || s.includes("huy"))
    return "border-red-200 bg-red-50 text-red-700";
  if (s.includes("complete") || s.includes("done") || s.includes("xong"))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s.includes("progress") || s.includes("checkin"))
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (s.includes("confirm"))
    return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
