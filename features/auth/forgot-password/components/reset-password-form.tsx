"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";

import { AuthInput } from "@/features/auth/components/auth-input";

import {
  getRecoveryErrorMessage,
  isInvalidRecoveryToken,
} from "../errors";
import { useClientReady } from "../hooks/use-client-ready";
import { useResetPasswordMutation } from "../hooks/use-reset-password-mutation";
import {
  clearPasswordRecovery,
  getRecoveryToken,
} from "../session-storage";
import {
  ResetPasswordFields,
  resetPasswordSchema,
} from "../validations";
import { RecoveryFormLoading } from "./recovery-form-loading";
import { RecoveryNotice } from "./recovery-notice";
import { RecoverySubmitButton } from "./recovery-submit-button";

export function ResetPasswordForm() {
  const router = useRouter();
  const isClientReady = useClientReady();
  const resetPasswordToken = isClientReady ? getRecoveryToken() : null;
  const resetPasswordMutation = useResetPasswordMutation();
  const [hasCompletedReset, setHasCompletedReset] = useState(false);
  const [globalError, setGlobalError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<ResetPasswordFields>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    if (
      isClientReady &&
      !resetPasswordToken &&
      !hasCompletedReset
    ) {
      clearPasswordRecovery();
      router.replace("/forgot-password?reason=session-expired");
    }
  }, [hasCompletedReset, isClientReady, resetPasswordToken, router]);

  async function onSubmit(data: ResetPasswordFields) {
    if (!resetPasswordToken) return;
    setGlobalError(null);

    try {
      const response = await resetPasswordMutation.mutateAsync({
        resetPasswordToken,
        newPassword: data.newPassword,
        confirmPassword: data.confirmPassword,
      });

      if (!response.success) {
        throw new Error(response.message || "Không thể đặt lại mật khẩu.");
      }

      setHasCompletedReset(true);
      reset();
      clearPasswordRecovery();
      router.replace("/sign-in?reset=1");
    } catch (error) {
      if (isInvalidRecoveryToken(error)) {
        clearPasswordRecovery();
        router.replace("/forgot-password?reason=session-expired");
        return;
      }

      setGlobalError(
        getRecoveryErrorMessage(
          error,
          "Không thể đặt lại mật khẩu. Vui lòng thử lại.",
        ),
      );
    }
  }

  if (!isClientReady || !resetPasswordToken) {
    return <RecoveryFormLoading />;
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="flex flex-col gap-6"
    >
      <p
        id="reset-password-requirements"
        className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm leading-relaxed text-[#bdb5aa]"
      >
        Mật khẩu cần ít nhất 8 ký tự, gồm chữ thường, chữ hoa, số và ký tự
        đặc biệt trong @$!%*?&.
      </p>

      <AuthInput
        className="h-12"
        id="reset-new-password"
        label="Mật khẩu mới"
        type="password"
        placeholder="Nhập mật khẩu mới"
        autoComplete="new-password"
        error={errors.newPassword?.message}
        aria-invalid={Boolean(errors.newPassword)}
        aria-describedby={
          errors.newPassword
            ? "reset-password-requirements reset-new-password-error"
            : "reset-password-requirements"
        }
        {...register("newPassword")}
      />

      <AuthInput
        className="h-12"
        id="reset-confirm-password"
        label="Xác nhận mật khẩu"
        type="password"
        placeholder="Nhập lại mật khẩu mới"
        autoComplete="new-password"
        error={errors.confirmPassword?.message}
        aria-invalid={Boolean(errors.confirmPassword)}
        aria-describedby={
          errors.confirmPassword ? "reset-confirm-password-error" : undefined
        }
        {...register("confirmPassword")}
      />

      {globalError ? <RecoveryNotice>{globalError}</RecoveryNotice> : null}

      <RecoverySubmitButton
        id="reset-password-submit-btn"
        isPending={resetPasswordMutation.isPending}
        label="Đổi mật khẩu"
        pendingLabel="Đang cập nhật..."
      />
    </form>
  );
}
