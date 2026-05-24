"use client";

import { useState } from "react";
import { validateVoucher } from "@/lib/api/voucher";
import type { VoucherValidation } from "@/types/booking";
import { Tag, X } from "lucide-react";

interface VoucherStepProps {
  token: string;
  voucherCode: string;
  appliedVoucher: VoucherValidation | null;
  onVoucherChange: (code: string) => void;
  onVoucherApplied: (v: VoucherValidation | null) => void;
  onNext: () => void;
  onBack: () => void;
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

  async function handleApply() {
    if (!voucherCode.trim()) return;
    setLoading(true);
    setError(null);
    onVoucherApplied(null);
    try {
      const result = await validateVoucher(token, voucherCode.trim());
      if (result.valid) {
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
            onClick={handleApply}
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
