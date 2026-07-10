import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVehicles, getVehicle, addVehicle, updateVehicle, deleteVehicle } from "../vehicle-service";
import type { Vehicle, AddVehiclePayload, UpdateVehiclePayload } from "../types/vehicle-types";
import type { ApiError } from "@/lib/api-error";

export function useGetVehiclesQuery(token: string, page = 1, pageSize = 20, options?: { enabled?: boolean }) {
  return useQuery<Vehicle[], ApiError>({
    queryKey: ["user-vehicles", token, page, pageSize],
    queryFn: async () => {
      if (!token) return [];
      return await getVehicles(token, page, pageSize);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useGetVehicleQuery(token: string, id: string, options?: { enabled?: boolean }) {
  return useQuery<Vehicle, ApiError>({
    queryKey: ["user-vehicle", id, token],
    queryFn: async () => {
      if (!token) throw new Error("No auth token provided");
      return await getVehicle(token, id);
    },
    enabled: options?.enabled !== false && !!token && !!id,
  });
}

export function useAddVehicleMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<Vehicle, ApiError, AddVehiclePayload>({
    mutationFn: async (payload) => {
      if (!token) throw new Error("No auth token provided");
      return await addVehicle(token, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-vehicles", token] });
    },
  });
}

export function useUpdateVehicleMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<Vehicle, ApiError, { id: string; payload: UpdateVehiclePayload }>({
    mutationFn: async ({ id, payload }) => {
      if (!token) throw new Error("No auth token provided");
      return await updateVehicle(token, id, payload);
    },
    onSuccess: (_, { id }) => {
      void queryClient.invalidateQueries({ queryKey: ["user-vehicles", token] });
      void queryClient.invalidateQueries({ queryKey: ["user-vehicle", id, token] });
    },
  });
}

export function useDeleteVehicleMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<void, ApiError, string>({
    mutationFn: async (id) => {
      if (!token) throw new Error("No auth token provided");
      await deleteVehicle(token, id);
    },
    onSuccess: (_, id) => {
      void queryClient.invalidateQueries({ queryKey: ["user-vehicles", token] });
      void queryClient.invalidateQueries({ queryKey: ["user-vehicle", id, token] });
    },
  });
}
