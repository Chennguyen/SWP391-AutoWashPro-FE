import axios, { AxiosError, InternalAxiosRequestConfig } from "axios";
import { apiBase, ApiError, translateErrorMessage } from "@/lib/api-error";

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
    const body: unknown = error.response?.data;
    const bodyRecord = isRecord(body) ? body : null;
    const errorsRecord =
      bodyRecord && isRecord(bodyRecord.errors) ? bodyRecord.errors : null;
    const code =
      typeof errorsRecord?.code === "string"
        ? errorsRecord.code
        : typeof bodyRecord?.code === "string"
          ? bodyRecord.code
          : undefined;

    if (body) {
      if (typeof body === "string" && body.trim()) {
        message = body;
      } else if (bodyRecord) {
        // Parse lỗi ModelState/.NET Problem Details (errors, detail, message, title)
        const errorsObj = bodyRecord.errors;
        let errorsStr = "";
        if (isRecord(errorsObj)) {
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

        const messageValue =
          bodyRecord.message ??
          bodyRecord.error ??
          bodyRecord.detail ??
          (errorsStr || undefined) ??
          bodyRecord.title ??
          `Lỗi ${status}`;
        message = String(messageValue);
      }
    }

    if (
      status >= 500 ||
      message.toLowerCase().includes("unexpected error") ||
      message.toLowerCase().includes("internal server error")
    ) {
      message = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";
    } else {
      message = translateErrorMessage(message);
    }

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
  }
);
