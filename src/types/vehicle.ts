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
  licensePlate: string;
  brand: string;
  model: string;
  color: string;
  vehicleType: VehicleType;
  licensePlateImageUrl?: string;
}

export interface AddVehiclePayload {
  licensePlate: string;
  brand: string;
  model: string;
  color: string;
  licensePlateImageFile: File;
}

export interface UpdateVehiclePayload {
  brand: string;
  model: string;
  color: string;
}

export const VEHICLE_TYPE_LABELS: Record<VehicleType, string> = {
  SEDAN: 'Sedan',
  SUV: 'SUV',
  HATCHBACK: 'Hatchback',
  PICKUP: 'Pickup',
  MOTORBIKE: 'Xe máy',
  OTHER: 'Khác',
};
