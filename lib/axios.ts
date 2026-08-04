import { apiBase, ApiError, getApiErrorMessage } from "@/lib/api-error";
import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const axiosInstance = axios.create({
  baseURL: apiBase(),
  headers: {
    // defaults
  },
});

// Request Interceptor: Tự động đính kèm token nếu có
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== "undefined") {
      const token = window.localStorage.getItem("token");
      if (token) {
        const cleanToken = token
          .trim()
          .replace(/^Bearer\s+/i, "")
          .replace(/['"]/g, "");
        config.headers.Authorization = `Bearer ${cleanToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Response Interceptor: Chuẩn hóa lỗi theo mô hình ApiError hiện tại của dự án
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error: AxiosError) => {
    const status = error.response?.status ?? 500;
    const body = error.response?.data;
    const code = isRecord(body) && typeof body.code === "string" ? body.code : error.code;
    const message = getApiErrorMessage(body, status);

    // Gắn cờ Unverified nếu backend trả về thông báo lỗi cụ thể
    if (
      message.includes("Only active and verified customer accounts") ||
      message.includes("Tài khoản chưa được kích hoạt hoặc xác minh")
    ) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("is_unverified", "true");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    }

    // Ném ra đối tượng ApiError nguyên bản để tương thích với UI cũ
    return Promise.reject(new ApiError(message, status, code, body));
  },
);
