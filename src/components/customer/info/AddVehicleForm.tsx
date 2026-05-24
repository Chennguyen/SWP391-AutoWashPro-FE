"use client";

import { useState } from "react";
import { addVehicle } from "@/lib/api/vehicle";
import type { AddVehiclePayload, VehicleType } from "@/types/vehicle";
import { VEHICLE_TYPE_LABELS } from "@/types/vehicle";

interface AddVehicleFormProps {
  token: string;
  onSuccess: () => void; // callback to parent to refresh vehicle list
}

const VEHICLE_TYPES: VehicleType[] = [
  "SEDAN",
  "SUV",
  "HATCHBACK",
  "PICKUP",
  "MOTORBIKE",
  "OTHER",
];

const INITIAL_FORM: AddVehiclePayload = {
  plateNumber: "",
  brand: "",
  model: "",
  color: "",
  vehicleType: "SEDAN",
};

export function AddVehicleForm({ token, onSuccess }: AddVehicleFormProps) {
  const [form, setForm] = useState<AddVehiclePayload>(INITIAL_FORM);
  const [errors, setErrors] = useState<Partial<Record<keyof AddVehiclePayload, string>>>({});
  const [loading, setLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!form.plateNumber.trim()) next.plateNumber = "Vui lòng nhập biển số xe.";
    if (!form.brand.trim()) next.brand = "Vui lòng nhập hãng xe.";
    if (!form.model.trim()) next.model = "Vui lòng nhập dòng xe.";
    if (!form.vehicleType) next.vehicleType = "Vui lòng chọn loại xe.";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setServerError(null);
    setSuccess(false);
    if (!validate()) return;

    setLoading(true);
    try {
      await addVehicle(token, form);
      setForm(INITIAL_FORM);
      setErrors({});
      setSuccess(true);
      onSuccess(); // trigger vehicle list refresh in parent
    } catch (err) {
      setServerError(err instanceof Error ? err.message : "Có lỗi xảy ra, vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  }

  const field = (
    id: keyof AddVehiclePayload,
    label: string,
    placeholder: string,
    type = "text"
  ) => (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-slate-700 mb-1">
        {label} <span className="text-red-500">*</span>
      </label>
      <input
        id={id}
        type={type}
        placeholder={placeholder}
        value={form[id] as string}
        onChange={(e) => {
          setForm((prev) => ({ ...prev, [id]: e.target.value }));
          if (errors[id]) setErrors((prev) => ({ ...prev, [id]: undefined }));
        }}
        disabled={loading}
        className={`w-full rounded-xl border px-4 py-2.5 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-900 transition-all
          ${errors[id] ? "border-red-400 bg-red-50" : "border-slate-200 bg-white"}`}
      />
      {errors[id] && <p className="text-xs text-red-500 mt-1">{errors[id]}</p>}
    </div>
  );

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {field("plateNumber", "Biển số xe", "51A-123.45")}
        {field("brand", "Hãng xe", "Toyota, Honda, Ford...")}
        {field("model", "Dòng xe", "Camry, Civic, Ranger...")}
        {field("color", "Màu xe", "Trắng, Đen, Bạc...")}
      </div>

      {/* Vehicle Type */}
      <div>
        <label className="block text-sm font-medium text-slate-700 mb-2">
          Loại xe <span className="text-red-500">*</span>
        </label>
        <div className="flex flex-wrap gap-2">
          {VEHICLE_TYPES.map((vt) => (
            <button
              key={vt}
              type="button"
              onClick={() => {
                setForm((prev) => ({ ...prev, vehicleType: vt }));
                if (errors.vehicleType) setErrors((prev) => ({ ...prev, vehicleType: undefined }));
              }}
              disabled={loading}
              className={`px-4 py-2 rounded-full text-sm font-medium border transition-all
                ${form.vehicleType === vt
                  ? "bg-slate-900 text-white border-slate-900"
                  : "bg-white text-slate-600 border-slate-200 hover:border-slate-400"
                }`}
            >
              {VEHICLE_TYPE_LABELS[vt]}
            </button>
          ))}
        </div>
        {errors.vehicleType && (
          <p className="text-xs text-red-500 mt-1">{errors.vehicleType}</p>
        )}
      </div>

      {/* Server error */}
      {serverError && (
        <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm">
          <span className="shrink-0 mt-0.5">⚠</span>
          <span>{serverError}</span>
        </div>
      )}

      {/* Success message */}
      {success && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm">
          <span>✓</span>
          <span>Thêm xe thành công!</span>
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full sm:w-auto px-8 py-3 rounded-full bg-slate-900 text-white text-sm font-bold tracking-wide hover:bg-slate-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
      >
        {loading ? "Đang lưu..." : "Thêm xe"}
      </button>
    </form>
  );
}
