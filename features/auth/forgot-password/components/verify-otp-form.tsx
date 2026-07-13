"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthInput } from "@/features/auth/components/auth-input";

import {
  getRecoveryErrorMessage,
  isOtpVerificationError,
} from "../errors";
import { useClientReady } from "../hooks/use-client-ready";
import { useVerifyOtpMutation } from "../hooks/use-verify-otp-mutation";
import {
  clearPasswordRecovery,
  getRecoveryEmail,
  setRecoveryToken,
} from "../session-storage";
import { VerifyOtpFields, verifyOtpSchema } from "../validations";
import { RecoveryFormLoading } from "./recovery-form-loading";
import { RecoveryNotice } from "./recovery-notice";
import { RecoverySubmitButton } from "./recovery-submit-button";

export function VerifyOtpForm() {
  const router = useRouter();
  const isClientReady = useClientReady();
  const email = isClientReady ? getRecoveryEmail() : null;
  const verifyOtpMutation = useVerifyOtpMutation();
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<VerifyOtpFields>({
    resolver: zodResolver(verifyOtpSchema),
    defaultValues: { otp: "" },
  });

  useEffect(() => {
    if (isClientReady && !email) {
      clearPasswordRecovery();
      router.replace("/forgot-password?reason=missing-email");
    }
  }, [email, isClientReady, router]);

  async function onSubmit(data: VerifyOtpFields) {
    if (!email) return;
    setGlobalError(null);

    try {
      const response = await verifyOtpMutation.mutateAsync({
        email,
        otp: data.otp,
      });
      const resetPasswordToken = response.data?.resetPasswordToken;

      if (!response.success || !resetPasswordToken) {
        throw new Error(
          response.message || "Không nhận được token đặt lại mật khẩu.",
        );
      }

      if (!setRecoveryToken(resetPasswordToken)) {
        setGlobalError(
          "Trình duyệt không thể lưu phiên khôi phục. Vui lòng bật sessionStorage và thử lại.",
        );
        return;
      }

      router.push("/reset-password");
    } catch (error) {
      const message = getRecoveryErrorMessage(
        error,
        "Không thể xác minh mã OTP. Vui lòng thử lại.",
      );

      if (isOtpVerificationError(error)) {
        setError("otp", { message });
        return;
      }

      setGlobalError(message);
    }
  }

  if (!isClientReady || !email) {
    return <RecoveryFormLoading />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <RecoveryNotice tone="info">
        Mã xác minh đã được gửi đến <strong>{email}</strong>.
      </RecoveryNotice>

      <AuthInput
        className="h-12 text-center font-mono text-lg tracking-[0.35em]"
        id="verify-otp-code"
        label="Mã OTP"
        type="text"
        placeholder="000000"
        inputMode="numeric"
        autoComplete="one-time-code"
        maxLength={6}
        error={errors.otp?.message}
        aria-invalid={Boolean(errors.otp)}
        aria-describedby={errors.otp ? "verify-otp-code-error" : undefined}
        {...register("otp")}
      />

      {globalError ? <RecoveryNotice>{globalError}</RecoveryNotice> : null}

      <RecoverySubmitButton
        id="verify-otp-submit-btn"
        isPending={verifyOtpMutation.isPending}
        label="Xác minh OTP"
        pendingLabel="Đang xác minh..."
      />

      <p className="text-center text-xs text-[#9b9488]">
        Sai địa chỉ email?{" "}
        <Link
          href="/forgot-password"
          className="font-medium text-[#d8bd84] underline underline-offset-4 transition-colors hover:text-[#f0d89f]"
        >
          Nhập lại email
        </Link>
      </p>
    </form>
  );
}
