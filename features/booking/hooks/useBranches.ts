import { useQuery } from "@tanstack/react-query";
import { getBranches } from "../public-read-service";
import type { Branch } from "../types/booking-types";
import type { ApiError } from "@/lib/api-error";

export function useGetBranchesQuery(keyword = "", token = "", options?: { enabled?: boolean }) {
  return useQuery<Branch[], ApiError>({
    queryKey: ["booking-branches", keyword, token],
    queryFn: async () => {
      return await getBranches(keyword, token);
    },
    enabled: options?.enabled !== false,
  });
}
