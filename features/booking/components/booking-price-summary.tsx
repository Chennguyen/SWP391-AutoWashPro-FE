"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import type { CustomerBooking } from "@/features/booking/types/booking-types";
import type { LoyaltyPointsConfig } from "@/features/loyalty/loyalty-admin-service";
import { cn } from "@/lib/utils";

interface BookingPriceSummaryProps {
  booking?: CustomerBooking;
  isLoading: boolean;
  error: Error | null;
  depositRate?: number;
  configs?: LoyaltyPointsConfig | null;
  onRetry?: () => void;
  className?: string;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function PriceRow({
  label,
  value,
  emphasized = false,
}: {
  label: string;
  value: string;
  emphasized?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span
        className={cn(
          emphasized ? "font-semibold text-foreground" : "text-muted-foreground",
        )}
      >
        {label}
      </span>
      <span
        className={cn(
          emphasized ? "font-semibold text-foreground" : "font-medium text-foreground",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function hasAuthoritativePrice(
  booking: CustomerBooking | undefined,
): booking is CustomerBooking &
  Required<Pick<CustomerBooking, "basePrice" | "discountAmount" | "finalPrice">> {
  return (
    booking?.basePrice !== undefined &&
    booking.discountAmount !== undefined &&
    booking.finalPrice !== undefined
  );
}

export function BookingPriceSummary({
  booking,
  isLoading,
  error,
  depositRate = 30,
  configs,
  onRetry,
  className,
}: BookingPriceSummaryProps) {
  if (isLoading) {
    return (
      <Card size="sm" aria-label="Đang tải chi tiết thanh toán" className={cn("bg-transparent border-none shadow-none ring-0 p-0 overflow-visible", className)}>
        <CardHeader className="px-0 pt-0">
          <CardTitle className="text-slate-950 font-bold">Chi tiết thanh toán</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 px-0 pb-0">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-4/5" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
    );
  }

  if (error || !hasAuthoritativePrice(booking)) {
    return (
      <Alert variant="destructive">
        <AlertCircle aria-hidden />
        <AlertTitle>Không thể tải chi tiết thanh toán</AlertTitle>
        <AlertDescription className="flex flex-col items-start gap-3">
          <span>
            {error?.message ??
              "Backend chưa trả đủ basePrice, discountAmount và finalPrice cho booking này."}
          </span>
          {onRetry && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
              <RefreshCw data-icon="inline-start" aria-hidden />
              Thử lại
            </Button>
          )}
        </AlertDescription>
      </Alert>
    );
  }

  const basePrice = booking.basePrice;
  const discountAmount = booking.discountAmount;
  const finalPrice = booking.finalPrice;
  const normalizedDepositRate = Number.isFinite(depositRate)
    ? Math.min(Math.max(depositRate, 0), 100)
    : 30;
  const depositAmount = Math.round(finalPrice * (normalizedDepositRate / 100));
  const remainingAmount = Math.max(finalPrice - depositAmount, 0);

  const configBasePrice = configs?.basePrice;
  let serviceBasePrice = booking.serviceBasePrice;
  let vehicleSurcharge = booking.vehicleSurcharge ?? 0;
  let vehicleTypeStr = booking.vehicleType ?? "";

  if (serviceBasePrice === undefined) {
    if (configBasePrice && basePrice > configBasePrice) {
      serviceBasePrice = configBasePrice;
      vehicleSurcharge = basePrice - configBasePrice;
    } else if (basePrice > 100000) {
      const remainder = basePrice - 100000;
      serviceBasePrice = 100000;
      vehicleSurcharge = remainder;
    } else {
      serviceBasePrice = basePrice;
    }
  }

  if (!vehicleTypeStr && vehicleSurcharge > 0) {
    if (configs && vehicleSurcharge === configs.suvBasePrice) {
      vehicleTypeStr = "SUV";
    } else if (configs && vehicleSurcharge === configs.sedanBasePrice) {
      vehicleTypeStr = "Sedan";
    } else if (vehicleSurcharge === 60000 || vehicleSurcharge === 30000) {
      vehicleTypeStr = "SUV";
    } else if (vehicleSurcharge === 40000) {
      vehicleTypeStr = "Sedan";
    }
  }

  const hasSurcharge = vehicleSurcharge > 0;
  const vehicleTypeLabel = vehicleTypeStr ? `(${vehicleTypeStr})` : "";

  const statusStr = (booking.status ?? "").toLowerCase();

  const isDepositPaid =
    statusStr.includes("confirm") ||
    statusStr.includes("checkin") ||
    statusStr.includes("progress") ||
    statusStr.includes("complete") ||
    statusStr.includes("hủy") ||
    statusStr.includes("cancel");

  const isCheckInPaid =
    statusStr.includes("checkin") ||
    statusStr.includes("progress") ||
    statusStr.includes("complete");

  const depositTag = isDepositPaid ? " (Đã thanh toán)" : " (Chưa thanh toán)";
  const checkInTag = isCheckInPaid ? " (Đã thanh toán)" : " (Chưa thanh toán)";

  return (
    <Card size="sm" className={cn("bg-transparent border-none shadow-none ring-0 p-0 overflow-visible", className)}>
      <CardHeader className="px-0 pt-0">
        <CardTitle className="text-slate-950 font-bold">Chi tiết thanh toán</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3 px-0 pb-0">
        {hasSurcharge ? (
          <>
            <PriceRow label="Giá dịch vụ gốc" value={formatVND(serviceBasePrice)} />
            <PriceRow label={`Phụ phí dòng xe${vehicleTypeLabel}`} value={`+${formatVND(vehicleSurcharge)}`} />
          </>
        ) : (
          <PriceRow label="Giá gốc" value={formatVND(basePrice)} />
        )}
        <PriceRow label="Tổng giảm giá" value={`-${formatVND(discountAmount)}`} />
        <PriceRow label="Thành tiền" value={formatVND(finalPrice)} emphasized />
        <PriceRow
          label={`Số tiền đã cọc (${normalizedDepositRate}%)${depositTag}`}
          value={formatVND(depositAmount)}
        />
        <PriceRow
          label={`Tổng tiền phải trả khi check-in${checkInTag}`}
          value={formatVND(remainingAmount)}
          emphasized
        />
      </CardContent>
    </Card>
  );
}
