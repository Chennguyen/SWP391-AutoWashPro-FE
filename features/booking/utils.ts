import type { CustomerBooking } from "@/features/booking/types/booking-types";

// ─── Token ─────────────────────────────────────────────────────────────────────

/**
 * Đăng ký một listener callback để lắng nghe cập nhật local storage và các sự kiện đăng nhập xác thực.
 * Giải quyết tính phản ứng cho trạng thái token xác thực trên các tab trình duyệt khác nhau.
 * 
 * @param cb Bộ xử lý callback để kích hoạt khi thay đổi trạng thái token.
 * @returns Hàm dọn dẹp (clean up) để hủy đăng ký lắng nghe.
 */
export function subscribeToToken(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", cb);
  window.addEventListener("autowash-auth", cb);
  return () => {
    window.removeEventListener("storage", cb);
    window.removeEventListener("autowash-auth", cb);
  };
}

/**
 * Lấy snapshot token xác thực đã được làm sạch từ local storage của trình duyệt.
 * Loại bỏ tiền tố 'Bearer' và các dấu ngoặc kép bọc ngoài.
 * 
 * @returns Chuỗi token sạch hoặc null nếu chưa đăng nhập.
 */
export function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem("token") ?? "";
  const withoutBearer = raw.trim().replace(/^Bearer\s+/i, "");
  const clean =
    (withoutBearer.startsWith('"') && withoutBearer.endsWith('"')) ||
    (withoutBearer.startsWith("'") && withoutBearer.endsWith("'"))
      ? withoutBearer.slice(1, -1).trim()
      : withoutBearer;
  return clean || null;
}

/**
 * Hàm lấy snapshot token mock dùng cho môi trường dựng trang phía Server (SSR - Node environment).
 * 
 * @returns null.
 */
export function getServerTokenSnapshot(): string | null {
  return null;
}

// ─── Date helpers ──────────────────────────────────────────────────────────────

/**
 * Chuyển đổi đối tượng Date thành biểu diễn chuỗi định dạng YYYY-MM-DD.
 * 
 * @param date Đối tượng Date cần định dạng.
 * @returns Chuỗi ngày định dạng YYYY-MM-DD.
 */
export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Trích xuất phần ngày ISO YYYY-MM-DD từ nhiều định dạng giá trị thời gian khác nhau.
 * Phân tích cả chuỗi thời gian ISO YYYY-MM-DD và định dạng dấu gạch chéo DD/MM/YYYY.
 * 
 * @param value Chuỗi biểu diễn ngày thô.
 * @returns Chuỗi định dạng YYYY-MM-DD được trích xuất hoặc chuỗi rỗng.
 */
export function extractISODate(value = ""): string {
  const clean = value.trim();
  const isoMatch = clean.match(/(\d{4})-(\d{2})-(\d{2})/);
  if (isoMatch) return `${isoMatch[1]}-${isoMatch[2]}-${isoMatch[3]}`;

  const slashMatch = clean.match(/(\d{1,2})\/(\d{1,2})\/(\d{4})/);
  if (slashMatch) {
    return `${slashMatch[3]}-${slashMatch[2].padStart(2, "0")}-${slashMatch[1].padStart(2, "0")}`;
  }

  return "";
}

/**
 * Hàm tiện ích để trích xuất chuỗi giờ phút HH:MM từ các giá trị thời gian.
 * 
 * @param value Chuỗi ngày giờ thô.
 * @returns Chuỗi thời gian định dạng HH:MM đã được chuẩn hóa.
 */
function extractHHMM(value = ""): string {
  const m = value.match(/T?(\d{1,2}):(\d{2})/);
  if (!m) return "";
  return `${m[1].padStart(2, "0")}:${m[2]}`;
}

/**
 * Phân tích an toàn chuỗi ngày giờ từ API thành đối tượng Date của Javascript.
 * Loại bỏ hậu tố múi giờ (múi giờ Z hay +07:00) trước khi phân tích để trình duyệt
 * coi giá trị đó là giờ địa phương thay vì giờ UTC, ngăn chặn sai lệch múi giờ.
 * 
 * @param value Chuỗi ngày giờ đặt lịch thô.
 * @returns Đối tượng Date cục bộ hoặc null nếu không thể phân tích cú pháp.
 */
