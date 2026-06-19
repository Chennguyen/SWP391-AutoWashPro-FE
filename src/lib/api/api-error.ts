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
function pickErrorMessage(body: unknown, status: number): string {
  if (typeof body === "string" && body.trim()) {
    return body;
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

  return String(message);
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

    if (res.status === 500 || message.toLowerCase().includes("unexpected error")) {
      message = "Hệ thống gặp sự cố tạm thời. Vui lòng thử lại sau.";
    }

    throw new ApiError(message, res.status);
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
