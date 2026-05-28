// ─── Voucher API ──────────────────────────────────────────────────────────────
// Strategy: user-triggered validation — no-store, called client-side on demand.

import type { VoucherValidation } from '@/types/booking';
import { apiBase, handleApiResponse } from './api-error';

type VoucherRecord = {
  id?: string;
  Id?: string;
  voucherId?: string;
  VoucherId?: string;
  code?: string;
  Code?: string;
  valid?: boolean;
  Valid?: boolean;
  isValid?: boolean;
  IsValid?: boolean;
  discountAmount?: number;
  DiscountAmount?: number;
  message?: string;
  Message?: string;
  data?: VoucherRecord;
  Data?: VoucherRecord;
};

function normalizeVoucher(body: VoucherRecord): VoucherValidation {
  const raw = body.data ?? body.Data ?? body;
  return {
    id: raw.id ?? raw.Id,
    voucherId: raw.voucherId ?? raw.VoucherId ?? raw.id ?? raw.Id,
    code: raw.code ?? raw.Code ?? "",
    valid: raw.valid ?? raw.Valid ?? raw.isValid ?? raw.IsValid ?? false,
    discountAmount: Number(raw.discountAmount ?? raw.DiscountAmount ?? 0),
    message: raw.message ?? raw.Message ?? "",
  };
}

/**
 * Validate a voucher code for the current user.
 * Called client-side when user clicks "Áp dụng".
 * cache: 'no-store'
 */
export async function validateVoucher(
  token: string,
  code: string,
  totalAmount: number,
): Promise<VoucherValidation> {
  const url = `${apiBase()}/Voucher/vouchers/validate`;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code, totalAmount }),
  });
  const body = await handleApiResponse<VoucherRecord>(res);
  return normalizeVoucher(body);
}