export function parseBookingDateTime(value = ""): Date | null {
  if (!value) return null;
  const normalized = value.replace(/(?:z|[+-]\d{2}:\d{2})$/i, "");
  const dateStr = extractISODate(normalized);
  if (!dateStr) return null;
  const [year = "0", month = "1", day = "1"] = dateStr.split("-");
  const [hour = "0", minute = "0"] = extractHHMM(normalized).split(":");
  const parsed = new Date(
    Number(year),
    Number(month) - 1,
    Number(day),
    Number(hour),
    Number(minute),
  );
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

/**
 * Lấy đối tượng Date bắt đầu cho một lịch đặt chỗ.
 * 
 * @param booking Đối tượng đặt lịch.
 * @returns Đối tượng Date hoặc null.
 */
export function getBookingStartDate(booking: CustomerBooking): Date | null {
  return parseBookingDateTime(booking.startTime || booking.bookingDate);
}

/**
 * Lấy đối tượng Date kết thúc cho một lịch đặt chỗ.
 * 
 * @param booking Đối tượng đặt lịch.
 * @returns Đối tượng Date hoặc null.
 */
export function getBookingEndDate(booking: CustomerBooking): Date | null {
  if (!booking.endTime) return null;
  return parseBookingDateTime(booking.endTime);
}

/**
 * Định dạng ngày giờ bắt đầu của lịch đặt thành chuỗi hiển thị cục bộ (Việt Nam).
 * 
 * @param booking Đối tượng đặt lịch.
 * @returns Chuỗi ngày giờ thân thiện hiển thị hoặc giá trị dự phòng ban đầu.
 */
export function formatBookingDateTime(booking: CustomerBooking): string {
  const date = getBookingStartDate(booking);
  if (!date) return booking.startTime || booking.bookingDate || "Chưa có thời gian";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Định dạng riêng phần ngày của lịch đặt thành chuỗi hiển thị kiểu Việt Nam (DD/MM/YYYY).
 * 
 * @param booking Đối tượng đặt lịch.
 * @returns Chuỗi ngày hiển thị hoặc giá trị dự phòng.
 */
export function formatDateOnly(booking: CustomerBooking): string {
  const date = getBookingStartDate(booking);
  if (!date) return booking.bookingDate || "Chưa có ngày";
  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/**
 * Định dạng khoảng thời gian diễn ra lịch đặt (HH:MM - HH:MM).
 * 
 * @param booking Đối tượng đặt lịch.
 * @returns Chuỗi khoảng thời gian.
 */
export function formatTimeRange(booking: CustomerBooking): string {
  const start = getBookingStartDate(booking);
  if (!start) return booking.startTime || "Chưa có giờ";
  const startText = start.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  const end = getBookingEndDate(booking);
  if (!end) return startText;
  const endText = end.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" });
  return `${startText} - ${endText}`;
}

/**
 * Tính toán khoảng thời gian còn lại (tính bằng phút) cho đến khi lịch rửa xe bắt đầu diễn ra.
 * 
 * @param booking Lịch đặt mục tiêu.
 * @returns Số phút chênh lệch còn lại (có thể âm nếu đã quá giờ) hoặc null.
 */
export function minutesUntilBooking(booking: CustomerBooking): number | null {
  const date = getBookingStartDate(booking);
  if (!date) return null;
  return Math.floor((date.getTime() - Date.now()) / 60_000);
}

// ─── Status helpers ─────────────────────────────────────────────────────────────

/**
 * Hàm bổ trợ chuẩn hóa chuỗi trạng thái thô để so sánh an toàn hơn.
 * 
 * @param status Từ khóa trạng thái thô.
 * @returns Trạng thái đã chuẩn hóa, cắt bỏ khoảng trắng và chuyển về chữ thường.
 */
function normalizeStatus(status: string): string {
  return status.trim().toLowerCase().replace(/[\s_-]+/g, "");
}

/**
 * Kiểm tra xem từ khóa trạng thái có biểu thị lịch đặt đã bị Hủy bỏ hay không.
 * 
 * @param status Từ khóa trạng thái.
 * @returns Trạng thái có phải đã hủy hay không.
 */
export function isCancelledStatus(status: string): boolean {
  const s = normalizeStatus(status);
  return s.includes("cancel") || s.includes("hủy") || s.includes("huy");
}

/**
 * Kiểm tra xem từ khóa trạng thái có biểu thị lịch đặt đã Hoàn thành hay không.
 * 
 * @param status Từ khóa trạng thái.
 * @returns Trạng thái có phải đã hoàn thành hay không.
 */
export function isCompletedStatus(status: string): boolean {
  const s = normalizeStatus(status);
  return s.includes("complete") || s.includes("done") || s.includes("xong");
}

/**
 * Kiểm tra xem từ khóa trạng thái có biểu thị lịch đặt sắp diễn ra hay không (Chưa xong & Chưa hủy).
 * 
 * @param status Từ khóa trạng thái.
 * @returns Trạng thái có phải là lịch đặt sắp tới hay không.
 */
export function isUpcomingStatus(status: string): boolean {
  return !isCancelledStatus(status) && !isCompletedStatus(status);
}

/**
 * Kiểm tra xem trạng thái lịch đặt hiện tại có cho phép khách hàng thực hiện check-in hay không.
 * 
 * @param status Từ khóa trạng thái.
 * @returns Có thể check-in hay không.
 */
export function canCheckIn(status: string): boolean {
  return normalizeStatus(status) === "confirmed";
}

/**
 * Trả về các class CSS Tailwind tương ứng để tạo màu sắc nhãn (Badge) cho từng trạng thái lịch đặt.
 * 
 * @param status Từ khóa trạng thái hiện tại.
 * @returns Chuỗi class styling Tailwind.
 */
export function statusStyle(status: string): string {
  const s = normalizeStatus(status);
  if (s.includes("cancel") || s.includes("hủy") || s.includes("huy"))
    return "border-red-200 bg-red-50 text-red-700";
  if (s.includes("complete") || s.includes("done") || s.includes("xong"))
    return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (s.includes("progress") || s.includes("checkin"))
    return "border-indigo-200 bg-indigo-50 text-indigo-700";
  if (s.includes("confirm"))
    return "border-blue-200 bg-blue-50 text-blue-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}
