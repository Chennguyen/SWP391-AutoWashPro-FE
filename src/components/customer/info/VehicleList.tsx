"use client";

import { useState, useCallback } from "react";
import { getVehicles } from "@/lib/api/vehicle";
import type { Vehicle } from "@/types/vehicle";
import { VEHICLE_TYPE_LABELS } from "@/types/vehicle";
import { AddVehicleForm } from "./AddVehicleForm";
import Link from "next/link";
import { Car, Plus, X } from "lucide-react";

interface VehicleListProps {
  token: string;
  initialVehicles: Vehicle[];
}

const TYPE_ICON: Record<string, string> = {
  SEDAN: "🚗",
  SUV: "🚙",
  HATCHBACK: "🚘",
  PICKUP: "🛻",
  MOTORBIKE: "🏍",
  OTHER: "🚐",
};

export function VehicleList({ token, initialVehicles }: VehicleListProps) {
  const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
  const [showForm, setShowForm] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Called after successful vehicle add to re-fetch the updated list
  const handleVehicleAdded = useCallback(async () => {
    setRefreshing(true);
    try {
      const updated = await getVehicles(token);
      setVehicles(updated);
    } catch {
      // vehicle was still added — list will show on next full page load
    } finally {
      setRefreshing(false);
      setShowForm(false);
    }
  }, [token]);

  return (
    <section
      className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden"
      aria-label="Quản lý xe"
    >
      {/* Section header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
        <div className="flex items-center gap-2">
          <Car size={16} className="text-slate-400" aria-hidden />
          <h2 className="text-sm font-semibold text-slate-700">
            Xe của tôi
            {!refreshing && (
              <span className="ml-1.5 text-slate-400 font-normal">
                ({vehicles.length})
              </span>
            )}
            {refreshing && (
              <span className="ml-2 text-slate-400 font-normal text-xs">
                đang cập nhật...
              </span>
            )}
          </h2>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold border transition-all
            ${showForm
              ? "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
              : "bg-slate-900 text-white border-slate-900 hover:bg-slate-700"
            }`}
        >
          {showForm ? <><X size={14} /> Huỷ</> : <><Plus size={14} /> Thêm xe</>}
        </button>
      </div>

      {/* Section body */}
      <div className="p-6 space-y-5">
        {/* Add vehicle form */}
        {showForm && (
          <div className="bg-slate-50 rounded-2xl border border-slate-100 p-5">
            <h3 className="text-sm font-semibold text-slate-700 mb-4">
              Thêm xe mới
            </h3>
            <AddVehicleForm token={token} onSuccess={handleVehicleAdded} />
          </div>
        )}

        {/* Vehicle grid */}
        {vehicles.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <Car size={40} className="text-slate-200 mb-4" />
            <p className="text-slate-500 font-medium mb-1">Chưa có xe nào được đăng ký</p>
            <p className="text-slate-400 text-sm mb-6">
              Thêm xe để bắt đầu đặt lịch rửa xe nhanh hơn.
            </p>
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="px-6 py-2.5 rounded-full bg-slate-900 text-white text-sm font-semibold hover:bg-slate-700 transition-all"
              >
                + Thêm xe ngay
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {vehicles.map((v) => (
              <div
                key={v.id}
                className="bg-slate-50 rounded-2xl border border-slate-100 p-5 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <span className="text-2xl" aria-hidden>
                    {TYPE_ICON[v.vehicleType] ?? "🚗"}
                  </span>
                  <span className="text-[11px] font-bold tracking-widest uppercase text-slate-400 border border-slate-200 rounded-full px-2.5 py-0.5">
                    {VEHICLE_TYPE_LABELS[v.vehicleType]}
                  </span>
                </div>
                <p className="text-base font-bold text-slate-900 mb-0.5">
                  {v.plateNumber}
                </p>
                <p className="text-sm text-slate-600">
                  {v.brand} {v.model}
                </p>
                <p className="text-xs text-slate-400 mt-1">Màu: {v.color}</p>
              </div>
            ))}
          </div>
        )}

        {/* CTA to booking */}
        {vehicles.length > 0 && (
          <div className="pt-4 border-t border-slate-100">
            <Link
              href="/customer/booking"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-slate-900 text-white text-sm font-bold hover:bg-slate-700 transition-all"
            >
              Đặt lịch ngay →
            </Link>
          </div>
        )}
      </div>
    </section>
  );
}
