import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCustomerProfile,
  updateCustomerProfile,
  changeCustomerPassword,
  getMyVerificationStatus,
  resubmitVerification,
} from "../customer-service";
import { CustomerProfile, UpdateCustomerProfilePayload } from "../types/user-types";
import { ApiError } from "@/lib/api-error";

export function useGetProfileQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<CustomerProfile, ApiError>({
    queryKey: ["user-profile", token],
    queryFn: async () => {
      if (!token) throw new Error("No auth token provided");
      return await getCustomerProfile(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useUpdateProfileMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<CustomerProfile, ApiError, UpdateCustomerProfilePayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No auth token provided");
      return await updateCustomerProfile(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-profile", token] });
      void queryClient.invalidateQueries({ queryKey: ["verification-status", token] });
    },
  });
}

export interface ChangePasswordPayload {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export function useChangePasswordMutation(token: string) {
  return useMutation<void, ApiError, ChangePasswordPayload>({
    mutationFn: async ({ currentPassword, newPassword, confirmPassword }) => {
      if (!token) throw new Error("No auth token provided");
      await changeCustomerPassword(token, currentPassword, newPassword, confirmPassword);
    },
  });
}

export function useGetVerificationStatusQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<CustomerProfile & { status: string; rejectReason: string }, ApiError>({
    queryKey: ["verification-status", token],
    queryFn: async () => {
      if (!token) throw new Error("No auth token provided");
      return await getMyVerificationStatus(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useResubmitVerificationMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { firstName: string; lastName: string; faceImages: File[] }>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No auth token provided");
      await resubmitVerification(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["verification-status", token] });
    },
  });
}
