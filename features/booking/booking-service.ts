import type {
  BookingResult,
  BookingSlot,
  CreateBookingPayload,
  CustomerBooking,
} from "@/features/booking/types/booking-types";
import { apiBase, handleApiResponse } from "@/lib/api-error";
import { axiosInstance } from "@/lib/axios";

type SlotRecord = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  time?: string;
  Time?: string;
  slot?: string;
  Slot?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  available?: boolean;
  Available?: boolean;
  isAvailable?: boolean;
  IsAvailable?: boolean;
  booked?: boolean;
  Booked?: boolean;
  isBooked?: boolean;
  IsBooked?: boolean;
  occupied?: boolean;
  Occupied?: boolean;
  status?: string;
  Status?: string;
};

type SlotListResponse =
  | SlotRecord[]
  | {
      data?: SlotRecord[] | { items?: SlotRecord[]; results?: SlotRecord[] };
      Data?: SlotRecord[] | { items?: SlotRecord[]; results?: SlotRecord[] };
      items?: SlotRecord[];
      results?: SlotRecord[];
    };

type BookingResponse = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  confirmationCode?: string;
  ConfirmationCode?: string;
  code?: string;
  Code?: string;
  message?: string;
  Message?: string;
  data?: BookingResponse;
  Data?: BookingResponse;
};

type NestedName = {
  id?: string | number;
  Id?: string | number;
  branchId?: string | number;
  BranchId?: string | number;
  vehicleId?: string | number;
  VehicleId?: string | number;
  name?: string;
  Name?: string;
  address?: string;
  Address?: string;
  licensePlate?: string;
  LicensePlate?: string;
  plateNumber?: string;
  PlateNumber?: string;
};

type CustomerBookingRecord = {
  id?: string | number;
  Id?: string | number;
  bookingId?: string | number;
  BookingId?: string | number;
  branchId?: string | number;
  BranchId?: string | number;
  branchName?: string;
  BranchName?: string;
  branchAddress?: string;
  BranchAddress?: string;
  branch?: NestedName;
  Branch?: NestedName;
  vehicleLicensePlate?: string;
  VehicleLicensePlate?: string;
  licensePlate?: string;
  LicensePlate?: string;
  vehicle?: NestedName;
  Vehicle?: NestedName;
  vehicleId?: string | number;
  VehicleId?: string | number;
  bookingDate?: string;
  BookingDate?: string;
  date?: string;
  Date?: string;
  startTime?: string;
  StartTime?: string;
  endTime?: string;
  EndTime?: string;
  status?: string;
  Status?: string;
  serviceName?: string;
  ServiceName?: string;
  service?: NestedName;
  Service?: NestedName;
  totalPrice?: number;
  TotalPrice?: number;
  price?: number;
  Price?: number;
  finalPrice?: number;
  FinalPrice?: number;
  basePrice?: number;
  BasePrice?: number;
  discountAmount?: number;
  DiscountAmount?: number;
  cancelReason?: string;
  CancelReason?: string;
};

type BookingListResponse =
  | CustomerBookingRecord[]
  | {
      data?:
        | CustomerBookingRecord[]
        | { items?: CustomerBookingRecord[]; results?: CustomerBookingRecord[] };
      Data?:
        | CustomerBookingRecord[]
        | { items?: CustomerBookingRecord[]; results?: CustomerBookingRecord[] };
      items?: CustomerBookingRecord[];
      results?: CustomerBookingRecord[];
    };

/**
 * Trích xuất danh sách slot từ phản hồi API về dạng mảng thô.
 * 
 * @param body Phản hồi của API chứa thông tin slot.
 * @returns Mảng các bản ghi slot thô.
 */
function unwrapList(body: any): any[] {
  if (!body) return [];
  if (Array.isArray(body)) return body;

  const directList = body.items ?? body.Items ?? body.results ?? body.Results;
  if (Array.isArray(directList)) return directList;

  const dataPayload = body.data ?? body.Data;
  if (Array.isArray(dataPayload)) return dataPayload;

  if (dataPayload && typeof dataPayload === "object") {
    const nestedList = dataPayload.items ?? dataPayload.Items ?? dataPayload.results ?? dataPayload.Results;
    if (Array.isArray(nestedList)) return nestedList;
  }

  return [];
}

/**
 * Chuyển đổi chuỗi ngày định dạng ISO YYYY-MM-DD thành định dạng ngày Việt Nam DD/MM/YYYY.
 * 
 * @param isoDate Chuỗi ngày đầu vào định dạng YYYY-MM-DD.
 * @returns Chuỗi ngày định dạng DD/MM/YYYY hoặc giá trị gốc nếu không khớp.
 */
function toViDate(isoDate: string): string {
  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (match) return `${match[3]}/${match[2]}/${match[1]}`;
  return isoDate;
}

