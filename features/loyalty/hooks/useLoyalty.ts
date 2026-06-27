import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLoyaltyInfo,
  getAllTiers,
  getPointTransactions,
  getRewards,
  getMyVouchers,
  redeemReward,
} from "../loyalty-service";
import type {
  LoyaltyInfo,
  LoyaltyTier,
  Reward,
  MyVoucher,
  PointTransaction,
} from "../types/loyalty-types";
import type { ApiError } from "@/lib/api-error";

export function useGetLoyaltyInfoQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<LoyaltyInfo, ApiError>({
    queryKey: ["loyalty-info", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getLoyaltyInfo(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetAllTiersQuery(token?: string, options?: { enabled?: boolean }) {
  return useQuery<LoyaltyTier[], ApiError>({
    queryKey: ["all-tiers", token],
    queryFn: async () => {
      return await getAllTiers(token);
    },
    enabled: options?.enabled !== false,
  });
}

export function useGetPointTransactionsQuery(
  token: string,
  params?: { type?: string; page?: number; pageSize?: number },
  options?: { enabled?: boolean }
) {
  return useQuery<PointTransaction[], ApiError>({
    queryKey: ["point-transactions", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getPointTransactions(token, params);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetRewardsQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<Reward[], ApiError>({
    queryKey: ["loyalty-rewards", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getRewards(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetMyVouchersQuery(
  token: string,
  userId: string,
  options?: { enabled?: boolean }
) {
  return useQuery<MyVoucher[], ApiError>({
    queryKey: ["my-vouchers", token, userId],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      if (!userId) return [];
      return await getMyVouchers(token, userId);
    },
    enabled: options?.enabled !== false && !!token && !!userId,
  });
}

export function useRedeemRewardMutation(token: string, userId: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (rewardId) => {
      if (!token) throw new Error("No token provided");
      if (!userId) throw new Error("No user ID provided");
      await redeemReward(token, rewardId, userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loyalty-info", token] });
      void queryClient.invalidateQueries({ queryKey: ["my-vouchers", token, userId] });
      void queryClient.invalidateQueries({ queryKey: ["point-transactions", token] });
    },
  });
}
