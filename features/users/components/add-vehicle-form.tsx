"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { ApiError } from "@/lib/api-error";
import { addVehicle, updateVehicle } from "@/features/booking/vehicle-service";
import {
  getVehicleBrandChoice,
  getVehicleModelChoice,
  VIETNAM_VEHICLE_BRANDS,
  VIETNAM_VEHICLE_MODELS,
} from "@/features/booking/vehicle-options";
import type { UpdateVehiclePayload, Vehicle } from "@/features/booking/vehicle-types";

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

/**
 * Thành phần (Component) AddVehicleForm
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AddVehicleForm({
  token,
  vehicle,
  onCancel,
  onSuccess,
  onUnauthorized,
}: AddVehicleFormProps) {
  const isEditing = Boolean(vehicle);
  const [form, setForm] = useState<VehicleForm>(() => formFromVehicle(vehicle));
  const [brandChoice, setBrandChoice] = useState(() => getVehicleBrandChoice(vehicle?.brand ?? ""));
  const [modelChoice, setModelChoice] = useState(() =>
    getVehicleModelChoice(getVehicleBrandChoice(vehicle?.brand ?? ""), vehicle?.model ?? ""),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  
  const [vehicleType, setVehicleType] = useState<"SEDAN" | "SUV">(() => {
    return vehicle?.vehicleType === "SUV" ? "SUV" : "SEDAN";
  });

  const [imagePreviews, setImagePreviews] = useState<string[]>(() => {
    if (vehicle?.vehicleImages && vehicle.vehicleImages.length > 0) {
      return vehicle.vehicleImages;
    }
    return vehicle?.licensePlateImageUrl ? [vehicle.licensePlateImageUrl] : [];
  });
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [serverError, setServerError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const previewUrlsRef = useRef<string[]>([]);

  useEffect(() => {
    const previewRefs = previewUrlsRef;

    return () => {
      previewRefs.current.forEach((url) => {
        URL.revokeObjectURL(url);
      });
    };
  }, []);

  function updateField(name: FieldName, value: string) {
    setForm((current) => ({ ...current, [name]: value }));
    if (errors[name]) {
      setErrors((current) => ({ ...current, [name]: undefined }));
    }
  }

  function handleBrandSelect(value: string) {
    setBrandChoice(value);
    setModelChoice("");
    setForm((current) => ({
      ...current,
      brand: value,
      model: "",
    }));
    setErrors((current) => ({ ...current, brand: undefined, model: undefined }));
  }

  function handleModelSelect(value: string) {
    setModelChoice(value);
    updateField("model", value);
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
    if (!isEditing && imageFiles.length === 0) {
      nextErrors.licensePlateImage = "Vui lòng chọn từ 1 đến 3 ảnh xác minh.";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleImageUpload(event: ChangeEvent<HTMLInputElement>) {
    const files = event.target.files;
    if (!files || files.length === 0) {
      return;
    }

    const newFiles = Array.from(files);
    const validFiles: File[] = [];
    const newErrors: string[] = [];

    for (const file of newFiles) {
      if (!file.type.startsWith("image/")) {
        newErrors.push(`File "${file.name}" không phải là ảnh.`);
        continue;
      }
      if (file.size > 10 * 1024 * 1024) {
        newErrors.push(`Ảnh "${file.name}" vượt quá 10 MB.`);
        continue;
      }
      validFiles.push(file);
    }

    if (newErrors.length > 0) {
      setErrors((current) => ({
        ...current,
        licensePlateImage: newErrors[0],
      }));
      event.target.value = "";
      return;
    }

    const totalCount = imageFiles.length + validFiles.length;
    if (totalCount > 3) {
      setErrors((current) => ({
        ...current,
        licensePlateImage: "Bạn chỉ được tải lên tối đa 3 ảnh xác minh xe.",
      }));
      event.target.value = "";
      return;
    }

    // Create object URLs for previews
    const newPreviews = validFiles.map((file) => {
      const url = URL.createObjectURL(file);
      previewUrlsRef.current.push(url);
      return url;
    });

    setImagePreviews((prev) => [...prev, ...newPreviews]);
    setImageFiles((prev) => [...prev, ...validFiles]);
    setErrors((current) => ({ ...current, licensePlateImage: undefined }));
    event.target.value = "";
  }

  function handleRemoveImage(index: number) {
    const isNewFile = index >= (imagePreviews.length - imageFiles.length);

    if (isNewFile) {
      const fileIndex = index - (imagePreviews.length - imageFiles.length);
      const urlToRevoke = imagePreviews[index];
      URL.revokeObjectURL(urlToRevoke);
      previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== urlToRevoke);

      setImageFiles((prev) => prev.filter((_, i) => i !== fileIndex));
      setImagePreviews((prev) => prev.filter((_, i) => i !== index));
    }
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
          vehicleType,
        };
        await updateVehicle(token, vehicle.id, payload);
      } else {
        await addVehicle(token, {
          licensePlate: form.licensePlate.trim(),
          brand: form.brand.trim(),
          model: form.model.trim(),
          color: form.color.trim(),
          vehicleType,
          vehicleImages: imageFiles,
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

  function renderSelect(
    id: FieldName,
    label: string,
    value: string,
    options: string[],
    onChange: (value: string) => void,
    placeholder: string,
  ) {
    return (
      <div>
        <label htmlFor={`${id}-select`} className="mb-1 block text-sm font-medium text-slate-700">
          {label} <span className="text-red-500">*</span>
        </label>
        <select
          id={`${id}-select`}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          disabled={saving}
          className={`w-full rounded-lg border px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 ${
            errors[id] ? "border-red-300 bg-red-50" : "border-slate-200 bg-white"
          }`}
        >
          <option value="">{placeholder}</option>
          {options.map((option) => (
            <option key={option} value={option}>
              {option}
            </option>
          ))}
        </select>
      </div>
    );
  }



  const modelOptions = brandChoice ? VIETNAM_VEHICLE_MODELS[brandChoice] ?? [] : [];

  return (
    <form onSubmit={handleSubmit} className="space-y-4" noValidate>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {renderInput("licensePlate", "Biển số xe", "30A-12345")}
        <div className="space-y-3">
          {renderSelect(
            "brand",
            "Hãng xe",
            brandChoice,
            VIETNAM_VEHICLE_BRANDS,
            handleBrandSelect,
            "Chọn hãng xe",
          )}
          {errors.brand ? (
            <p className="mt-1 text-xs text-red-600">{errors.brand}</p>
          ) : null}
        </div>
        <div className="space-y-3">
          {renderSelect(
            "model",
            "Dòng xe",
            modelChoice,
            modelOptions,
            handleModelSelect,
            brandChoice ? "Chọn dòng xe" : "Chọn hãng xe trước",
          )}
          {errors.model ? (
            <p className="mt-1 text-xs text-red-600">{errors.model}</p>
          ) : null}
        </div>
        {renderInput("color", "Màu xe", "Black")}
        
        {/* Dropdown chọn loại xe */}
        <div>
          <label htmlFor="vehicle-type-select" className="mb-1 block text-sm font-medium text-slate-700">
            Loại xe <span className="text-red-500">*</span>
          </label>
          <select
            id="vehicle-type-select"
            value={vehicleType}
            onChange={(event) => setVehicleType(event.target.value as "SEDAN" | "SUV")}
            disabled={saving}
            className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
          >
            <option value="SEDAN">Sedan</option>
            <option value="SUV">SUV</option>
          </select>
        </div>
      </div>

      {!isEditing ? (
        <div>
          <p className="mb-1 text-sm font-medium text-slate-700">
            Ảnh xác minh xe (Chọn từ 1 đến 3 ảnh) <span className="text-red-500">*</span>
          </p>
          <label
            htmlFor="vehicle-images-input"
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
              Nhấn để chọn ảnh xác minh xe
            </span>
            <span className="text-xs text-slate-400">Chọn tối đa 3 ảnh, PNG, JPG tối đa 10 MB mỗi ảnh</span>
          </label>
          <input
            id="vehicle-images-input"
            type="file"
            accept="image/*"
            multiple
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
      ) : (
        <div>
          <p className="mb-2 text-sm font-medium text-slate-700">
            Ảnh xác minh xe (Chỉ đọc)
          </p>
        </div>
      )}

      {imagePreviews.length > 0 ? (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {imagePreviews.map((preview, index) => (
            <div key={`${preview}-${index}`} className="relative overflow-hidden rounded-lg border border-slate-200 bg-white">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={preview}
                alt={`Ảnh xác minh ${index + 1}`}
                className="aspect-video w-full object-cover"
              />
              {!isEditing ? (
                <button
                  type="button"
                  onClick={() => handleRemoveImage(index)}
                  disabled={saving}
                  className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-950/70 text-white transition hover:bg-slate-950 disabled:cursor-not-allowed disabled:opacity-60 text-xs"
                  aria-label={`Xóa ảnh ${index + 1}`}
                >
                  <span aria-hidden>×</span>
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : isEditing ? (
        <p className="text-xs text-slate-400 italic">Không có ảnh xác minh cho xe này.</p>
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
