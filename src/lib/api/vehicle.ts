import type {
  AddVehiclePayload,
  UpdateVehiclePayload,
  Vehicle,
  VehicleType,
} from "@/types/vehicle";
import { apiBase, handleApiResponse } from "./api-error";

type VehicleRecord = {
  id?: string | number;
  Id?: string | number;
  ID?: string | number;
  vehicleId?: string | number;
  vehicleID?: string | number;
  VehicleId?: string | number;
  VehicleID?: string | number;
  plateNumber?: string;
  PlateNumber?: string;
  licensePlate?: string;
  LicensePlate?: string;
  brand?: string;
  Brand?: string;
  model?: string;
  Model?: string;
  color?: string;
  Color?: string;
  vehicleType?: VehicleType;
  VehicleType?: VehicleType;
  licensePlateImageUrl?: string;
  LicensePlateImageUrl?: string;
};

type VehicleListResponse =
  | VehicleRecord[]
  | {
      data?: VehicleRecord[] | { items?: VehicleRecord[]; results?: VehicleRecord[] };
      items?: VehicleRecord[];
      results?: VehicleRecord[];
    };

/**
 * Xây dựng URL cho các endpoint danh sách xe.
 * 
 * @param path Đường dẫn hậu tố.
 * @returns Chuỗi URL API đầy đủ.
 */
function vehiclesEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/vehicles${path}`;
}

/**
 * Xây dựng URL cho các endpoint xe cá nhân theo ID.
 * 
 * @param id Khóa định danh của xe.
 * @param query Các tham số truy vấn tùy chọn.
 * @returns Chuỗi URL API đầy đủ.
 */
function vehicleEndpoint(id: string, query = ""): string {
  const suffix = query ? `?${query}` : "";
  return vehiclesEndpoint(`/${encodeURIComponent(id)}${suffix}`);
}

/**
 * Ép kiểu các đầu vào không xác định thành kiểu chuỗi chuẩn, xử lý các giá trị null/undefined.
 * 
 * @param value Giá trị cần kiểm tra.
 * @returns Biểu diễn chuỗi.
 */
function stringValue(value: unknown): string {
  if (value === undefined || value === null) {
    return "";
  }

  return String(value);
}

/**
 * Chuẩn hóa một bản ghi xe thô từ API để phù hợp với schema Vehicle của UI.
 * Xử lý các biến thể trong viết hoa/thường của tên trường.
 * 
 * @param raw Bản ghi xe thô từ API.
 * @returns Giao diện Vehicle đã chuẩn hóa.
 */
function normalizeVehicle(raw: VehicleRecord): Vehicle {
  const id = stringValue(
    raw.vehicleId ??
      raw.vehicleID ??
      raw.VehicleId ??
      raw.VehicleID ??
      raw.id ??
      raw.Id ??
      raw.ID,
  );
  const licensePlate = stringValue(
    raw.licensePlate ?? raw.LicensePlate ?? raw.plateNumber ?? raw.PlateNumber,
  );

  return {
    id: id || licensePlate,
    plateNumber: licensePlate,
    licensePlate,
    brand: stringValue(raw.brand ?? raw.Brand),
    model: stringValue(raw.model ?? raw.Model),
    color: stringValue(raw.color ?? raw.Color),
    vehicleType: raw.vehicleType ?? raw.VehicleType ?? "OTHER",
    licensePlateImageUrl: raw.licensePlateImageUrl ?? raw.LicensePlateImageUrl,
  };
}

/**
 * Phân giải danh sách xe từ các biến thể khác nhau của phong bì phản hồi REST.
 * 
 * @param body Phản hồi API chứa tập hợp các xe.
 * @returns Mảng Vehicle đã được chuẩn hóa.
 */
function normalizeVehicles(body: VehicleListResponse): Vehicle[] {
  if (Array.isArray(body)) {
    return body.map(normalizeVehicle);
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data.map(normalizeVehicle);
  }

  if (data && !Array.isArray(data)) {
    return (data.items ?? data.results ?? []).map(normalizeVehicle);
  }

  return (body.items ?? body.results ?? []).map(normalizeVehicle);
}

/**
 * Giải nén các bản ghi chi tiết xe đơn lẻ từ các cấu trúc phong bì có thể có.
 * 
 * @param body Phản hồi API chứa thông tin xe.
 * @returns Bản ghi thông tin xe thô.
 */
function unwrapVehicle(body: VehicleRecord | { data?: VehicleRecord }): VehicleRecord {
  return "data" in body && body.data ? body.data : (body as VehicleRecord);
}

/**
 * Lấy danh sách xe đã được phân trang được đăng ký với hồ sơ khách hàng đã xác thực.
 * 
 * @param token Token xác thực.
 * @param page Chỉ số trang đích.
 * @param pageSize Số lượng bản ghi trên mỗi trang.
 * @returns Một promise giải quyết thành mảng Vehicle.
 */
export async function getVehicles(token: string, page = 1, pageSize = 20): Promise<Vehicle[]> {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });

  const res = await fetch(vehiclesEndpoint(`?${params.toString()}`), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });
  const body = await handleApiResponse<VehicleListResponse>(res);
  return normalizeVehicles(body);
}

/**
 * Lấy thông tin của một chiếc xe duy nhất theo ID.
 * 
 * @param token Token xác thực.
 * @param id Khóa định danh của xe.
 * @returns Một promise giải quyết thành thông tin Vehicle.
 */
export async function getVehicle(token: string, id: string): Promise<Vehicle> {
  const params = new URLSearchParams({
    _: String(Date.now()),
  });

  const res = await fetch(vehicleEndpoint(id, params.toString()), {
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

/**
 * Đăng ký một chiếc xe mới với tệp tải ảnh lên (yêu cầu multipart/form-data).
 * 
 * @param token Token xác thực.
 * @param payload Dữ liệu xe thêm mới (biển số, hãng xe, dòng xe, màu xe, tệp ảnh biển số).
 * @returns Một promise giải quyết thành chiếc xe Vehicle mới được đăng ký.
 */
export async function addVehicle(
  token: string,
  payload: AddVehiclePayload,
): Promise<Vehicle> {
  const form = new FormData();
  form.append("LicensePlate", payload.licensePlate);
  form.append("Brand", payload.brand);
  form.append("Model", payload.model);
  form.append("Color", payload.color);
  form.append("LicensePlateImageUrl", payload.licensePlateImageFile);

  const res = await fetch(vehiclesEndpoint(), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: form,
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

/**
 * Cập nhật thông tin các trường của một chiếc xe hiện có.
 * 
 * @param token Token xác thực.
 * @param id ID của xe đích cần cập nhật.
 * @param payload Các trường thông tin cần cập nhật (hãng xe, dòng xe, màu xe).
 * @returns Một promise giải quyết thành đối tượng xe Vehicle đã được cập nhật.
 */
export async function updateVehicle(
  token: string,
  id: string,
  payload: UpdateVehiclePayload,
): Promise<Vehicle> {
  const res = await fetch(vehicleEndpoint(id), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      brand: payload.brand,
      model: payload.model,
      color: payload.color,
    }),
  });
  const body = await handleApiResponse<VehicleRecord | { data?: VehicleRecord }>(res);
  return normalizeVehicle(unwrapVehicle(body));
}

/**
 * Hủy liên kết hoặc xóa một bản ghi xe khỏi hồ sơ khách hàng.
 * 
 * @param token Token xác thực.
 * @param id ID của xe cần xóa.
 * @returns Một promise giải quyết khi xe đã được xóa thành công.
 */
export async function deleteVehicle(token: string, id: string): Promise<void> {
  const res = await fetch(vehicleEndpoint(id), {
    method: "DELETE",
    cache: "no-store",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
  });

  if (res.status === 204) {
    return;
  }

  await handleApiResponse<unknown>(res);
}
