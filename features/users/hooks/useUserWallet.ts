import {
  type Query,
  useMutation,
  useQueries,
  useQuery,
} from "@tanstack/react-query";
import {
  createWalletTopUp,
  getWallet,
  getWalletTopUpStatus,
  getWalletTransactions,
} from "../wallet-service";
import {
  Wallet,
  WalletTopUpPayment,
  WalletTopUpStatusResult,
} from "../types/user-types";
import { trackPendingWalletTopUp } from "../wallet-top-up-tracker";
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

export function useCreateWalletTopUpMutation(token: string) {
  return useMutation<WalletTopUpPayment, ApiError, number>({
    mutationFn: async (amount) => {
      if (!token) throw new Error("No auth token provided");
      return await createWalletTopUp(token, amount);
    },
    onSuccess: trackPendingWalletTopUp,
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

export function useGetWalletTopUpStatusQueries(
  token: string,
  transactionIds: readonly string[],
) {
  return useQueries({
    queries: transactionIds.map((transactionId) => ({
      queryKey: ["wallet-top-up-status", transactionId],
      queryFn: () => getWalletTopUpStatus(token, transactionId),
      enabled: Boolean(token && transactionId),
      refetchInterval: (
        query: Query<WalletTopUpStatusResult, Error>,
      ) =>
        query.state.data?.status === "Pending" ? 3_000 : false,
      refetchIntervalInBackground: true,
      refetchOnWindowFocus: (
        query: Query<WalletTopUpStatusResult, Error>,
      ) =>
        query.state.data?.status === "Pending",
      refetchOnReconnect: (
        query: Query<WalletTopUpStatusResult, Error>,
      ) =>
        query.state.data?.status === "Pending",
      retry: 2,
    })),
  });
}