/**
 * Chuẩn hóa chuỗi thời gian về định dạng HH:MM.
 * Hỗ trợ phân tích cú pháp chuỗi ngày giờ ISO và đệm thêm số 0 cho giờ có một chữ số.
 * 
 * @param value Giá trị thời gian từ API.
 * @returns Chuỗi thời gian định dạng HH:MM.
 */
function toHHMM(value = ""): string {
  if (/^\d{2}:\d{2}$/.test(value)) {
    return value;
  }

  const isoMatch = value.match(/T(\d{2}):(\d{2})/);
  if (isoMatch) {
    return `${isoMatch[1]}:${isoMatch[2]}`;
  }

  const timeMatch = value.match(/(\d{1,2}):(\d{2})/);
  if (timeMatch) {
    return `${timeMatch[1].padStart(2, "0")}:${timeMatch[2]}`;
  }

  return value;
}

/**
 * Xác định tính khả dụng của một slot dựa trên các từ khóa trạng thái.
 * 
 * @param status Chuỗi trạng thái từ API.
 * @returns True nếu khả dụng, false nếu đã bận/đã đặt, hoặc undefined nếu không xác định được.
 */
function availabilityFromStatus(status?: string): boolean | undefined {
  const normalized = status?.trim().toLowerCase();
  if (!normalized) {
    return undefined;
  }

  if (
    normalized.includes("notavailable") ||
    normalized.includes("not available") ||
    normalized.includes("unavailable") ||
    normalized.includes("book") ||
    normalized.includes("reserved") ||
    normalized.includes("busy") ||
    normalized.includes("pending") ||
    normalized.includes("confirm") ||
    normalized.includes("cancel") ||
    normalized.includes("checkin") ||
    normalized.includes("check-in") ||
    normalized.includes("progress") ||
    normalized.includes("complete")
  ) {
    return false;
  }

  if (
    normalized.includes("available") ||
    normalized.includes("free") ||
    normalized.includes("open")
  ) {
    return true;
  }

  return undefined;
}

/**
 * Ép kiểu các dạng dữ liệu đầu vào khác nhau thành giá trị boolean.
 * Hỗ trợ các từ khóa chuỗi ("available", "true", "booked") và các số nhị phân.
 * 
 * @param value Giá trị cần ép kiểu.
 * @returns Một giá trị boolean, hoặc undefined nếu ép kiểu thất bại.
 */
function booleanValue(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") {
    if (value === 1) return true;
    if (value === 0) return false;
  }
  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();
    if (["true", "1", "yes", "available"].includes(normalized)) return true;
    if (["false", "0", "no", "unavailable", "notavailable", "booked"].includes(normalized)) {
      return false;
    }
  }

  return undefined;
}

/**
 * Chuẩn hóa một bản ghi slot thô từ API để phù hợp với schema BookingSlot của UI.
 * Tính toán tính khả dụng dựa trên trạng thái đã đặt, trạng thái bận và từ khóa trạng thái.
 * 
 * @param raw Bản ghi slot thô từ database/API.
 * @returns Đối tượng BookingSlot đã được định dạng.
 */
function normalizeSlot(raw: SlotRecord): BookingSlot {
  const status = raw.status ?? raw.Status;
  const hasBookingReference = raw.bookingId !== undefined || raw.BookingId !== undefined;
  const isBooked =
    booleanValue(raw.booked ?? raw.Booked) ??
    booleanValue(raw.isBooked ?? raw.IsBooked) ??
    booleanValue(raw.occupied ?? raw.Occupied) ??
    (hasBookingReference ? true : undefined);
  const explicitAvailable =
    availabilityFromStatus(status) ??
    booleanValue(raw.available ?? raw.Available) ??
    booleanValue(raw.isAvailable ?? raw.IsAvailable) ??
    (isBooked !== undefined ? !isBooked : undefined);
  const available = explicitAvailable ?? true;

  const time = toHHMM(
    raw.time ?? raw.Time ?? raw.slot ?? raw.Slot ?? raw.startTime ?? raw.StartTime ?? "",
  );
  
  const endTimeRaw = raw.endTime ?? raw.EndTime ?? "";
  const endTime = endTimeRaw ? toHHMM(endTimeRaw) : undefined;

  return {
    time,
    endTime,
    available,
    availabilityExplicit: explicitAvailable !== undefined,
  };
}

/**
 * Chuẩn hóa phản hồi đặt lịch thô để trích xuất thông tin xác nhận.
 * 
 * @param body Phản hồi API sau khi tạo đặt lịch.
 * @returns Cấu trúc BookingResult đồng nhất.
 */
