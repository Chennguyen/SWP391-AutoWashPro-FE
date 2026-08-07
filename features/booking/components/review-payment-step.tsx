"use client";

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
import {
  createBooking,
  getBookingScheduleWarning,
  getSlots,
} from "@/features/booking/booking-service";
import {
  getAppliedPromotions,
  type AppliedPromotion,
} from "@/features/booking/promotion-service";
import type {
  BookingResult,
  BookingScheduleWarning,
  Branch,
  CreateBookingPayload,
  VoucherValidation,
} from "@/features/booking/types/booking-types";
import type { Vehicle } from "@/features/booking/types/vehicle-types";
import { validateVoucher } from "@/features/booking/voucher-service";
import { getLoyaltySettings } from "@/features/loyalty/loyalty-admin-service";
import {
  getAvailableVouchers,
  getLoyaltyInfo,
  type LoyaltyInfo,
  type MyVoucher,
} from "@/features/loyalty/loyalty-service";
import {
  createWalletTopUp,
  getWallet,
  type Wallet,
  type WalletTopUpPayment,
} from "@/features/users/wallet-service";
import { trackPendingWalletTopUp } from "@/features/users/wallet-top-up-tracker";
import { WalletTopUpQrDialog } from "@/features/users/components/wallet-top-up-qr-dialog";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  AlertTriangle,
  Calendar,
  Car,
  Clock,
  MapPin,
  Plus,
  Tag,
  Ticket,
  WalletCards,
} from "lucide-react";
import {
  FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

const QUICK_TOP_UP_PRESETS = [100_000, 200_000, 500_000];

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatVoucherDiscount(voucher: MyVoucher) {
  return voucher.discountType.toLowerCase() === "percentage"
    ? `${voucher.discountValue.toLocaleString("vi-VN")}%`
    : formatVND(voucher.discountValue);
}

function isVoucherAvailable(voucher: MyVoucher, now: number) {
  if (
    voucher.status.trim().toLowerCase() !== "active" ||
    voucher.isUsed ||
    voucher.usedAt !== null ||
    voucher.discountValue <= 0
  ) {
    return false;
  }

  if (!voucher.expiresAt) {
    return true;
  }

  const expiresAt = new Date(voucher.expiresAt).getTime();
  return Number.isFinite(expiresAt) && expiresAt > now;
}

function getPromotionDiscountAmount(
  promotion: AppliedPromotion,
  servicePrice: number,
) {
  if (promotion.discountType === "Percentage") {
    return (servicePrice * promotion.discountValue) / 100;
  }

  return promotion.discountValue;
}

function formatPromotionDiscount(promotion: AppliedPromotion) {
  return promotion.discountType === "Percentage"
    ? `${promotion.discountValue.toLocaleString("vi-VN")}%`
    : formatVND(promotion.discountValue);
}

function formatDate(dateStr: string) {
  const [year, month, day] = dateStr.split("-");
  return `${day}/${month}/${year}`;
}

function formatConflictTime(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatConflictDate(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatConflictTimeRange(startTime: string, endTime: string) {
  return `${formatConflictTime(startTime)} - ${formatConflictTime(endTime)}, ${formatConflictDate(startTime)}`;
}

function toStartTime(date: string, slot: string) {
  return `${date}T${slot}:00+07:00`;
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

function haveSamePromotions(
  current: AppliedPromotion[],
  latest: AppliedPromotion[],
) {
  if (current.length !== latest.length) return false;

  return current.every((promotion, index) => {
    const nextPromotion = latest[index];
    return (
      nextPromotion !== undefined &&
      promotion.id === nextPromotion.id &&
      promotion.name === nextPromotion.name &&
      promotion.discountType === nextPromotion.discountType &&
      promotion.discountValue === nextPromotion.discountValue
    );
  });
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
    basePrice: 100_000,
    sedanBasePrice: 0,
    suvBasePrice: 30_000,
    paymentDeposite: 30, // 30%
    redeemPointValue: 100,
  });

  useEffect(() => {
    let active = true;
    async function loadConfigs() {
      try {
        const settings = await getLoyaltySettings(token);
        if (active) {
          setConfigs({
            basePrice: settings.basePrice ?? 100_000,
            sedanBasePrice: settings.sedanBasePrice ?? 0,
            suvBasePrice: settings.suvBasePrice ?? 30_000,
            paymentDeposite: settings.paymentDeposite ?? 30,
            redeemPointValue: settings.redeemPointValue ?? 100,
          });
        }
      } catch (err) {
        console.warn(
          "DEBUG [ReviewPaymentStep] Không thể tải cấu hình từ API, sử dụng cấu hình mặc định:",
          err,
        );
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
  const [topUpPayment, setTopUpPayment] =
    useState<WalletTopUpPayment | null>(null);
  const [submitted, setSubmitted] = useState(false);
  const [detectedDuration, setDetectedDuration] = useState(15);
  const [endTime, setEndTime] = useState<string | undefined>(undefined);
  const [promotions, setPromotions] = useState<AppliedPromotion[]>([]);
  const [promotionsLoading, setPromotionsLoading] = useState(true);
  const [promotionError, setPromotionError] = useState<string | null>(null);
  const [localAppliedVoucher, setLocalAppliedVoucher] =
    useState<VoucherValidation | null>(appliedVoucher);
  const [loyalty, setLoyalty] = useState<LoyaltyInfo | null>(null);
  const [myVouchers, setMyVouchers] = useState<MyVoucher[]>([]);
  const [vouchersLoading, setVouchersLoading] = useState(false);
  const [voucherListError, setVoucherListError] = useState<string | null>(null);
  const [isVoucherModalOpen, setIsVoucherModalOpen] = useState(false);
  const [selectedVoucherInModal, setSelectedVoucherInModal] =
    useState<MyVoucher | null>(null);
  const [voucherCodeInput, setVoucherCodeInput] = useState("");
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [voucherValidationLoading, setVoucherValidationLoading] =
    useState(false);
  const [redeemPoint, setRedeemPoint] = useState(false);
  const [pendingRequest, setPendingRequest] =
    useState<CreateBookingPayload | null>(null);
  const [scheduleWarning, setScheduleWarning] =
    useState<BookingScheduleWarning | null>(null);
  const requestInFlightRef = useRef(false);
  const voucherRequestIdRef = useRef(0);

  // Sync prop changes to local state
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setLocalAppliedVoucher(appliedVoucher);
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [appliedVoucher]);

  // Load loyalty info when token is changed.
  useEffect(() => {
    let active = true;
    async function loadLoyalty() {
      if (!token) return;

      try {
        const loyaltyInfo = await getLoyaltyInfo(token);
        if (active) {
          setLoyalty(loyaltyInfo);
        }
      } catch (err) {
        console.warn("Failed to load loyalty info:", err);
      }
    }

    void loadLoyalty();
    return () => {
      active = false;
    };
  }, [token]);

  const loadAvailableVouchers = useCallback(async () => {
    const requestId = ++voucherRequestIdRef.current;
    setVouchersLoading(true);
    setVoucherListError(null);
    setMyVouchers([]);
    setSelectedVoucherInModal(null);

    try {
      const list = await getAvailableVouchers(token);
      if (requestId !== voucherRequestIdRef.current) return;

      const now = Date.now();
      setMyVouchers(list.filter((voucher) => isVoucherAvailable(voucher, now)));
    } catch (loadError) {
      if (requestId !== voucherRequestIdRef.current) return;

      console.warn("Failed to load available vouchers:", loadError);
      setVoucherListError(
        "Không thể tải danh sách voucher. Vui lòng thử lại.",
      );

      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized();
      }
    } finally {
      if (requestId === voucherRequestIdRef.current) {
        setVouchersLoading(false);
      }
    }
  }, [onUnauthorized, token]);

  const handleVoucherModalOpenChange = useCallback(
    (open: boolean) => {
      setIsVoucherModalOpen(open);
      if (open) {
        void loadAvailableVouchers();
      } else {
        voucherRequestIdRef.current += 1;
        setVouchersLoading(false);
      }
    },
    [loadAvailableVouchers],
  );

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
            const diff = eh * 60 + em - (sh * 60 + sm);
            if (diff > 0 && diff <= 120) {
              setDetectedDuration(diff);
              return;
            }
          }
          const [h1, m1] = latestSlots[0].time.split(":").map(Number);
          const [h2, m2] = latestSlots[1].time.split(":").map(Number);
          const diff = h2 * 60 + m2 - (h1 * 60 + m1);
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

  const loadPromotions = useCallback(async () => {
    if (!token) return null;

    setPromotionsLoading(true);
    setPromotionError(null);
    try {
      const nextPromotions = await getAppliedPromotions(token);
      setPromotions(nextPromotions);
      return nextPromotions;
    } catch (promotionLoadError) {
      if (
        promotionLoadError instanceof ApiError &&
        promotionLoadError.status === 401
      ) {
        setPromotionError(
          "Phiên đăng nhập đã hết hạn nên chưa thể xác định khuyến mãi.",
        );
        onUnauthorized();
        return null;
      }

      console.warn(
        "DEBUG [loadPromotions] Không thể tải danh sách khuyến mãi:",
        promotionLoadError,
      );
      setPromotionError(
        "Không thể xác định khuyến mãi đang áp dụng. Vui lòng thử lại.",
      );
      return null;
    } finally {
      setPromotionsLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadPromotions();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadPromotions]);

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
    const totalPromotionDiscount = promotions.reduce(
      (total, promotion) =>
        total + getPromotionDiscountAmount(promotion, servicePrice),
      0,
    );

    return Math.min(servicePrice, totalPromotionDiscount);
  }, [promotions, servicePrice]);

  const loyaltyPoints = loyalty?.points ?? 0;
  const pointRedemptionValueVnd = configs.redeemPointValue;
  const discount = localAppliedVoucher?.discountAmount ?? 0; // Voucher giảm giá
  const payableAmountBeforeRedeem = Math.max(
    0,
    servicePrice - promotionDiscount - discount,
  );
  const maxRedeemByPoints = loyaltyPoints * pointRedemptionValueVnd;
  const rawRedeemDiscountEstimate = Math.min(
    maxRedeemByPoints,
    payableAmountBeforeRedeem,
  );
  const redeemPointsUsedEstimate = Math.floor(
    rawRedeemDiscountEstimate / pointRedemptionValueVnd,
  );
  const redeemDiscountEstimate =
    redeemPointsUsedEstimate * pointRedemptionValueVnd;
  const redeemValue = redeemPoint ? redeemDiscountEstimate : 0;
  const payableAmount = Math.max(0, payableAmountBeforeRedeem - redeemValue);
  const deposit = Math.round(payableAmount * depositRate);
  const voucherId =
    localAppliedVoucher?.voucherId ?? localAppliedVoucher?.id ?? null;
  const walletBalance = wallet?.balance ?? 0;
  const insufficientBalance = !walletLoading && walletBalance < deposit;
  const missingDepositAmount = Math.max(0, deposit - walletBalance);
  const effectiveTopUpAmount = topUpAmount ?? missingDepositAmount;
  const quickTopUpOptions = useMemo(() => {
    const roundedShortfall =
      Math.ceil(missingDepositAmount / 100_000) * 100_000;
    return Array.from(
      new Set(
        [
          missingDepositAmount,
          ...QUICK_TOP_UP_PRESETS,
          roundedShortfall,
        ].filter((amount) => Number.isFinite(amount) && amount > 0),
      ),
    );
  }, [missingDepositAmount]);

  async function handleQuickTopUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setTopUpError(null);

    if (!Number.isFinite(effectiveTopUpAmount) || effectiveTopUpAmount <= 0) {
      setTopUpError("Vui lòng nhập số tiền nạp hợp lệ.");
      return;
    }

    setTopUpLoading(true);
    try {
      const payment = await createWalletTopUp(token, effectiveTopUpAmount);
      trackPendingWalletTopUp(payment);
      setTopUpPayment(payment);
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

    const userId =
      typeof window !== "undefined"
        ? (window.localStorage.getItem("userId") ?? "")
        : "";
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
        handleVoucherModalOpenChange(false);
      } else {
        setVoucherError(result.message || "Mã voucher không hợp lệ.");
      }
    } catch (err) {
      setVoucherError(
        err instanceof Error ? err.message : "Không thể kiểm tra voucher.",
      );
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

  function beginBookingRequest() {
    if (requestInFlightRef.current) {
      return false;
    }

    requestInFlightRef.current = true;
    setLoading(true);
    setError(null);
    return true;
  }

  function finishBookingRequest() {
    requestInFlightRef.current = false;
    setLoading(false);
  }

  async function completeBooking(request: CreateBookingPayload) {
    const result = await createBooking(token, request);

    setPendingRequest(null);
    setScheduleWarning(null);
    setSubmitted(true);

    try {
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
      // Thông báo cho Sidebar và các widget khác cập nhật số dư ví ngay lập tức
      window.dispatchEvent(
        new CustomEvent("autowash-wallet-updated", { detail: nextWallet }),
      );
    } catch (walletRefreshError) {
      console.warn(
        "Booking đã tạo thành công nhưng chưa thể cập nhật lại số dư ví:",
        walletRefreshError,
      );
    }

    const enrichedResult: BookingResult = {
      ...result,
      serviceBasePrice: configs.basePrice,
      vehicleSurcharge: surcharge,
      vehicleType: vehicle?.vehicleType || (isSUV ? "SUV" : isSedan ? "Sedan" : ""),
    };

    onSuccess(enrichedResult);
  }

  function handleBookingError(
    submitError: unknown,
    request: CreateBookingPayload | null,
  ) {
    const warning = getBookingScheduleWarning(submitError);
    if (warning && request) {
      // Giữ nguyên payload đã gửi để lần xác nhận không phụ thuộc form state.
      setPendingRequest(request);
      setScheduleWarning(warning);
      return;
    }

    if (submitError instanceof ApiError && submitError.status === 401) {
      onUnauthorized();
      return;
    }

    const normalizedMessage =
      submitError instanceof Error ? submitError.message.toLowerCase() : "";
    if (
      normalizedMessage.includes("slot already booked") ||
      normalizedMessage.includes("time slot is already booked") ||
      normalizedMessage.includes("slot unavailable") ||
      normalizedMessage.includes("khung giờ này đã được đặt")
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
  }

  async function handleConfirm() {
    if (!agreed || submitted || !beginBookingRequest()) {
      return;
    }

    if (insufficientBalance) {
      setError("Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.");
      finishBookingRequest();
      return;
    }

    let request: CreateBookingPayload | null = null;

    try {
      const latestPromotions = await loadPromotions();
      if (latestPromotions === null) {
        setError(
          "Chưa thể xác nhận khuyến mãi đang áp dụng. Vui lòng thử lại.",
        );
        return;
      }

      if (!haveSamePromotions(promotions, latestPromotions)) {
        setError(
          "Danh sách khuyến mãi vừa thay đổi. Vui lòng kiểm tra lại trước khi xác nhận.",
        );
        return;
      }

      const latestSlots = await getSlots(token, branch.id, date);
      const latestSelectedSlot = latestSlots.find((item) => item.time === slot);
      if (
        latestSlots.length > 0 &&
        (!latestSelectedSlot || latestSelectedSlot.available === false)
      ) {
        onSlotUnavailable();
        return;
      }

      request = {
        branchId: branch.id,
        vehicleId: vehicle.id,
        voucherId,
        bookingDate: date,
        startTime: toStartTime(date, slot),
        redemPoint: redeemPoint,
        acknowledgedScheduleConflictIds: [],
      };

      await completeBooking(request);
    } catch (submitError) {
      handleBookingError(submitError, request);
    } finally {
      finishBookingRequest();
    }
  }

  async function handleConfirmScheduleWarning() {
    if (
      !pendingRequest ||
      !scheduleWarning ||
      !beginBookingRequest()
    ) {
      return;
    }

    const conflictIds = Array.from(
      new Set(
        scheduleWarning.conflicts.map((conflict) => conflict.bookingId),
      ),
    );
    const request: CreateBookingPayload = {
      ...pendingRequest,
      acknowledgedScheduleConflictIds: conflictIds,
    };

    try {
      await completeBooking(request);
    } catch (submitError) {
      handleBookingError(submitError, request);
    } finally {
      finishBookingRequest();
    }
  }

  function handleCancelScheduleWarning() {
    if (requestInFlightRef.current) {
      return;
    }

    setScheduleWarning(null);
    setPendingRequest(null);
  }

  const rows = [
    { icon: MapPin, label: "Chi nhánh", value: branch.name },
    {
      icon: Car,
      label: "Xe",
      value: `${vehicle.licensePlate} - ${vehicle.brand} ${vehicle.model}`,
    },
    { icon: Calendar, label: "Ngày", value: formatDate(date) },
    {
      icon: Clock,
      label: "Slot",
      value: formatSlotRange(slot, detectedDuration, endTime),
    },
  ];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">
            Xác nhận đặt lịch
          </h2>
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
              <Icon
                className="mt-0.5 shrink-0 text-muted-foreground"
                aria-hidden
              />
              <span className="w-20 shrink-0 text-sm text-muted-foreground">
                {label}
              </span>
              <span className="text-sm font-semibold text-foreground">
                {value}
              </span>
            </div>
          ))}
          <div className="flex items-start gap-3">
            <Ticket
              className="mt-0.5 shrink-0 text-muted-foreground"
              aria-hidden
            />
            <span className="w-20 shrink-0 text-sm text-muted-foreground">
              Khuyến mãi
            </span>
            <div className="min-w-0 flex-1">
              {promotionsLoading ? (
                <span className="text-sm text-muted-foreground">
                  Đang xác định...
                </span>
              ) : promotionError ? (
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm text-destructive">
                    {promotionError}
                  </span>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void loadPromotions()}
                  >
                    Thử lại
                  </Button>
                </div>
              ) : promotions.length > 0 ? (
                <div className="flex flex-col gap-1.5">
                  {promotions.map((promotion) => {
                    const discountAmount = getPromotionDiscountAmount(
                      promotion,
                      servicePrice,
                    );

                    return (
                      <div
                        key={promotion.id}
                        className="flex items-start justify-between gap-4 text-sm"
                      >
                        <span className="min-w-0 font-semibold text-foreground">
                          {promotion.name}
                          <span className="font-normal text-muted-foreground">
                            {" "}
                            (giảm {formatPromotionDiscount(promotion)})
                          </span>
                        </span>
                        <span className="shrink-0 font-medium text-destructive">
                          -{formatVND(Math.min(servicePrice, discountAmount))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <span className="text-sm font-semibold text-foreground">
                  Không có
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* ── Voucher Selection Card (Shopee style, between details and checkout) ── */}
      <button
        type="button"
        onClick={() => handleVoucherModalOpenChange(true)}
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
                Đã áp dụng mã: {localAppliedVoucher.code} (-
                {formatVND(localAppliedVoucher.discountAmount)})
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
            <span className="font-medium text-foreground">
              {formatVND(configs.basePrice)}
            </span>
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">
              Phụ phí dòng xe(
              {vehicle?.vehicleType === "SUV"
                ? "SUV"
                : vehicle?.vehicleType === "SEDAN"
                  ? "sedan"
                  : "sedan/SUV"}
              )
            </span>
            <span className="font-medium text-foreground">
              +{formatVND(surcharge)}
            </span>
          </div>

          <div className="flex items-start justify-between gap-4 text-sm">
            <div className="min-w-0">
              <span className="text-muted-foreground">
                Tổng giảm từ khuyến mãi
              </span>
            </div>
            {promotionsLoading ? (
              <span className="shrink-0 text-muted-foreground">
                Đang xác định...
              </span>
            ) : promotionError ? (
              <span className="shrink-0 font-medium text-destructive">
                Chưa xác định
              </span>
            ) : promotionDiscount > 0 ? (
              <span className="shrink-0 font-medium text-destructive">
                -{formatVND(promotionDiscount)}
              </span>
            ) : (
              <span className="shrink-0 font-medium text-foreground">0₫</span>
            )}
          </div>

          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Voucher</span>
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
              <span className="block text-sm font-semibold text-foreground">
                Dùng điểm thưởng
              </span>
              <p className="mt-1 text-xs text-muted-foreground">
                Bạn có {loyaltyPoints.toLocaleString("vi-VN")} điểm
              </p>
              <div className="mt-1 flex flex-col gap-0.5 text-xs text-muted-foreground">
                <p>
                  Ước tính dùng{" "}
                  {redeemPointsUsedEstimate.toLocaleString("vi-VN")} điểm
                </p>
                <p>Ước tính giảm {formatVND(redeemDiscountEstimate)}</p>
              </div>
              <p className="mt-1 text-xs text-muted-foreground">
                Điểm sẽ được trừ khi check-in và thanh toán thành công.
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
            <span className="font-medium text-foreground">
              {formatVND(payableAmount)}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between text-sm">
            <div>
              <span className="text-muted-foreground">
                Số tiền phải cọc ({configs.paymentDeposite}%)
              </span>
              <p className="text-xs text-muted-foreground">
                Bạn phải cọc trước {configs.paymentDeposite}% để giữ slot
              </p>
            </div>
            <span className="font-medium text-foreground">
              {formatVND(deposit)}
            </span>
          </div>

          <Separator />

          <div className="flex justify-between gap-4 text-sm">
            <span className="font-semibold text-foreground">
              Tổng tiền phải trả khi check-in
            </span>
            <span className="font-semibold text-foreground tabular-nums">
              {formatVND(Math.max(0, payableAmount - deposit))}
            </span>
          </div>
        </CardContent>
      </Card>

      {insufficientBalance ? (
        <Alert>
          <AlertCircle aria-hidden />
          <AlertDescription>
            Số dư ví không đủ để đặt cọc. Vui lòng nạp thêm tiền.
          </AlertDescription>
        </Alert>
      ) : null}

      {insufficientBalance ? (
        <form onSubmit={handleQuickTopUp}>
          <Card>
            <CardContent className="flex flex-col gap-4">
              <div className="flex items-start gap-2 text-sm text-muted-foreground">
                <AlertCircle className="mt-0.5 shrink-0" aria-hidden />
                <span>
                  Cần nạp thêm tối thiểu{" "}
                  <strong>{formatVND(missingDepositAmount)}</strong> để đủ tiền
                  đặt cọc.
                </span>
              </div>

              <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-end">
                <div>
                  <label
                    htmlFor="quick-wallet-top-up"
                    className="mb-1 block text-sm font-semibold text-foreground"
                  >
                    Nạp nhanh vào ví
                  </label>
                  <Input
                    id="quick-wallet-top-up"
                    type="number"
                    min={1000}
                    step={1000}
                    value={effectiveTopUpAmount}
                    onChange={(event) => {
                      setTopUpAmount(Number(event.target.value));
                    }}
                    disabled={topUpLoading || Boolean(topUpPayment)}
                    className="h-10 font-semibold"
                  />
                </div>
                <Button
                  type="submit"
                  disabled={topUpLoading || Boolean(topUpPayment)}
                  size="lg"
                >
                  <Plus data-icon="inline-start" aria-hidden />
                  {topUpLoading ? "Đang tạo QR..." : "Nạp tiền"}
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                {quickTopUpOptions.map((amount, index) => (
                  <Button
                    key={`${amount}-${index}`}
                    type="button"
                    onClick={() => {
                      setTopUpAmount(amount);
                    }}
                    disabled={topUpLoading || Boolean(topUpPayment)}
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
            </CardContent>
          </Card>
        </form>
      ) : null}

      <WalletTopUpQrDialog
        token={token}
        payment={topUpPayment}
        onCancel={() => setTopUpPayment(null)}
        onUnauthorized={onUnauthorized}
        onConfirmed={() => {
          setTopUpPayment(null);
          setError(null);
          setTopUpAmount(null);
          void loadWallet();
          window.dispatchEvent(new Event("autowash-auth"));
        }}
      />

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
          disabled={
            !agreed ||
            loading ||
            submitted ||
            insufficientBalance ||
            promotionsLoading ||
            promotionError !== null
          }
          size="lg"
          className="min-w-44"
        >
          {loading ? "Đang xử lý..." : "Xác nhận đặt lịch"}
        </Button>
      </div>

      <Dialog
        open={scheduleWarning !== null}
        onOpenChange={(open) => {
          if (!open) {
            handleCancelScheduleWarning();
          }
        }}
      >
        <DialogContent
          showCloseButton={false}
          className="booking-brand-dialog !flex max-h-[86dvh] max-w-xl flex-col overflow-hidden !p-0"
        >
          <DialogHeader className="border-b px-4 py-4 sm:px-6">
            <div className="flex items-start gap-3">
              <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-amber-100 text-amber-700">
                <AlertTriangle aria-hidden />
              </div>
              <div className="min-w-0 pt-0.5">
                <DialogTitle className="text-lg">
                  Lịch đặt quá gần nhau
                </DialogTitle>
                <DialogDescription className="mt-1.5 leading-relaxed">
                  Booking mới cách một lịch đặt khác của bạn không quá{" "}
                  {scheduleWarning?.thresholdMinutes ?? 30} phút. Bạn có chắc
                  chắn muốn tiếp tục đặt lịch không?
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="booking-warning-scroll min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="flex flex-col gap-3">
              {scheduleWarning?.conflicts.map((conflict) => (
                <div
                  key={conflict.bookingId}
                  className="rounded-xl border border-white/10 bg-black/35 p-4 shadow-inner backdrop-blur-md"
                >
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3">
                    <p className="min-w-0 leading-5 font-semibold text-white/90">
                      {conflict.branchName}
                    </p>
                    <Badge
                      variant="outline"
                      className="h-6 shrink-0 self-center border-amber-400/70 bg-black/40 px-2.5 py-0 text-[11px] leading-none text-amber-300"
                    >
                      {conflict.isSameBranch
                        ? "Cùng chi nhánh"
                        : "Khác chi nhánh"}
                    </Badge>
                  </div>

                  <div className="mt-3 flex items-start gap-2 text-sm text-white/50">
                    <Clock className="mt-0.5 size-4 shrink-0" aria-hidden />
                    <span>
                      {formatConflictTimeRange(
                        conflict.startTime,
                        conflict.endTime,
                      )}
                    </span>
                  </div>

                  <p className="mt-2 text-sm font-medium text-amber-300/90">
                    {conflict.gapMinutes === 0
                      ? "Thời gian hai booking bị trùng hoặc liền nhau."
                      : `Cách lịch mới: ${conflict.gapMinutes} phút`}
                  </p>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="!mx-0 !mb-0 mt-0 flex-col-reverse gap-2 rounded-t-none border-t bg-muted/40 !px-4 !py-3 sm:flex-row sm:items-center sm:justify-end sm:!px-6">
            <div className="grid w-full grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                size="lg"
                className="w-full"
                onClick={handleCancelScheduleWarning}
                disabled={loading}
              >
                Quay lại
              </Button>
              <Button
                type="button"
                size="lg"
                className="w-full"
                onClick={() => void handleConfirmScheduleWarning()}
                disabled={loading}
              >
                {loading ? "Đang xử lý..." : "Vẫn đặt lịch"}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={isVoucherModalOpen}
        onOpenChange={handleVoucherModalOpenChange}
      >
        <DialogContent className="booking-brand-dialog !flex max-h-[86dvh] max-w-2xl flex-col overflow-hidden !p-0">
          <DialogHeader className="border-b px-4 py-4 pr-12 sm:px-6">
            <DialogTitle>Chọn voucher</DialogTitle>
            <DialogDescription className="max-w-xl leading-relaxed">
              Chọn voucher trong ví hoặc nhập mã thủ công để áp dụng cho lịch
              đặt này.
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
                <Badge
                  variant="secondary"
                  className="max-w-[55%] shrink-0 truncate px-2.5 py-1 text-[11px] leading-none"
                >
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
              ) : voucherListError ? (
                <Card className="border border-destructive/25 bg-destructive/5 !ring-0">
                  <CardContent className="flex min-h-32 flex-col items-center justify-center px-4 py-6 text-center">
                    <AlertCircle
                      className="size-6 text-destructive"
                      aria-hidden
                    />
                    <p className="mt-3 text-sm text-muted-foreground">
                      {voucherListError}
                    </p>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="mt-4"
                      onClick={() => void loadAvailableVouchers()}
                    >
                      Thử lại
                    </Button>
                  </CardContent>
                </Card>
              ) : myVouchers.length === 0 ? (
                <Card className="border border-dashed border-border bg-card/70 !ring-0">
                  <CardContent className="flex min-h-28 items-center justify-center px-4 py-6 text-center text-sm text-muted-foreground">
                    Bạn không có voucher nào chưa sử dụng.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-col gap-3">
                  {myVouchers.map((v) => {
                    const isSelected = selectedVoucherInModal?.id === v.id;
                    const discountValueText = formatVoucherDiscount(v);
                    return (
                      <button
                        key={v.id}
                        type="button"
                        onClick={() => {
                          setSelectedVoucherInModal(v);
                          setVoucherError(null);
                        }}
                        aria-pressed={isSelected}
                        className={cn(
                          "grid grid-cols-[88px_minmax(0,1fr)_36px] overflow-hidden rounded-xl border bg-card text-left transition hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
                          isSelected
                            ? "border-primary ring-2 ring-ring/30"
                            : "border-border",
                        )}
                      >
                        <div className="flex flex-col items-center justify-center border-r border-dashed bg-muted/40 p-3">
                          <Ticket
                            className="text-muted-foreground"
                            aria-hidden
                          />
                          <span className="mt-1.5 w-full truncate text-center text-[10px] font-semibold text-muted-foreground">
                            Voucher
                          </span>
                        </div>

                        <div className="min-w-0 p-3.5">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {v.rewardName}
                          </p>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            Giảm {discountValueText} - Đơn tối thiểu 0đ
                          </p>
                          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs text-muted-foreground">
                              Hạn dùng:{" "}
                              {v.expiresAt
                                ? new Date(v.expiresAt).toLocaleDateString(
                                    "vi-VN",
                                  )
                                : "Vô thời hạn"}
                            </p>
                            <Badge variant="outline" className="font-mono">
                              {v.code}
                            </Badge>
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
                handleVoucherModalOpenChange(false);
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
                  void handleApplyVoucherCode(selectedVoucherInModal.code);
                }
              }}
              disabled={!selectedVoucherInModal || voucherValidationLoading}
            >
              {voucherValidationLoading ? "Đang áp dụng..." : "Đồng ý"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
