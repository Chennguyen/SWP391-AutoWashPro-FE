type UnknownRecord = Record<string, unknown>;

export type PageResult<T> = {
  items: T[];
  totalCount: number;
};

export type AccountStatus = "Pending" | "Active" | "Rejected" | "Locked" | "Inactive";
export type BookingStatus =
  | "Available"
  | "Pending"
  | "Confirmed"
  | "CheckIn"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export type AdminBranch = {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  role?: string;
  status?: string;
  isVerified: boolean;
  createdAt?: string;
  faceImages?: string[];
  totalPoints?: number;
  totalWashes?: number;
  tierName?: string;
  tierLevel?: number;
};

export type AdminBooking = {
  id: string;
  branchId?: string;
  branchName: string;
  customerName: string;
  customerEmail?: string;
  vehiclePlate: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  note?: string;
  createdAt?: string;
};

export type AdminBookingSlot = {
  id?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  bookingId?: string;
  status?: string;
};

export type DashboardStats = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalUsers: number;
  newUsers: number;
  [key: string]: unknown;
};

export type RevenueReport = {
  totalRevenue: number;
  totalBookings?: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

export type LoyaltyReport = {
  totalPoints: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};
