"use client";

import { useState, useEffect } from "react";
import { getVehicles } from "@/lib/api/vehicle";
import type { Vehicle } from "@/types/vehicle";
import { VEHICLE_TYPE_LABELS } from "@/types/vehicle";
import { Car, CheckCircle2 } from "lucide-react";
import Link from "next/link";

const TYPE_ICON: Record<string, string> = {
  SEDAN: "🚗",
  SUV: "🚙",
  HATCHBACK: "🚘",
  PICKUP: "🛻",
  MOTORBIKE: "🏍",
  OTHER: "🚐",
};

interface VehicleStepProps {
  token: string;
  selected: Vehicle | null;
  onSelect: (v: Vehicle) => void;
  onNext: () => void;
  onBack: () => void;
}

export function VehicleStep({
  token,
  selected,
  onSelect,
  onNext,
  onBack,
}: VehicleStepProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    getVehicles(token)
      .then((data) => { if (!cancelled) setVehicles(data); })
      .catch((err) => { if (!cancelled) setError(err instanceof Error ? err.message : "Không thể tải danh sách xe."); })
      .finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [token]);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-900">Chọn xe của bạn</h2>
        <p className="text-sm text-slate-500 mt-0.5">Chọn xe cần rửa trong lần đặt lịch này.</p>
      </div>

      {loading && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-28 rounded-2xl bg-slate-100 animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          ⚠ {error}
        </div>
      )}

      {!loading && !error && vehicles.length === 0 && (
        <div className="flex flex-col items-center py-16 text-center">
          <Car size={36} className="text-slate-200 mb-4" />
          <p className="text-slate-500 font-medium mb-1">Bạn chưa có xe nào được đăng ký.</p>
          <p className="text-slate-400 text-sm mb-5">Thêm xe trước khi đặt lịch.</p>
          <Link
            href="/customer/info"
            className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
          >
            + Thêm xe ngay
          </Link>
        </div>
      )}

      {!loading && !error && vehicles.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {vehicles.map((v) => {
            const isSelected = selected?.id === v.id;
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                aria-pressed={isSelected}
                className={`w-full text-left p-5 rounded-2xl border-2 transition-all
                  ${isSelected
                    ? "border-slate-900 bg-slate-50 shadow-md"
                    : "border-slate-100 bg-white hover:border-slate-300"
                  }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <span className="text-2xl mb-2 block" aria-hidden>{TYPE_ICON[v.vehicleType] ?? "🚗"}</span>
                    <p className="font-bold text-slate-900">{v.plateNumber}</p>
                    <p className="text-sm text-slate-500 mt-0.5">{v.brand} {v.model} · {v.color}</p>
                    <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400 mt-1 inline-block">
                      {VEHICLE_TYPE_LABELS[v.vehicleType]}
                    </span>
                  </div>
                  {isSelected && <CheckCircle2 size={20} className="text-emerald-500 shrink-0" aria-hidden />}
                </div>
              </button>
            );
          })}
        </div>
      )}

      <div className="flex justify-between pt-2">
        <button
          onClick={onBack}
          className="px-6 py-3 rounded-full border border-slate-200 text-sm font-semibold text-slate-600 hover:bg-slate-50 transition-all"
        >
          ← Quay lại
        </button>
        <button
          onClick={onNext}
          disabled={!selected}
          className="px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
        >
          Tiếp tục →
        </button>
      </div>
    </div>
  );
}
