import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { LoginForm } from "@/features/auth/components/login-form";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";

/**
 * Trang (Page) LoginPage
 *
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/sign-in/page.tsx
 */
export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard>
        {/* Header */}
        <div className="mb-8 text-left">
          <Link
            href="/"
            aria-label="Quay lại trang chủ"
            className="mb-10 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#d8bd84] transition-colors hover:bg-white/5 hover:text-[#f0d89f]"
          >
            <ArrowLeft size={20} aria-hidden />
          </Link>

          <h1 className="text-[clamp(2.35rem,4.2vw,3.35rem)] font-semibold leading-none tracking-normal text-[#f7efe3]">
            Đăng nhập
          </h1>
          <p className="mt-4 text-base text-[#c8c0b4]">
            Chưa có tài khoản?{" "}
            <Link
              href="/sign-up"
              className="font-medium text-[#d8bd84] underline underline-offset-4 transition-colors hover:text-[#f0d89f]"
            >
              Tạo tài khoản
            </Link>
          </p>
        </div>

        {/* Client-side form */}
        <Suspense
          fallback={
            <div className="h-40 flex items-center justify-center text-sm text-slate-500">
              Đang tải...
            </div>
          }
        >
          <LoginForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
