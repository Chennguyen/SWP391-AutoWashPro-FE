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
  Ticket,
  X,
} from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { createBooking, getSlots } from "@/lib/api/booking";
import { getWallet, topUpWallet, type Wallet } from "@/lib/api/wallet";
import { type AdminPromotion, getLoyaltySettings } from "@/lib/api/loyalty-admin";
import { getLoyaltyInfo, getMyVouchers, type LoyaltyInfo } from "@/lib/api/loyalty";
import { validateVoucher } from "@/lib/api/voucher";
import { cn } from "@/lib/utils";
import type { BookingResult, Branch, VoucherValidation } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";

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

function unwrapList(body: any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;

  const directList = body.items ?? body.Items ?? body.results ?? body.Results;
  if (Array.isArray(directList)) return directList;

  const dataPayload = body.data ?? body.Data;
  if (Array.isArray(dataPayload)) return dataPayload;

  if (dataPayload && typeof dataPayload === "object") {
    const nestedList = dataPayload.items ?? dataPayload.Items ?? dataPayload.results ?? dataPayload.Results;
    if (Array.isArray(nestedList)) return nestedList;
  }

  return [];
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
  const [configs, setConfigs] = useState({
    vndPerPoint: 10_000,
    basePrice: 100_000,
    sedanBasePrice: 0,
    suvBasePrice: 30_000,
    paymentDeposite: 30, // 30%
  });

  useEffect(() => {
    let active = true;
    async function loadConfigs() {
      try {
        const settings = await getLoyaltySettings(token);
        if (active) {
          setConfigs({
            vndPerPoint: settings.vndPerPoint ?? 10_000,
            basePrice: settings.basePrice ?? 100_000,
            sedanBasePrice: settings.sedanBasePrice ?? 0,
            suvBasePrice: settings.suvBasePrice ?? 30_000,
            paymentDeposite: settings.paymentDeposite ?? 30,
          });
        }
      } catch (err) {
        console.warn("DEBUG [ReviewPaymentStep] Không thể tải cấu hình từ API, sử dụng cấu hình mặc định:", err);
      }
    }
    void loadConfigs();
    return () => {
      active = false;
    };
  }, [token]);

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
  const [localAppliedVoucher, setLocalAppliedVoucher] = useState<VoucherValidation | null>(appliedVoucher);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [myVouchers, setMyVouchers] = useState<any[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherInModal, setSelectedVoucherInModal] = useState<any>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherValidationLoading, setVoucherValidationLoading] = useState(false);
  const [redeemPoint, setRedeemPoint] = useState(false);

  // Sync prop changes to local state
  useEffect(() => {
    setLocalAppliedVoucher(appliedVoucher);
  }, [appliedVoucher]);

  // Load loyalty info and user's vouchers when token is changed
  useEffect(() => {
    let active = true;
    async function loadLoyaltyAndVouchers() {
      if (!token) return;
      const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") ?? "" : "";
      if (!userId) return;

      setVouchersLoading(true);
      try {
        const loyaltyInfo = await getLoyaltyInfo(token);
        if (active) {
          setLoyalty(loyaltyInfo);
        }

        const list = await getMyVouchers(token, userId);
        const now = Date.now();
        const validVouchers = list.filter((v) => {
          if (v.isUsed) return false;
          if (v.expiresAt) {
            return new Date(v.expiresAt).getTime() > now;
          }
          return true;
        });

        if (active) {
          setMyVouchers(validVouchers);
        }
      } catch (err) {
        console.warn("Failed to load loyalty or vouchers:", err);
      } finally {
        if (active) {
          setVouchersLoading(false);
        }
      }
    }

    void loadLoyaltyAndVouchers();
    return () => {
      active = false;
    };
  }, [token]);

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
        
        let res = await fetch(`${apiBaseUrl}/api/v1/promotions/available?${params.toString()}`, {
          cache: "no-store",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        
        let rawList: any[] = [];
        if (res.ok) {
          const text = await res.text();
          const body = text ? JSON.parse(text) : null;
          rawList = unwrapList(body);
        }
        
        if (!res.ok || rawList.length === 0) {
          res = await fetch(`${apiBaseUrl}/Promotion/promotions?${params.toString()}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const text = await res.text();
            const body = text ? JSON.parse(text) : null;
            rawList = unwrapList(body);
          }
        }
        
        if (!res.ok || rawList.length === 0) {
          res = await fetch(`${apiBaseUrl}/api/v1/promotions?${params.toString()}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const text = await res.text();
            const body = text ? JSON.parse(text) : null;
            rawList = unwrapList(body);
          }
        }

        if (!res.ok || rawList.length === 0) {
          res = await fetch(`${apiBaseUrl}/Promotion/admin/promotions?${params.toString()}`, {
            cache: "no-store",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          if (res.ok) {
            const text = await res.text();
            const body = text ? JSON.parse(text) : null;
            rawList = unwrapList(body);
          }
        }

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
          tierIds: Array.isArray(p.tierIds ?? p.TierIds) ? (p.tierIds ?? p.TierIds) as string[] : [],
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

  const isSUV = vehicle?.vehicleType === "SUV";
  const isSedan = vehicle?.vehicleType === "SEDAN";
  const surcharge = isSUV
    ? configs.suvBasePrice
    : isSedan
    ? configs.sedanBasePrice
    : 0;
  const servicePrice = configs.basePrice + surcharge;
  const depositRate = configs.paymentDeposite / 100;

  const promotionDiscount = useMemo(() => {
    const activePromos = promotions.filter((p) => {
      if (p.isActive === false) return false;
      
      const isPromoGlobal = p.isGlobal || !p.tierIds || p.tierIds.length === 0;
      if (!isPromoGlobal) {
        if (!loyalty?.tier?.id) return false;
        const tierIds = p.tierIds ?? [];
        if (!tierIds.includes(loyalty.tier.id)) return false;
      }

      console.warn("DEBUG [ReviewPaymentStep] Promotion active check (Ignoring date validation as requested):", {
        name: p.name,
        isGlobal: p.isGlobal,
        isActive: p.isActive,
        loyaltyTier: loyalty?.tier?.name
      });

      return true;
    });

    console.warn("DEBUG [ReviewPaymentStep] Active promotions found:", activePromos);

    let maxPromoDiscount = 0;
    activePromos.forEach((p) => {
      let currentDiscount = 0;
      if (p.discountType === "Percentage") {
        if (p.discountValue > 100) {
          currentDiscount = Math.min(servicePrice, p.discountValue);
        } else {
          currentDiscount = Math.min(servicePrice, (servicePrice * p.discountValue) / 100);
        }
      } else {
        currentDiscount = Math.min(servicePrice, p.discountValue);
      }
      if (currentDiscount > maxPromoDiscount) {
        maxPromoDiscount = currentDiscount;
      }
    });

    return maxPromoDiscount;
  }, [promotions, date, servicePrice, loyalty]);

  const loyaltyPoints = loyalty?.points ?? 0;
  const discount = localAppliedVoucher?.discountAmount ?? 0; // Voucher giảm giá
  const payableAmountBeforeRedeem = Math.max(0, servicePrice - promotionDiscount - discount);
  const redeemValue = redeemPoint
    ? Math.min(payableAmountBeforeRedeem, loyaltyPoints * configs.vndPerPoint)
    : 0;
  const payableAmount = Math.max(0, payableAmountBeforeRedeem - redeemValue);
  const deposit = Math.round(payableAmount * depositRate);
  const voucherId = localAppliedVoucher?.voucherId ?? localAppliedVoucher?.id ?? null;
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

  async function handleApplyVoucherCode(codeToApply?: string) {
    const code = (codeToApply ?? voucherCodeInput).trim().toUpperCase();
    if (!code) return;

    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") ?? "" : "";
    if (!userId) {
      setVoucherError("Không tìm thấy thông tin tài khoản.");
      return;
    }

    setVoucherValidationLoading(true);
    setVoucherError(null);
    try {
      const result = await validateVoucher(token, userId, code, servicePrice);
      if (result.valid) {
        setLocalAppliedVoucher(result);
        setIsVoucherModalOpen(false);
      } else {
        setVoucherError(result.message || "Mã voucher không hợp lệ.");
      }
    } catch (err) {
      setVoucherError(err instanceof Error ? err.message : "Không thể kiểm tra voucher.");
    } finally {
      setVoucherValidationLoading(false);
    }
  }

  function handleRemoveVoucher() {
    setLocalAppliedVoucher(null);
    setSelectedVoucherInModal(null);
    setVoucherCodeInput("");
    setVoucherError(null);
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
        redemPoint: redeemPoint,
      });
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
      // Thông báo cho Sidebar và các widget khác cập nhật số dư ví ngay lập tức
      window.dispatchEvent(new CustomEvent("autowash-wallet-updated", { detail: nextWallet }));
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

      {/* ── Voucher Selection Card (Shopee style, between details and checkout) ── */}
      <div 
        onClick={() => setIsVoucherModalOpen(true)}
        className="rounded-lg border border-slate-200 bg-slate-50 p-4 flex items-center justify-between cursor-pointer hover:bg-slate-100 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <Tag size={16} className="text-amber-500 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Voucher của bạn
            </p>
            {localAppliedVoucher ? (
              <p className="text-xs text-emerald-600 font-medium mt-0.5">
                Đã áp dụng mã: {localAppliedVoucher.code} (-{formatVND(localAppliedVoucher.discountAmount)})
              </p>
            ) : (
              <p className="text-xs text-slate-500 mt-0.5">
                Chọn hoặc nhập mã giảm giá
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!localAppliedVoucher && (
            <span className="text-xs text-slate-500 font-medium mr-1">
              Chọn voucher
            </span>
          )}
          <span className="text-slate-400 font-bold text-sm">&gt;</span>
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
            <span className="font-medium text-slate-700">{formatVND(configs.basePrice)}</span>
          </div>

          {/* Phụ phí dòng xe */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">
              Phụ phí dòng xe({vehicle?.vehicleType === "SUV" ? "SUV" : vehicle?.vehicleType === "SEDAN" ? "sedan" : "sedan/SUV"})
            </span>
            <span className="font-normal text-slate-700">
              +{formatVND(surcharge)}
            </span>
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
              Voucher
            </span>
            {localAppliedVoucher && discount > 0 ? (
              <span className="font-medium" style={{ color: "#EE4D2D" }}>
                -{formatVND(discount)}
              </span>
            ) : (
              <span className="font-medium text-slate-700">0₫</span>
            )}
          </div>

          <label className="flex items-start justify-between gap-4 rounded-lg border border-slate-200 bg-white px-3 py-3">
            <div>
              <span className="block text-sm font-semibold text-slate-900">Dùng điểm thưởng</span>
              <p className="mt-1 text-xs text-slate-500">
                Bạn có {loyaltyPoints.toLocaleString("vi-VN")} điểm
                {configs.vndPerPoint > 0 ? ` · ước tính giảm tối đa ${formatVND(loyaltyPoints * configs.vndPerPoint)}` : ""}
              </p>
            </div>
            <input
              type="checkbox"
              checked={redeemPoint}
              onChange={(event) => setRedeemPoint(event.target.checked)}
              className="mt-1 h-4 w-4 accent-slate-950"
              disabled={loyaltyPoints <= 0}
            />
          </label>

          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Quy đổi điểm thưởng</span>
            {redeemValue > 0 ? (
              <span className="font-medium" style={{ color: "#EE4D2D" }}>
                -{formatVND(redeemValue)}
              </span>
            ) : (
              <span className="font-medium text-slate-700">0₫</span>
            )}
          </div>

          {/* Số tiền phải trả */}
          <div className="flex justify-between text-sm">
            <span className="text-slate-600">Số tiền phải trả</span>
            <span className="font-medium text-slate-700">{formatVND(payableAmount)}</span>
          </div>

          {/* Đường kẻ dashed phân cách */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Số tiền phải cọc */}
          <div className="flex justify-between text-sm">
            <div>
              <span className="text-slate-600">Số tiền phải cọc ({configs.paymentDeposite}%)</span>
              <p className="text-xs text-slate-400">Bạn phải cọc trước {configs.paymentDeposite}% để giữ slot</p>
            </div>
            <span className="font-medium text-slate-700">{formatVND(deposit)}</span>
          </div>

          {/* Đường kẻ dashed phân cách */}
          <div className="border-t border-dashed border-slate-200" />

          {/* Tổng tiền phải trả khi check-in */}
          <div className="flex justify-between text-sm">
            <span className="font-semibold text-slate-800">Tổng tiền phải trả khi check-in</span>
            <span className="font-bold text-slate-950">
              {formatVND(Math.max(0, payableAmount - deposit))}
            </span>
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

      {/* ── Voucher Modal (Shopee style, luxury dark edition) ── */}
      {isVoucherModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="relative w-full max-w-lg rounded-2xl bg-[#1E1E2E] border border-[#2D2D44] p-5 text-slate-100 shadow-2xl flex flex-col max-h-[80vh]">
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-[#2D2D44]">
              <h3 className="text-lg font-bold text-slate-50">Chọn Voucher</h3>
              <button 
                type="button"
                onClick={() => setIsVoucherModalOpen(false)}
                className="text-slate-400 hover:text-slate-200 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Input Row */}
            <div className="mt-4">
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Nhập mã voucher của bạn..."
                  value={voucherCodeInput}
                  onChange={(e) => {
                    setVoucherCodeInput(e.target.value.toUpperCase());
                    setVoucherError(null);
                  }}
                  className="flex-1 bg-[#252538] border border-[#3A3A55] rounded-xl px-4 py-2.5 text-sm font-mono tracking-wider focus:outline-none focus:border-amber-500 placeholder-slate-500 text-slate-100"
                />
                <button
                  type="button"
                  onClick={() => handleApplyVoucherCode()}
                  disabled={voucherValidationLoading || !voucherCodeInput.trim()}
                  className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold px-5 py-2.5 rounded-xl text-sm transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {voucherValidationLoading ? "Đang check..." : "Áp dụng"}
                </button>
              </div>

              {voucherError && (
                <p className="mt-2 text-xs text-red-500 font-semibold flex items-center gap-1">
                  <span>⚠</span> {voucherError}
                </p>
              )}
            </div>

            {/* Vouchers List */}
            <div className="mt-5 flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">
                Voucher cho bạn {loyalty?.tier?.name ? `(Hạng ${loyalty.tier.name})` : ""}
              </p>

              {vouchersLoading ? (
                <div className="space-y-3 py-4">
                  {[1, 2].map((i) => (
                    <div key={i} className="h-24 animate-pulse rounded-xl bg-[#252538]/50" />
                  ))}
                </div>
              ) : myVouchers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  Bạn không có voucher nào chưa sử dụng.
                </div>
              ) : (
                myVouchers.map((v) => {
                  const isSelected = selectedVoucherInModal?.id === v.id;
                  const discountValueText = v.discountAmount 
                    ? `${v.discountAmount.toLocaleString("vi-VN")}đ`
                    : "Freeship / Free";
                  return (
                    <div 
                      key={v.id}
                      onClick={() => setSelectedVoucherInModal(v)}
                      className="relative flex border border-[#2D2D44] rounded-xl overflow-hidden bg-[#252538]/40 hover:bg-[#252538]/70 transition-colors cursor-pointer select-none"
                    >
                      {/* Ticket Cut Left Accent */}
                      <div className="w-24 shrink-0 flex flex-col items-center justify-center bg-amber-500/10 border-r border-dashed border-[#2D2D44] p-3 relative">
                        <Ticket className="text-amber-500" size={20} />
                        <span className="text-[9px] text-amber-500 font-extrabold mt-1.5 text-center truncate w-full uppercase">
                          {loyalty?.tier?.name ? `Hạng ${loyalty.tier.name}` : "Voucher"}
                        </span>
                        
                        {/* Circular Ticket Cuts */}
                        <div className="absolute top-0 right-0 w-3 h-1.5 bg-[#1E1E2E] rounded-b-full translate-x-1.5 -translate-y-px" />
                        <div className="absolute bottom-0 right-0 w-3 h-1.5 bg-[#1E1E2E] rounded-t-full translate-x-1.5 translate-y-px" />
                      </div>

                      {/* Ticket Details */}
                      <div className="flex-1 p-3.5 flex flex-col justify-between min-w-0">
                        <div>
                          <p className="text-sm font-black text-slate-100 truncate">{v.rewardName}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">Giảm {discountValueText} • Đơn tối thiểu 0đ</p>
                        </div>
                        <div className="flex items-center justify-between mt-2.5">
                          <p className="text-[10px] text-slate-500">
                            Hạn dùng: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                          </p>
                          <span className="text-[10px] font-mono text-amber-500 font-black px-1.5 py-0.5 bg-amber-500/15 rounded">
                            {v.code}
                          </span>
                        </div>
                      </div>

                      {/* Selection Circle */}
                      <div className="flex items-center px-4 shrink-0 bg-slate-900/20 border-l border-[#2D2D44]/50">
                        <div className={`w-4 h-4 rounded-full border flex items-center justify-center transition-all ${
                          isSelected ? "border-amber-500 bg-amber-500" : "border-slate-500"
                        }`}>
                          {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-slate-950" />}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Footer buttons */}
            <div className="mt-5 pt-3 border-t border-[#2D2D44] flex gap-2">
              <button
                type="button"
                onClick={() => {
                  handleRemoveVoucher();
                  setIsVoucherModalOpen(false);
                }}
                className="flex-1 py-2.5 rounded-xl border border-[#2D2D44] text-xs font-semibold text-slate-400 hover:bg-[#252538] transition"
              >
                Bỏ áp dụng
              </button>
              <button
                type="button"
                onClick={() => {
                  if (selectedVoucherInModal) {
                    setLocalAppliedVoucher({
                      id: selectedVoucherInModal.id,
                      voucherId: selectedVoucherInModal.id,
                      code: selectedVoucherInModal.code,
                      discountAmount: selectedVoucherInModal.discountAmount ?? 0,
                      valid: true,
                      message: "",
                    });
                  }
                  setIsVoucherModalOpen(false);
                }}
                disabled={!selectedVoucherInModal}
                className="flex-1 py-2.5 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-600 transition disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Đồng ý
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
