// ─── Booking Types ────────────────────────────────────────────────────────────

import type { Vehicle } from './vehicle';

export interface Branch {
  id: string;
  name: string;
  address: string;
  openTime: string;   // e.g. "08:00"
  closeTime: string;  // e.g. "17:00"
  status: 'ACTIVE' | 'INACTIVE';
}

export interface BookingSlot {
  time: string;       // "HH:mm" e.g. "08:00"
  available: boolean;
}

export interface VoucherValidation {
  code: string;
  valid: boolean;
  discountAmount: number;
  message: string;
}

export interface BookingReview {
  branch: Branch;
  vehicle: Vehicle;
  date: string;       // ISO date string "YYYY-MM-DD"
  slot: string;       // "HH:mm"
  subtotal: number;
  discount: number;
  depositAmount: number;
  finalAmount: number;
}

export interface CreateBookingPayload {
  branchId: string;
  vehicleId: string;
  date: string;
  slot: string;
  voucherCode?: string;
}

export interface BookingResult {
  bookingId: string;
  confirmationCode?: string;
  message?: string;
}

// ─── Wizard Step State ────────────────────────────────────────────────────────

export interface WizardState {
  selectedBranch: Branch | null;
  selectedVehicle: Vehicle | null;
  selectedDate: string;         // "YYYY-MM-DD"
  selectedSlot: string;         // "HH:mm"
  voucherCode: string;
  appliedVoucher: VoucherValidation | null;
  bookingResult: BookingResult | null;
  currentStep: number;          // 1–6
}
