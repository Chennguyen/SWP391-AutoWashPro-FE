export type AdminTier = {
  id: string;
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description?: string;
};

export type CreateTierPayload = {
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description?: string;
};

export type UpdateTierPayload = Partial<{
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description: string;
}>;

export type LoyaltyPointsConfig = {
  vndPerPoint: number;      // configKey: "point_earn_rate"
  slotDurationMinutes?: number; // configKey: "SlotDurationMinutes"
  workingStartHour?: string;    // configKey: "WorkingStartHour"
  workingEndHour?: string;      // configKey: "WorkingEndHour"
  basePrice?: number;           // configKey: "BasePrice"
  suvBasePrice?: number;        // configKey: "SuvBasePrice"
  sedanBasePrice?: number;      // configKey: "SedanBasePrice"
  paymentDeposite?: number;     // configKey: "PaymentDeposite"
};

export type LoyaltyPointsConfigRaw = {
  configKey: string;
  configValue: string;
};

export type AdminRewardTypeEnum = 0 | 1 | 2;
export type AdminRewardType = "FREE_WASH" | "VOUCHER" | "GIFT" | string;

export type AdminReward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: AdminRewardType;
  rewardTypeEnum: AdminRewardTypeEnum;
  quantityAvailable: number | null;
  validDays: number | null;
  isActive: boolean;
  tierIds?: string[];
};

export type CreateRewardPayload = {
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: AdminRewardTypeEnum;   // integer enum
  quantityAvailable: number;
  validDays: number;
  isActive: boolean;
  tierIds?: string[];
};

export type UpdateRewardPayload = Partial<{
  name: string;
  description: string;
  pointsRequired: number;
  quantityAvailable: number;
  validDays: number;
  isActive: boolean;
  tierIds: string[];
}>;

export type AdminPromotion = {
  id: string;
  name: string;
  description: string;
  discountType: string;   // "Percentage" or "FixedAmount"
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  isActive?: boolean;
  tierIds?: string[];
};

export type CreatePromotionPayload = {
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  tierIds?: string[];
};

export type AdjustPointsAction = "ADD" | "SUBTRACT";

export type AdjustPointsPayload = {
  action: AdjustPointsAction;
  points: number;
  reason: string;
};

export type UpdatePromotionPayload = Partial<{
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  isActive: boolean;
  tierIds: string[];
}>;
