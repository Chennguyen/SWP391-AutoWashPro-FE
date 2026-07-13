import { useMutation } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";
import { redeemReward } from "../services";
import type {
  RedeemRewardRequest,
  RedeemRewardResponse,
} from "../types";

export function useRedeemRewardMutation() {
  return useMutation<
    RedeemRewardResponse,
    ApiError,
    RedeemRewardRequest
  >({
    mutationFn: redeemReward,
  });
}
