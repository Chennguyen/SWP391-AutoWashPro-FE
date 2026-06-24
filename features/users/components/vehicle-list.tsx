"use client";

import { useRef, useState } from "react";
import { ArrowLeft, Car, ExternalLink, Pencil, Plus, Trash2, X, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import { ApiError } from "@/lib/api-error";
import { deleteVehicle, getVehicle } from "@/features/booking/vehicle-service";
import type { Vehicle } from "@/features/booking/vehicle-types";
import { AddVehicleForm } from "./add-vehicle-form";

interface VehicleListProps {
  token: string;
  vehicles: Vehicle[];
  loading: boolean;
  error: string | null;
  onRefresh: () => Promise<void>;
  onUnauthorized: () => void;
}

type FormMode =
  | { type: "closed" }
  | { type: "create" }
  | { type: "edit"; vehicle: Vehicle };

/**
 * Thành phần (Component) VehicleList
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function VehicleList({
  token,
  vehicles,
  loading,
  error,
  onRefresh,
  onUnauthorized,
}: VehicleListProps) {
  const [formMode, setFormMode] = useState<FormMode>({ type: "closed" });
  const [selectedVehicle, setSelectedVehicle] = useState<Vehicle | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const activeDetailIdRef = useRef<string | null>(null);

  const formTitle = formMode.type === "edit" ? "Sửa thông tin xe" : "Thêm xe mới";
  const isDetailOpen = selectedVehicle !== null;

  async function handleOpenDetail(vehicle: Vehicle) {
    if (!vehicle.id) {
      setActionError("Không tìm thấy mã xe để tải chi tiết.");
      return;
    }

    setActionError(null);
    setFormMode({ type: "closed" });
    setSelectedVehicle(vehicle);
    activeDetailIdRef.current = vehicle.id;
    setDetailLoading(false);
  }

  async function handleDelete(vehicle: Vehicle) {
    if (!vehicle.id) {
      setActionError("Không tìm thấy mã xe để xóa.");
      return;
    }

    const confirmed = window.confirm(`Xóa xe ${vehicle.licensePlate}?`);
    if (!confirmed) {
      return;
    }

    setActionError(null);
    setDeletingId(vehicle.id);
    try {
      await deleteVehicle(token, vehicle.id);
      setSelectedVehicle(null);
      activeDetailIdRef.current = null;
      setFormMode({ type: "closed" });
      await onRefresh();
      window.dispatchEvent(new Event("autowash-auth"));
    } catch (deleteError) {
      if (deleteError instanceof ApiError && deleteError.status === 401) {
        onUnauthorized();
        return;
      }

      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Không thể xóa xe, vui lòng thử lại.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  async function handleFormSuccess() {
    const editedVehicleId = formMode.type === "edit" ? formMode.vehicle.id : null;
    setFormMode({ type: "closed" });
    await onRefresh();
    window.dispatchEvent(new Event("autowash-auth"));

    if (editedVehicleId) {
      try {
        const detail = await getVehicle(token, editedVehicleId);
        activeDetailIdRef.current = editedVehicleId;
        setSelectedVehicle(detail);
      } catch {
        activeDetailIdRef.current = null;
        setSelectedVehicle(null);
      }
    }
  }

  function handleBackToList() {
    setSelectedVehicle(null);
    activeDetailIdRef.current = null;
    setFormMode({ type: "closed" });
    setActionError(null);
  }

  return (
    <section aria-label="Thông tin xe" className="space-y-4">
      <div className="flex flex-col gap-3 border-b border-slate-200 pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-950">
            {isDetailOpen ? "Chi tiết xe" : "Thông tin xe"}
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {isDetailOpen
              ? "Xem thông tin xe, sửa hoặc xóa xe đang chọn."
              : "Quản lý danh sách xe dùng để đặt lịch rửa xe."}
          </p>
        </div>
        <div className="flex gap-2">
          {isDetailOpen ? (
            <button
              type="button"
              onClick={handleBackToList}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
            >
              <ArrowLeft size={16} aria-hidden />
              Danh sách xe
            </button>
          ) : (
            <button
              type="button"
              onClick={() =>
                setFormMode((current) =>
                  current.type === "create" ? { type: "closed" } : { type: "create" },
                )
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800"
            >
              {formMode.type === "create" ? <X size={16} aria-hidden /> : <Plus size={16} aria-hidden />}
              {formMode.type === "create" ? "Đóng" : "Thêm xe"}
            </button>
          )}
        </div>
      </div>

      {formMode.type !== "closed" ? (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
          <h3 className="mb-4 text-sm font-semibold text-slate-800">{formTitle}</h3>
          <AddVehicleForm
            token={token}
            vehicle={formMode.type === "edit" ? formMode.vehicle : undefined}
            onCancel={() => setFormMode({ type: "closed" })}
            onSuccess={handleFormSuccess}
            onUnauthorized={onUnauthorized}
          />
        </div>
      ) : null}

      {error ? (
        (() => {
          const isUnverified = error.includes("Only active and verified customer accounts") || (typeof window !== "undefined" && window.localStorage.getItem("is_unverified") === "true");
          return (
            <div role="alert" className={cn("rounded-lg border px-4 py-3 text-sm flex items-start gap-3", isUnverified ? "border-amber-200 bg-amber-50 text-amber-800" : "border-red-200 bg-red-50 text-red-700")}>
              <Info size={18} className={cn("mt-0.5 shrink-0", isUnverified ? "text-amber-600" : "text-red-500")} aria-hidden />
              <div>
                <p className="font-semibold">{isUnverified ? "Hồ sơ FaceID đang chờ duyệt" : "Lỗi tải thông tin"}</p>
                <p className="mt-1 text-xs md:text-sm">
                  {isUnverified ? "Tài khoản đang được hệ thống xác thực, vui lòng đợi trong ít phút." : error}
                </p>
              </div>
            </div>
          );
        })()
      ) : null}

      {actionError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {actionError}
        </div>
      ) : null}

      {isDetailOpen && selectedVehicle && formMode.type === "closed" ? (
        <div className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <Car size={20} className="text-blue-600" aria-hidden />
                <h3 className="truncate text-2xl font-black text-slate-950">
                  {selectedVehicle.licensePlate}
                </h3>
              </div>
              {detailLoading ? (
                <p className="mt-3 text-sm text-slate-500">Đang tải thông tin xe...</p>
              ) : (
                <div className="mt-5 grid gap-4 sm:grid-cols-4">
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Hãng xe</p>
                    <p className="mt-2 font-bold text-slate-950">{selectedVehicle.brand}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Dòng xe</p>
                    <p className="mt-2 font-bold text-slate-950">{selectedVehicle.model}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Màu xe</p>
                    <p className="mt-2 font-bold text-slate-950">{selectedVehicle.color}</p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Loại xe</p>
                    <p className="mt-2 font-bold text-slate-950">
                      {selectedVehicle.vehicleType === "SEDAN" ? "Sedan" : 
                       selectedVehicle.vehicleType === "SUV" ? "SUV" : selectedVehicle.vehicleType}
                    </p>
                  </div>
                </div>
              )}
            </div>
            <div className="flex shrink-0 gap-2">
              <button
                type="button"
                onClick={() => setFormMode({ type: "edit", vehicle: selectedVehicle })}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 hover:text-slate-950"
              >
                <Pencil size={14} aria-hidden />
                Sửa
              </button>
              <button
                type="button"
                onClick={() => handleDelete(selectedVehicle)}
                disabled={deletingId === selectedVehicle.id}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-2 text-sm font-semibold text-red-500 shadow-sm transition hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Trash2 size={14} aria-hidden />
                Xóa
              </button>
            </div>
          </div>

          {/* Ảnh xác minh xe */}
          {selectedVehicle.vehicleImages && selectedVehicle.vehicleImages.length > 0 ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ảnh xác minh xe ({selectedVehicle.vehicleImages.length} ảnh)
              </p>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                {selectedVehicle.vehicleImages.map((imgUrl, index) => (
                  <div key={`${imgUrl}-${index}`} className="relative group overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imgUrl}
                      alt={`Ảnh xác minh ${index + 1} của xe ${selectedVehicle.licensePlate}`}
                      className="h-48 w-full object-cover transition duration-200 group-hover:scale-105"
                    />
                    <a
                      href={imgUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/30 group-hover:opacity-100"
                      aria-label={`Xem ảnh đầy đủ ${index + 1}`}
                    >
                      <span className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
                        <ExternalLink size={13} aria-hidden />
                        Xem đầy đủ
                      </span>
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ) : selectedVehicle.licensePlateImageUrl ? (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ảnh xác minh xe
              </p>
              <div className="relative group w-full max-w-sm overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-sm">
                <img
                  src={selectedVehicle.licensePlateImageUrl}
                  alt={`Ảnh biển số xe ${selectedVehicle.licensePlate}`}
                  className="h-48 w-full object-cover transition duration-200 group-hover:scale-105"
                />
                <a
                  href={selectedVehicle.licensePlateImageUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="absolute inset-0 flex items-center justify-center bg-black/0 opacity-0 transition duration-200 group-hover:bg-black/30 group-hover:opacity-100"
                  aria-label="Xem ảnh biển số đầy đủ"
                >
                  <span className="flex items-center gap-1.5 rounded-lg bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-800 shadow">
                    <ExternalLink size={13} aria-hidden />
                    Xem đầy đủ
                  </span>
                </a>
              </div>
            </div>
          ) : (
            <div className="mt-5">
              <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
                Ảnh xác minh xe
              </p>
              <div className="flex h-32 w-full max-w-sm items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50">
                <p className="text-xs text-slate-400">Chưa có ảnh xác minh</p>
              </div>
            </div>
          )}
        </div>
      ) : null}

      {!isDetailOpen && loading && vehicles.length === 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-32 animate-pulse rounded-lg border border-slate-200 bg-slate-100" />
          ))}
        </div>
      ) : null}

      {!isDetailOpen && !loading && vehicles.length === 0 && !error ? (
        <div className="flex min-h-64 flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 bg-white px-6 py-12 text-center">
          <Car size={40} className="mb-3 text-slate-300" aria-hidden />
          <p className="font-semibold text-slate-700">Chưa có xe nào được đăng ký</p>
          <p className="mt-1 text-sm text-slate-500">Thêm xe đầu tiên để quản lý nhanh hơn.</p>
        </div>
      ) : null}

      {!isDetailOpen && vehicles.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
          {vehicles.map((vehicle) => (
            <button
              key={`${vehicle.id}-${vehicle.licensePlate}`}
              type="button"
              onClick={() => handleOpenDetail(vehicle)}
              className="rounded-lg border border-slate-200 bg-white p-4 text-left transition hover:border-blue-300 hover:bg-blue-50/40"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Car size={18} className="text-blue-600" aria-hidden />
                  <h3 className="truncate text-lg font-bold text-slate-950">
                    {vehicle.licensePlate}
                  </h3>
                </div>
                <p className="mt-2 text-sm text-slate-600">
                  {vehicle.brand} {vehicle.model}
                </p>
                <p className="mt-1 text-sm text-slate-500">Màu: {vehicle.color}</p>
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </section>
  );
}
