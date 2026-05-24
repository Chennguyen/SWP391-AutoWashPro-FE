// ─── Voucher API ──────────────────────────────────────────────────────────────
// Strategy: user-triggered validation — no-store, called client-side on demand.

import type { VoucherValidation } from '@/types/booking';
import { apiBase, handleApiResponse } from './api-error';

/**
 * Validate a voucher code for the current user.
 * Called client-side when user clicks "Áp dụng".
 * cache: 'no-store'
 */
export async function validateVoucher(
  token: string,
  code: string,
): Promise<VoucherValidation> {
  const url = `${apiBase()}/vouchers/validate`;
  const res = await fetch(url, {
    method: 'POST',
    cache: 'no-store',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ code }),
  });
  return handleApiResponse<VoucherValidation>(res);
}
