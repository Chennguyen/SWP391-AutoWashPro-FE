"use client";

import { useCallback, useEffect, useState } from "react";
import { validateVoucher } from "@/lib/api/voucher";
import { getMyVouchers, type MyVoucher } from "@/lib/api/loyalty";
import type { VoucherValidation } from "@/types/booking";
import { Tag, Ticket, X } from "lucide-react";

const SERVICE_PRICE = 100_000;

interface VoucherStepProps {
  token: string;
  voucherCode: string;
  appliedVoucher: VoucherValidation | null;
  onVoucherChange: (code: string) => void;
  onVoucherApplied: (v: VoucherValidation | null) => void;
  onNext: () => void;
  onBack: () => void;
}

function getUserId(): string {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("userId") ?? "";
}

export function VoucherStep({
  token,
  voucherCode,
  appliedVoucher,
  onVoucherChange,
  onVoucherApplied,
  onNext,
  onBack,
}: VoucherStepProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Danh sách voucher của user để chọn nhanh
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);

  const loadMyVouchers = useCallback(async () => {
    if (!token) return;
    const userId = getUserId();
    if (!userId) return;
    setVouchersLoading(true);
    try {
      const list = await getMyVouchers(token, userId);
      // Chỉ hiển thị voucher chưa dùng và chưa hết hạn
      const now = Date.now();
      const valid = list.filter((v) => {
        if (v.isUsed) return false;
        if (v.expiresAt) {
          return new Date(v.expiresAt).getTime() > now;
        }
        return true;
      });
      setMyVouchers(valid);
    } catch {
      // Lỗi load vouchers không hiển thị error chặn UX
    } finally {
      setVouchersLoading(false);
    }
  }, [token]);

  useEffect(() => {
    void loadMyVouchers();
  }, [loadMyVouchers]);

  async function handleApply(code?: string) {
    const applyCode = (code ?? voucherCode).trim();
    if (!applyCode) return;
    const userId = getUserId();
    if (!userId) {
      setError("Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.");
      return;
    }
    setLoading(true);
    setError(null);
    onVoucherApplied(null);
    try {
      const result = await validateVoucher(token, userId, applyCode, SERVICE_PRICE);
      if (result.valid) {
        onVoucherChange(applyCode.toUpperCase());
        onVoucherApplied(result);
      } else {
        setError(result.message || "Mã voucher không hợp lệ.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Không thể kiểm tra voucher.");
    } finally {
      setLoading(false);
    }
  }

  function handleRemove() {
    onVoucherChange("");
    onVoucherApplied(null);
    setError(null);
  }

  function handlePickVoucher(voucher: MyVoucher) {
    if (appliedVoucher) return; // Đã áp dụng rồi
    onVoucherChange(voucher.code);
    void handleApply(voucher.code);
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Áp dụng voucher</h2>
        <p className="text-sm text-slate-500 mt-0.5">
          Nhập mã voucher nếu có để được giảm giá. Bạn có thể bỏ qua bước này.
        </p>
      </div>

      {/* Input row */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Tag size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
          <input
            type="text"
            placeholder="Nhập mã voucher..."
            value={voucherCode}
            onChange={(e) => {
              onVoucherChange(e.target.value.toUpperCase());
              setError(null);
              if (appliedVoucher) onVoucherApplied(null);
            }}
            disabled={loading || !!appliedVoucher}
            className="w-full pl-9 pr-4 py-3 rounded-xl border border-slate-200 text-sm font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 disabled:bg-slate-50"
          />
        </div>
        {appliedVoucher ? (
          <button
            onClick={handleRemove}
            className="px-5 py-3 rounded-xl border border-red-200 text-red-600 text-sm font-semibold hover:bg-red-50 transition-all flex items-center gap-1.5"
          >
            <X size={14} /> Xoá
          </button>
        ) : (
          <button
            onClick={() => void handleApply()}
            disabled={loading || !voucherCode.trim()}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            {loading ? "Đang kiểm tra..." : "Áp dụng"}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="shrink-0">⚠</span>
          <span>{error}</span>
        </div>
      )}

      {/* Success */}
      {appliedVoucher && (
        <div className="flex items-center justify-between p-4 rounded-xl bg-emerald-50 border border-emerald-200">
          <div className="flex items-center gap-2 text-emerald-700 text-sm font-semibold">
            <span>✓</span>
            <span>Áp dụng mã <strong>{appliedVoucher.code}</strong> thành công!</span>
          </div>
          <span className="text-emerald-700 font-bold text-base">
            -{appliedVoucher.discountAmount.toLocaleString("vi-VN")}đ
          </span>
        </div>
      )}

      {/* Quick-pick: Voucher từ ví */}
      {!appliedVoucher && (
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Ticket size={15} className="text-slate-400" />
            <p className="text-sm font-semibold text-slate-700">Voucher trong ví của bạn</p>
          </div>

          {vouchersLoading ? (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-xl bg-slate-100" />
              ))}
            </div>
          ) : myVouchers.length === 0 ? (
            <p className="text-xs text-slate-400 py-2">
              Bạn chưa có voucher khả dụng. Tích điểm để đổi voucher!
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {myVouchers.map((v) => {
                const isSelected = voucherCode === v.code;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => handlePickVoucher(v)}
                    disabled={loading}
                    className={`flex items-center justify-between rounded-xl border px-3 py-2.5 text-left text-sm transition ${
                      isSelected
                        ? "border-blue-500 bg-blue-50"
                        : "border-slate-200 bg-white hover:border-slate-400 hover:bg-slate-50"
                    }`}
                  >
                    <div>
                      <p className="font-semibold text-slate-900 text-xs">{v.rewardName}</p>
                      <code className="text-xs font-mono text-slate-500 tracking-wider">{v.code}</code>
                    </div>
                    {v.discountAmount ? (
                      <span className="ml-2 shrink-0 rounded-lg bg-emerald-100 px-2 py-1 text-xs font-bold text-emerald-700">
                        -{v.discountAmount.toLocaleString("vi-VN")}đ
                      </span>
                    ) : (
                      <span className="ml-2 shrink-0 rounded-lg bg-amber-100 px-2 py-1 text-xs font-bold text-amber-700">
                        Miễn phí
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          ← Quay lại
        </button>
        <button
          onClick={onNext}
          className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}
