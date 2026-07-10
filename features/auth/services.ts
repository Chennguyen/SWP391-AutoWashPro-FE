import { axiosInstance } from "@/lib/axios";
import { ApiError } from "@/lib/api-error";

import { RegisterPayload, RegisterResult, LoginResult } from "./types/auth-types";

// ─── Register ─────────────────────────────────────────────────────────────────

/**
 * Đăng ký người dùng mới.
 * Gửi một yêu cầu POST dưới dạng multipart/form-data chứa thông tin cá nhân và các ảnh sinh trắc khuôn mặt.
 * 
 * @param payload Dữ liệu đầu vào đăng ký bao gồm họ tên, email, số điện thoại, số CCCD, mật khẩu và ảnh sinh trắc.
 * @returns Một promise giải quyết phản hồi đăng ký.
 * @throws ApiError nếu email đã được đăng ký hoặc dữ liệu xác thực không hợp lệ.
 */
export async function registerUser(
  payload: RegisterPayload
): Promise<RegisterResult> {
  const form = new FormData();
  form.append("FirstName", payload.firstName.trim());
  form.append("LastName", payload.lastName.trim());
  form.append("Email", payload.email.trim());
  form.append("Phone", payload.phone.trim());
  form.append("Password", payload.password);
  form.append("Cccd", payload.cccd.trim());

  // Thêm từng ảnh khuôn mặt riêng biệt dưới cùng một tên trường
  payload.faceImages.forEach((file) => {
    form.append("FaceImages", file);
  });

  try {
    const res = await axiosInstance.post<RegisterResult>("/api/v1/auth/register", form);
    return res.data;
  } catch (error) {
    if (error instanceof ApiError) {
      const msg = error.message.toLowerCase();
      // Nếu trùng email, sđt hoặc cccd
      if (error.status === 409 || error.status === 400) {
        if (msg.includes("user exist with mail") || msg.includes("email")) {
          throw new ApiError("Email này đã được đăng ký. Vui lòng dùng email khác.", 409);
        }
        if (msg.includes("user exist with phone") || msg.includes("phone")) {
          throw new ApiError("Số điện thoại này đã được đăng ký. Vui lòng dùng số điện thoại khác.", 409);
        }
        if (msg.includes("user exist with cccd") || msg.includes("cccd")) {
          throw new ApiError("Số CCCD này đã được đăng ký. Vui lòng kiểm tra lại.", 409);
        }
      }
      throw error;
    }
    throw error;
  }
}

// ─── Login ────────────────────────────────────────────────────────────────────

/**
 * Xác thực người dùng (Đăng nhập).
 * Gửi một yêu cầu POST dưới dạng multipart/form-data chứa thông tin đăng nhập.
 * 
 * @param email Địa chỉ email của người dùng.
 * @param password Chuỗi mật khẩu của người dùng.
 * @returns Một promise giải quyết phản hồi đăng nhập, bao gồm token và trạng thái xác thực.
 * @throws ApiError nếu thông tin đăng nhập sai hoặc tài khoản bị khóa.
 */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const form = new FormData();
  form.append("Identifier", email.trim());
  form.append("Password", password);

  try {
    const res = await axiosInstance.post<LoginResult>("/api/v1/auth/login", form);
    const body = res.data;

    if (!body?.success) {
      throw new ApiError(body?.message || "Đăng nhập thất bại", 400);
    }
    return body;
  } catch (error) {
    if (error instanceof ApiError) {
      let message = error.message;
      const raw = message.toLowerCase();

      // Bảo lưu logic ánh xạ thông báo lỗi thân thiện với người dùng
      if (raw.includes("invalid email or password")) {
        message = "Email hoặc mật khẩu không đúng.";
      } else if (raw.includes("account") && raw.includes("lock")) {
        message = "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.";
      } else if (raw.includes("not found")) {
        message = "Tài khoản không tồn tại.";
      } else if (raw.includes("unexpected error")) {
        message = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";
      }

      throw new ApiError(message, error.status);
    }
    throw error;
  }
}
