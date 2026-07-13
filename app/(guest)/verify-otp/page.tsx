import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RecoveryPageHeader } from "@/features/auth/forgot-password/components/recovery-page-header";
import { VerifyOtpForm } from "@/features/auth/forgot-password/components/verify-otp-form";

export const metadata: Metadata = {
  title: "Xác minh OTP | AutoWash Pro",
  description: "Xác minh mã OTP để tiếp tục đặt lại mật khẩu.",
};

export default function VerifyOtpPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <RecoveryPageHeader
          backHref="/forgot-password"
          backLabel="Quay lại nhập email"
          title="Xác minh OTP"
          description="Nhập mã gồm 6 chữ số đã được gửi đến email của bạn."
        />
        <VerifyOtpForm />
      </AuthCard>
    </AuthLayout>
  );
}
