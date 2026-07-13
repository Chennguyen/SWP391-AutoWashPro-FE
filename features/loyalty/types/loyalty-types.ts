export type TierBenefits = {
  prioritySlotBooking?: boolean;
  priorityBookingDays?: number;
  discountPercent?: number;
  [key: string]: unknown;
};

export type LoyaltyTier = {
  id: string;
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description?: string;
  benefits?: TierBenefits;
};

export type LoyaltyInfo = {
  customerId: string;
  points: number;
  totalWashes: number;
  tier: LoyaltyTier | null;
  nextTierName: string | null;
  nextTierRequiredWashes: number | null;
};

export type RewardType = "FREE_WASH" | "VOUCHER" | "GIFT" | string;

export type { Reward } from "@/features/voucher/types";

export type MyVoucher = {
  id: string;
  code: string;
  rewardName: string;
  status: "Active" | "Used" | "Expired" | string;
  discountType: "Percentage" | "FixedAmount" | string;
  discountValue: number;
  discountAmount: number | null;
  rewardType: RewardType;
  expiresAt: string | null;
  usedAt: string | null;
  isUsed: boolean;
};

export type PointTransactionType = "Earn" | "Redeem" | string;

export type PointTransaction = {
  id: string;
  type: PointTransactionType;
  points: number;
  description: string;
  createdAt: string;
};
