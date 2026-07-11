"use client";

import { Button } from "@/components/ui/button";
import { AuthInput } from "@/features/auth/components/auth-input";
import { ApiError } from "@/lib/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { useLogin } from "../hooks/useLogin";
import { LoginFields, loginSchema } from "../validation/auth-validation";

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

      setGlobalError(
        error instanceof Error
          ? error.message
          : "Không thể kết nối đến máy chủ. Vui lòng thử lại.",
      );
    }
  }

  return (
    <>
      {justRegistered ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
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

      <form
        onSubmit={handleSubmit(onSubmit)}
        noValidate
        className="flex flex-col gap-6"
      >
        <AuthInput
          className="h-10"
          id="login-email"
          label="Email"
          type="email"
          placeholder="ban@example.com"
          autoComplete="email"
          error={errors.email?.message}
          {...register("email")}
        />

        <AuthInput
          className="h-10"
          id="login-password"
          label="Mật khẩu"
          type="password"
          placeholder="Nhập mật khẩu"
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
            className="flex items-start gap-2 rounded-2xl border border-red-400/30 bg-red-400/10 px-4 py-3 text-sm text-red-200"
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
          className="h-12 w-full rounded-full bg-[#d8bd84] !text-[#0e0e10] transition-colors hover:bg-[#f0d89f]"
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2 !text-[#0e0e10]">
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
            <span className="flex items-center justify-center gap-5 !text-[#0e0e10]">
              Đăng nhập
              <ArrowRight size={22} aria-hidden />
            </span>
          )}
        </Button>
        <p className="mt-2 text-center text-xs text-[#9b9488]">
          Chưa có tài khoản?{" "}
          <Button
            variant="link"
            onClick={() => router.push("/sign-up")}
            className="text-[#d8bd84] underline underline-offset-4 transition-colors hover:text-[#f0d89f]"
          >
            Đăng kí
          </Button>
        </p>
      </form>
    </>
  );
}
