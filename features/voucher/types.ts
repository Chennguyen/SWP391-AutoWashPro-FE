export interface Reward {
  id: string;
  name: string;
  rewardType: string;
  pointsRequired: number;
  quantityAvailable: number;
  validDays: number;
  description: string;
  isRedeemable: boolean;
  allowedTiers: AllowedTier[];
  isActive?: boolean;
}

export interface AllowedTier {
  id: string;
  name: string;
}

export interface GetRewardsResponse {
  data: Reward[];
}

export interface RedeemRewardRequest {
  rewardId: string;
  customerId: string;
}

export type RedeemRewardResponse = string;
