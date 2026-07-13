import { useQuery } from "@tanstack/react-query";
import type { ApiError } from "@/lib/api-error";
import { getRewards } from "../services";
import type { Reward } from "../types";

export function getRewardsQueryKey(token: string) {
  return ["loyalty-rewards", token, "redeemable"] as const;
}

export function useGetRewardsQuery(
  token: string,
  options?: { enabled?: boolean },
) {
  return useQuery<Reward[], ApiError>({
    queryKey: getRewardsQueryKey(token),
    queryFn: getRewards,
    enabled: options?.enabled !== false && Boolean(token),
  });
}
