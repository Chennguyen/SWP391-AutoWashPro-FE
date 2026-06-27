import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getVehicles, addVehicle, updateVehicle, deleteVehicle } from "@/features/booking/vehicle-service";
import { Vehicle, AddVehiclePayload, UpdateVehiclePayload } from "@/features/booking/types/vehicle-types";
import { ApiError } from "@/lib/api-error";

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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-vehicles", token] });
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
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-vehicles", token] });
    },
  });
}