function normalizeBookingResult(body: BookingResponse): BookingResult {
  const raw = body.data ?? body.Data ?? body;
  const bookingId = String(raw.bookingId ?? raw.BookingId ?? raw.id ?? raw.Id ?? "");

  return {
    bookingId,
    id:
      raw.id !== undefined || raw.Id !== undefined
        ? String(raw.id ?? raw.Id)
        : undefined,
    confirmationCode:
      raw.confirmationCode ?? raw.ConfirmationCode ?? raw.code ?? raw.Code,
    message: raw.message ?? raw.Message,
  };
}

/**
 * Trích xuất danh sách đặt lịch từ các lớp bao bọc phản hồi API.
 * 
 * @param body Phản hồi API chứa tập hợp các đặt lịch.
 * @returns Mảng các bản ghi đặt lịch.
 */
function unwrapBookings(body: BookingListResponse): CustomerBookingRecord[] {
  if (Array.isArray(body)) {
    return body;
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data;
  }

  if (data && !Array.isArray(data)) {
    return data.items ?? data.results ?? [];
  }

  const upperData = body.Data;
  if (Array.isArray(upperData)) {
    return upperData;
  }

  if (upperData && !Array.isArray(upperData)) {
    return upperData.items ?? upperData.results ?? [];
  }

  return body.items ?? body.results ?? [];
}

/**
 * Chuẩn hóa một bản ghi đặt lịch từ database thành đối tượng CustomerBooking để hiển thị trên giao diện.
 * Xử lý các giá trị dự phòng khi thiếu thuộc tính và các biến thể về cách viết hoa/thường của API.
 * 
 * @param raw Bản ghi đặt lịch thô.
 * @returns Đối tượng CustomerBooking đã được chuẩn hóa.
 */
function normalizeCustomerBooking(raw: CustomerBookingRecord): CustomerBooking {
  const branch = raw.branch ?? raw.Branch;
  const vehicle = raw.vehicle ?? raw.Vehicle;
  const service = raw.service ?? raw.Service;

  return {
    id: String(raw.id ?? raw.Id ?? raw.bookingId ?? raw.BookingId ?? ""),
    branchId:
      raw.branchId !== undefined || raw.BranchId !== undefined
        ? String(raw.branchId ?? raw.BranchId)
        : branch?.id !== undefined ||
            branch?.Id !== undefined ||
            branch?.branchId !== undefined ||
            branch?.BranchId !== undefined
          ? String(branch?.id ?? branch?.Id ?? branch?.branchId ?? branch?.BranchId)
          : undefined,
    vehicleId:
      raw.vehicleId !== undefined || raw.VehicleId !== undefined
        ? String(raw.vehicleId ?? raw.VehicleId)
        : vehicle?.id !== undefined ||
            vehicle?.Id !== undefined ||
            vehicle?.vehicleId !== undefined ||
            vehicle?.VehicleId !== undefined
          ? String(vehicle?.id ?? vehicle?.Id ?? vehicle?.vehicleId ?? vehicle?.VehicleId)
          : undefined,
    branchName:
      raw.branchName ??
      raw.BranchName ??
      branch?.name ??
      branch?.Name ??
      "AutoWash Pro",
    branchAddress:
      raw.branchAddress ?? raw.BranchAddress ?? branch?.address ?? branch?.Address,
    vehicleLicensePlate:
      raw.vehicleLicensePlate ??
      raw.VehicleLicensePlate ??
      raw.licensePlate ??
      raw.LicensePlate ??
      vehicle?.licensePlate ??
      vehicle?.LicensePlate ??
      vehicle?.plateNumber ??
      vehicle?.PlateNumber ??
      "",
    bookingDate: raw.bookingDate ?? raw.BookingDate ?? raw.date ?? raw.Date ?? "",
    startTime: raw.startTime ?? raw.StartTime ?? "",
    endTime: raw.endTime ?? raw.EndTime,
    status: raw.status ?? raw.Status ?? "Đã đặt",
    serviceName: raw.serviceName ?? raw.ServiceName ?? service?.name ?? service?.Name,
    totalPrice: raw.totalPrice ?? raw.TotalPrice ?? raw.price ?? raw.Price,
    finalPrice: raw.finalPrice ?? raw.FinalPrice,
    basePrice: raw.basePrice ?? raw.BasePrice,
    discountAmount: raw.discountAmount ?? raw.DiscountAmount,
    cancelReason: raw.cancelReason ?? raw.CancelReason,
  };
}

/**
 * Lấy danh sách các khung giờ cho một chi nhánh và ngày cụ thể.
 * 
 * @param token Token xác thực.
 * @param branchId ID của chi nhánh mục tiêu.
 * @param date Chuỗi ngày mục tiêu (YYYY-MM-DD).
 * @returns Một promise giải quyết thành một mảng các đối tượng BookingSlot.
 */
