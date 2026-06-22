import { Suspense } from "react";
import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { LoginForm } from "@/components/auth/LoginForm";

/**
 * Trang (Page) LoginPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/auth/login/page.tsx
 */
export default function LoginPage() {
  return (
    <AuthLayout>
      <AuthCard>
        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Chào mừng trở lại
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Đăng nhập vào <span className="font-semibold text-[#2563EB]">Auto Wash Pro</span>
          </p>
        </div>

        {/* Client-side form */}
        <Suspense fallback={<div className="h-40 flex items-center justify-center text-sm text-slate-500">Đang tải...</div>}>
          <LoginForm />
        </Suspense>

        {/* Sign up link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Chưa có tài khoản?{" "}
          <Link
            href="/auth/signup"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors"
          >
            Đăng ký
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
