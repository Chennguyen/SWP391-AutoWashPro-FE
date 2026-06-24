// ─── Voucher API ──────────────────────────────────────────────────────────────
// Chiến lược: kiểm tra do người dùng kích hoạt — không lưu cache (no-store), gọi trực tiếp từ phía client khi cần.

import type { VoucherValidation } from '@/features/booking/booking-types';
import { apiBase, handleApiResponse } from '@/lib/api-error';

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

/**
 * Chuẩn hóa phản hồi kiểm tra voucher thô từ backend thành cấu trúc VoucherValidation.
 * Trích xuất các trường lồng nhau và đảm bảo các giá trị dự phòng mặc định.
 * 
 * @param body Bản ghi phản hồi thô.
 * @returns Giao diện VoucherValidation đã chuẩn hóa.
 */
function normalizeVoucher(body: VoucherRecord): VoucherValidation {
  const raw = body.data ?? body.Data ?? body;
  return {
    id: raw.id ?? raw.Id,
    voucherId: raw.voucherId ?? raw.VoucherId ?? raw.id ?? raw.Id,
    code: raw.code ?? raw.Code ?? '',
    valid: raw.valid ?? raw.Valid ?? raw.isValid ?? raw.IsValid ?? false,
    discountAmount: Number(raw.discountAmount ?? raw.DiscountAmount ?? 0),
    message: raw.message ?? raw.Message ?? '',
  };
}

/**
 * Xác thực mã voucher đối với tổng hóa đơn thanh toán cụ thể của khách hàng.
 * Được gọi phía client khi khách hàng nhấp vào "Áp dụng" trong quá trình thanh toán/đặt lịch.
 * 
 * @param token Token xác thực.
 * @param userId ID của khách hàng.
 * @param code Mã khuyến mại cần xác thực.
 * @param totalAmount Tổng giá trị giỏ hàng trước khi giảm giá.
 * @returns Một promise giải quyết thành chi tiết kết quả VoucherValidation.
 */
export async function validateVoucher(
  token: string,
  userId: string,
  code: string,
  totalAmount: number,
): Promise<VoucherValidation> {
  const url = `${apiBase()}/Voucher/vouchers/validate?userId=${encodeURIComponent(userId)}`;
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
