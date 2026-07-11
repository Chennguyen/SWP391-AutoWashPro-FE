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
  Sparkles,
} from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiError } from "@/lib/api-error";
import { createBooking, getSlots } from "@/features/booking/booking-service";
import { getWallet, topUpWallet, type Wallet } from "@/features/users/wallet-service";
import { type AdminPromotion, getLoyaltySettings } from "@/features/loyalty/loyalty-admin-service";
import { getLoyaltyInfo, getMyVouchers, getRewards, redeemReward, type LoyaltyInfo, type Reward } from "@/features/loyalty/loyalty-service";
import { getLoyaltyInfo, getMyVouchers, type LoyaltyInfo, type MyVoucher } from "@/features/loyalty/loyalty-service";
import { validateVoucher } from "@/features/booking/voucher-service";
import { cn } from "@/lib/utils";
import type { BookingResult, Branch, VoucherValidation } from "@/features/booking/types/booking-types";
import type { Vehicle } from "@/features/booking/types/vehicle-types";

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

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toBoolean(val: unknown, fallback = true): boolean {
  if (val === undefined || val === null) return fallback;
  if (typeof val === "boolean") return val;
  const s = String(val).trim().toLowerCase();
  if (s === "false" || s === "0") return false;
  if (s === "true" || s === "1") return true;
  return fallback;
}

function formatSlotRange(slot: string, duration: number, endTime?: string) {
  if (endTime) {
    return `${slot}-${endTime}`;
  }
  return `${slot}-${addMinutes(slot, duration)}`;
}

