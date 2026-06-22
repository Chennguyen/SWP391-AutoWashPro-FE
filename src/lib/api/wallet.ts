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

/**
 * Phân giải hậu tố đường dẫn URL cho các endpoint ví của khách hàng.
 * 
 * @param path Đường dẫn tương đối tùy chọn.
 * @returns Chuỗi URL API đầy đủ.
 */
function walletEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/wallet${path}`;
}

/**
 * Giải nén thông tin ví thô từ phong bì phản hồi REST tiêu chuẩn từ ngoài vào.
 * 
 * @param body Phản hồi ví của API không phân biệt chữ hoa/thường.
 * @returns Bản ghi dữ liệu ví thô.
 */
function unwrapWallet(body: WalletResponse): WalletRecord {
  return "data" in body && body.data ? body.data : (body as WalletRecord);
}

/**
 * Chuẩn hóa các thuộc tính của ví bao gồm số dư và đơn vị tiền tệ.
 * Hỗ trợ nhiều phiên bản backend khác nhau và các khác biệt về viết hoa/thường của trường.
 * 
 * @param body Bản ghi phản hồi thô.
 * @returns Đối tượng Wallet đã được chuẩn hóa.
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
 * Lấy số dư hiện tại và thông tin chi tiết ví của khách hàng.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành thông tin chi tiết Wallet.
 */
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

/**
 * Nạp thêm tiền vào ví ảo của khách hàng.
 * 
 * @param token Token xác thực.
 * @param balance Số tiền cần nạp thêm vào ví.
 * @returns Một promise giải quyết thành thông tin Wallet đã được cập nhật.
 */
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
