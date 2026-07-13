import type { Metadata } from "next";

import { AuthCard } from "@/features/auth/components/auth-card";
import { AuthLayout } from "@/features/auth/components/auth-layout";
import { RecoveryPageHeader } from "@/features/auth/forgot-password/components/recovery-page-header";
import { ResetPasswordForm } from "@/features/auth/forgot-password/components/reset-password-form";

export const metadata: Metadata = {
  title: "Đặt lại mật khẩu | AutoWash Pro",
  description: "Tạo mật khẩu mới cho tài khoản AutoWash Pro.",
};

export default function ResetPasswordPage() {
  return (
    <AuthLayout>
      <AuthCard>
        <RecoveryPageHeader
          backHref="/forgot-password"
          backLabel="Bắt đầu lại quá trình khôi phục"
          title="Tạo mật khẩu mới"
          description="Chọn mật khẩu an toàn và khác với mật khẩu bạn đã sử dụng trước đây."
        />
        <ResetPasswordForm />
      </AuthCard>
    </AuthLayout>
  );
}
