"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Car, CheckCircle2, RefreshCw } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getBookings } from "@/lib/api/booking";
import { getVehicles } from "@/lib/api/vehicle";
import type { CustomerBooking } from "@/types/booking";
import type { Vehicle } from "@/types/vehicle";

interface VehicleStepProps {
  token: string;
  selected: Vehicle | null;
  onSelect: (vehicle: Vehicle) => void;
  onNext: () => void;
  onBack: () => void;
  onUnauthorized: () => void;
}

const ACTIVE_BOOKING_STATUSES = new Set([
  "available",
  "pending",
  "confirmed",
  "checkin",
  "check-in",
  "inprogress",
  "in-progress",
  "đã đặt",
  "da dat",
  "đã xác nhận",
  "dang xu ly",
  "đang xử lý",
]);

function toISODate(date: Date): string {
  return date.toISOString().split("T")[0] ?? "";
}

function isActiveBooking(booking: CustomerBooking): boolean {
  const status = booking.status.trim().toLowerCase();
  if (status.includes("cancel") || status.includes("hủy") || status.includes("huỷ")) {
    return false;
  }
  if (status.includes("complete") || status.includes("completed") || status.includes("hoàn thành")) {
    return false;
  }

  return ACTIVE_BOOKING_STATUSES.has(status) || Boolean(status);
}

function normalizePlate(value: string) {
  return value.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

function buildBookedVehicleMap(bookings: CustomerBooking[]) {
  const ids = new Set<string>();
  const plates = new Set<string>();

  for (const booking of bookings) {
    if (!isActiveBooking(booking)) continue;
    if (booking.vehicleId) ids.add(booking.vehicleId);
    if (booking.vehicleLicensePlate) plates.add(normalizePlate(booking.vehicleLicensePlate));
  }

  return { ids, plates };
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
  const [activeBookings, setActiveBookings] = useState<CustomerBooking[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const bookedVehicles = useMemo(
    () => buildBookedVehicleMap(activeBookings),
    [activeBookings],
  );

  const loadData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const from = new Date();
      const to = new Date();
      to.setDate(to.getDate() + 365);

      const [nextVehicles, nextBookings] = await Promise.all([
        getVehicles(token, 1, 20),
        getBookings(token, toISODate(from), toISODate(to), 1, 100),
      ]);

      setVehicles(nextVehicles);
      setActiveBookings(nextBookings.filter(isActiveBooking));
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

  function isVehicleBooked(vehicle: Vehicle): boolean {
    return (
      bookedVehicles.ids.has(vehicle.id) ||
      bookedVehicles.plates.has(normalizePlate(vehicle.licensePlate))
    );
  }

  const selectedBlocked = selected ? isVehicleBooked(selected) : false;

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Chọn xe của bạn</h2>
          <p className="mt-1 text-sm text-slate-500">
            Xe đang có lịch active sẽ bị khóa để tránh đặt trùng.
          </p>
        </div>
        <button
          type="button"
          onClick={loadData}
          disabled={loading}
          title="Tải lại danh sách xe"
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
          <span className="sr-only">Tải lại danh sách xe</span>
        </button>
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
            href="/customer/info"
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
            const booked = isVehicleBooked(vehicle);

            return (
              <button
                key={vehicle.id}
                type="button"
                onClick={() => !booked && onSelect(vehicle)}
                disabled={booked}
                aria-pressed={isSelected}
                className={`rounded-lg border-2 p-5 text-left transition ${
                  booked
                    ? "cursor-not-allowed border-slate-100 bg-slate-50 opacity-60"
                    : isSelected
                      ? "border-slate-950 bg-slate-50 shadow-sm"
                      : "border-slate-200 bg-white hover:border-slate-300"
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <Car size={22} className={booked ? "mb-2 text-slate-300" : "mb-2 text-blue-600"} aria-hidden />
                    <p className={booked ? "font-bold text-slate-400" : "font-bold text-slate-950"}>
                      {vehicle.licensePlate}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">
                      {vehicle.brand} {vehicle.model} - {vehicle.color}
                    </p>
                    {booked ? (
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        Xe này đang có lịch active
                      </p>
                    ) : null}
                  </div>
                  {isSelected && !booked ? (
                    <CheckCircle2 size={20} className="shrink-0 text-emerald-500" aria-hidden />
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>
      ) : null}

      {selectedBlocked ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Xe đã chọn đang có lịch active. Vui lòng chọn xe khác.
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
          disabled={!selected || selectedBlocked}
          className="rounded-lg bg-slate-950 px-8 py-3 text-sm font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Tiếp tục
        </button>
      </div>
    </div>
  );
}
