/**
 * Lớp ApiError
 * 
 * Lớp lỗi tùy chỉnh đại diện cho các thất bại của API, ghi lại mã trạng thái và thông báo lỗi.
 */
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/**
 * Hàm kiểm tra kiểu dữ liệu (Type guard) để xác định xem giá trị có phải là một đối tượng record thông thường hay không.
 * 
 * @param value Giá trị cần kiểm tra.
 * @returns Trả về true nếu giá trị là một đối tượng, không phải null và không phải mảng.
 */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Hàm bổ trợ để chuyển đổi các lỗi xác thực phức tạp (như lỗi ModelState của .NET) thành một chuỗi duy nhất.
 * 
 * @param errors Trường lỗi từ payload phản hồi của API.
 * @returns Một chuỗi chứa thông tin chi tiết về lỗi, hoặc null nếu đối tượng lỗi không hợp lệ.
 */
function stringifyErrors(errors: unknown): string | null {
  if (Array.isArray(errors)) {
    return errors.map(String).filter(Boolean).join(" ");
  }

  if (!isRecord(errors)) {
    return null;
  }

  return Object.entries(errors)
    .flatMap(([field, messages]) => {
      if (Array.isArray(messages)) {
        return messages.map((message) => `${field}: ${String(message)}`);
      }

      return [`${field}: ${String(messages)}`];
    })
    .filter(Boolean)
    .join(" ");
}

/**
 * Trích xuất một thông báo lỗi thân thiện với người dùng từ các cấu trúc dữ liệu phản hồi lỗi API khác nhau.
 * Sẽ dự phòng về văn bản mặc định như "Lỗi [status]" nếu không tìm thấy thông báo nào.
 * 
 * @param body Nội dung phản hồi đã được phân tích cú pháp.
 * @param status Mã trạng thái HTTP của phản hồi.
 * @returns Một chuỗi đại diện cho thông báo lỗi.
 */
export function translateErrorMessage(message: string): string {
  const raw = message.toLowerCase();

  // 1. Lỗi đăng nhập & Tài khoản
  if (
    raw.includes("invalid email or password") ||
    raw.includes("username or password is incorrect") ||
    raw.includes("invalid credentials")
  ) {
    return "Email hoặc mật khẩu không đúng.";
  }
  if (raw.includes("account") && (raw.includes("lock") || raw.includes("block"))) {
    return "Tài khoản đã bị tạm khóa. Vui lòng liên hệ hỗ trợ.";
  }
  if (
    raw.includes("user not found") ||
    raw.includes("user does not exist") ||
    raw.includes("account does not exist")
  ) {
    return "Tài khoản không tồn tại.";
  }
  if (raw.includes("only active and verified customer accounts")) {
    return "Tài khoản chưa được kích hoạt hoặc xác minh.";
  }

  // 2. Lỗi đăng ký trùng lặp thông tin
  if (
    raw.includes("user exist with mail") ||
    raw.includes("email is already taken") ||
    raw.includes("email already exists") ||
    raw.includes("email already in use")
  ) {
    return "Email này đã được đăng ký. Vui lòng dùng email khác.";
  }
  if (
    raw.includes("user exist with phone") ||
    raw.includes("phone number already") ||
    raw.includes("phone already") ||
    raw.includes("phone number is already in use")
  ) {
    return "Số điện thoại này đã được đăng ký. Vui lòng dùng số điện thoại khác.";
  }
  if (
    raw.includes("user exist with cccd") ||
    raw.includes("cccd already") ||
    raw.includes("citizen identity")
  ) {
    return "Số CCCD này đã được đăng ký. Vui lòng kiểm tra lại.";
  }

  // 3. Lỗi thay đổi mật khẩu
  if (
    raw.includes("incorrect password") ||
    raw.includes("current password does not match") ||
    raw.includes("passwords do not match")
  ) {
    return "Mật khẩu hiện tại không đúng.";
  }
  if (raw.includes("passwords must have at least one non alphanumeric character")) {
    return "Mật khẩu mới phải chứa ít nhất một ký tự đặc biệt (ví dụ: @, #, $, ...).";
  }
  if (raw.includes("passwords must have at least one lowercase")) {
    return "Mật khẩu mới phải chứa ít nhất một chữ cái thường.";
  }
  if (raw.includes("passwords must have at least one uppercase")) {
    return "Mật khẩu mới phải chứa ít nhất một chữ cái viết hoa.";
  }
  if (raw.includes("passwords must have at least one digit") || raw.includes("must have at least one digit")) {
    return "Mật khẩu mới phải chứa ít nhất một chữ số (0-9).";
  }
  if (raw.includes("passwords must be at least") || raw.includes("password is too short")) {
    return "Mật khẩu mới quá ngắn. Vui lòng nhập mật khẩu dài hơn.";
  }

  // 4. Lỗi đặt lịch & mã giảm giá
  if (
    raw.includes("slot already booked") ||
    raw.includes("time slot is already booked") ||
    raw.includes("slot unavailable")
  ) {
    return "Khung giờ này đã được đặt lịch trước. Vui lòng chọn khung giờ khác.";
  }
  if (
    raw.includes("invalid voucher") ||
    raw.includes("voucher expired") ||
    raw.includes("voucher is not valid") ||
    raw.includes("voucher not found")
  ) {
    return "Mã giảm giá không hợp lệ hoặc đã hết hạn.";
  }

  return message;
}

