"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import {
  AlertCircle,
  Calendar,
  Car,
  Clock,
  MapPin,
  Plus,
  Tag,
  WalletCards,
} from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { createBooking, getSlots } from "@/lib/api/booking";
import { getWallet, topUpWallet, type Wallet } from "@/lib/api/wallet";
import type { BookingResult, Branch, VoucherValidation } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";

const SERVICE_PRICE = 100_000;
const DEPOSIT_RATE = 0.3;
const QUICK_TOP_UP_PRESETS = [100_000, 200_000, 500_000];

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

function formatSlotRange(slot: string, duration: number, endTime?: string) {
  if (endTime) {
    return `${slot}-${endTime}`;
  }
  return `${slot}-${addMinutes(slot, duration)}`;
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
  const [topUpAmount, setTopUpAmount] = useState<number | null>(null);
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError, setTopUpError] = useState<string | null>(null);
  const [topUpSuccess, setTopUpSuccess] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState(15);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);

  useEffect(() => {
    let active = true;
    async function loadSlotDetails() {
      try {
        const latestSlots = await getSlots(token, branch.id, date);
        if (!active) return;
        const currentSlot = latestSlots.find((s) => s.time === slot);
        if (currentSlot?.endTime) {
          setEndTime(currentSlot.endTime);
        }
        if (latestSlots.length >= 2) {
          if (currentSlot?.endTime) {
            const [sh, sm] = currentSlot.time.split(":").map(Number);
            const [eh, em] = currentSlot.endTime.split(":").map(Number);
            const diff = (eh * 60 + em) - (sh * 60 + sm);
            if (diff > 0 && diff <= 120) {
              setDetectedDuration(diff);
              return;
            }
          }
          const [h1, m1] = latestSlots[0].time.split(":").map(Number);
          const [h2, m2] = latestSlots[1].time.split(":").map(Number);
          const diff = (h2 * 60 + m2) - (h1 * 60 + m1);
          if (diff > 0 && diff <= 120) {
            setDetectedDuration(diff);
          }
        }
      } catch {
        // use default 15
      }
    }
    void loadSlotDetails();
    return () => {
      active = false;
    };
  }, [token, branch.id, date, slot]);

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
  const missingDepositAmount = Math.max(0, deposit - walletBalance);
  const effectiveTopUpAmount = topUpAmount ?? missingDepositAmount;
  const quickTopUpOptions = useMemo(() => {
    const roundedShortfall = Math.ceil(missingDepositAmount / 100_000) * 100_000;
    return Array.from(
      new Set(
        [missingDepositAmount, ...QUICK_TOP_UP_PRESETS, roundedShortfall].filter(
          (amount) => Number.isFinite(amount) && amount > 0,
        ),
      ),
    );
  }, [missingDepositAmount]);

  async function handleQuickTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError(null);
    setTopUpSuccess(null);

    if (!Number.isFinite(effectiveTopUpAmount) || effectiveTopUpAmount <= 0) {
      setTopUpError("Vui lòng nhập số tiền nạp hợp lệ.");
      return;
    }

    setTopUpLoading(true);
    try {
      await topUpWallet(token, effectiveTopUpAmount);
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
      setError(null);
      setTopUpAmount(null);
      setTopUpSuccess(`Đã nạp ${formatVND(effectiveTopUpAmount)} vào ví.`);
      window.dispatchEvent(new Event("autowash-auth"));
    } catch (topUpException) {
      if (topUpException instanceof ApiError && topUpException.status === 401) {
        onUnauthorized();
        return;
      }

      setTopUpError(
        topUpException instanceof Error
          ? topUpException.message
          : "Không thể nạp ví, vui lòng thử lại.",
      );
    } finally {
      setTopUpLoading(false);
    }
  }

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

      // Gracefully handle 5xx server errors — BE may crash when applying tier
      // promotion discount (NullReferenceException in PromotionTiers.Include).
      // FE-only mitigation: show a clear message and suggest removing the voucher.
      if (submitError instanceof ApiError && submitError.status >= 500) {
        const hint = appliedVoucher
          ? " Nếu lỗi tiếp tục, hãy thử bỏ voucher và đặt lịch lại."
          : " Vui lòng thử lại sau ít phút hoặc liên hệ hỗ trợ.";
        setError(`Hệ thống gặp sự cố tạm thời khi xử lý đặt lịch.${hint}`);
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
    { icon: Clock, label: "Slot", value: formatSlotRange(slot, detectedDuration, endTime) },
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

      {insufficientBalance ? (
        <form onSubmit={handleQuickTopUp} className="rounded-lg border border-amber-200 bg-amber-50 p-4">
          <div className="flex items-start gap-2 text-sm text-amber-800">
            <AlertCircle size={16} className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Cần nạp thêm tối thiểu <strong>{formatVND(missingDepositAmount)}</strong> để đủ tiền đặt cọc.
            </span>
          </div>

          <div className="mt-4 grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label htmlFor="quick-wallet-top-up" className="mb-1 block text-sm font-semibold text-slate-700">
                Nạp nhanh vào ví
              </label>
              <input
                id="quick-wallet-top-up"
                type="number"
                min={1000}
                step={1000}
                value={effectiveTopUpAmount}
                onChange={(event) => {
                  setTopUpSuccess(null);
                  setTopUpAmount(Number(event.target.value));
                }}
                disabled={topUpLoading}
                className="w-full rounded-lg border border-amber-200 bg-white px-3 py-2.5 text-sm font-semibold text-slate-950 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={topUpLoading}
              className="inline-flex justify-center gap-2 rounded-lg bg-amber-600 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-amber-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Plus size={16} aria-hidden />
              {topUpLoading ? "Đang nạp..." : "Nạp tiền"}
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {quickTopUpOptions.map((amount, index) => (
              <button
                key={`${amount}-${index}`}
                type="button"
                onClick={() => {
                  setTopUpSuccess(null);
                  setTopUpAmount(amount);
                }}
                disabled={topUpLoading}
                className="rounded-lg border border-amber-200 bg-white px-3 py-2 text-xs font-bold text-amber-800 transition hover:bg-amber-100 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {index === 0 ? "Nạp đủ thiếu " : ""}
                {formatVND(amount)}
              </button>
            ))}
          </div>

          {topUpError ? (
            <div role="alert" className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {topUpError}
            </div>
          ) : null}

          {topUpSuccess ? (
            <div role="status" className="mt-3 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-semibold text-emerald-700">
              {topUpSuccess} Số dư mới: {formatVND(walletBalance)}.
            </div>
          ) : null}
        </form>
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
