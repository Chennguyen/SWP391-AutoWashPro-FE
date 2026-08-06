import { axiosInstance } from "@/lib/axios";
import { GetTransactionsResponse } from "@/types/transaction";

import {
  Wallet,
  WalletTopUpPayment,
  WalletTopUpStatus,
  WalletTopUpStatusResult,
} from "./types/user-types";
export {
  type Wallet,
  type WalletTopUpPayment,
  type WalletTopUpStatus,
  type WalletTopUpStatusResult,
};

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

type WalletTopUpRecord = {
  transactionId?: string;
  TransactionId?: string;
  amount?: number | string;
  Amount?: number | string;
  currency?: string;
  Currency?: string;
  bankName?: string;
  BankName?: string;
  bankAccount?: string;
  BankAccount?: string;
  referenceCode?: string;
  ReferenceCode?: string;
  description?: string;
  Description?: string;
  qrCode?: string;
  QRCode?: string;
  status?: string;
  Status?: string;
  createdAt?: string | null;
  CreatedAt?: string | null;
  expiredAt?: string | null;
  ExpiredAt?: string | null;
  paidAt?: string | null;
  PaidAt?: string | null;
  externalTransactionId?: string | null;
  ExternalTransactionId?: string | null;
  bankReferenceCode?: string | null;
  BankReferenceCode?: string | null;
  message?: string;
  Message?: string;
};

type WalletTopUpResponse =
  | WalletTopUpRecord
  | { data?: WalletTopUpRecord };

function unwrapWalletTopUp(body: WalletTopUpResponse): WalletTopUpRecord {
  return "data" in body ? (body.data ?? {}) : (body as WalletTopUpRecord);
}

function normalizeWalletTopUpStatus(status: unknown): WalletTopUpStatus {
  if (
    status === "Pending" ||
    status === "Succeeded" ||
    status === "Failed" ||
    status === "Expired"
  ) {
    return status;
  }

  throw new Error("Backend returned an unsupported wallet top-up status.");
}

/**
 * Giải nén thông tin ví thô từ phản hồi của API.
 */
function unwrapWallet(body: WalletResponse): WalletRecord {
  return "data" in body && body.data ? body.data : (body as WalletRecord);
}

/**
 * Chuẩn hóa các thuộc tính của ví.
 */
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

function normalizeWalletTopUp(body: WalletTopUpResponse): WalletTopUpPayment {
  const raw = unwrapWalletTopUp(body);
  const amount = Number(raw.amount ?? raw.Amount ?? 0);
  const transactionId = String(raw.transactionId ?? raw.TransactionId ?? "");
  const qrCode = raw.qrCode ?? raw.QRCode ?? "";
  const expiredAt = raw.expiredAt ?? raw.ExpiredAt ?? "";

  if (
    !transactionId ||
    !qrCode ||
    !expiredAt ||
    Number.isNaN(Date.parse(expiredAt))
  ) {
    throw new Error("Backend returned incomplete wallet top-up information.");
  }

  return {
    transactionId,
    amount: Number.isFinite(amount) ? amount : 0,
    currency: raw.currency ?? raw.Currency ?? "VND",
    bankName: raw.bankName ?? raw.BankName ?? "",
    bankAccount: raw.bankAccount ?? raw.BankAccount ?? "",
    referenceCode: raw.referenceCode ?? raw.ReferenceCode ?? "",
    description: raw.description ?? raw.Description ?? "",
    qrCode,
    status: normalizeWalletTopUpStatus(raw.status ?? raw.Status),
    expiredAt,
    message: raw.message ?? raw.Message ?? "",
  };
}

function normalizeWalletTopUpStatusResult(
  body: WalletTopUpResponse,
): WalletTopUpStatusResult {
  const raw = unwrapWalletTopUp(body);
  const amount = Number(raw.amount ?? raw.Amount ?? 0);

  return {
    transactionId: String(raw.transactionId ?? raw.TransactionId ?? ""),
    amount: Number.isFinite(amount) ? amount : 0,
    currency: raw.currency ?? raw.Currency ?? "VND",
    referenceCode: raw.referenceCode ?? raw.ReferenceCode ?? "",
    status: normalizeWalletTopUpStatus(raw.status ?? raw.Status),
    createdAt: raw.createdAt ?? raw.CreatedAt ?? null,
    expiredAt: raw.expiredAt ?? raw.ExpiredAt ?? null,
    paidAt: raw.paidAt ?? raw.PaidAt ?? null,
    externalTransactionId:
      raw.externalTransactionId ?? raw.ExternalTransactionId ?? null,
    bankReferenceCode:
      raw.bankReferenceCode ?? raw.BankReferenceCode ?? null,
  };
}

/**
 * Lấy số dư hiện tại và thông tin chi tiết ví của khách hàng bằng Axios.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành thông tin chi tiết Wallet.
 */
export async function getWallet(token: string): Promise<Wallet> {
  void token;
  const res = await axiosInstance.get<WalletResponse>("/api/v2/wallet");
  return normalizeWallet(res.data);
}

/**
 * Tạo yêu cầu nạp ví qua QR. Backend chỉ cộng tiền sau khi SePay xác nhận.
 * 
 * @param token Token xác thực.
 * @param balance Số tiền cần nạp thêm vào ví.
 * @returns Thông tin giao dịch pending và URL QR do Backend tạo.
 */
export async function createWalletTopUp(
  token: string,
  balance: number,
): Promise<WalletTopUpPayment> {
  void token;
  const res = await axiosInstance.patch<WalletTopUpResponse>(
    "/api/v2/wallet/top-up",
    { balance },
  );
  return normalizeWalletTopUp(res.data);
}

/**
 * Lấy trạng thái top-up từ Backend bằng đúng transactionId của yêu cầu QR.
 */
export async function getWalletTopUpStatus(
  token: string,
  transactionId: string,
): Promise<WalletTopUpStatusResult> {
  void token;
  const res = await axiosInstance.get<WalletTopUpResponse>(
    `/api/v2/wallet/top-up/${encodeURIComponent(transactionId)}`,
  );
  return normalizeWalletTopUpStatusResult(res.data);
}

/**
 * Lấy danh sách lịch sử giao dịch ví của khách hàng từ Backend.
 * 
 * @param params Tham số phân trang, loại giao dịch và từ khóa mô tả.
 * @returns Phản hồi danh sách giao dịch kèm thông tin phân trang.
 */
export async function getWalletTransactions(
  params: { pageIndex: number; pageSize: number; type?: number; description?: string }
): Promise<GetTransactionsResponse> {
  const query = new URLSearchParams({
    PageIndex: String(params.pageIndex),
    PageSize: String(params.pageSize),
  });
  
  if (params.type !== undefined) {
    query.set("Type", String(params.type));
  }
  if (params.description?.trim()) {
    query.set("Description", params.description.trim());
  }

  // Gọi đến endpoint /api/v1/Transaction được cấu hình ở Backend
  const res = await axiosInstance.get<GetTransactionsResponse>(`/api/v1/Transaction?${query.toString()}`);
  return res.data;
}
