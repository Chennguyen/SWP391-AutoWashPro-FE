"use client";

import { useEffect, useState } from "react";
import { Info } from "lucide-react";
import { getLoyaltySettings } from "@/lib/api/loyalty-admin";
import type { Vehicle } from "@/types/vehicle";

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
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Bảng giá dịch vụ</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chi tiết biểu phí và số tiền cần cọc trước cho xe của bạn.
        </p>
      </div>

      {loading ? (
        <div className="space-y-3 py-6">
          <div className="h-6 w-1/3 animate-pulse rounded bg-slate-100" />
          <div className="h-24 animate-pulse rounded-lg bg-slate-100" />
        </div>
      ) : (
        <div className="space-y-5">
          {/* Card bảng giá */}
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="bg-slate-50 px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <span className="text-sm font-bold text-slate-800">Thông tin xe đang chọn:</span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                {vehicle?.licensePlate} ({vehicleTypeLabel})
              </span>
            </div>

            <div className="p-5 space-y-4">
              {/* Dòng giá cơ bản */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">Giá dịch vụ cơ bản</span>
                <span className="font-semibold text-slate-800">{formatVND(configs.basePrice)}</span>
              </div>

              {/* Dòng phụ phí động */}
              <div className="flex items-center justify-between text-sm">
                <span className="text-slate-500">
                  Phụ phí dòng xe ({vehicleTypeLabel})
                </span>
                <span className="font-normal text-slate-700">
                  +{formatVND(surcharge)}
                </span>
              </div>

              <div className="border-t border-slate-100 my-2 pt-3 flex items-center justify-between">
                <span className="font-bold text-slate-900">Tổng cộng giá dịch vụ</span>
                <span className="text-lg font-black text-blue-600">{formatVND(totalPrice)}</span>
              </div>
            </div>
          </div>

          {/* Alert thông tin */}
          <div className="flex gap-2.5 rounded-lg border border-amber-200 bg-amber-50/60 p-4 text-xs text-amber-800 leading-relaxed">
            <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
            <p>
              <strong>Lưu ý:</strong> Mức phụ phí và tỷ lệ đặt cọc được cấu hình trực tiếp từ hệ thống AutoWash Pro để đảm bảo công bằng dựa trên kích thước xe. SUV cần lượng nước, hóa chất tẩy rửa lớn hơn và thời gian xử lý lâu hơn so với dòng xe Sedan.
            </p>
          </div>
        </div>
      )}

      {/* Điều hướng */}
      <div className="flex justify-between pt-2">
        <button
          type="button"
          onClick={onBack}
          className="rounded-lg border border-slate-200 px-6 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
        >
          Quay lại
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
