import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { getWallet, topUpWallet, getWalletTransactions } from "../wallet-service";
import { Wallet } from "../types/user-types";
import { GetTransactionsResponse } from "@/types/transaction";
import { ApiError } from "@/lib/api-error";

export function useGetWalletQuery(token: string, options?: { enabled?: boolean }) {
  return useQuery<Wallet, ApiError>({
    queryKey: ["user-wallet", token],
    queryFn: async () => {
      if (!token) throw new Error("No auth token provided");
      return await getWallet(token);
    },
    enabled: options?.enabled !== false && !!token,
  });
}

export function useTopUpWalletMutation(token: string) {
  const queryClient = useQueryClient();

  return useMutation<Wallet, ApiError, number>({
    mutationFn: async (amount) => {
      if (!token) throw new Error("No auth token provided");
      return await topUpWallet(token, amount);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["user-wallet", token] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    },
  });
}

export function useGetWalletTransactionsQuery(
  params: Parameters<typeof getWalletTransactions>[0],
  options?: { enabled?: boolean }
) {
  return useQuery<GetTransactionsResponse, ApiError>({
    queryKey: ["wallet-transactions", params],
    queryFn: async () => {
      return await getWalletTransactions(params);
    },
    enabled: options?.enabled !== false,
  });
}