export async function getSlots(
  token: string,
  branchId: string,
  date: string,
): Promise<BookingSlot[]> {
  const params = new URLSearchParams({
    BranchId: branchId,
    Date: date,
    branchId: branchId,
    date: date,
  });

  const res = await axiosInstance.get<SlotListResponse>(`/api/v1/bookings/slot?${params.toString()}`);
  const rawList = unwrapList(res.data);
  return rawList.map(normalizeSlot).filter((slot) => slot.time);
}

/**
 * Tạo một lịch đặt chỗ rửa xe mới.
 * 
 * @param token Token xác thực.
 * @param payload Chi tiết dữ liệu đặt lịch (chi nhánh, xe, ngày, khung giờ bắt đầu, voucher, điểm đổi).
 * @returns Một promise giải quyết thành BookingResult chứa thông tin xác nhận đặt lịch.
 */
export async function createBooking(
  token: string,
  payload: CreateBookingPayload,
): Promise<BookingResult> {
  const res = await axiosInstance.post<BookingResponse>("/api/v1/bookings/", {
    branchId: payload.branchId,
    vehicleId: payload.vehicleId,
    voucherId: payload.voucherId,
    bookingDate: payload.bookingDate,
    startTime: payload.startTime,
    redemPoint: payload.redemPoint,
  });
  return normalizeBookingResult(res.data);
}

/**
 * Lấy danh sách lịch đặt của khách hàng được lọc theo khoảng ngày và trạng thái.
 * Tự động truyền cả định dạng ngày ISO YYYY-MM-DD và Việt Nam DD/MM/YYYY để bộ lọc backend hoạt động chính xác.
 * 
 * @param token Token xác thực.
 * @param fromDate Chuỗi ngày bắt đầu (YYYY-MM-DD).
 * @param toDate Chuỗi ngày kết thúc (YYYY-MM-DD).
 * @param page Chỉ số trang phân trang hiện tại.
 * @param pageSize Số lượng bản ghi trên mỗi trang.
 * @param status Tùy chọn trạng thái lọc (ví dụ: "PENDING", "COMPLETED").
 * @returns Một promise giải quyết thành mảng CustomerBooking đã được chuẩn hóa.
 */
export async function getBookings(
  token: string,
  fromDate: string,
  toDate: string,
  page = 1,
  pageSize = 20,
  status?: string,
): Promise<CustomerBooking[]> {
  const fromVi = toViDate(fromDate);
  const toVi = toViDate(toDate);
  const params = new URLSearchParams({
    fromDate,
    toDate,
    FromDate: fromVi,
    ToDate: toVi,
    page: String(page),
    pageSize: String(pageSize),
  });
  if (status) {
    params.set("status", status);
  }

  const res = await axiosInstance.get<BookingListResponse>(`/api/v1/bookings/?${params.toString()}`);
  return unwrapBookings(res.data).map(normalizeCustomerBooking);
}

/**
 * Lấy thông tin chi tiết của một lịch đặt dựa trên ID.
 * 
 * @param token Token xác thực.
 * @param id ID của lịch đặt.
 * @returns Một promise giải quyết thành đối tượng CustomerBooking tương ứng.
 */
export async function getBooking(token: string, id: string): Promise<CustomerBooking> {
  const res = await axiosInstance.get<
    { data?: CustomerBookingRecord; Data?: CustomerBookingRecord } | CustomerBookingRecord
  >(`/api/v1/bookings/${encodeURIComponent(id)}`);
  const raw = res.data;
  const record =
    ("data" in raw && raw.data ? raw.data : "Data" in raw && raw.Data ? raw.Data : raw) as CustomerBookingRecord;
  return normalizeCustomerBooking(record);
}

/**
 * Thực hiện check-in cho khách hàng tại chi nhánh khi họ đến đúng khung giờ.
 * 
 * @param token Token xác thực.
 * @param id ID của lịch đặt cần check-in.
 * @returns Một promise giải quyết khi hoạt động check-in hoàn tất.
 */
export async function checkInBooking(token: string, id: string): Promise<void> {
  await axiosInstance.post(`/api/v1/bookings/${encodeURIComponent(id)}/check-in`, {});
}

/**
 * Hủy một lịch đặt đã hẹn kèm theo lý do cụ thể.
 * 
 * @param token Token xác thực.
 * @param id ID của lịch đặt cần hủy.
 * @param reason Lý do giải thích tại sao lịch đặt bị hủy.
 * @returns Một promise giải quyết khi hoạt động hủy thành công.
 */
export async function cancelBooking(
  token: string,
  id: string,
  reason: string,
): Promise<void> {
  await axiosInstance.post(`/api/v1/bookings/${encodeURIComponent(id)}/cancel`, { reason });
}


