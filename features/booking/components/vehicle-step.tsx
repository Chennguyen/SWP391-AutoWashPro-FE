"use client";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Vehicle } from "@/features/booking/types/vehicle-types";
import { getVehicles } from "@/features/booking/vehicle-service";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

interface VehicleStepProps {
  token: string;
  selected: Vehicle | null;
  onSelect: (vehicle: Vehicle) => void;
  onNext: () => void;
  onBack: () => void;
  onUnauthorized: () => void;
}

/**
 * Thành phần (Component) VehicleStep
 *
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function VehicleStep({
  token,
  selected,
  onSelect,
  onNext,
  onBack,
  onUnauthorized,
}: VehicleStepProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const nextVehicles = await getVehicles(token, 1, 20);

      setVehicles(nextVehicles);
    } catch (loadError) {
      if (loadError instanceof ApiError && loadError.status === 401) {
        onUnauthorized();
        return;
      }

      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải danh sách xe.",
      );
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      void loadData();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [loadData]);

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-xl font-semibold text-foreground">
          Chọn xe của bạn
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chọn phương tiện bạn muốn đặt lịch.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <Skeleton key={item} className="h-32 rounded-xl" />
          ))}
        </div>
      ) : null}

      {error ? (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      ) : null}

      {!loading && !error && vehicles.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="flex flex-col items-center py-16 text-center">
            <Car className="mb-4 text-muted-foreground" aria-hidden />
            <p className="font-semibold text-foreground">
              Bạn chưa có xe nào được đăng ký.
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Thêm xe trước khi đặt lịch.
            </p>
            <Link
              className={buttonVariants({ className: "mt-5" })}
              href="/customer/profile"
            >
              Thêm xe ngay
            </Link>
          </CardContent>
        </Card>
      ) : null}

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isSelected = selected?.id === vehicle.id;
            const vehicleTypeLabel =
              vehicle.vehicleType === "SEDAN"
                ? "Sedan"
                : vehicle.vehicleType === "SUV"
                  ? "SUV"
                  : vehicle.vehicleType;

            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => onSelect(vehicle)}
                aria-pressed={isSelected}
                className={cn(
                  "rounded-xl border bg-card p-0 text-left text-card-foreground transition hover:-translate-y-0.5 hover:ring-2 hover:ring-ring/20 focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:translate-y-px",
                  isSelected
                    ? "border-primary ring-2 ring-ring/30"
                    : "border-border hover:border-foreground/30",
                )}
              >
                <Card className="h-full border-0 bg-transparent py-0 ring-0">
                  <CardHeader className="">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 mt-3">
                        <div className="mb-2 flex size-9 items-center justify-center rounded-lg bg-muted">
                          <Car aria-hidden />
                        </div>
                        <CardTitle className="text-base tabular-nums">
                          {vehicle.licensePlate}
                        </CardTitle>
                        <CardDescription className="truncate">
                          {vehicle.brand} {vehicle.model}
                        </CardDescription>
                      </div>
                      {isSelected ? (
                        <CheckCircle2
                          className="mt-3 shrink-0 text-primary"
                          aria-hidden
                        />
                      ) : (
                        <Badge variant="secondary">{vehicleTypeLabel}</Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex flex-wrap gap-2 pb-5">
                    <Badge variant="outline">
                      {vehicle.color || "Chưa có màu"}
                    </Badge>
                    <Badge variant="outline">{vehicleTypeLabel}</Badge>
                  </CardContent>
                </Card>
              </button>
            );
          })}
        </div>
      ) : null}

      <div className="flex justify-between gap-3 pt-2">
        <Button type="button" onClick={onBack} variant="outline" size="lg">
          Quay lại
        </Button>
        <Button
          type="button"
          onClick={onNext}
          disabled={!selected}
          size="lg"
          className="min-w-32"
        >
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}
