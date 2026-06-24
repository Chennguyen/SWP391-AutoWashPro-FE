"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Car, CheckCircle2 } from "lucide-react";
import { ApiError } from "@/lib/api-error";
import { getVehicles } from "@/features/booking/vehicle-service";
import type { Vehicle } from "@/features/booking/vehicle-types";

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
    <div className="space-y-5">
      <div>
        <h2 className="text-xl font-bold text-slate-950">Chọn xe của bạn</h2>
        <p className="mt-1 text-sm text-slate-500">
          Chọn phương tiện bạn muốn đặt lịch.
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-lg bg-slate-100" />
          ))}
        </div>
      ) : null}

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {!loading && !error && vehicles.length === 0 ? (
        <div className="flex flex-col items-center py-16 text-center">
          <Car size={38} className="mb-4 text-slate-200" aria-hidden />
          <p className="font-semibold text-slate-600">Bạn chưa có xe nào được đăng ký.</p>
          <p className="mt-1 text-sm text-slate-400">Thêm xe trước khi đặt lịch.</p>
          <Link
            href="/customer/profile"
            className="mt-5 rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Thêm xe ngay
          </Link>
        </div>
      ) : null}

      {vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {vehicles.map((vehicle) => {
            const isSelected = selected?.id === vehicle.id;

            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => onSelect(vehicle)}
                aria-pressed={isSelected}
                className={`rounded-lg border-2 p-5 text-left transition ${
                  isSelected
                    ? "border-slate-950 bg-slate-50 shadow-sm"
                    : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Car size={22} className="mb-2 text-blue-600" aria-hidden />
                    <p className="font-bold text-slate-950">
                      {vehicle.licensePlate}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {vehicle.brand} {vehicle.model} - {vehicle.color} ({vehicle.vehicleType === "SEDAN" ? "Sedan" : vehicle.vehicleType === "SUV" ? "SUV" : vehicle.vehicleType})
                    </p>
                  </div>
                  {isSelected ? (
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" aria-hidden />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

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
          disabled={!selected}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
