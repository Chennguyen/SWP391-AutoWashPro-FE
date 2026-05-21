"use client";

import { useState, FormEvent } from "react";
import { AuthInput } from "@/components/auth/AuthInput";
import { SocialButton } from "@/components/auth/SocialButton";
import { AuthDivider } from "@/components/auth/AuthDivider";

/* ───── Google icon SVG ───── */
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
      <path
        d="M17.64 9.205c0-.639-.057-1.252-.164-1.841H9v3.481h4.844a4.14 4.14 0 0 1-1.796 2.716v2.259h2.908c1.702-1.567 2.684-3.875 2.684-6.615Z"
        fill="#4285F4"
      />
      <path
        d="M9 18c2.43 0 4.467-.806 5.956-2.18l-2.908-2.259c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18Z"
        fill="#34A853"
      />
      <path
        d="M3.964 10.71A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.71V4.958H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.042l3.007-2.332Z"
        fill="#FBBC05"
      />
      <path
        d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.958L3.964 7.29C4.672 5.163 6.656 3.58 9 3.58Z"
        fill="#EA4335"
      />
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

export function SignupForm() {
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });
  const [errors, setErrors] = useState<Partial<typeof form>>({});
  const [loading, setLoading] = useState(false);

  function handleChange(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [field]: e.target.value }));
      // Clear error on change
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

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }
    setErrors({});
    setLoading(true);
    // TODO: connect to auth API
    setTimeout(() => setLoading(false), 1500);
  }

  return (
    <>
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="signup-name"
          label="Họ tên"
          type="text"
          placeholder="Nguyễn Văn A"
          autoComplete="name"
          value={form.name}
          onChange={handleChange("name")}
          error={errors.name}
        />

        <AuthInput
          id="signup-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          value={form.email}
          onChange={handleChange("email")}
          error={errors.email}
        />

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
          />
          <PasswordStrength password={form.password} />
        </div>

        <AuthInput
          id="signup-confirm-password"
          label="Xác nhận mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="new-password"
          value={form.confirmPassword}
          onChange={handleChange("confirmPassword")}
          error={errors.confirmPassword}
        />

        {/* Submit */}
        <button
          id="signup-submit-btn"
          type="submit"
          disabled={loading}
          className="mt-1 w-full rounded-xl bg-[#2563EB] px-4 py-3.5 text-sm font-semibold text-white tracking-wide transition-all duration-200 hover:bg-[#1D4ED8] active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-[#2563EB]/40 disabled:opacity-60 disabled:cursor-not-allowed disabled:active:scale-100"
        >
          {loading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none" aria-hidden="true">
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
        onClick={() => {/* TODO: Google OAuth */}}
        id="signup-google-btn"
      >
        Đăng ký bằng Google
      </SocialButton>
    </>
  );
}
