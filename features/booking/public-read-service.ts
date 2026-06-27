import type { Branch } from "@/features/booking/types/booking-types";
import { apiBase, handleApiResponse } from "@/lib/api-error";

type BranchRecord = {
  id?: string | number;
  Id?: string | number;
  branchId?: string | number;
  BranchId?: string | number;
  name?: string;
  Name?: string;
  branchName?: string;
  BranchName?: string;
  address?: string;
  Address?: string;
  location?: string;
  Location?: string;
  openTime?: string;
  OpenTime?: string;
  closeTime?: string;
  CloseTime?: string;
  isActive?: boolean;
  IsActive?: boolean;
  status?: string;
  Status?: string;
};

type BranchListResponse =
  | BranchRecord[]
  | {
      data?: BranchRecord[] | { items?: BranchRecord[]; results?: BranchRecord[] };
      items?: BranchRecord[];
      results?: BranchRecord[];
    };

/**
 * Chuẩn hóa một bản ghi chi nhánh thô từ API để phù hợp với schema Branch của UI.
 * Hỗ trợ các trường dự phòng cho địa điểm (location) và cách viết hoa/thường.
 * 
 * @param raw Thuộc tính chi nhánh thô.
 * @returns Đối tượng chi nhánh Branch đã chuẩn hóa.
 */
function normalizeBranch(raw: BranchRecord): Branch {
  const status = raw.status ?? raw.Status;
  const isActive =
    raw.isActive ?? raw.IsActive ?? status?.toUpperCase() === "ACTIVE";

  return {
    id: String(raw.id ?? raw.Id ?? raw.branchId ?? raw.BranchId ?? ""),
    name:
      raw.name ??
      raw.Name ??
      raw.branchName ??
      raw.BranchName ??
      "Chi nhánh AutoWash Pro",
    address: raw.address ?? raw.Address ?? raw.location ?? raw.Location ?? "",
    openTime: raw.openTime ?? raw.OpenTime ?? "08:00",
    closeTime: raw.closeTime ?? raw.CloseTime ?? "17:00",
    status: isActive ? "ACTIVE" : "INACTIVE",
  };
}

/**
 * Giải nén các mảng chi nhánh từ các phong bì phản hồi REST khác nhau.
 * 
 * @param body Phản hồi API chứa danh sách chi nhánh.
 * @returns Mảng các chi nhánh đã chuẩn hóa.
 */
function normalizeBranches(body: BranchListResponse): Branch[] {
  if (Array.isArray(body)) {
    return body.map(normalizeBranch);
  }

  const data = body.data;
  if (Array.isArray(data)) {
    return data.map(normalizeBranch);
  }

  if (data && !Array.isArray(data)) {
    return (data.items ?? data.results ?? []).map(normalizeBranch);
  }

  return (body.items ?? body.results ?? []).map(normalizeBranch);
}

/**
 * Lấy tất cả các chi nhánh hoạt động trong hệ thống.
 * Hỗ trợ truy vấn công khai (không cần token xác thực) và tìm kiếm theo từ khóa.
 * 
 * @param keyword Từ khóa tìm kiếm tên chi nhánh tùy chọn.
 * @param token Token xác thực tùy chọn.
 * @returns Một promise giải quyết thành danh sách mảng các chi nhánh Branch.
 */
export async function getBranches(keyword = "", token = ""): Promise<Branch[]> {
  const params = new URLSearchParams();

  if (keyword.trim()) {
    params.set("keyword", keyword.trim());
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const query = params.toString();
  const res = await fetch(
    `${apiBase()}/api/v1/branches${query ? `?${query}` : ""}`,
    {
      cache: "no-store",
      headers,
    },
  );
  const body = await handleApiResponse<BranchListResponse>(res);
  return normalizeBranches(body);
}
