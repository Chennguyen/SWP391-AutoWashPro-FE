"use client";

import { Button } from "@/components/ui/button";
import { AuthInput } from "@/features/auth/components/auth-input";
import { ApiError } from "@/lib/api-error";
import { getTodayUtcDateString } from "@/lib/date-of-birth";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import { useRouter } from "next/navigation";
import { ChangeEvent, useEffect, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { useRegister } from "../hooks/useRegister";
import { SignupFields, signupSchema } from "../validation/auth-validation";

/* ───── Password strength indicator ───── */
function PasswordStrength({ password }: { password: string }) {
  if (!password) return null;

  let strength = 0;
  if (password.length >= 8) strength++;
  if (/[A-Z]/.test(password)) strength++;
  if (/[0-9]/.test(password)) strength++;
  if (/[^A-Za-z0-9]/.test(password)) strength++;

  const labels = ["Yếu", "Trung bình", "Khá", "Mạnh"];
  const colors = [
    "bg-red-400",
    "bg-orange-400",
    "bg-[#d8bd84]",
    "bg-emerald-400",
  ];
  const textColors = [
    "text-red-300",
    "text-orange-300",
    "text-[#d8bd84]",
    "text-emerald-300",
  ];

  return (
    <div className="mt-1.5">
      <div className="flex gap-1 mb-1">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-all duration-300 ${
              i < strength ? colors[strength - 1] : "bg-white/10"
            }`}
          />
        ))}
      </div>
      <p
        className={`text-xs font-medium ${textColors[strength - 1] ?? "text-gray-400"}`}
      >
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

/* ───── Main Component ───── */
export function SignupForm() {
  const router = useRouter();
  const registerMutation = useRegister();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      const role = window.localStorage.getItem("role");
      if (token) {
        if (role?.toLowerCase() === "admin") {
          router.replace("/admin");
        } else {
          router.replace("/customer");
        }
      }
    }
  }, [router]);

  const [faceImages, setFaceImages] = useState<UploadedImage[]>([]);
  const [faceImagesError, setFaceImagesError] = useState<string | null>(null);
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [maxDateOfBirth] = useState(getTodayUtcDateString);

  const {
    register,
    handleSubmit,
    watch,
    setError,
    formState: { errors },
  } = useForm<SignupFields>({
    resolver: zodResolver(signupSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      phone: "",
      dateOfBirth: "",
      password: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("password");

  // Track blob URLs for cleanup to prevent memory leaks
  const previewUrls = useRef(new Set<string>());

  useEffect(() => {
    return () => {
      previewUrls.current.forEach((url) => URL.revokeObjectURL(url));
      previewUrls.current.clear();
    };
  }, []);

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

    const updated = [...faceImages, ...newImages];
    setFaceImages(updated);
    if (updated.length >= 3) {
      setFaceImagesError(null);
    }
    e.target.value = ""; // Reset input so the same file can be re-selected if removed
  }

  function handleRemoveFaceImage(id: string) {
    setFaceImages((prev) => {
      const img = prev.find((i) => i.id === id);
      if (img) {
        URL.revokeObjectURL(img.preview);
        previewUrls.current.delete(img.preview);
      }
      const filtered = prev.filter((i) => i.id !== id);
      if (filtered.length < 3) {
        setFaceImagesError(
          `Vui lòng tải lên đủ 3 ảnh khuôn mặt (hiện tại: ${filtered.length}/3).`,
        );
      }
      return filtered;
    });
  }

  const isSubmitting = registerMutation.isPending;

  async function onSubmit(data: SignupFields) {
    setGlobalError(null);

    // Validate face images manually
    if (faceImages.length < 3) {
      setFaceImagesError(
        `Vui lòng tải lên đủ 3 ảnh khuôn mặt (hiện tại: ${faceImages.length}/3).`,
      );
      return;
    }

    try {
      await registerMutation.mutateAsync({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        dateOfBirth: data.dateOfBirth || undefined,
        faceImages: faceImages.map((img) => img.file),
      });

      // On success, show pending-approval modal instead of redirecting immediately
      setShowSuccessModal(true);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) {
          const msg = err.message.toLowerCase();
          if (msg.includes("số điện thoại") || msg.includes("phone")) {
            setError("phone", { message: err.message });
          } else {
            setError("email", { message: err.message });
          }
        } else if (err.status >= 500) {
          setGlobalError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
        } else {
          setGlobalError(err.message);
        }
      } else {
        setGlobalError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
      }
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
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm"
        >
          <div className="w-full max-w-sm rounded-[28px] border border-[#d8bd84]/45 bg-[#12110f] p-6 text-center shadow-[0_26px_80px_rgba(0,0,0,0.7)]">
            {/* Icon */}
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[#d8bd84]/35 bg-[#d8bd84]/12">
              <svg
                className="h-7 w-7 text-[#d8bd84]"
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
              className="text-lg font-bold text-[#f7efe3]"
            >
              Đăng ký thành công!
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-[#b8afa2]">
              Tài khoản của bạn đang chờ Admin xác minh tài khoản. Vui lòng đợi
              trong giây lát trước khi đăng nhập.
            </p>

            <button
              id="success-modal-confirm-btn"
              type="button"
              onClick={() => router.push("/sign-in?registered=1")}
              className="mt-5 h-12 w-full rounded-full bg-[linear-gradient(180deg,#f0d89f_0%,#c8a35f_100%)] text-sm font-semibold text-[#0b0906] transition-all hover:brightness-110 active:scale-[0.98]"
            >
              Tôi đã hiểu
            </button>
          </div>
        </div>
      )}

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-4"
      >
        {/* ── Họ & Tên ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:gap-3">
          <AuthInput
            className="h-11"
            id="signup-last-name"
            label="Họ"
            type="text"
            placeholder="Nguyễn"
            autoComplete="family-name"
            error={errors.lastName?.message}
            {...register("lastName")}
          />
          <AuthInput
            className="h-11"
            id="signup-first-name"
            label="Tên"
            type="text"
            placeholder="Văn A"
            autoComplete="given-name"
            error={errors.firstName?.message}
            {...register("firstName")}
          />
        </div>

        {/* ── Email ── */}
        <AuthInput
          className="h-11"
          id="signup-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        {/* ── Số điện thoại ── */}
        <AuthInput
          className="h-11"
          id="signup-phone"
          label="Số điện thoại"
          type="tel"
          placeholder="0901234567"
          autoComplete="tel"
          error={errors.phone?.message}
          {...register("phone")}
        />

        {/* ── Ngày sinh ── */}
        <AuthInput
          className="h-11 scheme-dark"
          id="signup-date-of-birth"
          label="Ngày sinh"
          rightLabel="Không bắt buộc"
          description="Nếu cung cấp, ngày sinh sẽ không thể tự chỉnh sửa sau khi đăng ký."
          type="date"
          autoComplete="bday"
          max={maxDateOfBirth}
          error={errors.dateOfBirth?.message}
          {...register("dateOfBirth")}
        />

        {/* ── Mật khẩu & Xác nhận mật khẩu ── */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 sm:items-start sm:gap-3">
          <div className="flex flex-col gap-1.5">
            <AuthInput
              className="h-11"
              id="signup-password"
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              autoComplete="new-password"
              error={errors.password?.message}
              {...register("password")}
            />
            <PasswordStrength password={passwordVal} />
          </div>

          <AuthInput
            className="h-11"
            id="signup-confirm-password"
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="••••••••"
            autoComplete="new-password"
            error={errors.confirmPassword?.message}
            {...register("confirmPassword")}
          />
        </div>

        {/* ── Face Images Upload ── */}
        <div className="mt-1 flex flex-col gap-2.5 rounded-[24px] border border-white/15 bg-white/[0.03] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-4">
          <div>
            <p className="mb-0.5 text-sm font-semibold text-[#f3eadc]">
              Ảnh khuôn mặt ({faceImages.length}/3)
              {faceImages.length < 3 && (
                <span className="text-red-500 ml-1 font-semibold">*</span>
              )}
            </p>
            <p className="mb-2 text-xs leading-relaxed text-[#9b9488]">
              Cần đúng 3 ảnh chân dung rõ mặt, góc chụp khác nhau. Dùng để xác
              thực danh tính khi đến rửa xe.
            </p>

            {/* Upload zone */}
            {canUploadMore && (
              <>
                <label
                  htmlFor="upload-face"
                  className="flex cursor-pointer flex-col items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[#d8bd84]/35 bg-black/15 p-3.5 transition-all hover:border-[#d8bd84] hover:bg-[#d8bd84]/8"
                >
                  <svg
                    className="h-6 w-6 text-[#d8bd84]"
                    fill="currentColor"
                    viewBox="0 0 16 16"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"
                    />
                    <path
                      fillRule="evenodd"
                      d="M8 12a.5.5 0 0 0 .5-.5V5.707l2.146 2.147a.5.5 0 0 0 .708-.708l-3-3a.5.5 0 0 0-.708 0l-3 3a.5.5 0 1 0 .708.708L7.5 5.707V11.5a.5.5 0 0 0 .5.5z"
                    />
                  </svg>
                  <div className="text-center">
                    <p className="text-sm font-semibold text-[#f3eadc]">
                      Nhấn để chọn ảnh
                    </p>
                    <p className="mt-0.5 text-xs text-[#8f887e]">
                      PNG, JPG tối đa 10 MB mỗi ảnh
                    </p>
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
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {faceImages.map((img, idx) => (
                  <div
                    key={img.id}
                    className="relative aspect-square overflow-hidden rounded-xl border border-white/15"
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
                      className="absolute right-1 top-1 flex h-6 w-6 items-center justify-center rounded-full bg-black/70 text-white transition-colors hover:bg-black"
                    >
                      <span className="text-xs" aria-hidden>
                        ✕
                      </span>
                    </button>
                  </div>
                ))}

                {/* Placeholder slots for remaining images */}
                {Array.from({ length: 3 - faceImages.length }).map((_, i) => (
                  <label
                    key={`slot-${i}`}
                    htmlFor="upload-face"
                    className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-white/15 bg-black/15 transition-colors hover:border-[#d8bd84]"
                  >
                    <span className="text-xl text-[#d8bd84]" aria-hidden>
                      +
                    </span>
                  </label>
                ))}
              </div>
            )}

            {/* Face image error */}
            {faceImagesError && (
              <p className="mt-2 rounded-2xl border border-red-400/25 bg-red-400/10 px-4 py-2.5 text-sm text-red-200">
                {faceImagesError}
              </p>
            )}
          </div>
        </div>

        {/* ── Global error (network / server 400/500) ── */}
        {globalError && (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
          >
            <svg
              className="w-4 h-4 mt-0.5 shrink-0"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
              />
            </svg>
            <span>{globalError}</span>
          </div>
        )}

        {/* ── Submit ── */}
        <Button
          id="signup-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="mt-1 h-12 w-full rounded-full border-0 bg-[linear-gradient(180deg,#f0d89f_0%,#c8a35f_100%)] text-base font-semibold tracking-normal text-[#0b0906] shadow-[0_18px_40px_rgba(188,163,116,0.18)] transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:opacity-70"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="h-4 w-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
                aria-hidden="true"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8v8H4z"
                />
              </svg>
              Đang tạo tài khoản…
            </span>
          ) : (
            <span className="flex items-center justify-center gap-5">
              Đăng ký
              <ArrowRight size={22} aria-hidden />
            </span>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-[#9b9488]">
          Đã có tài khoản?{" "}
          <Button
            variant="link"
            onClick={() => router.push("/sign-in")}
            className="text-[#d8bd84] underline underline-offset-4 transition-colors hover:text-[#f0d89f]"
          >
            Đăng nhập
          </Button>
        </p>
      </form>
    </>
  );
}
