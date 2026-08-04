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
  rewardName?: string;
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
  acknowledgedScheduleConflictIds: string[];
}

export interface BookingScheduleConflict {
  bookingId: string;
  branchId: string;
  branchName: string;
  startTime: string;
  endTime: string;
  isSameBranch: boolean;
  gapMinutes: number;
}

export interface BookingScheduleWarning {
  code: "BOOKING_TIME_TOO_CLOSE";
  severity: "warning";
  thresholdMinutes: number;
  conflicts: BookingScheduleConflict[];
}

export interface BookingWarningErrorResponse {
  success: false;
  message: string;
  data: null;
  errors: BookingScheduleWarning;
  traceId?: string;
  timestampUtc: string;
}

export interface BookingResult {
  bookingId: string;
  id?: string;
  confirmationCode?: string;
  message?: string;
  basePrice: number;
  discountAmount: number;
  finalPrice: number;
  serviceBasePrice?: number;
  vehicleSurcharge?: number;
  vehicleType?: string;
}

export interface CustomerBooking {
  id: string;
  branchId?: string;
  vehicleId?: string;
  branchName: string;
  branchAddress?: string;
  vehicleLicensePlate: string;
  vehicleType?: string;
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
  serviceBasePrice?: number;
  vehicleSurcharge?: number;
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
