"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";

import { AuthInput } from "@/features/auth/components/auth-input";

import { getRecoveryErrorMessage } from "../errors";
import { useForgotPasswordMutation } from "../hooks/use-forgot-password-mutation";
import { beginPasswordRecovery } from "../session-storage";
import {
  ForgotPasswordFields,
  forgotPasswordSchema,
} from "../validations";
import { RecoveryNotice } from "./recovery-notice";
import { RecoverySubmitButton } from "./recovery-submit-button";

const REDIRECT_MESSAGES: Record<string, string> = {
  "missing-email": "Vui lòng nhập lại email để bắt đầu phiên khôi phục mật khẩu.",
  "session-expired":
    "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu mã OTP mới.",
};

export function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const forgotPasswordMutation = useForgotPasswordMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const redirectReason = searchParams.get("reason") ?? "";
  const redirectMessage = REDIRECT_MESSAGES[redirectReason];

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ForgotPasswordFields>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  async function onSubmit(data: ForgotPasswordFields) {
    setGlobalError(null);

    try {
      const response = await forgotPasswordMutation.mutateAsync({
        email: data.email,
      });

      if (!response.success) {
        throw new Error(response.message || "Không thể gửi mã OTP.");
      }

      if (!beginPasswordRecovery(data.email)) {
        setGlobalError(
          "Trình duyệt không thể lưu phiên khôi phục. Vui lòng bật sessionStorage và thử lại.",
        );
        return;
      }

      router.push("/verify-otp");
    } catch (error) {
      setGlobalError(
        getRecoveryErrorMessage(
          error,
          "Không thể gửi mã OTP. Vui lòng thử lại.",
        ),
      );
    }
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      {redirectMessage ? (
        <RecoveryNotice tone="info">{redirectMessage}</RecoveryNotice>
      ) : null}

      <AuthInput
        className="h-12"
        id="forgot-password-email"
        label="Email"
        type="email"
        placeholder="ban@example.com"
        autoComplete="email"
        error={errors.email?.message}
        aria-invalid={Boolean(errors.email)}
        aria-describedby={
          errors.email ? "forgot-password-email-error" : undefined
        }
        {...register("email")}
      />

      {globalError ? <RecoveryNotice>{globalError}</RecoveryNotice> : null}

      <RecoverySubmitButton
        id="forgot-password-submit-btn"
        isPending={forgotPasswordMutation.isPending}
        label="Gửi mã OTP"
        pendingLabel="Đang gửi mã..."
      />
    </form>
  );
}
