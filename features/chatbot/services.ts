import { ApiError } from "@/lib/api-error";
import { axiosInstance } from "@/lib/axios";
import type { chatbotRequest, chatbotResponse } from "./types";

function ensureUsableResponse(response: chatbotResponse): chatbotResponse {
  if (!response?.success || !response.data || typeof response.data.answer !== "string") {
    throw new ApiError("Phản hồi trợ lý không hợp lệ.", 502);
  }

  if (!response.data.answer.trim()) {
    throw new ApiError("Trợ lý chưa có câu trả lời. Vui lòng thử lại.", 502);
  }

  return response;
}

export const AIService = {
  /** Sends one non-streaming message using the API contract in ./types.ts. */
  async sendRequest(payload: chatbotRequest): Promise<chatbotResponse> {
    const response = await axiosInstance.post<chatbotResponse>(
      "/api/v1/chat",
      payload,
      { timeout: 20_000 },
    );

    return ensureUsableResponse(response.data);
  },
};
