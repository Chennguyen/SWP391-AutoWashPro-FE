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
  vehicleType?: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  note?: string;
  cancelReason?: string;
  createdAt?: string;
  basePrice?: number;
  discountAmount?: number;
  finalPrice?: number;
  serviceBasePrice?: number;
  vehicleSurcharge?: number;
};

export type AdminCheckInResult = {
  id: string;
  status: BookingStatus;
  checkedInAt: string;
  estimatedCompletedAt: string;
  message: string;
};

export type AdminCancelBookingResult = {
  id: string;
  status: BookingStatus;
  cancelledAt: string;
  refundApplied: boolean;
  refundAmount: number;
  refundTransactionId?: string;
  refundReasonCode?: string;
  message: string;
};

export type AdminBulkCancelBookingsRequest = {
  BranchId: string;
  FromDate: string;
  ToDate: string;
};

export type AdminBulkCancelBookingsResult = {
  branchId: string;
  fromDate: string;
  toDate: string;
  totalBookingCount: number;
  cancelledBookingCount: number;
  refundedBookingCount: number;
  skippedBookingCount: number;
  totalRefundAmount: number;
  message: string;
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
  activeCustomers?: number;
  lockedCustomers?: number;
  totalBranches?: number;
  activeBranches?: number;
  todayBookings: DashboardTodayBooking[];
  topBranches: DashboardTopBranch[];
  [key: string]: unknown;
};

export type DashboardTodayBooking = {
  id: string;
  startTime: string;
  status: string;
  branchName: string;
  licensePlate: string;
};

export type DashboardTopBranch = {
  branchId: string;
  branchName: string;
  completedBookings: number;
  revenue: number;
};

export type RevenueReport = {
  totalRevenue: number;
  totalBookings?: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

export type LoyaltyReport = {
  summary: {
    totalPointsEarned: number;
    totalPointsRedeemed: number;
    totalRewardsRedeemed: number;
    tierUpgradeCount: number;
  };
  tierDistribution: Array<{
    tierName: string;
    customerCount: number;
  }>;
  [key: string]: unknown;
};

export type WalletTopUpTransactionStatus =
  | "Pending"
  | "Succeeded"
  | "Failed"
  | "Expired";

export type WalletTopUpTransaction = {
  transactionId: string;
  customerId: string;
  customerName: string;
  email: string;
  phone: string;
  amount: number;
  status: WalletTopUpTransactionStatus | null;
  provider: string | null;
  referenceCode: string | null;
  externalTransactionId: string | null;
  paidAt: string | null;
  createdAt: string;
};

export type WalletTopUpTransactionFilters = {
  keyword?: string;
  status?: WalletTopUpTransactionStatus;
  fromDate?: string;
  toDate?: string;
  minAmount?: number;
  maxAmount?: number;
};

export type WalletTopUpTransactionQuery = WalletTopUpTransactionFilters & {
  pageIndex: number;
  pageSize: number;
};

export type WalletTopUpTransactionPage = {
  items: WalletTopUpTransaction[];
  totalItems: number;
  pageSize: number;
  pageIndex: number;
};

export type WalletTopUpRevenueSummary = {
  totalRevenue: number;
  succeededTransactions: number;
};
