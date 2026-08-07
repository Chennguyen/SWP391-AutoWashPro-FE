"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import {
  getWalletTopUpRevenueSummary,
  getWalletTopUpTransactions,
} from "@/features/admin/wallet-topup-service";
import type {
  WalletTopUpTransactionFilters,
  WalletTopUpTransactionQuery,
} from "@/features/admin/types/admin-types";

export function useWalletTopUpTransactions(
  token: string,
  query: WalletTopUpTransactionQuery,
) {
  return useQuery({
    queryKey: ["admin-wallet-topup-transactions", token, query],
    queryFn: () => getWalletTopUpTransactions(token, query),
    enabled: Boolean(token),
    placeholderData: keepPreviousData,
  });
}

export function useWalletTopUpRevenueSummary(
  token: string,
  filters: WalletTopUpTransactionFilters,
) {
  return useQuery({
    queryKey: ["admin-wallet-topup-revenue-summary", token, filters],
    queryFn: () => getWalletTopUpRevenueSummary(token, filters),
    enabled: Boolean(token),
  });
}