function unwrapList(body: unknown): Record<string, unknown>[] {
  if (!body) return [];
  if (Array.isArray(body)) return body.filter(isRecord);
  if (!isRecord(body)) return [];

  const directList = body.items ?? body.Items ?? body.results ?? body.Results;
  if (Array.isArray(directList)) return directList.filter(isRecord);

  const dataPayload = body.data ?? body.Data;
  if (Array.isArray(dataPayload)) return dataPayload.filter(isRecord);

  if (isRecord(dataPayload)) {
    const nestedList = dataPayload.items ?? dataPayload.Items ?? dataPayload.results ?? dataPayload.Results;
    if (Array.isArray(nestedList)) return nestedList.filter(isRecord);
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
  const [, setPromotionsLoading] = useState(false);
  const [localAppliedVoucher, setLocalAppliedVoucher] = useState<VoucherValidation | null>(appliedVoucher);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherInModal, setSelectedVoucherInModal] = useState<MyVoucher | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherValidationLoading, setVoucherValidationLoading] = useState(false);
  const [redeemPoint, setRedeemPoint] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);

  // Sync prop changes to local state
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalAppliedVoucher(appliedVoucher);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedVoucher]);

  // Refresh vouchers and rewards from backend
  const refreshVouchersAndRewards = useCallback(async () => {
    if (!token) return;
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") ?? "" : "";
    if (!userId) return;

    setVouchersLoading(true);
    setRewardsLoading(true);
    try {
      const loyaltyInfo = await getLoyaltyInfo(token);
      setLoyalty(loyaltyInfo);

      const [vouchersList, rewardsList] = await Promise.all([
        getMyVouchers(token, userId).catch(() => []),
        getRewards(token).catch(() => []),
      ]);

      const now = Date.now();
      const validVouchers = vouchersList.filter((v) => {
        if (v.isUsed) return false;
        if (v.expiresAt) {
          return new Date(v.expiresAt).getTime() > now;
        }
        return true;
      });

      setMyVouchers(validVouchers);
      const activeRewards = rewardsList.filter((r) => r.isActive && r.pointsRequired > 0);
      setRewards(activeRewards);
    } catch (err) {
      console.warn("Failed to load loyalty or vouchers:", err);
    } finally {
      setVouchersLoading(false);
      setRewardsLoading(false);
    }
  }, [token]);

  // Load loyalty info and user's vouchers when token is changed
  useEffect(() => {
    if (token) {
      void refreshVouchersAndRewards();
    }
  }, [token, refreshVouchersAndRewards]);

  // 1-Click Redeem & Apply Voucher
  async function handleRedeemAndApply(reward: Reward) {
    const userId = typeof window !== "undefined" ? window.localStorage.getItem("userId") ?? "" : "";
    if (!userId || !token) {
      setRedeemError("Không tìm thấy thông tin xác thực.");
      return;
    }

    if (loyalty && loyalty.points < reward.pointsRequired) {
      setRedeemError(`Bạn không đủ điểm để đổi voucher này (Cần ${reward.pointsRequired} điểm, hiện có ${loyalty.points} điểm).`);
      setTimeout(() => setRedeemError(null), 3000);
      return;
    }

    setRedeemError(null);
    setRedeemingId(reward.id);

    try {
      await redeemReward(token, reward.id, userId);
      
      // Reload lists
      const loyaltyInfo = await getLoyaltyInfo(token);
      setLoyalty(loyaltyInfo);

      const [vouchersList, rewardsList] = await Promise.all([
        getMyVouchers(token, userId).catch(() => []),
        getRewards(token).catch(() => []),
      ]);

      const now = Date.now();
      const validVouchers = vouchersList.filter((v) => {
        if (v.isUsed) return false;
        if (v.expiresAt) {
          return new Date(v.expiresAt).getTime() > now;
        }
        return true;
      });

      setMyVouchers(validVouchers);
      const activeRewards = rewardsList.filter((r) => r.isActive && r.pointsRequired > 0);
      setRewards(activeRewards);

      // Find the newly redeemed voucher
      const newlyAddedVoucher = validVouchers.find(
        (v) => v.rewardName === reward.name && !myVouchers.some((oldV) => oldV.id === v.id)
      ) || validVouchers[0];

      if (newlyAddedVoucher) {
        setSelectedVoucherInModal(newlyAddedVoucher);
        setLocalAppliedVoucher({
          id: newlyAddedVoucher.id,
          voucherId: newlyAddedVoucher.id,
          code: newlyAddedVoucher.code,
          discountAmount: newlyAddedVoucher.discountAmount ?? 0,
          valid: true,
          message: "",
        });
        setIsVoucherModalOpen(false);
      }
    } catch (err) {
      setRedeemError(err instanceof Error ? err.message : "Đổi điểm thất bại, vui lòng thử lại.");
      setTimeout(() => setRedeemError(null), 3000);
    } finally {
      setRedeemingId(null);
    }
  }

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
        
        let rawList: Record<string, unknown>[] = [];
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

        const promotionsList = rawList.map((p) => {
          const tierIdsRaw = p.tierIds ?? p.TierIds;
          const tierIds = Array.isArray(tierIdsRaw) ? tierIdsRaw.map(String) : [];

          return {
            id: String(p.id ?? p.Id ?? p.promotionId ?? p.PromotionId ?? ""),
            name: String(p.name ?? p.Name ?? "Khuyến mãi"),
            description: String(p.description ?? p.Description ?? ""),
            discountType: String(p.discountType ?? p.DiscountType ?? "FixedAmount"),
            discountValue: Number(p.discountValue ?? p.DiscountValue ?? 0),
            startDate: String(p.startDate ?? p.StartDate ?? p.startTime ?? p.StartTime ?? ""),
            endDate: String(p.endDate ?? p.EndDate ?? p.endTime ?? p.EndTime ?? ""),
            isGlobal: toBoolean(p.isGlobal ?? p.IsGlobal, tierIds.length === 0),
            isActive: toBoolean(p.isActive ?? p.IsActive, true),
            tierIds,
          };
        });

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

      // Date range validation against the selected booking date
      if (date) {
        const parseLocal = (dStr: string) => {
          if (!dStr) return null;
          const cleanDate = dStr.slice(0, 10);
          const parts = cleanDate.split(/[-/]/);
          if (parts.length === 3) {
            const year = Number(parts[0]);
            const month = Number(parts[1]) - 1;
            const day = Number(parts[2]);
            if (!Number.isNaN(year) && !Number.isNaN(month) && !Number.isNaN(day)) {
              return new Date(year, month, day);
            }
          }
          const parsed = new Date(dStr);
          return Number.isNaN(parsed.getTime()) ? null : parsed;
        };

        const targetDate = parseLocal(date);

        if (targetDate) {
          if (p.startDate) {
            const start = parseLocal(p.startDate);
            if (start && targetDate < start) return false;
          }

          if (p.endDate) {
            const end = parseLocal(p.endDate);
            if (end && targetDate > end) return false;
          }
        }
      }

      console.warn("DEBUG [ReviewPaymentStep] Promotion active check passed:", {
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
        setError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
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
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">Xác nhận đặt lịch</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Kiểm tra thông tin và số tiền cọc trước khi xác nhận.
          </p>
        </div>
        <Card size="sm" className="min-w-44">
          <CardContent className="text-right">
          <div className="flex items-center justify-end gap-1.5 text-xs font-medium text-muted-foreground">
            <WalletCards aria-hidden />
            Ví của bạn
          </div>
          <p className="mt-1 text-base font-semibold text-foreground tabular-nums">
            {walletLoading ? "Đang tải..." : formatVND(walletBalance)}
          </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Thông tin lịch hẹn</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3">
          {rows.map(({ icon: Icon, label, value }) => (
            <div key={label} className="flex items-start gap-3">
              <Icon className="mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="w-20 shrink-0 text-sm text-muted-foreground">{label}</span>
              <span className="text-sm font-semibold text-foreground">{value}</span>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* ── Voucher Selection Card (Shopee style, between details and checkout) ── */}
      <button
        type="button"
        onClick={() => setIsVoucherModalOpen(true)}
        className="flex items-center justify-between rounded-xl border bg-card p-4 text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px"
      >
        <div className="flex items-center gap-2.5">
          <Tag className="shrink-0 text-muted-foreground" aria-hidden />
          <div>
            <p className="text-sm font-semibold text-foreground">
              Voucher của bạn
            </p>
            {localAppliedVoucher ? (
              <p className="mt-0.5 text-xs font-medium text-muted-foreground">
                Đã áp dụng mã: {localAppliedVoucher.code} (-{formatVND(localAppliedVoucher.discountAmount)})
              </p>
            ) : (
              <p className="mt-0.5 text-xs text-muted-foreground">
                Chọn hoặc nhập mã giảm giá
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1">
          {!localAppliedVoucher && (
            <span className="mr-1 text-xs font-medium text-muted-foreground">
              Chọn voucher
            </span>
          )}
          <span className="text-sm font-bold text-muted-foreground">&gt;</span>
        </div>
      </button>

      {/* ── Bảng Chi tiết Thanh toán kiểu Shopee (flat list) ── */}
      <Card>
        <CardHeader className="border-b">
          <CardTitle>Chi tiết thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Giá dịch vụ gốc</span>
            <span className="font-medium text-foreground">{formatVND(configs.basePrice)}</span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Phụ phí dòng xe({vehicle?.vehicleType === "SUV" ? "SUV" : vehicle?.vehicleType === "SEDAN" ? "sedan" : "sedan/SUV"})
            </span>
            <span className="font-medium text-foreground">
              +{formatVND(surcharge)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Ưu đãi giảm giá</span>
            {promotionDiscount > 0 ? (
              <span className="font-medium text-destructive">
                -{formatVND(promotionDiscount)}
              </span>
            ) : (
              <span className="font-medium text-foreground">0₫</span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Voucher
            </span>
            {localAppliedVoucher && discount > 0 ? (
              <span className="font-medium text-destructive">
                -{formatVND(discount)}
              </span>
            ) : (
              <span className="font-medium text-foreground">0₫</span>
            )}
          </div>

          <label className="flex items-start justify-between gap-4 rounded-lg border bg-muted/30 px-3 py-3">
            <div>
              <span className="block text-sm font-semibold text-foreground">Dùng điểm thưởng</span>
              <p className="mt-1 text-xs text-muted-foreground">
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
            <span className="text-muted-foreground">Quy đổi điểm thưởng</span>
            {redeemValue > 0 ? (
              <span className="font-medium text-destructive">
                -{formatVND(redeemValue)}
              </span>
            ) : (
              <span className="font-medium text-foreground">0₫</span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Số tiền phải trả</span>
            <span className="font-medium text-foreground">{formatVND(payableAmount)}</span>
          </div>

          <Separator />

          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">Số tiền phải cọc ({configs.paymentDeposite}%)</span>
              <p className="text-xs text-muted-foreground">Bạn phải cọc trước {configs.paymentDeposite}% để giữ slot</p>
            </div>
            <span className="font-medium text-foreground">{formatVND(deposit)}</span>
          </div>

          <Separator />

          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold text-foreground">Tổng tiền phải trả khi check-in</span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatVND(Math.max(0, payableAmount - deposit))}
            </span>
          </div>
        </CardContent>
      </Card>

      {insufficientBalance ? (
        <Alert>
          <AlertCircle aria-hidden />
          <AlertDescription>Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.</AlertDescription>
        </Alert>
      ) : null}

      {insufficientBalance ? (
        <form onSubmit={handleQuickTopUp}>
          <Card>
            <CardContent className="flex flex-col gap-4">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <AlertCircle className="mt-0.5 shrink-0" aria-hidden />
            <span>
              Cần nạp thêm tối thiểu <strong>{formatVND(missingDepositAmount)}</strong> để đủ tiền đặt cọc.
            </span>
          </div>

          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
            <div>
              <label htmlFor="quick-wallet-top-up" className="mb-1 block text-sm font-semibold text-foreground">
                Nạp nhanh vào ví
              </label>
              <Input
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
                className="h-10 font-semibold"
              />
            </div>
            <Button
              type="submit"
              disabled={topUpLoading}
              size="lg"
            >
              <Plus data-icon="inline-start" aria-hidden />
              {topUpLoading ? "Đang nạp..." : "Nạp tiền"}
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            {quickTopUpOptions.map((amount, index) => (
              <Button
                key={`${amount}-${index}`}
                type="button"
                onClick={() => {
                  setTopUpSuccess(null);
                  setTopUpAmount(amount);
                }}
                disabled={topUpLoading}
                variant="outline"
                size="sm"
              >
                {index === 0 ? "Nạp đủ thiếu " : ""}
                {formatVND(amount)}
              </Button>
            ))}
          </div>

          {topUpError ? (
            <Alert variant="destructive">
              <AlertDescription>{topUpError}</AlertDescription>
            </Alert>
          ) : null}

          {topUpSuccess ? (
            <Alert>
              <AlertDescription>
              {topUpSuccess} Số dư mới: {formatVND(walletBalance)}.
              </AlertDescription>
            </Alert>
          ) : null}
            </CardContent>
          </Card>
        </form>
      ) : null}

      <label className="flex cursor-pointer select-none items-start gap-3">
        <input
          type="checkbox"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
          className="mt-0.5 h-4 w-4 accent-slate-950"
        />
        <span className="text-sm text-muted-foreground">
          Tôi xác nhận thông tin đặt lịch đúng và đồng ý với điều khoản dịch vụ
          của AutoWash Pro.
        </span>
      </label>

      {error ? (
        <Alert variant="destructive">
          <AlertCircle aria-hidden />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          onClick={onBack}
          disabled={loading}
          variant="outline"
          size="lg"
        >
          Quay lại
        </Button>
        <Button
          type="button"
          onClick={handleConfirm}
          disabled={!agreed || loading || submitted || insufficientBalance}
          size="lg"
          className="min-w-44"
        >
          {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
        </Button>
      </div>

      <Dialog open={isVoucherModalOpen} onOpenChange={setIsVoucherModalOpen}>
        <DialogContent className="booking-brand-dialog !flex max-h-[86dvh] max-w-2xl flex-col overflow-hidden !p-0">
          <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
            <DialogTitle>Chọn voucher</DialogTitle>
            <DialogDescription className="max-w-xl leading-relaxed">
              Chọn voucher trong ví hoặc nhập mã thủ công để áp dụng cho lịch đặt này.
            </DialogDescription>
          </DialogHeader>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-hidden px-4 py-4 sm:px-6">
            <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_7rem] sm:items-center">
              <Input
                type="text"
                placeholder="Nhập mã voucher của bạn..."
                value={voucherCodeInput}
                onChange={(e) => {
                  setVoucherCodeInput(e.target.value.toUpperCase());
                  setVoucherError(null);
                }}
                className="!h-10 font-mono tracking-wider"
              />
              <Button
                type="button"
                onClick={() => handleApplyVoucherCode()}
                disabled={voucherValidationLoading || !voucherCodeInput.trim()}
                className="!h-10 w-full"
              >
                {voucherValidationLoading ? "Đang check..." : "Áp dụng"}
              </Button>
            </div>

            {voucherError ? (
              <Alert variant="destructive">
                <AlertDescription>{voucherError}</AlertDescription>
              </Alert>
            ) : null}

            <div className="flex items-center justify-between gap-3 pt-1">
              <p className="text-sm font-semibold leading-none text-foreground">
                Voucher cho bạn
              </p>
              {loyalty?.tier?.name ? (
                <Badge variant="secondary" className="max-w-[55%] shrink-0 truncate px-2.5 py-1 text-[11px] leading-none">
                  Hạng {loyalty.tier.name}
                </Badge>
              ) : null}
            </div>

            <div className="-mx-1 min-h-0 flex-1 overflow-y-auto px-1 py-1">
              {vouchersLoading ? (
                <div className="flex flex-col gap-3 py-1">
                  {[1, 2].map((i) => (
                    <Skeleton key={i} className="h-20 rounded-xl" />
                  ))}
                </div>
              ) : myVouchers.length === 0 ? (
                <div className="py-8 text-center text-slate-500 text-sm">
                  Bạn không có voucher nào chưa sử dụng trong ví.
                </div>
                <Card className="border border-dashed border-border bg-card/70 !ring-0">
                  <CardContent className="flex min-h-28 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
                    Bạn không có voucher nào chưa sử dụng.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {myVouchers.map((v) => {
                    const isSelected = selectedVoucherInModal?.id === v.id;
                    const discountValueText = v.discountAmount
                      ? `${v.discountAmount.toLocaleString("vi-VN")}đ`
                      : "Freeship / Free";
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => setSelectedVoucherInModal(v)}
                        aria-pressed={isSelected}
                        className={cn(
                          "grid grid-cols-[88px_minmax(0,1fr)_36px] overflow-hidden rounded-xl border bg-card text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
                          isSelected ? "border-primary ring-2 ring-ring/30" : "border-border",
                        )}
                      >
                        <div className="flex flex-col items-center justify-center border-r border-dashed bg-muted/40 p-3">
                          <Ticket className="text-muted-foreground" aria-hidden />
                          <span className="mt-1.5 w-full truncate text-center text-[10px] font-semibold text-muted-foreground">
                            Voucher
                          </span>
                        </div>

                        <div className="min-w-0 p-3.5">
                          <p className="truncate text-sm font-semibold text-foreground">{v.rewardName}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">Giảm {discountValueText} - Đơn tối thiểu 0đ</p>
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Hạn dùng: {v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("vi-VN") : "Vô thời hạn"}
                            </p>
                            <Badge variant="outline" className="font-mono">
                              {v.code}
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Đổi Voucher bằng điểm tích lũy */}
              <div className="pt-4 border-t border-[#2D2D44] mt-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Sparkles className="text-amber-500" size={13} />
                    Đổi điểm lấy Voucher {loyalty?.points !== undefined && `(${loyalty.points} điểm)`}
                  </p>
                </div>

                {redeemError && (
                  <p className="text-xs text-red-500 mb-2 font-semibold flex items-center gap-1">
                    <span>⚠</span> {redeemError}
                  </p>
                )}

                {rewardsLoading ? (
                  <div className="space-y-3 py-2">
                    {[1].map((i) => (
                      <div key={i} className="h-24 animate-pulse rounded-xl bg-[#252538]/50" />
                    ))}
                  </div>
                ) : rewards.length === 0 ? (
                  <p className="text-xs text-slate-500 py-2">Không có phần thưởng voucher nào bằng điểm.</p>
                ) : (
                  <div className="space-y-3">
                    {rewards.map((r) => {
                      const points = r.pointsRequired;
                      const hasEnoughPoints = loyalty ? loyalty.points >= points : false;
                      const isRedeeming = redeemingId === r.id;

                      return (
                        <div 
                          key={r.id}
                          className="relative flex border border-[#2D2D44] rounded-xl overflow-hidden bg-[#252538]/20"
                        >
                          {/* Ticket Cut Left Accent */}
                          <div className="w-24 shrink-0 flex flex-col items-center justify-center bg-amber-500/5 border-r border-dashed border-[#2D2D44] p-3 relative">
                            <Ticket className="text-amber-500/60" size={20} />
                            <span className="text-[10px] text-amber-500 font-extrabold mt-1 text-center w-full uppercase">
                              {points} Điểm
                            </span>
                            
                            {/* Circular Ticket Cuts */}
                            <div className="absolute top-0 right-0 w-3 h-1.5 bg-[#1E1E2E] rounded-b-full translate-x-1.5 -translate-y-px" />
                            <div className="absolute bottom-0 right-0 w-3 h-1.5 bg-[#1E1E2E] rounded-t-full translate-x-1.5 translate-y-px" />
                          </div>

                          {/* Ticket Details */}
                          <div className="flex-1 p-3 flex flex-col justify-between min-w-0">
                            <div>
                              <p className="text-sm font-bold text-slate-200 truncate">{r.name}</p>
                              <p className="text-[10px] text-slate-400 mt-0.5 line-clamp-1">{r.description || "Đổi điểm nhận ưu đãi đặc biệt"}</p>
                            </div>
                            <div className="flex items-center justify-between mt-2">
                              <p className="text-[9px] text-slate-500">
                                Yêu cầu: {points} điểm
                              </p>
                              
                              <button
                                type="button"
                                onClick={() => void handleRedeemAndApply(r)}
                                disabled={isRedeeming || !hasEnoughPoints}
                                className={cn(
                                  "text-[10px] font-bold px-2.5 py-1 rounded transition-all cursor-pointer active:scale-[0.98]",
                                  hasEnoughPoints
                                    ? "bg-amber-500 hover:bg-amber-600 text-slate-950"
                                    : "bg-[#252538] text-slate-500 cursor-not-allowed"
                                )}
                              >
                                {isRedeeming ? "Đang đổi..." : "Đổi & Dùng"}
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

                        <div className="flex items-center justify-center border-l bg-muted/20">
                          <span
                            className={cn(
                              "size-4 rounded-full border",
                              isSelected && "border-primary bg-primary",
                            )}
                            aria-hidden
                          />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="!mx-0 !mb-0 mt-0 flex-col-reverse gap-2 rounded-t-none border-t bg-muted/40 !px-4 !py-3 sm:flex-row sm:items-center sm:justify-end sm:!px-6">
            <Button
              type="button"
              variant="outline"
              size="lg"
              className="!h-10 w-full sm:w-28"
              onClick={() => {
                handleRemoveVoucher();
                setIsVoucherModalOpen(false);
              }}
            >
              Bỏ áp dụng
            </Button>
            <Button
              type="button"
              size="lg"
              className="!h-10 w-full sm:w-28"
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
            >
              Đồng ý
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
