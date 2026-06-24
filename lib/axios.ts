import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiBase, ApiError } from "@/lib/api-error";

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
        const cleanToken = token.trim().replace(/^Bearer\s+/i, "").replace(/['"]/g, "");
        config.headers.Authorization = `Bearer ${cleanToken}`;
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response Interceptor: Chuẩn hóa lỗi theo mô hình ApiError hiện tại của dự án
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error: AxiosError) => {
    let message = "Đã xảy ra lỗi kết nối.";
    const status = error.response?.status ?? 500;
    const body = error.response?.data as any;

    if (body) {
      if (typeof body === "string" && body.trim()) {
        message = body;
      } else if (typeof body === "object" && body !== null) {
        // Parse lỗi ModelState/.NET Problem Details (errors, detail, message, title)
        const errorsObj = body.errors;
        let errorsStr = "";
        if (errorsObj && typeof errorsObj === "object") {
          errorsStr = Object.entries(errorsObj)
            .flatMap(([field, val]) => {
              if (Array.isArray(val)) {
                return val.map((m) => `${field}: ${String(m)}`);
              }
              return [`${field}: ${String(val)}`];
            })
            .filter(Boolean)
            .join(" ");
        }

        message = body.message ?? body.error ?? body.detail ?? errorsStr ?? body.title ?? `Lỗi ${status}`;
      }
    }

    if (status === 500 || message.toLowerCase().includes("unexpected error")) {
      message = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";
    }

    // Gắn cờ Unverified nếu backend trả về thông báo lỗi cụ thể
    if (message.includes("Only active and verified customer accounts")) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("is_unverified", "true");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    }

    // Ném ra đối tượng ApiError nguyên bản để tương thích với UI cũ
    return Promise.reject(new ApiError(message, status));
  }
);
