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
import { type AdminPromotion } from "@/lib/api/loyalty-admin";
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

/**
 * Thành phần (Component) ReviewPaymentStep
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
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
  const [promotions, setPromotions] = useState<AdminPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(false);

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

  useEffect(() => {
    let active = true;
    async function loadPromotions() {
      if (!token) return;
      setPromotionsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
        const params = new URLSearchParams({ pageSize: "50", pageIndex: "1" });
        
        // 1. Thử endpoint của khách hàng trước
        let res = await fetch(`${apiBaseUrl}/Promotion/promotions?${params.toString()}`, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        // 2. Nếu không thành công, thử endpoint /api/v1/promotions
        if (!res.ok) {
          res = await fetch(`${apiBaseUrl}/api/v1/promotions?${params.toString()}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }

        // 3. Nếu vẫn không được, thử /Promotion/admin/promotions (bản gốc quản trị)
        if (!res.ok) {
          res = await fetch(`${apiBaseUrl}/Promotion/admin/promotions?${params.toString()}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        }
        
        if (!res.ok) {
          throw new Error(`Tất cả các endpoint khuyến mãi đều trả về lỗi: ${res.status}`);
        }

        const text = await res.text();
        let body: any = null;
        if (text) {
          try {
            body = JSON.parse(text);
          } catch {
            body = text;
          }
        }

        const rawData = body?.data ?? body?.Data ?? body;
        const rawList = Array.isArray(rawData) ? rawData : (rawData?.items ?? rawData?.results ?? []);
        const promotionsList = Array.isArray(rawList) ? rawList.map((p: any) => ({
          id: String(p.id ?? p.Id ?? p.promotionId ?? p.PromotionId ?? ""),
          name: String(p.name ?? p.Name ?? "Khuyến mãi"),
          description: String(p.description ?? p.Description ?? ""),
          discountType: String(p.discountType ?? p.DiscountType ?? "FixedAmount"),
          discountValue: Number(p.discountValue ?? p.DiscountValue ?? 0),
          startDate: String(p.startDate ?? p.StartDate ?? ""),
          endDate: String(p.endDate ?? p.EndDate ?? ""),
          isGlobal: Boolean(p.isGlobal ?? p.IsGlobal ?? false),
          isActive: Boolean(p.isActive ?? p.IsActive ?? true),
        })) : [];

        if (active) {
          setPromotions(promotionsList);
        }
      } catch (err) {
        console.warn("DEBUG [loadPromotions] Không thể tải danh sách khuyến mãi:", err);
        if (active) {
          setPromotions([]);
        }
      } finally {
        if (active) {
          setPromotionsLoading(false);
        }
      }
    }
    void loadPromotions();
    return () => {
      active = false;
    };
  }, [token]);

  const promotionDiscount = useMemo(() => {
    const activePromos = promotions.filter((p) => {
      if (!p.isGlobal) return false;
      const start = new Date(p.startDate).getTime();
      const end = new Date(p.endDate).getTime();
      const now = Date.now();
      const bookingMs = new Date(date + "T00:00:00").getTime();
      // Thỏa mãn nếu hôm nay đang chạy khuyến mãi hoặc ngày đặt nằm trong đợt khuyến mãi
      const isTimeValid = (now >= start && now <= end) || (bookingMs >= start && bookingMs <= end);
      return isTimeValid;
    });

    let maxPromoDiscount = 0;
    activePromos.forEach((p) => {
      let currentDiscount = 0;
      if (p.discountType === "Percentage") {
        if (p.discountValue > 100) {
          // Nếu nhập nhầm % là số tiền (như 10000%) thì coi là số tiền cố định
          currentDiscount = Math.min(SERVICE_PRICE, p.discountValue);
        } else {
          currentDiscount = Math.min(SERVICE_PRICE, (SERVICE_PRICE * p.discountValue) / 100);
        }
      } else {
        currentDiscount = Math.min(SERVICE_PRICE, p.discountValue);
      }
      if (currentDiscount > maxPromoDiscount) {
        maxPromoDiscount = currentDiscount;
      }
    });

    return maxPromoDiscount;
  }, [promotions, date]);

  const discount = appliedVoucher?.discountAmount ?? 0; // Voucher giảm giá
  const payableAmount = Math.max(0, SERVICE_PRICE - promotionDiscount - discount);
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

      // Che giấu lỗi 5xx khỏi người dùng cuối trên production
      if (submitError instanceof ApiError && submitError.status >= 500) {
        setError("Đang xảy ra lỗi vui lòng quay lại sau");
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

      {/* ── Bảng Chi tiết Thanh toán kiểu Shopee (flat list) ── */}
      <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
        <div className="px-5 py-3 bg-slate-50 border-b border-slate-200">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Chi tiết thanh toán
          </p>
        </div>
        <div className="px-5 py-4 space-y-3">
          {/* Giá dịch vụ gốc */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Giá dịch vụ gốc</span>
            <span className="font-medium text-slate-700">{formatVND(SERVICE_PRICE)}</span>
          </div>

          {/* Ưu đãi giảm giá */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Ưu đãi giảm giá</span>
            {promotionDiscount > 0 ? (
              <span className="font-medium" style={{ color: "#EE4D2D" }}>
                -{formatVND(promotionDiscount)}
              </span>
            ) : (
              <span className="font-medium text-slate-700">0₫</span>
            )}
          </div>

          {/* Voucher */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              Voucher{appliedVoucher ? ` (${appliedVoucher.code})` : ""}
            </span>
            {appliedVoucher && discount > 0 ? (
              <span className="font-medium" style={{ color: "#EE4D2D" }}>
                -{formatVND(discount)}
              </span>
            ) : (
              <span className="font-medium text-slate-700">0₫</span>
            )}
          </div>

          {/* Đường kẻ dashed phân cách */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Số tiền phải trả */}
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-800">Số tiền phải trả</span>
            <span className="font-medium text-slate-700">{formatVND(payableAmount)}</span>
          </div>

          {/* Đường kẻ solid phân cách */}
          <div className="border-t border-slate-200" />

          {/* Số tiền cọc (30%) */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-slate-600">Số tiền phải cọc (30%)</span>
              <p className="text-xs text-slate-400">Bạn phải cọc trước 30% để giữ slot</p>
            </div>
            <span className="font-medium text-slate-700">{formatVND(deposit)}</span>
          </div>
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
