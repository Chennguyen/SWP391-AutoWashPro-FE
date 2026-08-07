"use client";

import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef, useSyncExternalStore } from "react";
import { toast } from "sonner";
import type { WalletTopUpStatus } from "../types/user-types";
import {
  getPendingWalletTopUpsServerSnapshot,
  getPendingWalletTopUpsSnapshot,
  type PendingWalletTopUp,
  subscribeToPendingWalletTopUps,
  untrackPendingWalletTopUp,
} from "../wallet-top-up-tracker";
import { getWallet, getWalletTopUpStatus } from "../wallet-service";

const TERMINAL_STATUSES = new Set<WalletTopUpStatus>([
  "Succeeded",
  "Failed",
  "Expired",
  "Cancelled",
]);

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function subscribeAuthState(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};

  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function getTokenSnapshot() {
  if (typeof window === "undefined") return "";

  try {
    return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
  } catch {
    return "";
  }
}

function getOwnerIdSnapshot() {
  if (typeof window === "undefined") return "";

  try {
    return window.localStorage.getItem("userId") ?? "";
  } catch {
    return "";
  }
}

function getServerAuthSnapshot() {
  return "";
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function isTerminalStatus(status: WalletTopUpStatus | undefined) {
  return status !== undefined && TERMINAL_STATUSES.has(status);
}

function WalletTopUpTransactionPoller({
  token,
  pendingTopUp,
}: {
  token: string;
  pendingTopUp: PendingWalletTopUp;
}) {
  const queryClient = useQueryClient();
  const handledStatusRef = useRef<WalletTopUpStatus | null>(null);
  const { amount, transactionId } = pendingTopUp;
  const statusQuery = useQuery({
    queryKey: ["wallet-top-up-status", transactionId],
    queryFn: () => getWalletTopUpStatus(token, transactionId),
    enabled: Boolean(token),
    refetchInterval: (query) =>
      isTerminalStatus(query.state.data?.status) ? false : 3_000,
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: (query) =>
      !isTerminalStatus(query.state.data?.status),
    refetchOnReconnect: (query) =>
      !isTerminalStatus(query.state.data?.status),
    retry: 2,
  });
  const status = statusQuery.data?.status;

  useEffect(() => {
    if (!isTerminalStatus(status) || handledStatusRef.current === status) {
      return;
    }

    handledStatusRef.current = status ?? null;
    untrackPendingWalletTopUp(transactionId);

    if (status === "Succeeded") {
      void queryClient.invalidateQueries({ queryKey: ["user-wallet"] });
      void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
      void getWallet(token)
        .then((wallet) => {
          queryClient.setQueryData(["user-wallet", token], wallet);
          window.dispatchEvent(
            new CustomEvent("autowash-wallet-updated", { detail: wallet }),
          );
        })
        .catch(() => undefined);

      toast.success("Nạp tiền thành công", {
        id: `wallet-top-up-${transactionId}`,
        description: `${formatCurrency(amount)} đã được cộng vào ví của bạn.`,
      });
      return;
    }

    const isExpired = status === "Expired";
    toast.error(isExpired ? "Giao dịch đã hết hạn" : "Giao dịch đã bị hủy", {
      id: `wallet-top-up-${transactionId}`,
      description: "Số dư ví của bạn không bị thay đổi.",
    });
  }, [amount, queryClient, status, token, transactionId]);

  return null;
}

export function WalletTopUpStatusMonitor() {
  const pendingTopUps = useSyncExternalStore(
    subscribeToPendingWalletTopUps,
    getPendingWalletTopUpsSnapshot,
    getPendingWalletTopUpsServerSnapshot,
  );
  const token = useSyncExternalStore(
    subscribeAuthState,
    getTokenSnapshot,
    getServerAuthSnapshot,
  );
  const ownerId = useSyncExternalStore(
    subscribeAuthState,
    getOwnerIdSnapshot,
    getServerAuthSnapshot,
  );

  return pendingTopUps
    .filter(
      (pendingTopUp) =>
        !pendingTopUp.ownerId ||
        !ownerId ||
        pendingTopUp.ownerId === ownerId,
    )
    .map((pendingTopUp) => (
      <WalletTopUpTransactionPoller
        key={pendingTopUp.transactionId}
        token={token}
        pendingTopUp={pendingTopUp}
      />
    ));
}
