import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getSlots,
  createBooking,
  getBookings,
  getBooking,
  checkInBooking,
  cancelBooking,
} from "../booking-service";
import type {
  BookingSlot,
  CreateBookingPayload,
  BookingResult,
  CustomerBooking,
} from "../types/booking-types";
import type { ApiError } from "@/lib/api-error";

export function useGetSlotsQuery(
  token: string,
  branchId: string,
  bookingDate: string,
  options?: { enabled?: boolean }
) {
  return useQuery<BookingSlot[], ApiError>({
    queryKey: ["booking-slots", branchId, bookingDate, token],
    queryFn: async () => {
      if (!token) throw new Error("Authentication token is required");
      if (!branchId || !bookingDate) return [];
      return await getSlots(token, branchId, bookingDate);
    },
    enabled: options?.enabled !== false && !!token && !!branchId && !!bookingDate,
  });
}

export function useCreateBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<BookingResult, ApiError, CreateBookingPayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("Authentication token is required");
      return await createBooking(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-slots"] });
    },
  });
}

export function useGetBookingsQuery(
  token: string,
  params: { fromDate: string; toDate: string; page?: number; pageSize?: number; status?: string },
  options?: { enabled?: boolean }
) {
  return useQuery<CustomerBooking[], ApiError>({
    queryKey: ["customer-bookings", params, token],
    queryFn: async () => {
      if (!token) throw new Error("Authentication token is required");
      return await getBookings(
        token,
        params.fromDate,
        params.toDate,
        params.page ?? 1,
        params.pageSize ?? 20,
        params.status
      );
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetBookingQuery(token: string, id: string, options?: { enabled?: boolean }) {
  return useQuery<CustomerBooking, ApiError>({
    queryKey: ["booking-detail", id, token],
    queryFn: async () => {
      if (!token) throw new Error("Authentication token is required");
      if (!id) throw new Error("Booking ID is required");
      return await getBooking(token, id);
    },
    enabled: options?.enabled !== false && !!token && !!id,
  });
}

export function useCheckInBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("Authentication token is required");
      return await checkInBooking(token, id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
    },
  });
}

export function useCancelBookingMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, { id: string; cancelReason: string }>({
    mutationFn: async ({ id, cancelReason }) => {
      if (!token) throw new Error("Authentication token is required");
      return await cancelBooking(token, id, cancelReason);
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["customer-bookings"] });
      void queryClient.invalidateQueries({ queryKey: ["booking-detail", id] });
      void queryClient.invalidateQueries({ queryKey: ["booking-slots"] });
    },
  });
}
