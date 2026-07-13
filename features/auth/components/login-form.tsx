"use client";

import { Button } from "@/components/ui/button";
import { AuthInput } from "@/features/auth/components/auth-input";
import { ApiError } from "@/lib/api-error";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  ArrowRight,
  CircleCheckBig,
  LoaderCircle,
  TriangleAlert,
} from "lucide-react";
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
  const justResetPassword = searchParams.get("reset") === "1";
  const successMessage = justResetPassword
    ? "Đổi mật khẩu thành công! Bạn có thể đăng nhập bằng mật khẩu mới."
    : justRegistered
      ? "Đăng ký thành công! Đăng nhập để tiếp tục."
      : null;
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
      {successMessage ? (
        <div
          role="status"
          className="mb-5 flex items-start gap-2 rounded-2xl border border-emerald-400/25 bg-emerald-400/10 px-4 py-3 text-sm text-emerald-200"
        >
          <CircleCheckBig
            className="mt-0.5 size-4 shrink-0"
            aria-hidden="true"
          />
          <span>{successMessage}</span>
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
            <Link href="/forgot-password" className="hover:underline">
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
            <TriangleAlert
              className="mt-0.5 size-4 shrink-0"
              aria-hidden="true"
            />
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
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
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
            type="button"
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
