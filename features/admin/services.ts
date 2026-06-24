import { apiBase, handleApiResponse } from "@/lib/api-error";
import { axiosInstance } from "@/lib/axios";

type UnknownRecord = Record<string, unknown>;
type ApiRecord<T> = T | { data?: T; Data?: T };
type ApiList<T> =
  | T[]
  | {
      data?: T[] | { items?: T[]; results?: T[]; totalCount?: number; total?: number };
      Data?: T[] | { items?: T[]; results?: T[]; totalCount?: number; total?: number };
      items?: T[];
      results?: T[];
      totalCount?: number;
      total?: number;
    };

export type PageResult<T> = {
  items: T[];
  totalCount: number;
};

export type AccountStatus = "Pending" | "Active" | "Rejected" | "Locked" | "Inactive";
export type BookingStatus =
  | "Available"
  | "Pending"
  | "Confirmed"
  | "CheckIn"
  | "InProgress"
  | "Completed"
  | "Cancelled";

export type AdminBranch = {
  id: string;
  name: string;
  address: string;
  isActive: boolean;
};

export type AdminUser = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone?: string;
  role?: string;
  status?: string;
  isVerified: boolean;
  createdAt?: string;
  faceImages?: string[];
  totalPoints?: number;
  totalWashes?: number;
  tierName?: string;
  tierLevel?: number;
};

export type AdminBooking = {
  id: string;
  branchId?: string;
  branchName: string;
  customerName: string;
  customerEmail?: string;
  vehiclePlate: string;
  bookingDate: string;
  startTime: string;
  endTime?: string;
  status: string;
  note?: string;
  createdAt?: string;
};

export type AdminBookingSlot = {
  id?: string;
  time: string;
  startTime?: string;
  endTime?: string;
  isAvailable: boolean;
  bookingId?: string;
  status?: string;
};

export type DashboardStats = {
  totalBookings: number;
  completedBookings: number;
  cancelledBookings: number;
  totalRevenue: number;
  totalUsers: number;
  newUsers: number;
  [key: string]: unknown;
};

export type RevenueReport = {
  totalRevenue: number;
  totalBookings?: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

export type LoyaltyReport = {
  totalPoints: number;
  details: UnknownRecord[];
  [key: string]: unknown;
};

/**
 * Phân giải URL cho các endpoint quản lý của quản trị viên (Admin).
 * 
 * @param path Hậu tố đường dẫn.
 * @returns Chuỗi URL API đầy đủ.
 */
function adminEndpoint(path: string) {
  return `${apiBase()}/api/v1/admin${path}`;
}

/**
 * Tạo cấu hình header chứa token xác thực.
 * 
 * @param token Token xác thực.
 * @returns Dictionary chứa header Authorization.
 */
function authHeaders(token: string): HeadersInit {
  return { Authorization: `Bearer ${token}` };
}

/**
 * Tạo cấu hình header JSON với token xác thực đi kèm.
 * 
 * @param token Token xác thực.
 * @returns Cấu hình header yêu cầu đầy đủ.
 */
function jsonHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

const IMAGE_OBJECT_VALUE_KEYS = [
  "url",
  "Url",
  "URL",
  "path",
  "Path",
  "imageUrl",
  "ImageUrl",
  "imageURL",
  "ImageURL",
  "imagePath",
  "ImagePath",
  "imageLink",
  "ImageLink",
  "fileUrl",
  "FileUrl",
  "fileURL",
  "FileURL",
  "filePath",
  "FilePath",
  "blobUrl",
  "BlobUrl",
  "src",
  "Src",
  "link",
  "Link",
];

const NESTED_IMAGE_VALUE_KEYS = [
  "urls",
  "Urls",
  "items",
  "Items",
  "images",
  "Images",
  "files",
  "Files",
  "values",
  "Values",
];

/**
 * Hàm trợ giúp để phân tích một chuỗi dạng JSON, trả về kết quả đã phân tích hoặc chuỗi thô nếu thất bại.
 * 
 * @param value Chuỗi giá trị cần phân tích.
 * @returns Đối tượng/mảng đã phân tích hoặc chuỗi gốc.
 */
function parseJsonLike(value: string): unknown {
  const trimmed = value.trim();
  if (!trimmed || (trimmed[0] !== "{" && trimmed[0] !== "[")) return value;

  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
}

/**
 * Ép kiểu các đầu vào không xác định thành định dạng đối tượng record thông thường.
 * Phân tích cú pháp chuỗi JSON nếu phát hiện thấy cấu trúc JSON.
 * 
 * @param value Đối tượng hoặc chuỗi JSON cần chuyển đổi.
 * @returns Đối tượng dạng record dictionary.
 */
function asRecord(value: unknown): UnknownRecord {
  const parsedValue = typeof value === "string" ? parseJsonLike(value) : value;
  return parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)
    ? (parsedValue as UnknownRecord)
    : {};
}

