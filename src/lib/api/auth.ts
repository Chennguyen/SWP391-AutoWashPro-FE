import { apiBase, handleApiResponse } from "./api-error";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface RegisterPayload {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  cccd: string;
  faceImages: File[];
}

export interface RegisterResult {
  message?: string;
  userId?: string;
}

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

  const res = await fetch(`${apiBase()}/api/v1/auth/register`, {
    method: "POST",
    // KHÔNG đặt Content-Type thủ công — trình duyệt sẽ tự động thiết lập nó với boundary
    body: form,
  });

  // Xử lý các lỗi xác thực từ định dạng Problem Details (RFC 9110)
  if (res.status === 400) {
    let message = "Dữ liệu không hợp lệ.";
    try {
      const body = await res.json();
      // body.errors là một Record<string, string[]>
      if (body?.errors) {
        const allErrors = Object.values(body.errors as Record<string, string[]>)
          .flat()
          .join(" ");
        if (allErrors) message = allErrors;
      } else if (body?.message) {
        message = body.message;
      } else if (body?.title) {
        message = body.title;
      } else if (typeof body === "string") {
        message = body;
      }
    } catch {
      // giữ thông điệp mặc định
    }

    const { ApiError } = await import("./api-error");

    // Nếu backend trả về 400 nhưng nội dung là trùng email
    if (message.toLowerCase().includes("user exist with mail")) {
      throw new ApiError("Email này đã được đăng ký. Vui lòng dùng email khác.", 409);
    }

    throw new ApiError(message, 400);
  }

  if (res.status === 409) {
    const { ApiError } = await import("./api-error");
    throw new ApiError("Email này đã được đăng ký. Vui lòng dùng email khác.", 409);
  }

  return handleApiResponse<RegisterResult>(res);
}

// ─── Login ────────────────────────────────────────────────────────────────────

export interface LoginResult {
  success: boolean;
  message: string;
  data: {
    access_token?: string;
    Access_token?: string;
    accessToken?: string;
    isVerify?: boolean;
  } | null;
}

type LoginErrorBody = Partial<LoginResult> & {
  errors?: Record<string, string[]>;
  title?: string;
};

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

  const res = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    body: form,
  });

  // Thử phân tích cú pháp nội dung phản hồi bất kể mã trạng thái là gì
  let body: LoginResult;
  try {
    body = await res.json();
  } catch {
    const { ApiError } = await import("./api-error");
    throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng thử lại.", res.status);
  }

  if (!res.ok || !body?.success) {
    const { ApiError } = await import("./api-error");

    let message = `Lỗi ${res.status}`;
    
    // Phân tích cú pháp đối tượng lỗi chi tiết của backend nếu có
    const errorBody = body as LoginErrorBody;
    if (errorBody?.errors && typeof errorBody.errors === "object") {
       const allErrors = Object.values(errorBody.errors as Record<string, string[]>)
         .flat()
         .join(" ");
       if (allErrors) message = allErrors;
    } else if (body?.message) {
       message = body.message;
    } else if (errorBody?.title) {
       message = errorBody.title;
    }

    const raw = message.toLowerCase();

    if (raw.includes("invalid email or password")) {
      message = "Email hoặc mật khẩu không đúng.";
    } else if (raw.includes("account") && raw.includes("lock")) {
      message = "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.";
    } else if (raw.includes("not found")) {
      message = "Tài khoản không tồn tại.";
    } else if (raw.includes("unexpected error")) {
      message = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
    }

    throw new ApiError(message, res.status);
  }

  return body;
}
