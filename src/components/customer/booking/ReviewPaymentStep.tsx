"use client";

import { useState } from "react";
import { createBooking } from "@/lib/api/booking";
import type { Branch, VoucherValidation, BookingResult } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";
import { MapPin, Car, Calendar, Clock, Tag, AlertCircle } from "lucide-react";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SUBTOTAL = 150_000; // TODO: replace with real price from branch/service selection

function formatVND(amount: number) {
  return amount.toLocaleString("vi-VN") + "đ";
}

function formatDate(dateStr: string) {
  const [y, m, d] = dateStr.split("-");
  return `${d}/${m}/${y}`;
}

// ─── Component ────────────────────────────────────────────────────────────────

interface ReviewPaymentStepProps {
  token: string;
  branch: Branch;
  vehicle: Vehicle;
  date: string;
  slot: string;
  appliedVoucher: VoucherValidation | null;
  onSuccess: (result: BookingResult) => void;
  onBack: () => void;
}

export function ReviewPaymentStep({
  token,
  branch,
  vehicle,
  date,
  slot,
  appliedVoucher,
  onSuccess,
  onBack,
}: ReviewPaymentStepProps) {
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const discount = appliedVoucher?.discountAmount ?? 0;
  const deposit = Math.max(0, SUBTOTAL - discount);

  async function handleConfirm() {
    if (!agreed || submitted) return;
    setLoading(true);
    setError(null);
    try {
      const result = await createBooking(token, {
        branchId: branch.id,
        vehicleId: vehicle.id,
        date,
        slot,
        ...(appliedVoucher ? { voucherCode: appliedVoucher.code } : {}),
      });
      setSubmitted(true);
      onSuccess(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Đặt lịch thất bại. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const rows = [
    { icon: MapPin, label: "Chi nhánh", value: branch.name },
    { icon: Car, label: "Xe", value: `${vehicle.plateNumber} — ${vehicle.brand} ${vehicle.model}` },
    { icon: Calendar, label: "Ngày", value: formatDate(date) },
    { icon: Clock, label: "Giờ", value: slot },
  ];

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Xác nhận đặt lịch</h2>
        <p className="text-sm text-slate-500 mt-0.5">Kiểm tra lại thông tin trước khi xác nhận.</p>
      </div>

      {/* Summary card */}
      <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5 space-y-3">
        {rows.map(({ icon: Icon, label, value }) => (
          <div key={label} className="flex items-start gap-3">
            <Icon size={15} className="text-slate-400 mt-0.5 shrink-0" aria-hidden />
            <span className="text-sm text-slate-500 w-20 shrink-0">{label}</span>
            <span className="text-sm font-semibold text-slate-900">{value}</span>
          </div>
        ))}
      </div>

      {/* Price breakdown */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-2.5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Giá dịch vụ</span>
          <span className="font-medium">{formatVND(SUBTOTAL)}</span>
        </div>
        {appliedVoucher && (
          <div className="flex justify-between text-sm text-emerald-600">
            <span className="flex items-center gap-1.5">
              <Tag size={13} aria-hidden /> Voucher ({appliedVoucher.code})
            </span>
            <span className="font-medium">-{formatVND(discount)}</span>
          </div>
        )}
        <div className="border-t border-slate-100 pt-2.5 flex justify-between">
          <span className="text-sm font-bold text-slate-900">Số tiền cọc</span>
          <span className="text-lg font-extrabold text-slate-900">{formatVND(deposit)}</span>
        </div>
      </div>

      {/* Terms checkbox */}
      <label className="flex items-start gap-3 cursor-pointer select-none group">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(e) => setAgreed(e.target.checked)}
          className="mt-0.5 w-4 h-4 accent-slate-900 cursor-pointer"
        />
        <span className="text-sm text-slate-600 group-hover:text-slate-900 transition-colors">
          Tôi đã đọc và đồng ý với{" "}
          <span className="underline font-medium text-slate-900">điều khoản dịch vụ</span>{" "}
          của AutoWash Pro.
        </span>
      </label>

      {/* Error */}
      {error && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <AlertCircle size={15} className="shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          disabled={loading}
          className="px-6 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-40 transition-all"
        >
          ← Quay lại
        </button>
        <button
          onClick={handleConfirm}
          disabled={!agreed || loading || submitted}
          className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
        </button>
      </div>
    </div>
  );
}
