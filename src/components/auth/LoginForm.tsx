"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { AuthInput } from "@/components/auth/AuthInput";
import { loginUser } from "@/lib/api/auth";
import { ApiError } from "@/lib/api/api-error";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Show success toast if redirected from signup
  const justRegistered = searchParams.get("registered") === "1";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; global?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate() {
    const newErrors: typeof errors = {};
    if (!email.trim()) newErrors.email = "Vui lòng nhập email.";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
      newErrors.email = "Email không hợp lệ.";
    if (!password) newErrors.password = "Vui lòng nhập mật khẩu.";
    else if (password.length < 6) newErrors.password = "Mật khẩu phải từ 6 ký tự.";
    return newErrors;
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
      const result = await loginUser(email, password);

      if (result.data?.access_token) {
        const token = result.data.access_token;
        localStorage.setItem("token", token);

        // Decode JWT payload (middle part of the token)
        try {
          const payloadBase64 = token.split(".")[1];
          // Fix base64 padding and decode
          const base64 = payloadBase64.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
          }).join(''));
          const decoded = JSON.parse(jsonPayload);

          const role = decoded["Role"] || decoded["http://schemas.microsoft.com/ws/2008/06/identity/claims/role"];
          const userId = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"];
          const userEmail = decoded["http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"];

          if (role) localStorage.setItem("role", role);
          if (userId) localStorage.setItem("userId", userId);
          if (userEmail) localStorage.setItem("email", userEmail);

          // Redirect based on role
          if (role?.toLowerCase() === "admin") {
            router.push("/admin/dashboard");
          } else {
            router.push("/customer");
          }
        } catch (e) {
          console.error("Failed to parse JWT token", e);
          router.push("/customer"); // default fallback
        }
      }
    } catch (err) {
      if (err instanceof ApiError) {
        // 401 — wrong credentials: highlight both fields
        if (err.status === 401) {
          setErrors({ email: " ", password: err.message });
        } else {
          setErrors({ global: err.message });
        }
      } else {
        setErrors({ global: "Không thể kết nối đến máy chủ. Vui lòng thử lại." });
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Success banner after signup redirect */}
      {justRegistered && (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700"
        >
          <svg className="w-4 h-4 mt-0.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
          </svg>
          <span>Đăng ký thành công! Đăng nhập để tiếp tục.</span>
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (errors.email) setErrors((prev) => ({ ...prev, email: undefined }));
          }}
          error={errors.email?.trim() ? errors.email : undefined}
        />

        <AuthInput
          id="login-password"
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          value={password}
          onChange={(e) => {
            setPassword(e.target.value);
            if (errors.password) setErrors((prev) => ({ ...prev, password: undefined }));
          }}
          error={errors.password}
          rightLabel={
            <Link href="#" className="hover:underline">
              Quên mật khẩu?
            </Link>
          }
        />

        {/* Global error (server 500, network, etc.) */}
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

        {/* Submit */}
        <button
          id="login-submit-btn"
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
              Đang đăng nhập…
            </span>
          ) : (
            "Đăng nhập"
          )}
        </button>
      </form>
    </>
  );
}
