// ─── Vehicle Types ────────────────────────────────────────────────────────────

export type VehicleType =
  | 'SEDAN'
  | 'SUV'
  | 'HATCHBACK'
  | 'PICKUP'
  | 'MOTORBIKE'
  | 'OTHER';

export interface Vehicle {
  id: string;
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  vehicleType: VehicleType;
}

export interface AddVehiclePayload {
  plateNumber: string;
  brand: string;
  model: string;
  color: string;
  vehicleType: VehicleType;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  HATCHBACK: 'Hatchback',
  PICKUP: 'Pickup',
  MOTORBIKE: 'Xe máy',
  OTHER: 'Khác',
};
