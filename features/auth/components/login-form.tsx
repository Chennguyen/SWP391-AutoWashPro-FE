"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { AuthInput } from "@/features/auth/components/auth-input";
import { ApiError } from "@/lib/api-error";
import { loginUser } from "@/features/auth/services";
import { useAuthStore } from "@/stores/auth-store";
import { Button } from "@/components/ui/button";

const loginSchema = z.object({
  email: z
    .string()
    .min(1, "Vui lòng nhập email.")
    .email("Email không hợp lệ."),
  password: z
    .string()
    .min(1, "Vui lòng nhập mật khẩu.")
    .min(6, "Mật khẩu phải từ 6 ký tự."),
});

type LoginFields = z.infer<typeof loginSchema>;

type JwtPayload = {
  Role?: string;
  role?: string;
  email?: string;
  sub?: string;
  nameid?: string;
  "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"?: string;
  "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"?: string;
};

function decodeJwtPayload(token: string): JwtPayload | null {
  const payload = token.split(".")[1];
  if (!payload) return null;

  try {
    const base64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = base64.padEnd(
      base64.length + ((4 - (base64.length % 4)) % 4),
      "=",
    );
    const json = decodeURIComponent(
      window
        .atob(padded)
        .split("")
        .map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`)
        .join(""),
    );

    return JSON.parse(json) as JwtPayload;
  } catch {
    return null;
  }
}

function getRole(payload: JwtPayload | null) {
  return (
    payload?.Role ??
    payload?.role ??
    payload?.[
      "http://schemas.microsoft.com/ws/2008/06/identity/claims/role"
    ] ??
    ""
  );
}

/**
 * Thành phần (Component) LoginForm
 * 
 * Chức năng: Đăng nhập hệ thống AutoWash Pro sử dụng React Hook Form + Zod & Zustand.
 */
export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const setAuthData = useAuthStore((state) => state.setAuthData);

  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
    setError,
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(data: LoginFields) {
    setGlobalError(null);

    try {
      const result = await loginUser(data.email, data.password);

      const token =
        result.data?.access_token ??
        result.data?.Access_token ??
        result.data?.accessToken;

      if (!token) {
        setGlobalError("Không nhận được token đăng nhập.");
        return;
      }

      const payload = decodeJwtPayload(token);
      const role = getRole(payload);
      const userId =
        payload?.sub ??
        payload?.nameid ??
        payload?.[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/nameidentifier"
        ];
      const emailAddress =
        payload?.email ??
        payload?.[
          "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress"
        ];

      // Lưu trạng thái qua Zustand (tự động đồng bộ localStorage)
      setAuthData({
        token,
        role,
        userId,
        email: emailAddress,
      });

      // Làm mới cache router trước khi chuyển trang
      router.refresh();

      if (role.toLowerCase() === "admin") {
        router.replace("/admin");
        return;
      }

      router.replace("/customer");
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setError("password", { message: error.message });
          return;
        }

        if (error.status >= 500) {
          setGlobalError("Đang xảy ra lỗi vui lòng quay lại sau");
          return;
        }

        setGlobalError(error.message);
        return;
      }

      setGlobalError("Không thể kết nối đến máy chủ. Vui lòng thử lại.");
    }
  }

  return (
    <>
      {justRegistered ? (
        <div
          role="status"
          className="mb-4 flex items-start gap-2 rounded-xl border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700"
        >
          <svg
            className="mt-0.5 h-4 w-4 shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z"
            />
          </svg>
          <span>Đăng ký thành công! Đăng nhập để tiếp tục.</span>
        </div>
      ) : null}

      <form onSubmit={handleSubmit(onSubmit)} noValidate className="flex flex-col gap-4">
        <AuthInput
          id="login-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthInput
          id="login-password"
          label="Mật khẩu"
          type="password"
          placeholder="••••••••"
          autoComplete="current-password"
          error={errors.password?.message}
          rightLabel={
            <Link href="#" className="hover:underline">
              Quên mật khẩu?
            </Link>
          }
          {...register("password")}
        />

        {globalError ? (
          <div
            role="alert"
            className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            <svg
              className="mt-0.5 h-4 w-4 shrink-0"
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
        ) : null}

        <Button
          id="login-submit-btn"
          type="submit"
          disabled={isSubmitting}
          className="mt-1 w-full rounded-xl bg-[#CDB390] hover:bg-[#BCA27F] py-6 text-sm font-semibold tracking-wide text-white transition-all duration-200 active:scale-[0.98]"
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
                  d="M4 12a8 8 0 0 1 8-8v8H4z"
                />
              </svg>
              Đang đăng nhập...
            </span>
          ) : (
            "Đăng nhập"
          )}
        </Button>
      </form>
    </>
  );
}
