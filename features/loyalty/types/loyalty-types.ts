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
  points: number;
  totalWashes: number;
  tier: LoyaltyTier | null;
  nextTierName: string | null;
  nextTierRequiredWashes: number | null;
};

export type RewardType = "FREE_WASH" | "VOUCHER" | "GIFT" | string;

export type Reward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: RewardType;
  quantityAvailable: number | null;
  validDays: number | null;
  isActive: boolean;
};

export type MyVoucher = {
  id: string;
  code: string;
  rewardName: string;
  discountAmount: number | null;
  rewardType: RewardType;
  expiresAt: string | null;
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
