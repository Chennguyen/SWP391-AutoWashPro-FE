import type { Vehicle } from "./vehicle-types";

export interface Branch {
  id: string;
  name: string;
  address: string;
  openTime: string;
  closeTime: string;
  status: "ACTIVE" | "INACTIVE";
}

export interface BookingSlot {
  time: string;
  endTime?: string;
  available: boolean;
  availabilityExplicit?: boolean;
}

export interface VoucherValidation {
  id?: string;
  voucherId?: string;
  code: string;
  valid: boolean;
  discountAmount: number;
  message: string;
}

export interface CreateBookingPayload {
  branchId: string;
  vehicleId: string;
  voucherId: string | null;
  bookingDate: string;
  startTime: string;
  redemPoint: boolean;
}

export interface BookingResult {
  bookingId: string;
  id?: string;
  confirmationCode?: string;
  message?: string;
}

export interface CustomerBooking {
  id: string;
  branchId?: string;
  vehicleId?: string;
  branchName: string;
  branchAddress?: string;
  vehicleLicensePlate: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  serviceName?: string;
  totalPrice?: number; // Kept for backwards compatibility
  finalPrice?: number;
  basePrice?: number;
  discountAmount?: number;
  cancelReason?: string;
}

export interface WizardState {
  selectedBranch: Branch | null;
  selectedVehicle: Vehicle | null;
  selectedDate: string;
  selectedSlot: string;
  voucherCode: string;
  appliedVoucher: VoucherValidation | null;
  bookingResult: BookingResult | null;
  currentStep: number;
}
