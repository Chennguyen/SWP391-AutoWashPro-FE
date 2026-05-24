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
 * POST /api/v1/auth/register
 * Content-Type: multipart/form-data
 * FaceImages: at least 3 face image files required
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

  // Append each face image separately under the same field name
  payload.faceImages.forEach((file) => {
    form.append("FaceImages", file);
  });

  const res = await fetch(`${apiBase()}/api/v1/auth/register`, {
    method: "POST",
    // Do NOT set Content-Type manually — browser sets it with boundary automatically
    body: form,
  });

  // Handle validation errors from the Problem Details format (RFC 9110)
  if (res.status === 400) {
    let message = "Dữ liệu không hợp lệ.";
    try {
      const body = await res.json();
      // body.errors is a Record<string, string[]>
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
      // keep default message
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
    access_token: string;
    isVerify: boolean;
  } | null;
}

/**
 * POST /api/v1/auth/login
 * Content-Type: multipart/form-data
 */
export async function loginUser(email: string, password: string): Promise<LoginResult> {
  const form = new FormData();
  form.append("Email", email.trim());
  form.append("Password", password);

  const res = await fetch(`${apiBase()}/api/v1/auth/login`, {
    method: "POST",
    body: form,
  });

  // Try to parse response body regardless of status code
  let body: LoginResult;
  try {
    body = await res.json();
  } catch {
    const { ApiError } = await import("./api-error");
    throw new ApiError("Không thể kết nối đến máy chủ. Vui lòng thử lại.", res.status);
  }

  if (!res.ok || !body.success) {
    const { ApiError } = await import("./api-error");

    // Map common backend error messages to Vietnamese
    const raw = body?.message ?? (body as any)?.errors?.detail ?? `Lỗi ${res.status}`;
    let message = raw;

    if (raw.toLowerCase().includes("invalid email or password")) {
      message = "Email hoặc mật khẩu không đúng.";
    } else if (raw.toLowerCase().includes("account") && raw.toLowerCase().includes("lock")) {
      message = "Tài khoản đã bị khoá. Vui lòng liên hệ hỗ trợ.";
    } else if (raw.toLowerCase().includes("not found")) {
      message = "Tài khoản không tồn tại.";
    } else if (raw.toLowerCase().includes("unexpected error")) {
      message = "Có lỗi hệ thống xảy ra. Vui lòng thử lại sau.";
    }

    throw new ApiError(message, res.status);
  }

  return body;
}

