"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { AuthInput } from "@/components/auth/AuthInput";
import { SocialButton } from "@/components/auth/SocialButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

/* ───── Google icon SVG ───── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z" fill="#4285F4" />
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z" fill="#34A853" />
      <path d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z" fill="#FBBC05" />
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z" fill="#EA4335" />
    </svg>
  );
}

/* ───── Password strength indicator ───── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ["Yếu", "Trung bình", "Khá", "Mạnh"];
  const colors = ["bg-red-400", "bg-orange-400", "bg-yellow-400", "bg-green-500"];
  const textColors = ["text-red-500", "text-orange-500", "text-yellow-600", "text-green-600"];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${i < strength ? colors[strength - 1] : "bg-gray-100"
              }`}
          />
        ))}
      </div>
      <p className={`text-xs font-medium ${textColors[strength - 1] ?? "text-gray-400"}`}>
        Mật khẩu: {labels[strength - 1] ?? "Chưa đủ"}
      </p>
    </div>
  );
}

type UploadedImage = {
  id: string;
  file: File | null;
  preview: string;
};

export function SignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [imageErrors, setImageErrors] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const previewUrls = useRef(new Set<string>());

  // Mô phỏng trạng thái đã tải lên (Mock data theo yêu cầu)
  const [personalImages, setPersonalImages] = useState<UploadedImage[]>([
    { id: "p1", file: null, preview: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=300&h=300&fit=crop" },
    { id: "p2", file: null, preview: "https://images.unsplash.com/photo-1621974110765-e65f8eca0d45?w=300&h=300&fit=crop" },
    { id: "p3", file: null, preview: "https://images.unsplash.com/photo-1622550186938-164921f06421?w=300&h=300&fit=crop" },
  ]);

  const [vehicleImages, setVehicleImages] = useState<UploadedImage[]>([
    { id: "v1", file: null, preview: "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=300&h=300&fit=crop" },
    { id: "v2", file: null, preview: "https://images.unsplash.com/photo-1605559424843-9e4c228bf1c2?w=300&h=300&fit=crop" },
  ]);

  useEffect(() => {
    return () => {
      // Dọn dẹp memory leak cho các file tạo bằng URL.createObjectURL
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  function handleChange(field: keyof typeof form) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    };
  }

  function validate() {
    const errs: typeof errors = {};
    if (!form.name.trim()) errs.name = "Vui lòng nhập họ tên.";
    if (!form.email.trim()) errs.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email không hợp lệ.";
    if (!form.password) errs.password = "Vui lòng nhập mật khẩu.";
    else if (form.password.length < 6) errs.password = "Mật khẩu phải từ 6 ký tự.";
    if (!form.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    else if (form.confirmPassword !== form.password)
      errs.confirmPassword = "Mật khẩu không khớp.";
    return errs;
  }

  const handleImageUpload = (
    e: ChangeEvent<HTMLInputElement>,
    currentImages: UploadedImage[],
    setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>,
    maxLimit: number
  ) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    const remainingSlots = maxLimit - currentImages.length;
    const filesToAdd = files.slice(0, remainingSlots);

    const newImages = filesToAdd.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: Math.random().toString(36).substring(7), file, preview };
    });

    setImages((prev) => [...prev, ...newImages]);
    if (imageErrors) setImageErrors("");
    e.target.value = ""; // Reset input
  };

  const handleRemoveImage = (
    id: string,
    setImages: React.Dispatch<React.SetStateAction<UploadedImage[]>>
  ) => {
    setImages((prev) => {
      const imgToRemove = prev.find((img) => img.id === id);
      if (imgToRemove && imgToRemove.file) {
        URL.revokeObjectURL(imgToRemove.preview);
        previewUrls.current.delete(imgToRemove.preview);
      }
      return prev.filter((img) => img.id !== id);
    });
  };
  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    const isImagesValid = personalImages.length === 3 && vehicleImages.length === 2;

    if (!isImagesValid) {
      setImageErrors("Vui lòng tải lên đủ 3 ảnh cá nhân và 2 ảnh xe.");
    }

    if (Object.keys(errs).length > 0 || !isImagesValid) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setImageErrors("");
    setLoading(true);
    // TODO: Connect to auth API
    setTimeout(() => setLoading(false), 1500);
  }

  const hasAllImages = personalImages.length === 3 && vehicleImages.length === 2;

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* --- Thông tin cá nhân --- */}
        <AuthInput id="signup-name" label="Họ tên" type="text" placeholder="Nguyễn Văn A" autoComplete="name" value={form.name} onChange={handleChange("name")} error={errors.name} />
        <AuthInput id="signup-email" label="Email" type="email" placeholder="ban@example.com" autoComplete="email" value={form.email} onChange={handleChange("email")} error={errors.email} />

        <div className="flex flex-col gap-1.5">
          <AuthInput id="signup-password" label="Mật khẩu" type="password" placeholder="••••••••" autoComplete="new-password" value={form.password} onChange={handleChange("password")} error={errors.password} />
          <PasswordStrength password={form.password} />
        </div>

        <AuthInput id="signup-confirm-password" label="Xác nhận mật khẩu" type="password" placeholder="••••••••" autoComplete="new-password" value={form.confirmPassword} onChange={handleChange("confirmPassword")} error={errors.confirmPassword} />

        {/* --- Vùng tải lên hình ảnh --- */}
        <div className="mt-2 flex flex-col gap-5 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">

          {/* Zone 1: Personal Images */}
          <div>
            <label
              htmlFor="upload-personal"
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer ${personalImages.length >= 3 ? "border-slate-200 bg-slate-50 opacity-60 pointer-events-none" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#2563EB]"
                }`}
            >
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Tải lên ảnh Cá nhân ({personalImages.length}/3)
                </p>
                <p className="mt-1 text-xs text-slate-500">3 hình chân dung</p>
              </div>
            </label>
            <input
              id="upload-personal"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e, personalImages, setPersonalImages, 3)}
              disabled={personalImages.length >= 3}
            />

            {/* Personal Previews */}
            {personalImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {personalImages.map((img) => (
                  <div key={img.id} className="relative aspect-square overflow-hidden rounded-xl border border-slate-200">
                    <img src={img.preview} alt="Personal preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id, setPersonalImages)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Zone 2: Vehicle Images */}
          <div>
            <label
              htmlFor="upload-vehicle"
              className={`flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-5 transition-all cursor-pointer ${vehicleImages.length >= 2 ? "border-slate-200 bg-slate-50 opacity-60 pointer-events-none" : "border-slate-300 bg-slate-50 hover:bg-slate-100 hover:border-[#2563EB]"
                }`}
            >
              <div className="text-center">
                <p className="text-sm font-semibold text-slate-900">
                  Tải lên ảnh Xe ({vehicleImages.length}/2)
                </p>
                <p className="mt-1 text-xs text-slate-500">Toàn cảnh, Biển số</p>
              </div>
            </label>
            <input
              id="upload-vehicle"
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={(e) => handleImageUpload(e, vehicleImages, setVehicleImages, 2)}
              disabled={vehicleImages.length >= 2}
            />

            {/* Vehicle Previews */}
            {vehicleImages.length > 0 && (
              <div className="mt-3 grid grid-cols-2 gap-2">
                {vehicleImages.map((img) => (
                  <div key={img.id} className="relative aspect-[3/2] overflow-hidden rounded-xl border border-slate-200">
                    <img src={img.preview} alt="Vehicle preview" className="h-full w-full object-cover" />
                    <button
                      type="button"
                      onClick={() => handleRemoveImage(img.id, setVehicleImages)}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {imageErrors && (
            <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {imageErrors}
            </p>
          )}
        </div>

        {/* Submit */}
        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading} // <--- Chỉ khóa nút khi đang loading
          className="mt-2 w-full rounded-xl bg-[#2563EB] px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#1D4ED8] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
              Đang tạo tài khoản…
            </span>
          ) : (
            "Đăng ký"
          )}
        </button>
      </form>

      <AuthDivider label="Hoặc tiếp tục với" />

      {/* Social sign up */}
      <SocialButton
        icon={<GoogleIcon />}
        onClick={() => {/* TODO: Google OAuth */ }}
        id="signup-google-btn"
      >
        Đăng ký bằng Google
      </SocialButton>
    </>
  );
}