"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AuthInput } from "@/features/auth/components/auth-input";
import { ApiError } from "@/lib/api-error";
import { loginSchema, LoginFields } from "../validation/auth-validation";
import { useLogin } from "../hooks/useLogin";
import { Button } from "@/components/ui/button";

/**
 * Thành phần (Component) LoginForm
 * 
 * Chức năng: Đăng nhập hệ thống AutoWash Pro sử dụng React Hook Form + Zod & Zustand.
 */
export function LoginForm() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const justRegistered = searchParams.get("registered") === "1";
  const loginMutation = useLogin();

  const [globalError, setGlobalError] = useState<string | null>(null);

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

  const {
    register,
    handleSubmit,
    formState: { errors },
    setError,
  } = useForm<LoginFields>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  const isSubmitting = loginMutation.isPending;

  async function onSubmit(data: LoginFields) {
    setGlobalError(null);

    try {
      await loginMutation.mutateAsync(data);
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 401) {
          setError("password", { message: error.message });
          return;
        }

        if (error.status >= 500) {
          setGlobalError("Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.");
          return;
        }

        setGlobalError(error.message);
        return;
      }

      setGlobalError(error instanceof Error ? error.message : "Không thể kết nối đến máy chủ. Vui lòng thử lại.");
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
