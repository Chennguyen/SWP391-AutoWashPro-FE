"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api/api-error";
import { addVehicle, updateVehicle } from "@/lib/api/vehicle";
import type { UpdateVehiclePayload, Vehicle } from "@/types/vehicle";

interface AddVehicleFormProps {
  token: string;
  vehicle?: Vehicle;
  onCancel: () => void;
  onSuccess: () => void;
  onUnauthorized: () => void;
}

type VehicleForm = {
  licensePlate: string;
  brand: string;
  model: string;
  color: string;
};

type FieldName = keyof VehicleForm;
type FormErrors = Partial<Record<FieldName | "licensePlateImage", string>>;

function formFromVehicle(vehicle?: Vehicle): VehicleForm {
  return {
    licensePlate: vehicle?.licensePlate ?? "",
    brand: vehicle?.brand ?? "",
    model: vehicle?.model ?? "",
    color: vehicle?.color ?? "",
  };
}

export function AddVehicleForm({
  token,
  vehicle,
  onCancel,
  onSuccess,
  onUnauthorized,
}: AddVehicleFormProps) {
  const isEditing = Boolean(vehicle);
  const [form, setForm] = useState<VehicleForm>(() => formFromVehicle(vehicle));
  const [errors, setErrors] = useState<FormErrors>({});
  const [imagePreview, setImagePreview] = useState(vehicle?.licensePlateImageUrl ?? "");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewUrlRef = useRef<string | null>(null);

  useEffect(() => {
    const previewRef = previewUrlRef;

    return () => {
      if (previewRef.current) {
        URL.revokeObjectURL(previewRef.current);
      }
    };
  }, []);

  function updateField(name: FieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  function validate(): boolean {
    const nextErrors: FormErrors = {};

    if (!form.licensePlate.trim()) {
      nextErrors.licensePlate = "Vui lòng nhập biển số xe.";
    }
    if (!form.brand.trim()) {
      nextErrors.brand = "Vui lòng nhập hãng xe.";
    }
    if (!form.model.trim()) {
      nextErrors.model = "Vui lòng nhập dòng xe.";
    }
    if (!form.color.trim()) {
      nextErrors.color = "Vui lòng nhập màu xe.";
    }
    if (!isEditing && !imageFile) {
      nextErrors.licensePlateImage = "Vui lòng chọn ảnh biển số.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) {
      return;
    }

    if (!file.type.startsWith("image/")) {
      setErrors((current) => ({
        ...current,
        licensePlateImage: "Vui lòng chọn file hình ảnh.",
      }));
      event.target.value = "";
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setErrors((current) => ({
        ...current,
        licensePlateImage: "Ảnh biển số tối đa 10 MB.",
      }));
      event.target.value = "";
      return;
    }

    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
    }

    const objectUrl = URL.createObjectURL(file);
    previewUrlRef.current = objectUrl;
    setImagePreview(objectUrl);
    setImageFile(file);
    setErrors((current) => ({ ...current, licensePlateImage: undefined }));
    event.target.value = "";
  }

  function handleRemoveImage() {
    if (previewUrlRef.current) {
      URL.revokeObjectURL(previewUrlRef.current);
      previewUrlRef.current = null;
    }

    setImagePreview(isEditing ? (vehicle?.licensePlateImageUrl ?? "") : "");
    setImageFile(null);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setServerError(null);

    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      if (vehicle) {
        const payload: UpdateVehiclePayload = {
          brand: form.brand.trim(),
          model: form.model.trim(),
          color: form.color.trim(),
        };
        await updateVehicle(token, vehicle.id, payload);
      } else if (imageFile) {
        await addVehicle(token, {
          licensePlate: form.licensePlate.trim(),
          brand: form.brand.trim(),
          model: form.model.trim(),
          color: form.color.trim(),
          licensePlateImageFile: imageFile,
        });
      }

      onSuccess();
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setServerError(
        error instanceof Error
          ? error.message
          : "Có lỗi xảy ra, vui lòng thử lại.",
      );
    } finally {
      setSaving(false);
    }
  }

  function renderInput(id: FieldName, label: string, placeholder: string) {
    const readonly = isEditing && id === "licensePlate";

    return (
      <div>
        <label htmlFor={id} className="mb-1 block text-sm font-medium text-slate-700">
          {label} <span className="text-red-500">*</span>
        </label>
        <input
          id={id}
          value={form[id]}
          onChange={(event) => updateField(id, event.target.value)}
          placeholder={placeholder}
          disabled={saving}
          readOnly={readonly}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
            errors[id] ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
          } ${readonly ? "cursor-not-allowed bg-slate-100 text-slate-500" : ""}`}
        />
        {errors[id] ? (
          <p className="mt-1 text-xs text-red-600">{errors[id]}</p>
        ) : null}
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderInput("licensePlate", "Biển số xe", "30A-12345")}
        {renderInput("brand", "Hãng xe", "Toyota")}
        {renderInput("model", "Dòng xe", "Camry")}
        {renderInput("color", "Màu xe", "Black")}
      </div>

      {!isEditing ? (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">
            Ảnh biển số <span className="text-red-500">*</span>
          </p>
          <label
            htmlFor="license-plate-image"
            className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-5 text-center transition hover:border-blue-500 hover:bg-blue-50/40"
          >
            <svg
              className="h-7 w-7 text-slate-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338 0A4.5 4.5 0 0 1 17.25 19.5H6.75Z"
              />
            </svg>
            <span className="text-sm font-semibold text-slate-700">
              Nhấn để chọn ảnh biển số
            </span>
            <span className="text-xs text-slate-400">PNG, JPG tối đa 10 MB</span>
          </label>
          <input
            id="license-plate-image"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleImageUpload}
            disabled={saving}
          />
          {errors.licensePlateImage ? (
            <p className="mt-1 text-xs text-red-600">
              {errors.licensePlateImage}
            </p>
          ) : null}
        </div>
      ) : null}

      {imagePreview ? (
        <div className="relative w-full overflow-hidden rounded-lg border border-slate-200 bg-white sm:max-w-sm">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={imagePreview}
            alt="Ảnh biển số đã chọn"
            className="aspect-video w-full object-cover"
          />
          {!isEditing || imageFile ? (
            <button
              type="button"
              onClick={handleRemoveImage}
              disabled={saving}
              className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60"
              aria-label="Xóa ảnh biển số"
            >
              <span aria-hidden>×</span>
            </button>
          ) : null}
        </div>
      ) : null}

      {serverError ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
          {serverError}
        </div>
      ) : null}

      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button
          type="button"
          onClick={onCancel}
          disabled={saving}
          className="rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={saving}
          className="rounded-lg bg-slate-950 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {saving ? "Đang lưu..." : isEditing ? "Lưu thay đổi" : "Thêm xe"}
        </button>
      </div>
    </form>
  );
}