/**
 * Trích xuất đệ quy các mảng chuỗi URL hình ảnh từ các trường dạng JSON hoặc các đối tượng lồng nhau.
 * 
 * @param value Giá trị có thể chứa liên kết hình ảnh.
 * @returns Mảng chứa các URL chuỗi độc nhất.
 */
function readImageValues(value: unknown): string[] {
  const parsedValue = typeof value === "string" ? parseJsonLike(value) : value;

  if (Array.isArray(parsedValue)) {
    return parsedValue.flatMap(readImageValues);
  }

  if (typeof parsedValue === "string") {
    const trimmed = parsedValue.trim();
    if (!trimmed) return [];
    return trimmed
      .split(/[,;\n]/)
      .map((part) => part.trim())
      .filter(Boolean);
  }

  const record = asRecord(parsedValue);
  if (Object.keys(record).length === 0) return [];

  const directValues = IMAGE_OBJECT_VALUE_KEYS.flatMap((key) => readImageValues(record[key]));
  if (directValues.length > 0) return directValues;

  return NESTED_IMAGE_VALUE_KEYS.flatMap((key) => readImageValues(record[key]));
}

/**
 * Lấy giá trị chuỗi từ một đối tượng dictionary bằng cách tìm kiếm trên nhiều tên khóa có thể có.
 * 
 * @param record Đối tượng nguồn.
 * @param keys Các tên khóa có thể có.
 * @param fallback Chuỗi dự phòng nếu không tìm thấy.
 * @returns Giá trị chuỗi đã được giải quyết hoặc chuỗi dự phòng.
 */
function readString(record: UnknownRecord, keys: string[], fallback = ""): string {
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null) {
      return String(value);
    }
  }

  return fallback;
}

/**
 * Lấy một giá trị chuỗi tùy chọn từ đối tượng dictionary.
 * 
 * @param record Đối tượng nguồn.
 * @param keys Các tên khóa có thể có.
 * @returns Chuỗi đã giải quyết hoặc undefined nếu trống.
 */
function readOptionalString(record: UnknownRecord, keys: string[]): string | undefined {
  const value = readString(record, keys);
  return value || undefined;
}

/**
 * Ép kiểu các giá trị trong đối tượng thành giá trị boolean.
 * Hỗ trợ các trạng thái từ khóa dạng chuỗi ("true", "active", "inactive").
 * 
 * @param record Đối tượng nguồn.
 * @param keys Các khóa có thể có.
 * @param fallback Giá trị boolean mặc định dự phòng.
 * @returns Giá trị boolean.
 */
function readBoolean(record: UnknownRecord, keys: string[], fallback = false): boolean {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "boolean") return value;
    if (typeof value === "string") {
      const normalized = value.toLowerCase();
      if (normalized === "true" || normalized === "active") return true;
      if (normalized === "false" || normalized === "inactive" || normalized === "locked") return false;
    }
  }

  return fallback;
}

/**
 * Trích xuất các trường mảng chuỗi (ví dụ: danh sách URL ảnh) từ các khóa trong đối tượng.
 * 
 * @param record Đối tượng nguồn.
 * @param keys Các khóa có thể chứa mảng.
 * @returns Mảng các chuỗi.
 */
function readStringArray(record: UnknownRecord, keys: string[]): string[] {
  for (const key of keys) {
    const values = readImageValues(record[key]);
    if (values.length > 0) return values;
  }
  return [];
}

/**
 * Lấy giá trị số từ đối tượng dictionary bằng cách tìm kiếm trên nhiều khóa có thể.
 * 
 * @param record Đối tượng nguồn.
 * @param keys Các khóa có thể.
 * @param fallback Số dự phòng mặc định.
 * @returns Số hữu hạn đã được giải quyết.
 */
