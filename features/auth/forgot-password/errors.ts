import { ApiError } from "@/lib/api-error";

const MESSAGE_MAP: Array<[string, string]> = [
  ["email does not exist", "Email này không tồn tại trong hệ thống."],
  ["invalid or expired otp", "Mã OTP không đúng hoặc đã hết hạn."],
  [
    "otp request limit exceeded",
    "Bạn đã yêu cầu OTP quá nhiều lần. Vui lòng thử lại sau.",
  ],
  ["account is inactive", "Tài khoản hiện không hoạt động."],
  [
    "confirm password does not match",
    "Mật khẩu xác nhận không khớp.",
  ],
  [
    "invalid or expired reset password token",
    "Phiên đặt lại mật khẩu không hợp lệ hoặc đã hết hạn.",
  ],
  ["invalid token purpose", "Phiên đặt lại mật khẩu không hợp lệ."],
  ["invalid token subject", "Phiên đặt lại mật khẩu không hợp lệ."],
];

export function getRecoveryErrorMessage(
  error: unknown,
  fallback: string,
): string {
  const message =
    error instanceof ApiError || error instanceof Error ? error.message : "";
  const normalizedMessage = message.trim().toLowerCase();

  const mappedMessage = MESSAGE_MAP.find(([fragment]) =>
    normalizedMessage.includes(fragment),
  )?.[1];

  return mappedMessage ?? (message.trim() || fallback);
}

export function isOtpVerificationError(error: unknown): boolean {
  return (
    error instanceof ApiError &&
    error.message.toLowerCase().includes("invalid or expired otp")
  );
}

export function isInvalidRecoveryToken(error: unknown): boolean {
  if (!(error instanceof ApiError)) return false;

  const message = error.message.toLowerCase();
  return (
    error.status === 401 ||
    message.includes("reset password token") ||
    message.includes("invalid token purpose") ||
    message.includes("invalid token subject")
  );
}
