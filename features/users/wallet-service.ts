import { axiosInstance } from "@/lib/axios";
import { GetTransactionsResponse } from "@/types/transaction";

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

/**
 * Lấy số dư hiện tại và thông tin chi tiết ví của khách hàng bằng Axios.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành thông tin chi tiết Wallet.
 */
export async function getWallet(token: string): Promise<Wallet> {
  const res = await axiosInstance.get<WalletResponse>("/api/v1/wallet");
  return normalizeWallet(res.data);
}

/**
 * Nạp thêm tiền vào ví ảo của khách hàng bằng Axios.
 * 
 * @param token Token xác thực.
 * @param balance Số tiền cần nạp thêm vào ví.
 * @returns Một promise giải quyết thành thông tin Wallet đã được cập nhật.
 */
export async function topUpWallet(token: string, balance: number): Promise<Wallet> {
  const res = await axiosInstance.patch<WalletResponse>("/api/v1/wallet/top-up", { Balance: balance });
  return normalizeWallet(res.data);
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
