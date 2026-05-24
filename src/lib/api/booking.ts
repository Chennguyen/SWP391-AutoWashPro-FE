// ─── Booking API ──────────────────────────────────────────────────────────────
// Strategy: all booking data is user-specific and time-sensitive — always no-store.

import type { BookingSlot, CreateBookingPayload, BookingResult } from '@/types/booking';
import { apiBase, handleApiResponse } from './api-error';

/**
 * Get available booking slots for a branch on a specific date.
 * Must fetch fresh every time — slot availability changes in real time.
 * cache: 'no-store'
 */
export async function getSlots(
  token: string,
  branchId: string,
  date: string, // "YYYY-MM-DD"
): Promise<BookingSlot[]> {
  const url = `${apiBase()}/bookings/slots?branchId=${branchId}&date=${date}`;
  const res = await fetch(url, {
    cache: 'no-store',
    headers: {
      Authorization: `Bearer ${token}`,
    },
  });
  return handleApiResponse<BookingSlot[]>(res);
}

/**
 * Create a new booking.
 * POST — no cache.
 */
export async function createBooking(
  token: string,
  payload: CreateBookingPayload,
): Promise<BookingResult> {
  const url = `${apiBase()}/bookings`;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  return handleApiResponse<BookingResult>(res);
}
