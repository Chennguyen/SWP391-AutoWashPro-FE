"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  Clock,
  MapPin,
  Tag,
  WalletCards,
} from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { createBooking, getSlots } from "@/lib/api/booking";
import { getWallet, type Wallet } from "@/lib/api/wallet";
import type { BookingResult, Branch, VoucherValidation } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";

const SERVICE_PRICE = 150_000;
const DEPOSIT_RATE = 0.2;

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function toStartTime(date: string, slot: string) {
  return `${date}T${slot}:00`;
}

function addMinutes(time: string, minutes: number) {
  const [hour = "0", minute = "0"] = time.split(":");
  const total = Number(hour) * 60 + Number(minute) + minutes;
  const nextHour = Math.floor(total / 60);
  const nextMinute = total % 60;
  return `${String(nextHour).padStart(2, "0")}:${String(nextMinute).padStart(2, "0")}`;
}

function formatSlotRange(slot: string) {
  return `${slot}-${addMinutes(slot, 15)}`;
}

interface ReviewPaymentStepProps {
  token: string;
  branch: Branch;
  vehicle: Vehicle;
  date: string;
  slot: string;
  appliedVoucher: VoucherValidation | null;
  onSuccess: (result: BookingResult) => void;
  onBack: () => void;
  onSlotUnavailable: () => void;
  onUnauthorized: () => void;
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
  onSlotUnavailable,
  onUnauthorized,
}: ReviewPaymentStepProps) {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized();
      }
    } finally {
      setWalletLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadWallet();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadWallet]);

  const discount = appliedVoucher?.discountAmount ?? 0;
  const payableAmount = Math.max(0, SERVICE_PRICE - discount);
  const deposit = Math.round(payableAmount * DEPOSIT_RATE);
  const voucherId = appliedVoucher?.voucherId ?? appliedVoucher?.id ?? null;
  const walletBalance = wallet?.balance ?? 0;
  const insufficientBalance = !walletLoading && walletBalance < deposit;

  async function handleConfirm() {
    if (!agreed || submitted) {
      return;
    }

    if (insufficientBalance) {
      setError("Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const latestSlots = await getSlots(token, branch.id, date);
      const latestSelectedSlot = latestSlots.find((item) => item.time === slot);
      if (
        latestSlots.length > 0 &&
        (!latestSelectedSlot || latestSelectedSlot.available === false)
      ) {
        onSlotUnavailable();
        return;
      }

      const result = await createBooking(token, {
        branchId: branch.id,
        vehicleId: vehicle.id,
        voucherId,
        bookingDate: date,
        startTime: toStartTime(date, slot),
        redemPoint: false,
      });
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
      setSubmitted(true);
      onSuccess(result);
    } catch (submitError) {
      if (submitError instanceof ApiError && submitError.status === 401) {
        onUnauthorized();
        return;
      }

      if (
        submitError instanceof Error &&
        submitError.message.toLowerCase().includes("slot already booked")
      ) {
        onSlotUnavailable();
        return;
      }

      setError(
        submitError instanceof Error
          ? submitError.message
          : "Đặt lịch thất bại. Vui lòng thử lại.",
      );
    } finally {
      setLoading(false);
    }
  }

  const rows = [
    { icon: MapPin, label: "Chi nhánh", value: branch.name },
    {
      icon: Car,
      label: "Xe",
      value: `${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model}`,
    },
    { icon: Calendar, label: "Ngày", value: formatDate(date) },
    { icon: Clock, label: "Slot", value: formatSlotRange(slot) },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Xác nhận đặt lịch</h2>
          <p className="mt-1 text-sm text-slate-500">
            Kiểm tra thông tin và số tiền cọc trước khi xác nhận.
          </p>
        </div>
        <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-semibold text-slate-500">
            <WalletCards size={13} aria-hidden />
            Ví của bạn
          </div>
          <p className="mt-0.5 text-sm font-bold text-slate-950">
            {walletLoading ? "Đang tải..." : formatVND(walletBalance)}
          </p>
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-slate-50 p-5">
        <div className="grid gap-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon size={16} className="mt-0.5 shrink-0 text-slate-400" aria-hidden />
              <span className="w-20 shrink-0 text-sm text-slate-500">{label}</span>
              <span className="text-sm font-semibold text-slate-950">{value}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white p-5">
        <div className="flex justify-between text-sm text-slate-600">
          <span>Giá dịch vụ</span>
          <span className="font-medium">{formatVND(SERVICE_PRICE)}</span>
        </div>
        {appliedVoucher ? (
          <div className="mt-3 flex justify-between text-sm text-emerald-600">
            <span className="flex items-center gap-1.5">
              <Tag size={14} aria-hidden />
              Voucher ({appliedVoucher.code})
            </span>
            <span className="font-medium">-{formatVND(discount)}</span>
          </div>
        ) : null}
        <div className="mt-3 flex justify-between text-sm text-slate-600">
          <span>Thành tiền sau voucher</span>
          <span className="font-medium">{formatVND(payableAmount)}</span>
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-4">
          <div>
            <p className="text-sm font-bold text-slate-950">Số tiền cọc</p>
            <p className="mt-0.5 text-xs text-slate-500">
              Thanh toán để giữ slot đã chọn.
            </p>
          </div>
          <span className="text-2xl font-black text-slate-950">
            {formatVND(deposit)}
          </span>
        </div>
      </div>

      {insufficientBalance ? (
        <div className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.</span>
        </div>
      ) : null}

      <label className="flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-slate-950"
        />
        <span className="text-sm text-slate-600">
          Tôi xác nhận thông tin đặt lịch đúng và đồng ý với điều khoản dịch vụ
          của AutoWash Pro.
        </span>
      </label>

      {error ? (
        <div role="alert" className="flex items-start gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      ) : null}

      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          disabled={loading}
          className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Quay lại
        </button>
        <button
          type="button"
          onClick={handleConfirm}
          disabled={!agreed || loading || submitted || insufficientBalance}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
        </button>
      </div>
    </div>
  );
}
