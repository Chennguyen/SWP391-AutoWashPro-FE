import { apiBase, handleApiResponse } from "./api-error";

export interface Wallet {
  id?: string;
  balance: number;
  currency?: string;
  updatedAt?: string;
}

type WalletRecord = {
  id?: string | number;
  Id?: string | number;
  walletId?: string | number;
  WalletId?: string | number;
  balance?: number | string;
  Balance?: number | string;
  amount?: number | string;
  Amount?: number | string;
  walletBalance?: number | string;
  WalletBalance?: number | string;
  currency?: string;
  Currency?: string;
  updatedAt?: string;
  UpdatedAt?: string;
};

type WalletResponse = WalletRecord | { data?: WalletRecord };

function walletEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/wallet${path}`;
}

function unwrapWallet(body: WalletResponse): WalletRecord {
  return "data" in body && body.data ? body.data : (body as WalletRecord);
}

function normalizeWallet(body: WalletResponse): Wallet {
  const raw = unwrapWallet(body);
  const balance = Number(
    raw.balance ??
      raw.Balance ??
      raw.amount ??
      raw.Amount ??
      raw.walletBalance ??
      raw.WalletBalance ??
      0,
  );

  return {
    id: raw.id !== undefined || raw.Id !== undefined || raw.walletId !== undefined || raw.WalletId !== undefined
      ? String(raw.id ?? raw.Id ?? raw.walletId ?? raw.WalletId)
      : undefined,
    balance: Number.isFinite(balance) ? balance : 0,
    currency: raw.currency ?? raw.Currency ?? "VND",
    updatedAt: raw.updatedAt ?? raw.UpdatedAt,
  };
}

export async function getWallet(token: string): Promise<Wallet> {
  const res = await fetch(walletEndpoint(), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<WalletResponse>(res);
  return normalizeWallet(body);
}

export async function topUpWallet(token: string, balance: number): Promise<Wallet> {
  const res = await fetch(walletEndpoint("/top-up"), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ Balance: balance }),
  });
  const body = await handleApiResponse<WalletResponse>(res);
  return normalizeWallet(body);
}