function readNumber(record: UnknownRecord, keys: string[], fallback = 0): number {
  for (const key of keys) {
    const value = Number(record[key]);
    if (Number.isFinite(value)) return value;
  }

  return fallback;
}

/**
 * Giải nén payload dữ liệu từ phong bì phản hồi chuẩn.
 * 
 * @template T Kiểu bản ghi bên trong.
 * @param body Cấu trúc bản ghi được bọc.
 * @returns Kiểu bên trong đã được mở gói.
 */
function unwrapRecord<T>(body: ApiRecord<T>): T {
  if (body && typeof body === "object" && "data" in body && body.data) return body.data;
  if (body && typeof body === "object" && "Data" in body && body.Data) return body.Data;
  return body as T;
}

/**
 * Chuẩn hóa các tập hợp phân trang từ các biến thể phong bì phản hồi REST khác nhau.
 * 
 * @template T Kiểu phần tử.
 * @param body Phản hồi API chứa các tập hợp danh sách.
 * @returns PageResult chứa các phần tử đã được chuẩn hóa.
 */
function unwrapPage<T>(body: ApiList<T>): PageResult<T> {
  if (Array.isArray(body)) return { items: body, totalCount: body.length };

  const data = body.data ?? body.Data;
  if (Array.isArray(data)) return { items: data, totalCount: body.totalCount ?? body.total ?? data.length };

  if (data && !Array.isArray(data)) {
    const items = data.items ?? data.results ?? [];
    return {
      items,
      totalCount: data.totalCount ?? data.total ?? body.totalCount ?? body.total ?? items.length,
    };
  }

  const items = body.items ?? body.results ?? [];
  return { items, totalCount: body.totalCount ?? body.total ?? items.length };
}

/**
 * Định dạng bản ghi chi nhánh thô thành AdminBranch chuẩn hóa.
 * 
 * @param raw Chi tiết chi nhánh thô.
 * @returns Cấu trúc AdminBranch.
 */
function normalizeBranch(raw: unknown): AdminBranch {
  const record = asRecord(raw);
  return {
    id: readString(record, ["id", "Id", "branchId", "BranchId"]),
    name: readString(record, ["name", "Name", "branchName", "BranchName"], "Chi nhánh"),
    address: readString(record, ["address", "Address", "location", "Location"]),
    isActive: readBoolean(record, ["isActive", "IsActive", "status", "Status"], true),
  };
}

/**
 * Chuẩn hóa chi tiết người dùng và các URL hình ảnh sinh trắc học khuôn mặt.
 * Xử lý các cấu trúc phân cấp lồng nhau và phân giải đường dẫn URL tương đối về tuyệt đối.
 * 
 * @param raw Bản ghi chi tiết người dùng thô.
 * @returns Cấu trúc AdminUser đã định dạng.
 */
