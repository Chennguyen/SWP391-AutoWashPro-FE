import { axiosInstance } from "@/lib/axios";

import {
  ForgotPasswordRequest,
  ForgotPasswordResponse,
  ResetPasswordRequest,
  ResetPasswordResponse,
  VerifyOtpRequest,
  VerifyOtpResponse,
} from "./types";

export const forgotPasswordService = {
  async forgotPassword(payload: ForgotPasswordRequest): Promise<ForgotPasswordResponse> {
    const response = await axiosInstance.post<ForgotPasswordResponse>(
      "/api/v1/auth/forgot-password",
      payload,
    );

    return response.data;
  },

  async verifyOtp(payload: VerifyOtpRequest): Promise<VerifyOtpResponse> {
    const response = await axiosInstance.post<VerifyOtpResponse>(
      "/api/v1/auth/verify-otp",
      payload,
    );

    return response.data;
  },

  async resetPassword(
    payload: ResetPasswordRequest,
  ): Promise<ResetPasswordResponse> {
    const response = await axiosInstance.post<ResetPasswordResponse>(
      "/api/v1/auth/reset-password",
      payload,
    );

    return response.data;
  },
};
