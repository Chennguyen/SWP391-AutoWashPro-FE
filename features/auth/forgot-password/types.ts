export interface PasswordRecoveryApiResponse<TData> {
  success: boolean;
  message: string;
  data: TData;
  errors: unknown | null;
  traceId: string | null;
  timestampUtc: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export type ForgotPasswordResponse = PasswordRecoveryApiResponse<null>;

export interface VerifyOtpRequest {
  email: string;
  otp: string;
}

export interface VerifyOtpResponseData {
  resetPasswordToken: string;
}

export type VerifyOtpResponse =
  PasswordRecoveryApiResponse<VerifyOtpResponseData>;

export interface ResetPasswordRequest {
  resetPasswordToken: string;
  newPassword: string;
  confirmPassword: string;
}

export type ResetPasswordResponse = PasswordRecoveryApiResponse<null>;
