import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { AuthCard } from "@/features/auth/components/auth-card";
import { SignupForm } from "@/features/auth/components/signup-form";

/**
 * Trang (Page) SignUpPage
 * 
 * Chức năng: Định nghĩa giao diện tuyến đường (Routing Page) cho hệ thống AutoWash Pro.
 * Đường dẫn tương đối: src/app/app/sign-up/page.tsx
 */
export default function SignUpPage() {
  return (
    <AuthLayout>
      <AuthCard>
        {/* Header */}
        <div className="mb-7 text-left">
          <Link
            href="/sign-in"
            aria-label="Quay lại đăng nhập"
            className="mb-8 inline-flex h-9 w-9 items-center justify-center rounded-full text-[#d8bd84] transition-colors hover:bg-white/5 hover:text-[#f0d89f]"
          >
            <ArrowLeft size={22} aria-hidden />
          </Link>

          <h1 className="text-[clamp(2.15rem,3.8vw,3rem)] font-semibold leading-none tracking-normal text-[#f7efe3]">
            Tạo tài khoản
          </h1>
          <p className="mt-4 text-base text-[#c8c0b4]">
            Đã có tài khoản?{" "}
            <Link
              href="/sign-in"
              className="font-medium text-[#d8bd84] underline underline-offset-4 transition-colors hover:text-[#f0d89f]"
            >
              Đăng nhập
            </Link>
          </p>
        </div>

        {/* Client-side form & social signup */}
        <SignupForm />

      </AuthCard>
    </AuthLayout>
  );
}
