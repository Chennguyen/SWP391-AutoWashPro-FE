import { axiosInstance } from "@/lib/axios";
import { ApiError } from "@/lib/api-error";
import type {
  GetRewardsResponse,
  RedeemRewardRequest,
  RedeemRewardResponse,
  Reward,
} from "./types";

export async function getRewards(): Promise<Reward[]> {
  const response = await axiosInstance.get<GetRewardsResponse>("/api/v1/rewards");

  if (!Array.isArray(response.data.data)) {
    throw new ApiError("Dữ liệu phần thưởng không hợp lệ.", 500);
  }

  return response.data.data;
}

export async function redeemReward(
  request: RedeemRewardRequest,
): Promise<RedeemRewardResponse> {
  const response = await axiosInstance.post<RedeemRewardResponse>(
    "/Reward/redeem-reward",
    undefined,
    {
      params: {
        rewardId: request.rewardId,
        id: request.customerId,
      },
    },
  );

  return response.data;
}
