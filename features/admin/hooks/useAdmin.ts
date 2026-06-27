import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getBranches,
  createBranch,
  updateBranch,
  deleteBranch,
  getUsers,
  getPendingUsers,
  getUser,
  verifyUser,
  rejectUser,
  updateUserStatus,
  getUserStatus,
  getAdminBookings,
  getBookingSlots,
  completeBooking,
  checkInAdminBooking,
  cancelAdminBooking,
  getDashboardStats,
  getRevenueReport,
  getLoyaltyReport,
} from "../services";
import type {
  AdminBranch,
  AdminUser,
  AdminBooking,
  AdminBookingSlot,
  DashboardStats,
  RevenueReport,
  LoyaltyReport,
  PageResult,
  AccountStatus,
} from "../types/admin-types";
import type { ApiError } from "@/lib/api-error";

// ─── Branches Hooks ───────────────────────────────────────────────────────────

export function useGetAdminBranchesQuery(
  token: string,
  params: Parameters<typeof getBranches>[1] = {},
  options?: { enabled?: boolean }
) {
  return useQuery<AdminBranch[], ApiError>({
    queryKey: ["admin-branches", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getBranches(token, params);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useCreateBranchMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, Parameters<typeof createBranch>[1]>({
    mutationFn: async (data) => {
      if (!token) throw new Error("No token provided");
      await createBranch(token, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-branches", token] });
    },
  });
}

export function useUpdateBranchMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; data: Parameters<typeof updateBranch>[2] }>({
    mutationFn: async ({ id, data }) => {
      if (!token) throw new Error("No token provided");
      await updateBranch(token, id, data);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-branches", token] });
    },
  });
}

export function useDeleteBranchMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await deleteBranch(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-branches", token] });
    },
  });
}

// ─── Users Verification Hooks ─────────────────────────────────────────────────

export function useGetUsersQuery(
  token: string,
  params: Parameters<typeof getUsers>[1] = {},
  options?: { enabled?: boolean }
) {
  return useQuery<PageResult<AdminUser>, ApiError>({
    queryKey: ["admin-users", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getUsers(token, params);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetPendingUsersQuery(
  token: string,
  params: Parameters<typeof getPendingUsers>[1] = {},
  options?: { enabled?: boolean }
) {
  return useQuery<PageResult<AdminUser>, ApiError>({
    queryKey: ["admin-pending-users", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getPendingUsers(token, params);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetAdminUserQuery(token: string, id: string, options?: { enabled?: boolean }) {
  return useQuery<AdminUser, ApiError>({
    queryKey: ["admin-user-detail", id, token],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getUser(token, id);
    },
    enabled: options?.enabled !== false && !!token && !!id,
  });
}

export function useVerifyUserMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await verifyUser(token, id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-users", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id, token] });
    },
  });
}

export function useRejectUserMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      if (!token) throw new Error("No token provided");
      await rejectUser(token, id, reason);
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-pending-users", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id, token] });
    },
  });
}

export function useUpdateUserStatusMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; status: AccountStatus }>({
    mutationFn: async ({ id, status }) => {
      if (!token) throw new Error("No token provided");
      await updateUserStatus(token, id, status);
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["admin-users", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-user-detail", id, token] });
    },
  });
}

// ─── Bookings Hooks ───────────────────────────────────────────────────────────

export function useGetAdminBookingsQuery(
  token: string,
  params: Parameters<typeof getAdminBookings>[1] = {},
  options?: { enabled?: boolean }
) {
  return useQuery<PageResult<AdminBooking>, ApiError>({
    queryKey: ["admin-bookings", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getAdminBookings(token, params);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetBookingSlotsQuery(
  token: string,
  params: Parameters<typeof getBookingSlots>[1],
  options?: { enabled?: boolean }
) {
  return useQuery<PageResult<AdminBookingSlot>, ApiError>({
    queryKey: ["admin-booking-slots", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getBookingSlots(token, params);
    },
    enabled: options?.enabled !== false && !!token && !!params?.Date && !!params?.BranchId,
  });
}

export function useCompleteBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; note: string }>({
    mutationFn: async ({ id, note }) => {
      if (!token) throw new Error("No token provided");
      await completeBooking(token, id, note);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats", token] });
    },
  });
}

export function useCheckInAdminBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No token provided");
      await checkInAdminBooking(token, id);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats", token] });
    },
  });
}

export function useCancelAdminBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; reason: string }>({
    mutationFn: async ({ id, reason }) => {
      if (!token) throw new Error("No token provided");
      await cancelAdminBooking(token, id, reason);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["admin-bookings", token] });
      void queryClient.invalidateQueries({ queryKey: ["admin-dashboard-stats", token] });
    },
  });
}

// ─── Dashboard Stats & Reports Hooks ──────────────────────────────────────────

export function useGetDashboardStatsQuery(
  token: string,
  params: Parameters<typeof getDashboardStats>[1],
  options?: { enabled?: boolean }
) {
  return useQuery<DashboardStats, ApiError>({
    queryKey: ["admin-dashboard-stats", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getDashboardStats(token, params);
    },
    enabled: options?.enabled !== false && !!token && !!params?.FromDate && !!params?.ToDate,
  });
}

export function useGetRevenueReportQuery(
  token: string,
  params: Parameters<typeof getRevenueReport>[1],
  options?: { enabled?: boolean }
) {
  return useQuery<RevenueReport, ApiError>({
    queryKey: ["admin-revenue-report", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getRevenueReport(token, params);
    },
    enabled: options?.enabled !== false && !!token && !!params?.FromDate && !!params?.ToDate,
  });
}

export function useGetLoyaltyReportQuery(
  token: string,
  params: Parameters<typeof getLoyaltyReport>[1],
  options?: { enabled?: boolean }
) {
  return useQuery<LoyaltyReport, ApiError>({
    queryKey: ["admin-loyalty-report", token, params],
    queryFn: async () => {
      if (!token) throw new Error("No token provided");
      return await getLoyaltyReport(token, params);
    },
    enabled: options?.enabled !== false && !!token && !!params?.FromDate && !!params?.ToDate,
  });
}
