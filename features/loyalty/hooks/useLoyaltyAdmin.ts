import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getLoyaltySettings,
  updateLoyaltySettings,
  getAdminTiers,
  createAdminTier,
  updateAdminTier,
  deleteAdminTier,
  getAdminRewards,
  createAdminReward,
  updateAdminReward,
  deleteAdminReward,
  getAdminPromotions,
  createAdminPromotion,
  updateAdminPromotion,
  deleteAdminPromotion,
  adjustCustomerPoints,
  updateSystemConfig,
} from "../loyalty-admin-service";
import type {
  AdminTier,
  CreateTierPayload,
  UpdateTierPayload,
  LoyaltyPointsConfig,
  AdminReward,
  CreateRewardPayload,
  UpdateRewardPayload,
  AdminPromotion,
  CreatePromotionPayload,
  UpdatePromotionPayload,
  AdjustPointsPayload,
} from "../types/loyalty-admin-types";
import type { ApiError } from "@/lib/api-error";

// ─── Settings Hooks ───────────────────────────────────────────────────────────

export function useGetLoyaltySettingsQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<LoyaltyPointsConfig, ApiError>({
    queryKey: ["loyalty-settings", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getLoyaltySettings(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useUpdateLoyaltySettingsMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, Parameters<typeof updateLoyaltySettings>[1]>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No token provided");
      await updateLoyaltySettings(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loyalty-settings", token] });
    },
  });
}

export function useUpdateSystemConfigMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { configKey: string; configValue: string }>({
    mutationFn: async ({ configKey, configValue }) => {
      if (!token) throw new Error("No token provided");
      await updateSystemConfig(token, configKey, configValue);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loyalty-settings", token] });
    },
  });
}

// ─── Tiers Hooks ──────────────────────────────────────────────────────────────

export function useGetAdminTiersQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<AdminTier[], ApiError>({
    queryKey: ["admin-tiers", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getAdminTiers(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useCreateAdminTierMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, CreateTierPayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No token provided");
      await createAdminTier(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tiers", token] });
      void queryClient.invalidateQueries({ queryKey: ["all-tiers"] });
    },
  });
}

export function useUpdateAdminTierMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; payload: UpdateTierPayload }>({
    mutationFn: async ({ id, payload }) => {
      if (!token) throw new Error("No token provided");
      await updateAdminTier(token, id, payload);
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tiers", token] });
      void queryClient.invalidateQueries({ queryKey: ["all-tiers"] });
    },
  });
}

export function useDeleteAdminTierMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await deleteAdminTier(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-tiers", token] });
      void queryClient.invalidateQueries({ queryKey: ["all-tiers"] });
    },
  });
}

// ─── Rewards Hooks ────────────────────────────────────────────────────────────

export function useGetAdminRewardsQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<AdminReward[], ApiError>({
    queryKey: ["admin-rewards", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getAdminRewards(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useCreateAdminRewardMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, CreateRewardPayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No token provided");
      await createAdminReward(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rewards", token] });
      void queryClient.invalidateQueries({ queryKey: ["loyalty-rewards", token] });
    },
  });
}

export function useUpdateAdminRewardMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; payload: UpdateRewardPayload }>({
    mutationFn: async ({ id, payload }) => {
      if (!token) throw new Error("No token provided");
      await updateAdminReward(token, id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rewards", token] });
      void queryClient.invalidateQueries({ queryKey: ["loyalty-rewards", token] });
    },
  });
}

export function useDeleteAdminRewardMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await deleteAdminReward(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-rewards", token] });
      void queryClient.invalidateQueries({ queryKey: ["loyalty-rewards", token] });
    },
  });
}

// ─── Promotions Hooks ─────────────────────────────────────────────────────────

export function useGetAdminPromotionsQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<AdminPromotion[], ApiError>({
    queryKey: ["admin-promotions", token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getAdminPromotions(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useCreateAdminPromotionMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, CreatePromotionPayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No token provided");
      await createAdminPromotion(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-promotions", token] });
    },
  });
}

export function useUpdateAdminPromotionMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; payload: UpdatePromotionPayload }>({
    mutationFn: async ({ id, payload }) => {
      if (!token) throw new Error("No token provided");
      await updateAdminPromotion(token, id, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-promotions", token] });
    },
  });
}

export function useDeleteAdminPromotionMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await deleteAdminPromotion(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-promotions", token] });
    },
  });
}

// ─── Points Adjustment Hooks ──────────────────────────────────────────────────

export function useAdjustCustomerPointsMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { customerId: string; payload: AdjustPointsPayload }>({
    mutationFn: async ({ customerId, payload }) => {
      if (!token) throw new Error("No token provided");
      await adjustCustomerPoints(token, customerId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["loyalty-info"] });
      void queryClient.invalidateQueries({ queryKey: ["point-transactions"] });
    },
  });
}