function normalizeUser(raw: unknown): AdminUser {
  const record = asRecord(raw);
  const profileData = asRecord(record.profileData ?? record.ProfileData);
  const faceData = asRecord(
    record.faceData ??
      record.FaceData ??
      record.faceIdData ??
      record.FaceIdData ??
      record.faceIDData ??
      record.FaceIDData,
  );
  const profileFaceData = asRecord(
    profileData.faceData ??
      profileData.FaceData ??
      profileData.faceIdData ??
      profileData.FaceIdData ??
      profileData.faceIDData ??
      profileData.FaceIDData,
  );
  const firstName =
    readString(record, ["firstName", "FirstName"]) ||
    readString(profileData, ["firstName", "FirstName"]);
  const lastName =
    readString(record, ["lastName", "LastName"]) ||
    readString(profileData, ["lastName", "LastName"]);
  const fullName =
    readString(record, ["fullName", "FullName"]) ||
    readString(profileData, ["fullName", "FullName"]) ||
    `${firstName} ${lastName}`.trim();

  const faceImageKeys = [
    "faceImageUrls",
    "FaceImageUrls",
    "faceImages",
    "FaceImages",
    "facialImages",
    "FacialImages",
    "faceImgUrls",
    "FaceImgUrls",
    "faceImageURL",
    "FaceImageURL",
    "faceImageUrl",
    "FaceImageUrl",
    "faceIdImageUrl",
    "FaceIdImageUrl",
    "faceIDImageUrl",
    "FaceIDImageUrl",
    "faceIdImages",
    "FaceIdImages",
    "faceIDImages",
    "FaceIDImages",
    "faceImage1",
    "FaceImage1",
    "faceImage2",
    "FaceImage2",
    "faceImage3",
    "FaceImage3",
    "faceImageUrl1",
    "FaceImageUrl1",
    "faceImageUrl2",
    "FaceImageUrl2",
    "faceImageUrl3",
    "FaceImageUrl3",
    "faceIdImageUrl1",
    "FaceIdImageUrl1",
    "faceIdImageUrl2",
    "FaceIdImageUrl2",
    "faceIdImageUrl3",
    "FaceIdImageUrl3",
    "imageUrls",
    "ImageUrls",
    "images",
    "Images",
  ];
  const rawImages = Array.from(
    new Set(
      [record, profileData, faceData, profileFaceData].flatMap((source) =>
        readStringArray(source, faceImageKeys),
      ),
    ),
  );

  // Chuyển đổi các đường dẫn tương đối thành URL tuyệt đối bằng cách sử dụng base URL backend
  const base =
    typeof process !== "undefined"
      ? (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
      : "";
  const faceImages = rawImages.map((url) => {
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return trimmedUrl;
    if (/^(https?:|data:|blob:)/i.test(trimmedUrl)) return trimmedUrl;
    if (!base) return trimmedUrl;

    const normalizedBase = base.replace(/\/$/, "");
    return trimmedUrl.startsWith("/")
      ? `${normalizedBase}${trimmedUrl}`
      : `${normalizedBase}/${trimmedUrl}`;
  });

  const tierData = asRecord(
    profileData.tierData ??
      profileData.TierData ??
      record.tierData ??
      record.TierData
  );
  const totalPoints = readNumber(record, ["totalPoints", "TotalPoints"]) || readNumber(profileData, ["totalPoints", "TotalPoints"]);
  const totalWashes = readNumber(record, ["totalWashes", "TotalWashes"]) || readNumber(profileData, ["totalWashes", "TotalWashes"]);
  const tierName = readOptionalString(tierData, ["name", "Name"]);
  const tierLevel = tierData.level !== undefined && tierData.level !== null ? Number(tierData.level) : undefined;

  return {
    id: readString(record, ["id", "Id", "userId", "UserId"]),
    email: readString(record, ["email", "Email"]),
    firstName,
    lastName,
    fullName: fullName || "Người dùng",
    phone: readOptionalString(record, ["phone", "Phone"]),
    role: readOptionalString(record, ["role", "Role"]),
    status: readOptionalString(record, ["status", "Status"]),
    isVerified: readBoolean(record, ["isVerified", "IsVerified", "isVerify", "IsVerify"], false),
    createdAt: readOptionalString(record, ["createdAt", "CreatedAt"]),
    faceImages,
    totalPoints,
    totalWashes,
    tierName,
    tierLevel,
  };
}

/**
 * Chuẩn hóa các bản ghi đặt lịch phức tạp với các mối quan hệ lồng nhau thành AdminBooking.
 * 
 * @param raw Chi tiết lịch đặt thô.
 * @returns Đối tượng AdminBooking đã chuẩn hóa.
 */
function normalizeBooking(raw: unknown): AdminBooking {
  const record = asRecord(raw);
  const branch = asRecord(record.branch);
  const branchUpper = asRecord(record.Branch);
  const user = asRecord(record.user);
  const userUpper = asRecord(record.User);
  const vehicle = asRecord(record.vehicle);
  const vehicleUpper = asRecord(record.Vehicle);

  return {
    id: readString(record, ["id", "Id", "bookingId", "BookingId"]),
    branchId: readOptionalString(record, ["branchId", "BranchId"]),
    branchName:
      readString(record, ["branchName", "BranchName"]) ||
      readString(branch, ["name", "Name"]) ||
      readString(branchUpper, ["name", "Name"], "Chi nhánh"),
    customerName:
      readString(record, ["customerName", "CustomerName", "userName", "UserName"]) ||
      readString(user, ["fullName", "FullName", "email", "Email"]) ||
      readString(userUpper, ["fullName", "FullName", "email", "Email"], "Khách hàng"),
    customerEmail:
      readOptionalString(record, ["customerEmail", "CustomerEmail", "userEmail", "UserEmail"]) ??
      readOptionalString(user, ["email", "Email"]) ??
      readOptionalString(userUpper, ["email", "Email"]),
    vehiclePlate:
      readString(record, ["vehiclePlate", "VehiclePlate", "vehicleLicensePlate", "VehicleLicensePlate", "licensePlate", "LicensePlate"]) ||
      readString(vehicle, ["licensePlate", "LicensePlate", "plateNumber", "PlateNumber"]) ||
      readString(vehicleUpper, ["licensePlate", "LicensePlate", "plateNumber", "PlateNumber"]),
    bookingDate: readString(record, ["bookingDate", "BookingDate", "date", "Date"]),
    startTime: readString(record, ["startTime", "StartTime"]),
    endTime: readOptionalString(record, ["endTime", "EndTime"]),
    status: readString(record, ["status", "Status"], "Pending"),
    note: readOptionalString(record, ["note", "Note"]),
    createdAt: readOptionalString(record, ["createdAt", "CreatedAt"]),
  };
}

/**
 * Chuẩn hóa các bản ghi khung giờ thô cho lịch biểu trực quan của quản trị viên.
 * 
 * @param raw Thuộc tính khung giờ đặt lịch thô.
 * @returns Đối tượng AdminBookingSlot đã chuẩn hóa.
 */
function normalizeSlot(raw: unknown): AdminBookingSlot {
  const record = asRecord(raw);
  const status = readOptionalString(record, ["status", "Status"]);
  return {
    id: readOptionalString(record, ["id", "Id"]),
    time: readString(record, ["time", "Time", "slot", "Slot", "startTime", "StartTime"]),
    startTime: readOptionalString(record, ["startTime", "StartTime"]),
    endTime: readOptionalString(record, ["endTime", "EndTime"]),
    isAvailable:
      readBoolean(record, ["isAvailable", "IsAvailable", "available", "Available"], false) ||
      status === "Available",
    bookingId: readOptionalString(record, ["bookingId", "BookingId"]),
    status,
  };
}

/**
 * Chuẩn hóa dữ liệu số liệu thống kê bảng điều khiển (Dashboard).
 * 
 * @param raw Payload thống kê thô của dashboard.
 * @returns Đối tượng DashboardStats.
 */
function normalizeDashboard(raw: unknown): DashboardStats {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  return {
    totalBookings: readNumber(record, [
      "totalBookings", "TotalBookings",
      "bookingCount", "BookingCount",
      "totalBooking", "TotalBooking",
    ]),
    completedBookings: readNumber(record, [
      "completedBookings", "CompletedBookings",
      "completedBooking", "CompletedBooking",
    ]),
    cancelledBookings: readNumber(record, [
      "cancelledBookings", "CancelledBookings",
      "cancelledBooking", "CancelledBooking",
      "canceledBookings", "CanceledBookings",
    ]),
    totalRevenue: readNumber(record, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"]),
    totalUsers: readNumber(record, [
      "totalUsers", "TotalUsers",
      "userCount", "UserCount",
      "totalUser", "TotalUser",
    ]),
    newUsers: readNumber(record, ["newUsers", "NewUsers", "newUser", "NewUser"]),
    ...record,
  };
}

/**
 * Chuẩn hóa tổng số và mảng dữ liệu báo cáo doanh thu tài chính.
 * 
 * @param raw Phản hồi API doanh thu thô.
 * @returns Cấu trúc RevenueReport đã chuẩn hóa.
 */
function normalizeRevenue(raw: unknown): RevenueReport {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  const details = record.details ?? record.Details ?? record.items ?? record.Items ?? [];
  return {
    totalRevenue: readNumber(record, ["totalRevenue", "TotalRevenue", "revenue", "Revenue"]),
    totalBookings: readNumber(record, ["totalBookings", "TotalBookings"], undefined),
    details: Array.isArray(details) ? (details as UnknownRecord[]) : [],
    ...record,
  };
}

/**
 * Chuẩn hóa báo cáo tích điểm thành viên chi tiết các hoạt động trong hệ thống.
 * 
 * @param raw Chi tiết số liệu tích điểm thành viên thô.
 * @returns Đối tượng LoyaltyReport đã được định dạng.
 */
function normalizeLoyalty(raw: unknown): LoyaltyReport {
  const record = asRecord(unwrapRecord(raw as ApiRecord<unknown>));
  const details = record.details ?? record.Details ?? record.items ?? record.Items ?? [];
  return {
    totalPoints: readNumber(record, ["totalPoints", "TotalPoints", "points", "Points"]),
    details: Array.isArray(details) ? (details as UnknownRecord[]) : [],
    ...record,
  };
}

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Lấy tất cả các chi nhánh phục vụ quản lý, có thể lọc theo trạng thái hoạt động.
 * 
 * @param token Token xác thực của quản trị viên (Admin).
 * @param params Các bộ lọc (trạng thái chi nhánh, từ khóa tìm kiếm tên).
 * @returns Tập hợp mảng AdminBranch.
 */
export async function getBranches(
  token: string,
  params: { isActive?: boolean; keyword?: string } = {},
): Promise<AdminBranch[]> {
  const query = new URLSearchParams();
  if (params.isActive !== undefined) query.set("isActive", String(params.isActive));
  if (params.keyword?.trim()) query.set("keyword", params.keyword.trim());

  const res = await axiosInstance.get<ApiList<unknown>>(`/api/v1/admin/branches?${query.toString()}`);
  return unwrapPage(res.data).items.map(normalizeBranch);
}

/**
 * Tạo một văn phòng chi nhánh kinh doanh mới.
 * 
 * @param token Token xác thực của Admin.
 * @param data Thông tin tên và địa chỉ của chi nhánh.
 * @returns Hứa giải quyết khi chi nhánh được tạo thành công.
 */
export async function createBranch(
  token: string,
  data: { Name: string; Address: string },
): Promise<void> {
  await axiosInstance.post("/api/v1/admin/branches", data);
}

/**
 * Cập nhật chi tiết thông tin hoặc trạng thái của một chi nhánh hiện có.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID chi nhánh cần cập nhật.
 * @param data Các thông tin thay đổi (tên, địa chỉ, trạng thái hoạt động).
 * @returns Hứa giải quyết khi cập nhật hoàn tất.
 */
export async function updateBranch(
  token: string,
  id: string,
  data: { Name?: string; Address?: string; IsActive?: boolean },
): Promise<void> {
  await axiosInstance.patch(`/api/v1/admin/branches/${encodeURIComponent(id)}`, data);
}

/**
 * Xóa một văn phòng chi nhánh khỏi hệ thống.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID chi nhánh đích cần xóa.
 * @returns Hứa giải quyết khi quá trình xóa hoàn tất.
 */
export async function deleteBranch(token: string, id: string): Promise<void> {
  await axiosInstance.delete(`/api/v1/admin/branches/${encodeURIComponent(id)}`);
}

/**
 * Lấy tất cả các hồ sơ khách hàng đã đăng ký trong hệ thống với phân trang.
 * 
 * @param token Token xác thực của Admin.
 * @param params Các giới hạn truy vấn (từ khóa tìm kiếm, giới hạn trang).
 * @returns Kết quả phân trang PageResult của AdminUser.
 */
export async function getUsers(
  token: string,
  params: { searchTerm?: string; pageIndex?: number; pageSize?: number } = {},
): Promise<PageResult<AdminUser>> {
  const query = new URLSearchParams({
    pageIndex: String(params.pageIndex ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.searchTerm?.trim()) query.set("searchTerm", params.searchTerm.trim());

  const res = await axiosInstance.get<ApiList<unknown>>(`/api/v1/admin/users?${query.toString()}`);
  const page = unwrapPage(res.data);
  return { ...page, items: page.items.map(normalizeUser) };
}

/**
 * Lấy danh sách những người dùng mới đăng ký đang chờ phê duyệt sinh trắc học khuôn mặt Face ID.
 * 
 * @param token Token xác thực của Admin.
 * @param params Các bộ lọc tìm kiếm và phân trang.
 * @returns Kết quả PageResult của các hồ sơ đang chờ xác minh.
 */
export async function getPendingUsers(
  token: string,
  params: { searchTerm?: string; pageIndex?: number; pageSize?: number } = {},
): Promise<PageResult<AdminUser>> {
  const query = new URLSearchParams({
    pageIndex: String(params.pageIndex ?? 1),
    pageSize: String(params.pageSize ?? 10),
  });
  if (params.searchTerm?.trim()) query.set("searchTerm", params.searchTerm.trim());

  const res = await axiosInstance.get<ApiList<unknown>>(`/api/v1/admin/users/pending-verification?${query.toString()}`);
  const page = unwrapPage(res.data);
  return { ...page, items: page.items.map(normalizeUser) };
}

/**
 * Lấy chi tiết thông tin của một người dùng bao gồm cả các hình ảnh Face ID đã tải lên.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID của người dùng cần truy vấn.
 * @returns Chi tiết dữ liệu AdminUser.
 */
export async function getUser(token: string, id: string): Promise<AdminUser> {
  const res = await axiosInstance.get<ApiRecord<unknown>>(`/api/v1/admin/users/${encodeURIComponent(id)}`);
  return normalizeUser(unwrapRecord(res.data));
}

/**
 * Phê duyệt và xác thực cấu hình sinh trắc học Face ID cho một hồ sơ người dùng.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID người dùng cần xác minh.
 * @returns Hứa giải quyết khi cập nhật xác minh thành công.
 */
export async function verifyUser(token: string, id: string): Promise<void> {
  await axiosInstance.patch(`/api/v1/admin/users/${encodeURIComponent(id)}/approval`);
}

/**
 * Từ chối hồ sơ Face ID của người dùng.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID người dùng.
 * @param rejectReason Lý do từ chối.
 * @returns Hứa giải quyết khi cập nhật thành công.
 */
export async function rejectUser(
  token: string,
  id: string,
  rejectReason: string,
): Promise<void> {
  await axiosInstance.patch(`/api/v1/admin/users/${encodeURIComponent(id)}/reject`, { rejectReason: rejectReason });
}

/**
 * Cập nhật cờ trạng thái tài khoản của người dùng (Active, Locked, Inactive).
 * 
 * @param token Token xác thực của Admin.
 * @param id ID người dùng cần cập nhật.
 * @param status Trạng thái AccountStatus đích.
 * @returns Hứa giải quyết khi cập nhật thành công.
 */
export async function updateUserStatus(
  token: string,
  id: string,
  status: AccountStatus,
): Promise<void> {
  await axiosInstance.patch(`/api/v1/admin/users/${encodeURIComponent(id)}/status`, { Status: status });
}

/**
 * Truy vấn trạng thái hiện tại của một người dùng cụ thể.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID người dùng cần truy vấn.
 * @returns Chuỗi đại diện cho trạng thái hiện tại của người dùng.
 */
export async function getUserStatus(token: string, id: string): Promise<string> {
  const res = await axiosInstance.get<ApiRecord<unknown>>(`/api/v1/admin/users/${encodeURIComponent(id)}/status`);
  const body = asRecord(unwrapRecord(res.data));
  return readString(body, ["status", "Status"]);
}

/**
 * Lấy tất cả lịch đặt lịch trên toàn bộ các chi nhánh dành cho quản trị viên.
 * Hỗ trợ lọc theo ngày, chi nhánh cụ thể và trạng thái lịch đặt.
 * 
 * @param token Token xác thực của Admin.
 * @param params Các ràng buộc truy vấn (BranchId, Date, Status, PageIndex, PageSize).
 * @returns Kết quả phân trang PageResult của AdminBooking.
 */
export async function getAdminBookings(
  token: string,
  params: {
    BranchId?: string;
    Date?: string;
    Status?: BookingStatus | string;
    PageIndex?: number;
    PageSize?: number;
  } = {},
): Promise<PageResult<AdminBooking>> {
  const query = new URLSearchParams({
    PageIndex: String(params.PageIndex ?? 1),
    PageSize: String(params.PageSize ?? 10),
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);
  if (params.Date) query.set("Date", params.Date);
  if (params.Status) query.set("Status", params.Status);

  const res = await axiosInstance.get<ApiList<unknown>>(`/api/v1/admin/bookings?${query.toString()}`);
  const page = unwrapPage(res.data);
  return { ...page, items: page.items.map(normalizeBooking) };
}

/**
 * Lấy nhật ký trạng thái các khung giờ đặt lịch phục vụ cho việc theo dõi lịch biểu.
 * 
 * @param token Token xác thực của Admin.
 * @param params Các ràng buộc truy vấn (BranchId, Date, Phân trang).
 * @returns Kết quả phân trang PageResult của AdminBookingSlot.
 */
export async function getBookingSlots(
  token: string,
  params: { BranchId: string; Date: string; PageIndex?: number; PageSize?: number },
): Promise<PageResult<AdminBookingSlot>> {
  const query = new URLSearchParams({
    BranchId: params.BranchId,
    Date: params.Date,
    PageIndex: String(params.PageIndex ?? 1),
    PageSize: String(params.PageSize ?? 10),
  });

  const res = await axiosInstance.get<ApiList<unknown>>(`/api/v1/admin/booking-slots?${query.toString()}`);
  const page = unwrapPage(res.data);
  return { ...page, items: page.items.map(normalizeSlot) };
}

/**
 * Hoàn thành một lịch đặt sau khi dịch vụ rửa xe đã được thực hiện xong, ghi nhận các lưu ý đóng của Admin.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID của lịch đặt đích.
 * @param note Ghi chú/báo cáo về dịch vụ đã thực hiện hoàn thành.
 * @returns Hứa giải quyết khi trạng thái được hoàn tất trong database.
 */
export async function completeBooking(token: string, id: string, note: string): Promise<void> {
  await axiosInstance.post(`/api/v1/admin/bookings/${encodeURIComponent(id)}/complete`, { Note: note });
}

/**
 * Thực hiện check-in cho một lịch đặt chỗ từ giao diện quản trị viên.
 * Nhắm mục tiêu chính xác đến endpoint đặt lịch của khách hàng thay vì namespace quản trị để tránh lỗi 404.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID của lịch đặt.
 * @returns Hứa giải quyết khi check-in hoàn tất.
 */
export async function checkInAdminBooking(token: string, id: string): Promise<void> {
  await axiosInstance.post(`/api/v1/bookings/${encodeURIComponent(id)}/check-in`, {});
}

/**
 * Hủy một lịch đặt chỗ bằng đặc quyền của Admin.
 * 
 * @param token Token xác thực của Admin.
 * @param id ID lịch đặt cần hủy.
 * @param reason Lý do hủy lịch phục vụ kiểm toán hệ thống.
 * @returns Hứa giải quyết khi việc hủy lịch hoàn tất.
 */
export async function cancelAdminBooking(
  token: string,
  id: string,
  reason: string,
): Promise<void> {
  await axiosInstance.post(`/api/v1/admin/bookings/${encodeURIComponent(id)}/cancel`, { Reason: reason });
}

/**
 * Lấy các chỉ số hoạt động chung của hệ thống cho các bảng biểu tóm tắt của Admin.
 * 
 * @param token Token xác thực của Admin.
 * @param params Phạm vi ngày truy vấn (FromDate, ToDate, BranchId tùy chọn).
 * @returns Tóm tắt các chỉ số DashboardStats.
 */
export async function getDashboardStats(
  token: string,
  params: { FromDate: string; ToDate: string; BranchId?: string },
): Promise<DashboardStats> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);

  const res = await axiosInstance.get<unknown>(`/api/v1/admin/dashboard?${query.toString()}`);
  return normalizeDashboard(res.data);
}

/**
 * Lấy các thống kê báo cáo doanh thu theo chi nhánh và thời gian được chọn.
 * 
 * @param token Token xác thực của Admin.
 * @param params Phạm vi ngày truy vấn (FromDate, ToDate, BranchId tùy chọn).
 * @returns Dữ liệu chi tiết RevenueReport.
 */
export async function getRevenueReport(
  token: string,
  params: { FromDate: string; ToDate: string; BranchId?: string },
): Promise<RevenueReport> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });
  if (params.BranchId) query.set("BranchId", params.BranchId);

  const res = await axiosInstance.get<unknown>(`/api/v1/admin/reports/revenue?${query.toString()}`);
  return normalizeRevenue(res.data);
}

/**
 * Lấy tổng số lượng giao dịch điểm và các báo cáo hoạt động điểm thành viên.
 * 
 * @param token Token xác thực của Admin.
 * @param params Phạm vi ngày.
 * @returns Tập dữ liệu LoyaltyReport.
 */
export async function getLoyaltyReport(
  token: string,
  params: { FromDate: string; ToDate: string },
): Promise<LoyaltyReport> {
  const query = new URLSearchParams({
    FromDate: params.FromDate,
    ToDate: params.ToDate,
  });

  const res = await axiosInstance.get<unknown>(`/api/v1/admin/reports/loyalty?${query.toString()}`);
  return normalizeLoyalty(res.data);
}