/**
 * Trích xuất một thông báo lỗi thân thiện với người dùng từ các cấu trúc dữ liệu phản hồi lỗi API khác nhau.
 * Sẽ dự phòng về văn bản mặc định như "Lỗi [status]" nếu không tìm thấy thông báo nào.
 * 
 * @param body Nội dung phản hồi đã được phân tích cú pháp.
 * @param status Mã trạng thái HTTP của phản hồi.
 * @returns Một chuỗi đại diện cho thông báo lỗi.
 */
function pickErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) {
    return translateErrorMessage(body);
  }

  if (!isRecord(body)) {
    return `Lỗi ${status}`;
  }

  const errors = stringifyErrors(body.errors);
  const message =
    body.message ??
    body.error ??
    body.detail ??
    errors ??
    body.title ??
    `Lỗi ${status}`;

  return translateErrorMessage(String(message));
}

/**
 * Hàm tiện ích để xử lý các phản hồi HTTP từ các yêu cầu fetch.
 * Phân tích cú pháp phản hồi JSON, kiểm tra xem phản hồi có thành công hay không, và ném lỗi ApiError nếu thất bại.
 * 
 * @template T Kiểu dữ liệu trả về mong muốn khi thành công.
 * @param res Đối tượng phản hồi Fetch API.
 * @returns Nội dung phản hồi đã được xử lý.
 * @throws ApiError nếu trạng thái yêu cầu HTTP không thành công.
 */
export async function handleApiResponse<T>(res: Response): Promise<T> {
  const text = await res.text();
  let body: unknown = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      body = text;
    }
  }

  if (!res.ok) {
    let message = pickErrorMessage(body, res.status);

    if (
      res.status >= 500 ||
      message.toLowerCase().includes("unexpected error") ||
      message.toLowerCase().includes("internal server error")
    ) {
      message = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";
    }

    if (
      message.includes("Only active and verified customer accounts") ||
      message.includes("Tài khoản chưa được kích hoạt hoặc xác minh")
    ) {
      if (typeof window !== "undefined") {
        window.localStorage.setItem("is_unverified", "true");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    }

    throw new ApiError(message, res.status);
  }

  if (typeof window !== "undefined" && res.url && res.url.includes("/api/v1/me") && !res.url.includes("/my-status")) {
    if (window.localStorage.getItem("is_unverified") === "true") {
      window.localStorage.removeItem("is_unverified");
      window.dispatchEvent(new Event("autowash-auth"));
    }
  }

  return body as T;
}

/**
 * Trả về URL gốc của API.
 * Sử dụng biến môi trường để cấu hình.
 * 
 * @returns URL cơ sở của API.
 */
export function apiBase(): string {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "";
  return base;
}
