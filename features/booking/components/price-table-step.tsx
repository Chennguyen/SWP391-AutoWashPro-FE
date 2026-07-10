"use client";

import { useEffect, useState } from "react";
import { Car, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoyaltySettings } from "@/features/loyalty/loyalty-admin-service";
import type { Vehicle } from "@/features/booking/types/vehicle-types";

interface PriceTableStepProps {
  token: string;
  vehicle: Vehicle | null;
  onNext: () => void;
  onBack: () => void;
}

function formatVND(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

export function PriceTableStep({ token, vehicle, onNext, onBack }: PriceTableStepProps) {
  const [loading, setLoading] = useState(true);
  const [configs, setConfigs] = useState({
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
            basePrice: settings.basePrice ?? 100_000,
            sedanBasePrice: settings.sedanBasePrice ?? 0,
            suvBasePrice: settings.suvBasePrice ?? 30_000,
            paymentDeposite: settings.paymentDeposite ?? 30,
          });
        }
      } catch (err) {
        console.warn("DEBUG [PriceTableStep] Không thể tải cấu hình từ API, sử dụng cấu hình mặc định:", err);
        // Fallback to default configs already set
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }
    void loadConfigs();
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

  const vehicleTypeLabel = isSUV ? "SUV" : isSedan ? "Sedan" : "Khác";
  const totalPrice = configs.basePrice + surcharge;

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-xl font-semibold text-foreground">Bảng giá dịch vụ</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Chi tiết biểu phí và số tiền cần cọc trước cho xe của bạn.
        </p>
      </div>

      {loading ? (
        <div className="flex flex-col gap-3 py-6">
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-36 rounded-xl" />
        </div>
      ) : (
        <div className="flex flex-col gap-5">
          <Card>
            <CardHeader className="border-b">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Car aria-hidden />
                  Xe đang chọn
                </CardTitle>
                <Badge variant="secondary">
                {vehicle?.licensePlate} ({vehicleTypeLabel})
                </Badge>
              </div>
            </CardHeader>

            <CardContent className="flex flex-col gap-4">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Giá dịch vụ cơ bản</span>
                <span className="font-semibold text-foreground">{formatVND(configs.basePrice)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">
                  Phụ phí dòng xe ({vehicleTypeLabel})
                </span>
                <span className="font-medium text-foreground">
                  +{formatVND(surcharge)}
                </span>
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <span className="font-semibold text-foreground">Tổng cộng giá dịch vụ</span>
                <span className="text-2xl font-semibold tabular-nums text-foreground">{formatVND(totalPrice)}</span>
              </div>
            </CardContent>
          </Card>

          <Alert>
            <Info aria-hidden />
            <AlertDescription>
              <strong>Lưu ý:</strong> Mức phụ phí và tỷ lệ đặt cọc được cấu hình trực tiếp từ hệ thống AutoWash Pro để đảm bảo công bằng dựa trên kích thước xe. SUV cần lượng nước, hóa chất tẩy rửa lớn hơn và thời gian xử lý lâu hơn so với dòng xe Sedan.
            </AlertDescription>
          </Alert>
        </div>
      )}

      <div className="flex justify-between gap-3 pt-2">
        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          size="lg"
        >
          Quay lại
        </Button>
        <Button
          type="button"
          onClick={onNext}
          size="lg"
          className="min-w-32"
        >
          Tiếp tục
        </Button>
      </div>
    </div>
  );
}
