"use client";

import { ChangeEvent, FormEvent, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AuthInput } from "@/components/auth/AuthInput";
import { registerUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/api-error";

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
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : "bg-gray-100"
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

/* ───── Types ───── */
type UploadedImage = {
  id: string;
  file: File;
  preview: string;
};

type FormFields = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  cccd: string;
  password: string;
  confirmPassword: string;
};

type FormErrors = Partial<FormFields & { faceImages: string; global: string }>;

function getFieldNameVietnamese(field: keyof FormFields): string {
  switch (field) {
    case "firstName": return "tên";
    case "lastName": return "họ";
    case "email": return "email";
    case "phone": return "số điện thoại";
    case "cccd": return "số CCCD";
    case "password": return "mật khẩu";
    case "confirmPassword": return "xác nhận mật khẩu";
    default: return "trường này";
  }
}

/* ───── Main Component ───── */
export function SignupForm() {
  const router = useRouter();

  const [form, setForm] = useState<FormFields>({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    cccd: "",
    password: "",
    confirmPassword: "",
  });

  const [errors, setErrors] = useState<FormErrors>({});
  const [faceImages, setFaceImages] = useState<UploadedImage[]>([]);
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  // Track blob URLs for cleanup to prevent memory leaks
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

  function handleChange(field: keyof FormFields) {
    return (e: ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setForm((prev) => ({ ...prev, [field]: val }));
      
      // Xử lý realtime viền đỏ (khi người dùng xóa trắng dữ liệu sau khi đã submit có lỗi)
      if (errors[field]) {
        const hasValue = field === "password" || field === "confirmPassword" ? val !== "" : val.trim() !== "";
        if (hasValue) {
          setErrors((prev) => ({ ...prev, [field]: undefined }));
        } else {
          setErrors((prev) => ({ ...prev, [field]: `Vui lòng nhập ${getFieldNameVietnamese(field)}.` }));
        }
      }
    };
  }

  function validate(): FormErrors {
    const errs: FormErrors = {};

    if (!form.firstName.trim()) errs.firstName = "Vui lòng nhập tên.";
    if (!form.lastName.trim()) errs.lastName = "Vui lòng nhập họ.";

    if (!form.email.trim()) errs.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      errs.email = "Email không hợp lệ.";

    if (!form.phone.trim()) errs.phone = "Vui lòng nhập số điện thoại.";
    else if (!/^(0|\+84)[0-9]{8,10}$/.test(form.phone.trim()))
      errs.phone = "Số điện thoại không hợp lệ.";

    if (!form.cccd.trim()) errs.cccd = "Vui lòng nhập số CCCD.";
    else if (!/^[0-9]{9,12}$/.test(form.cccd.trim()))
      errs.cccd = "Số CCCD phải từ 9–12 chữ số.";

    if (!form.password) errs.password = "Vui lòng nhập mật khẩu.";
    else if (form.password.length < 6) errs.password = "Mật khẩu phải từ 6 ký tự.";

    if (!form.confirmPassword) errs.confirmPassword = "Vui lòng xác nhận mật khẩu.";
    else if (form.confirmPassword !== form.password)
      errs.confirmPassword = "Mật khẩu không khớp.";

    if (faceImages.length < 3)
      errs.faceImages = `Vui lòng tải lên đủ 3 ảnh khuôn mặt (hiện tại: ${faceImages.length}/3).`;

    return errs;
  }

  function handleFaceImageUpload(e: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (!files.length) return;

    const remainingSlots = 3 - faceImages.length;
    const toAdd = files.slice(0, remainingSlots);

    const newImages: UploadedImage[] = toAdd.map((file) => {
      const preview = URL.createObjectURL(file);
      previewUrls.current.add(preview);
      return { id: Math.random().toString(36).slice(2), file, preview };
    });

    setFaceImages((prev) => [...prev, ...newImages]);
    if (errors.faceImages) setErrors((prev) => ({ ...prev, faceImages: undefined }));
    e.target.value = ""; // Reset input so the same file can be re-selected if removed
  }

  function handleRemoveFaceImage(id: string) {
    setFaceImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.preview);
        previewUrls.current.delete(img.preview);
      }
      return prev.filter((i) => i.id !== id);
    });
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setErrors({});
    setLoading(true);

    try {
      await registerUser({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
        cccd: form.cccd,
        faceImages: faceImages.map((img) => img.file),
      });

      // On success, show pending-approval modal instead of redirecting immediately
      setShowSuccessModal(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          // Trùng email — highlight ô email
          setErrors({ email: err.message });
        } else if (err.status >= 500) {
          // Che giấu lỗi 5xx khỏi người dùng cuối trên production
          setErrors({ global: "Đang xảy ra lỗi vui lòng quay lại sau" });
        } else {
          // Các lỗi server khác (400 validation, v.v.)
          setErrors({ global: err.message });
        }
      } else {
        setErrors({ global: "Không thể kết nối đến máy chủ. Vui lòng thử lại." });
      }
    } finally {
      setLoading(false);
    }
  }

  const canUploadMore = faceImages.length < 3;

  return (
    <>
      {/* ── Popup: Tài khoản chờ Admin duyệt ── */}
      {showSuccessModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="success-modal-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 text-center shadow-2xl">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-blue-50">
              <svg
                className="h-7 w-7 text-blue-600"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M9 12.75 11.25 15 15 9.75m-3-7.036A11.959 11.959 0 0 1 3.598 6 11.99 11.99 0 0 0 3 9.749c0 5.592 3.824 10.29 9 11.623 5.176-1.332 9-6.03 9-11.622 0-1.31-.21-2.571-.598-3.751h-.152c-3.196 0-6.1-1.248-8.25-3.285Z"
                />
              </svg>
            </div>

            <h3
              id="success-modal-title"
              className="text-lg font-bold text-slate-900"
            >
              Đăng ký thành công!
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Tài khoản của bạn đang chờ Admin xác minh tài khoản.
              Vui lòng đợi trong giây lát trước khi đăng nhập.
            </p>

            <button
              id="success-modal-confirm-btn"
              type="button"
              onClick={() => router.push("/auth/login?registered=1")}
              className="mt-5 w-full rounded-xl bg-[#CDB390] py-3 text-sm font-semibold text-white transition-all hover:bg-[#BCA27F] active:scale-[0.98]"
            >
              Tôi đã hiểu
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        {/* ── Họ & Tên ── */}
        <div className="grid grid-cols-2 gap-3">
          <AuthInput
            id="signup-last-name"
            label="Họ"
            type="text"
            placeholder="Nguyễn"
            autoComplete="family-name"
            value={form.lastName}
            onChange={handleChange("lastName")}
            error={errors.lastName}
            showRequiredAsterisk={!form.lastName.trim()}
          />
          <AuthInput
            id="signup-first-name"
            label="Tên"
            type="text"
            placeholder="Văn A"
            autoComplete="given-name"
            value={form.firstName}
            onChange={handleChange("firstName")}
            error={errors.firstName}
            showRequiredAsterisk={!form.firstName.trim()}
          />
        </div>

        {/* ── Email ── */}
        <AuthInput
          id="signup-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange("email")}
          error={errors.email}
          showRequiredAsterisk={!form.email.trim()}
        />

        {/* ── Số điện thoại ── */}
        <AuthInput
          id="signup-phone"
          label="Số điện thoại"
          type="tel"
          placeholder="0901234567"
          autoComplete="tel"
          value={form.phone}
          onChange={handleChange("phone")}
          error={errors.phone}
          showRequiredAsterisk={!form.phone.trim()}
        />

        {/* ── CCCD ── */}
        <AuthInput
          id="signup-cccd"
          label="Số CCCD / CMND"
          type="text"
          placeholder="012345678901"
          autoComplete="off"
          value={form.cccd}
          onChange={handleChange("cccd")}
          error={errors.cccd}
          showRequiredAsterisk={!form.cccd.trim()}
        />

        {/* ── Mật khẩu ── */}
        <div className="flex flex-col gap-1.5">
          <AuthInput
            id="signup-password"
            label="Mật khẩu"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            value={form.password}
            onChange={handleChange("password")}
            error={errors.password}
            showRequiredAsterisk={!form.password}
          />
          <PasswordStrength password={form.password} />
        </div>

        {/* ── Xác nhận mật khẩu ── */}
        <AuthInput
          id="signup-confirm-password"
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange("confirmPassword")}
          error={errors.confirmPassword}
          showRequiredAsterisk={!form.confirmPassword}
        />

        {/* ── Face Images Upload ── */}
        <div className="mt-2 flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-0.5">
              Ảnh khuôn mặt ({faceImages.length}/3)
              {faceImages.length < 3 && <span className="text-red-500 ml-1 font-semibold">*</span>}
            </p>
            <p className="text-xs text-slate-500 mb-3">
              Cần đúng 3 ảnh chân dung rõ mặt, góc chụp khác nhau. Dùng để xác thực danh tính khi đến rửa xe.
            </p>

            {/* Upload zone */}
            {canUploadMore && (
              <>
                <label
                  htmlFor="upload-face"
                  className="flex flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-slate-300 bg-slate-50 p-5 transition-all cursor-pointer hover:bg-slate-100 hover:border-[#2563EB]"
                >
                  <svg className="w-7 h-7 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 16.5V9.75m0 0 3 3m-3-3-3 3M6.75 19.5a4.5 4.5 0 0 1-1.41-8.775 5.25 5.25 0 0 1 10.338 0A4.5 4.5 0 0 1 17.25 19.5H6.75Z" />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-slate-700">
                      Nhấn để chọn ảnh
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">PNG, JPG tối đa 10 MB mỗi ảnh</p>
                  </div>
                </label>
                <input
                  id="upload-face"
                  type="file"
                  accept="image/*"
                  multiple
                  className="hidden"
                  onChange={handleFaceImageUpload}
                  disabled={!canUploadMore}
                />
              </>
            )}

            {/* Image previews */}
            {faceImages.length > 0 && (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {faceImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-slate-200"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={img.preview}
                      alt={`Ảnh khuôn mặt ${idx + 1}`}
                      className="h-full w-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => handleRemoveFaceImage(img.id)}
                      aria-label={`Xóa ảnh ${idx + 1}`}
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-slate-900/60 text-white hover:bg-slate-900 transition-colors"
                    >
                      <span className="text-xs" aria-hidden>✕</span>
                    </button>
                  </div>
                ))}

                {/* Placeholder slots for remaining images */}
                {Array.from({ length: 3 - faceImages.length }).map((_, i) => (
                  <label
                    key={`slot-${i}`}
                    htmlFor="upload-face"
                    className="aspect-square flex items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50 cursor-pointer hover:border-[#2563EB] transition-colors"
                  >
                    <span className="text-slate-300 text-xl" aria-hidden>+</span>
                  </label>
                ))}
              </div>
            )}

            {/* Face image error */}
            {errors.faceImages && (
              <p className="mt-2 rounded-xl bg-red-50 px-4 py-2.5 text-sm text-red-700">
                {errors.faceImages}
              </p>
            )}
          </div>
        </div>

        {/* ── Global error (network / server 400/500) ── */}
        {errors.global && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700"
          >
            <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
            <span>{errors.global}</span>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading}
          className="mt-2 w-full rounded-xl bg-[#CDB390] px-4 py-3.5 text-sm font-semibold tracking-wide text-white transition-all duration-200 hover:bg-[#BCA27F] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#CDB390]/40 disabled:cursor-not-allowed disabled:opacity-60 disabled:active:scale-100"
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
    </>
  );
}