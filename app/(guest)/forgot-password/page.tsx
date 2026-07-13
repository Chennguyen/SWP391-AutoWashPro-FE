import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { ForgotPasswordForm } from "@/features/auth/forgot-password/components/forgot-password-form";
import { RecoveryFormLoading } from "@/features/auth/forgot-password/components/recovery-form-loading";
import { RecoveryPageHeader } from "@/features/auth/forgot-password/components/recovery-page-header";

export const metadata: Metadata = {
  title: "Quên mật khẩu | AutoWash Pro",
  description: "Yêu cầu mã OTP để khôi phục mật khẩu AutoWash Pro.",
};

export default function ForgotPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <RecoveryPageHeader
          backHref="/sign-in"
          backLabel="Quay lại đăng nhập"
          title="Quên mật khẩu"
          description="Nhập email đã đăng ký để nhận mã xác minh và tạo mật khẩu mới."
        />

        <Suspense fallback={<RecoveryFormLoading />}>
          <ForgotPasswordForm />
        </Suspense>
      </AuthCard>
    </AuthLayout>
  );
}
