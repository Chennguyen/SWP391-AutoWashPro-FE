import Link from "next/link";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { AuthCard } from "@/components/auth/AuthCard";
import { SignupForm } from "@/components/auth/SignupForm";

/**
 * Trang (Page) SignUpPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/auth/signup/page.tsx
 */
export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthCard>
        {/* Header */}
        <div className="mb-7 text-center">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Tạo tài khoản
          </h1>
          <p className="mt-1.5 text-sm text-gray-500">
            Bắt đầu đặt lịch rửa xe thông minh
          </p>
        </div>

        {/* Client-side form & social signup */}
        <SignupForm />

        {/* Login link */}
        <p className="mt-6 text-center text-sm text-gray-500">
          Đã có tài khoản?{" "}
          <Link
            href="/auth/login"
            className="font-semibold text-[#2563EB] hover:text-[#1D4ED8] hover:underline transition-colors"
          >
            Đăng nhập
          </Link>
        </p>
      </AuthCard>
    </AuthLayout>
  );
}
