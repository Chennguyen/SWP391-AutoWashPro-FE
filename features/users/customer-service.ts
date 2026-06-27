import { apiBase, handleApiResponse } from "@/lib/api-error";

import { CustomerProfile, UpdateCustomerProfilePayload } from "./types/user-types";
export { type CustomerProfile, type UpdateCustomerProfilePayload };

type CustomerProfileRecord = {
  firstName?: string;
  FirstName?: string;
  lastName?: string;
  LastName?: string;
  cccd?: string;
  Cccd?: string;
  CCCD?: string;
  status?: string;
  Status?: string;
  rejectReason?: string;
  RejectReason?: string;
};

type CustomerProfileResponse =
  | CustomerProfileRecord
  | {
      data?: CustomerProfileRecord;
    };

/**
 * Hàm bổ trợ để phân giải đường dẫn endpoint cho các API hồ sơ người dùng.
 * 
 * @param path Suffix đường dẫn tương đối tùy chọn.
 * @returns Chuỗi URL endpoint API đầy đủ cho endpoint me của người dùng hiện tại.
 */
function customerEndpoint(path = "") {
  return `${apiBase()}/api/v1/me${path}`;
}

/**
 * Trích xuất payload hồ sơ thô từ nội dung phản hồi API lồng nhau.
 * 
 * @param body Phản hồi hồ sơ khách hàng không phân biệt chữ hoa/thường.
 * @returns Bản ghi dữ liệu hồ sơ khách hàng thô.
 */
function unwrapProfile(body: CustomerProfileResponse): CustomerProfileRecord {
  return "data" in body && body.data ? body.data : (body as CustomerProfileRecord);
}

/**
 * Chuẩn hóa chi tiết hồ sơ khách hàng để đảm bảo định dạng đồng nhất.
 * Giải quyết các khác biệt về cách viết hoa/thường của tên trường giữa các phiên bản backend khác nhau.
 * 
 * @param body Cấu trúc phản hồi thô.
 * @returns Đối tượng CustomerProfile đã chuẩn hóa.
 */
function normalizeProfile(body: CustomerProfileResponse): CustomerProfile {
  const data = unwrapProfile(body) as any;
  const profileData = data.profileData ?? data.ProfileData ?? data;

  return {
    firstName: profileData.firstName ?? profileData.FirstName ?? data.firstName ?? data.FirstName ?? "",
    lastName: profileData.lastName ?? profileData.LastName ?? data.lastName ?? data.LastName ?? "",
    cccd: profileData.cccd ?? profileData.Cccd ?? profileData.CCCD ?? data.cccd ?? data.Cccd ?? data.CCCD ?? "",
    email: data.email ?? data.Email ?? "",
    phone: data.phone ?? data.Phone ?? "",
    status: profileData.status ?? profileData.Status ?? data.status ?? data.Status,
    rejectReason: profileData.rejectReason ?? profileData.RejectReason ?? data.rejectReason ?? data.RejectReason,
  };
}

/**
 * Lấy thông tin hồ sơ của khách hàng hiện tại đang đăng nhập.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành dữ liệu CustomerProfile.
 */
export async function getCustomerProfile(token: string): Promise<CustomerProfile> {
  const res = await fetch(customerEndpoint(), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      Pragma: "no-cache",
    },
  });

  const body = await handleApiResponse<CustomerProfileResponse>(res);
  return normalizeProfile(body);
}

/**
 * Cập nhật thông tin hồ sơ của khách hàng đang đăng nhập.
 * 
 * @param token Token xác thực.
 * @param payload Các trường cập nhật (firstName, lastName, số CCCD).
 * @returns Một promise giải quyết thành CustomerProfile đã được cập nhật.
 */
export async function updateCustomerProfile(
  token: string,
  payload: UpdateCustomerProfilePayload,
): Promise<CustomerProfile> {
  const res = await fetch(customerEndpoint(), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  const body = await handleApiResponse<CustomerProfileResponse>(res);
  return normalizeProfile(body);
}

/**
 * Cập nhật mật khẩu cho tài khoản khách hàng hiện tại.
 * 
 * @param token Token xác thực.
 * @param currentPassword Chuỗi mật khẩu hiện tại.
 * @param newPassword Chuỗi mật khẩu mới.
 * @param confirmPassword Xác nhận chuỗi mật khẩu mới.
 * @returns Một promise giải quyết khi việc đổi mật khẩu hoàn tất.
 */
export async function changeCustomerPassword(
  token: string,
  currentPassword: string,
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  const res = await fetch(customerEndpoint("/password"), {
    method: "PATCH",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
  });

  await handleApiResponse<unknown>(res);
}

/**
 * Lấy trạng thái xác minh FaceID của khách hàng hiện tại.
 * 
 * @param token Token xác thực.
 * @returns Trạng thái xác minh và lý do từ chối nếu có.
 */
export async function getMyVerificationStatus(
  token: string,
): Promise<CustomerProfile & { status: string; rejectReason: string }> {
  const res = await fetch(customerEndpoint("/my-status"), {
    method: "GET",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
  });

  const body = await handleApiResponse<CustomerProfileResponse>(res);
  const profile = normalizeProfile(body);
  
  return {
    ...profile,
    status: profile.status ?? "",
    rejectReason: profile.rejectReason ?? "",
  };
}

/**
 * Gửi lại thông tin hồ sơ và FaceID để xác minh.
 * 
 * @param token Token xác thực.
 * @param payload Dữ liệu form bao gồm họ tên và 3 ảnh khuôn mặt.
 * @returns Một promise giải quyết khi việc gửi lại thông tin thành công.
 */
export async function resubmitVerification(
  token: string,
  payload: { firstName: string; lastName: string; faceImages: File[] },
): Promise<void> {
  const formData = new FormData();
  formData.append("FirstName", payload.firstName);
  formData.append("LastName", payload.lastName);
  
  for (const image of payload.faceImages) {
    formData.append("FaceImages", image);
  }

  const res = await fetch(customerEndpoint("/verification-resubmission"), {
    method: "POST",
    cache: "no-store",
    headers: {
      Authorization: `Bearer ${token}`,
      // Không set Content-Type, trình duyệt sẽ tự động set boundary cho multipart/form-data
    },
    body: formData,
  });

  await handleApiResponse<unknown>(res);
}
