// ─── Loyalty Admin API ────────────────────────────────────────────────────────
import { apiBase, handleApiResponse } from "./api-error";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * AdminTier
 * Sơ đồ cấu trúc đại diện cho Cấu hình Hạng thành viên của backend.
 */
export type AdminTier = {
  id: string;
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description?: string;
};

export type CreateTierPayload = {
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description?: string;
};

export type UpdateTierPayload = Partial<{
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  description: string;
}>;

/**
 * LoyaltyPointsConfig
 * Đối tượng cấu hình đã phân tích chứa tỉ lệ quy đổi điểm và thời gian hoạt động hệ thống.
 */
export type LoyaltyPointsConfig = {
  vndPerPoint: number;      // configKey: "point_earn_rate"
  slotDurationMinutes?: number; // configKey: "SlotDurationMinutes"
  workingStartHour?: string;    // configKey: "WorkingStartHour"
  workingEndHour?: string;      // configKey: "WorkingEndHour"
};

export type LoyaltyPointsConfigRaw = {
  configKey: string;
  configValue: string;
};

/** rewardType là integer enum: 0 = FREE_WASH, 1 = VOUCHER, 2 = GIFT */
export type AdminRewardTypeEnum = 0 | 1 | 2;
export type AdminRewardType = "FREE_WASH" | "VOUCHER" | "GIFT" | string;

export const REWARD_TYPE_MAP: Record<AdminRewardTypeEnum, AdminRewardType> = {
  0: "FREE_WASH",
  1: "VOUCHER",
  2: "GIFT",
};

export const REWARD_TYPE_REVERSE: Record<string, AdminRewardTypeEnum> = {
  FREE_WASH: 0,
  VOUCHER: 1,
  GIFT: 2,
};

export type AdminReward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: AdminRewardType;
  rewardTypeEnum: AdminRewardTypeEnum;
  quantityAvailable: number | null;
  validDays: number | null;
  isActive: boolean;
};

export type CreateRewardPayload = {
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: AdminRewardTypeEnum;   // integer enum
  quantityAvailable: number;
  validDays: number;
  isActive: boolean;
  allowedTierIds?: string[];
};

export type UpdateRewardPayload = Partial<{
  name: string;
  description: string;
  pointsRequired: number;
  quantityAvailable: number;
  validDays: number;
  isActive: boolean;
  allowedTierIds: string[];
}>;

export type AdminPromotion = {
  id: string;
  name: string;
  description: string;
  discountType: string;   // "Percentage" or "FixedAmount"
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  isActive?: boolean;
};

export type CreatePromotionPayload = {
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  applicableTierIds?: string[];
};

export type AdjustPointsAction = "ADD" | "SUBTRACT";

export type AdjustPointsPayload = {
  action: AdjustPointsAction;
  points: number;
  reason: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

/**
 * Ép kiểu các đầu vào không xác định thành các đối tượng dictionary thông thường.
 * 
 * @param value Giá trị cần kiểm tra.
 * @returns Đối tượng record dictionary.
 */
function rec(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : {};
}

/**
 * Đọc giá trị chuỗi từ đối tượng dictionary bằng cách tìm kiếm trên nhiều tên khóa có thể.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Các tên khóa có thể có.
 * @param fallback Chuỗi mặc định dự phòng.
 * @returns Chuỗi giải quyết được.
 */
function str(obj: Rec, keys: string[], fallback = ""): string {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
  }
  return fallback;
}

/**
 * Đọc một số hữu hạn từ đối tượng dictionary bằng cách kiểm tra nhiều khóa có thể.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Các khóa có thể có.
 * @param fallback Số mặc định dự phòng.
 * @returns Số hữu hạn đã được giải quyết.
 */
function num(obj: Rec, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return fallback;
}

/**
 * Đọc một số tùy chọn từ đối tượng dictionary, trả về null nếu trống hoặc không phải số hữu hạn.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Các khóa có thể.
 * @returns Số đã được phân giải hoặc null.
 */
function optNum(obj: Rec, keys: string[]): number | null {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Đọc một cờ boolean từ các khóa của đối tượng dictionary, xử lý các trường hợp chuỗi true/false/0/1.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Các khóa có thể.
 * @param fallback Mặc định dự phòng.
 * @returns Giá trị boolean.
 */
function bool(obj: Rec, keys: string[], fallback = false): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return fallback;
}

/**
 * Giải nén các bản ghi lồng nhau từ các phong bì phản hồi bên ngoài.
 * 
 * @param body Phản hồi của API.
 * @returns Bản ghi bên trong.
 */
function unwrap(body: unknown): Rec {
  const r = rec(body);
  if (r.data !== undefined) return rec(r.data);
  if (r.Data !== undefined) return rec(r.Data);
  return r;
}

/**
 * Trích xuất danh sách mảng từ phong bì phản hồi REST.
 * 
 * @param body Phản hồi API chứa danh sách mảng.
 * @returns Mảng các phần tử được trích xuất.
 */
function unwrapList(body: unknown): unknown[] {
  const r = rec(body);
  if (Array.isArray(body)) return body;
  if (Array.isArray(r.data)) return r.data as unknown[];
  if (Array.isArray(r.Data)) return r.Data as unknown[];
  if (Array.isArray(r.items)) return r.items as unknown[];
  if (Array.isArray(r.results)) return r.results as unknown[];
  const inner = rec(r.data ?? r.Data);
  if (Array.isArray(inner.items)) return inner.items as unknown[];
  if (Array.isArray(inner.results)) return inner.results as unknown[];
  return [];
}

/**
 * Xây dựng URL cho các endpoint cấu hình loyalty quản trị.
 */
function loyaltyAdminEndpoint(path: string): string {
  return `${apiBase()}/api/v1/loyalty/admin${path}`;
}

/**
 * Xây dựng URL cho các endpoint cấu hình hạng thành viên quản trị.
 */
function tierEndpoint(path: string): string {
  return `${apiBase()}/Tier/admin${path}`;
}

/**
 * Xây dựng URL cho các endpoint cấu hình phần thưởng quản trị.
 */
function rewardEndpoint(path: string): string {
  return `${apiBase()}/Reward/admin${path}`;
}

/**
 * Xây dựng URL cho các endpoint cấu hình khuyến mại quản trị.
 */
function promotionEndpoint(path: string): string {
  return `${apiBase()}/Promotion/admin${path}`;
}

/**
 * Xây dựng URL cho các endpoint admin cũ.
 */
function legacyAdminEndpoint(path: string): string {
  return `${apiBase()}/api/v1/admin${path}`;
}

/**
 * Xây dựng cấu hình header yêu cầu với token xác thực đi kèm.
 */
function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

/**
 * Định dạng các thuộc tính hạng thô thành cấu trúc AdminTier.
 * 
 * @param raw Bản ghi hạng thô.
 * @returns Đối tượng AdminTier đã chuẩn hóa.
 */
function normalizeTier(raw: unknown): AdminTier {
  const r = rec(raw);
  const benefitsRec = rec(r.benefits ?? r.Benefits);
  return {
    id: str(r, ["id", "Id", "tierId", "TierId"]),
    name: str(r, ["name", "Name", "tierName", "TierName"], "Tier"),
    level: num(r, ["level", "Level"], 1),
    requiredWashes: num(r, ["requiredWashes", "RequiredWashes", "required_washes", "minWashes", "MinWashes"], 0),
    priorityBookingDays:
      optNum(r, ["priorityBookingDays", "PriorityBookingDays", "priority_booking_days"]) ??
      optNum(benefitsRec, ["priorityBookingDays", "priority_booking_days"]) ??
      0,
    description: str(r, ["description", "Description"]) || undefined,
  };
}

/**
 * Định dạng chuỗi giờ hoạt động về dạng biểu diễn chuẩn HH:MM.
 * 
 * @param val Chuỗi giờ hoạt động thô đầu vào.
 * @returns Định dạng thời gian chuẩn HH:00.
 */
function formatHourString(val: string): string {
  const raw = val.trim();
  if (raw.includes(":")) {
    const parts = raw.split(":");
    return `${parts[0].padStart(2, "0")}:00`;
  }
  const n = parseInt(raw, 10);
  if (!isNaN(n) && n >= 0 && n <= 24) {
    return `${String(n).padStart(2, "0")}:00`;
  }
  return raw;
}

/**
 * Chuẩn hóa các cài đặt tham số hệ thống (tỉ lệ điểm, thời gian làm việc) từ các khóa cấu hình.
 * 
 * @param body Phản hồi API chứa cấu hình điểm.
 * @returns Cấu hình LoyaltyPointsConfig đã phân tích.
 */
function normalizeSettings(body: unknown): LoyaltyPointsConfig {
  const list = unwrapList(body);
  let vndPerPoint = 10000;
  let slotDurationMinutes = 15;
  let workingStartHour = "08:00";
  let workingEndHour = "17:00";

  for (const item of list) {
    const r = rec(item);
    const key = str(r, ["configKey", "ConfigKey", "key", "Key"]);
    const value = str(r, ["configValue", "ConfigValue", "value", "Value"]);
    if (key === "point_earn_rate" && value) {
      try {
        const parsed = JSON.parse(value) as Record<string, unknown>;
        const v = Number(parsed["VND_per_point"] ?? parsed["vnd_per_point"]);
        if (Number.isFinite(v)) vndPerPoint = v;
      } catch {
        // ignore parse error
      }
    } else if (key === "SlotDurationMinutes" && value) {
      const v = Number(value);
      if (Number.isFinite(v) && v > 0) slotDurationMinutes = v;
    } else if (key === "WorkingStartHour" && value) {
      workingStartHour = formatHourString(value);
    } else if (key === "WorkingEndHour" && value) {
      workingEndHour = formatHourString(value);
    }
  }

  // Dự phòng: nếu body là một đối tượng duy nhất (không phải mảng)
  if (list.length === 0) {
    const r = unwrap(body);
    vndPerPoint = num(r, [
      "earnRatePerAmount", "EarnRatePerAmount",
      "earn_rate_per_amount", "vndPerPoint", "VndPerPoint",
    ], 10000);
  }

  return { vndPerPoint, slotDurationMinutes, workingStartHour, workingEndHour };
}

/**
 * Định dạng bản ghi phần thưởng thô thành cấu trúc AdminReward, giải quyết ánh xạ kiểu enum.
 * 
 * @param raw Thuộc tính phần thưởng thô.
 * @returns Cấu trúc AdminReward đã được chuẩn hóa.
 */
function normalizeReward(raw: unknown): AdminReward {
  const r = rec(raw);

  const rewardTypeRaw = r.rewardType ?? r.RewardType ?? r.reward_type ?? r.type ?? r.Type;
  let rewardTypeEnum: AdminRewardTypeEnum = 1; // mặc định VOUCHER
  let rewardType: AdminRewardType = "VOUCHER";
  if (typeof rewardTypeRaw === "number") {
    rewardTypeEnum = (rewardTypeRaw as AdminRewardTypeEnum);
    rewardType = REWARD_TYPE_MAP[rewardTypeEnum] ?? "VOUCHER";
  } else if (typeof rewardTypeRaw === "string") {
    rewardType = rewardTypeRaw;
    rewardTypeEnum = (REWARD_TYPE_REVERSE[rewardTypeRaw] ?? 1) as AdminRewardTypeEnum;
  }

  return {
    id: str(r, ["id", "Id", "rewardId", "RewardId"]),
    name: str(r, ["name", "Name", "rewardName", "RewardName"], "Phần thưởng"),
    description: str(r, ["description", "Description"]),
    pointsRequired: num(r, ["pointsRequired", "PointsRequired", "points_required", "requiredPoints"]),
    rewardType,
    rewardTypeEnum,
    quantityAvailable: optNum(r, ["quantityAvailable", "QuantityAvailable", "stockQuantity", "StockQuantity", "stock_quantity"]),
    validDays: optNum(r, ["validDays", "ValidDays", "validDaysAfterRedeem", "ValidDaysAfterRedeem", "valid_days_after_redeem"]),
    isActive: bool(r, ["isActive", "IsActive"], str(r, ["status", "Status"]) === "active"),
  };
}

/**
 * Định dạng các bản ghi khuyến mại thô thành cấu trúc AdminPromotion tiêu chuẩn.
 * 
 * @param raw Thuộc tính khuyến mại thô.
 * @returns Bản ghi AdminPromotion đã được chuẩn hóa.
 */
function normalizePromotion(raw: unknown): AdminPromotion {
  const r = rec(raw);
  return {
    id: str(r, ["id", "Id", "promotionId", "PromotionId"]),
    name: str(r, ["name", "Name"], "Khuyến mãi"),
    description: str(r, ["description", "Description"]),
    discountType: str(r, ["discountType", "DiscountType", "discount_type"], "FixedAmount"),
    discountValue: num(r, ["discountValue", "DiscountValue", "discount_value"]),
    startDate: str(r, ["startDate", "StartDate", "start_date"]),
    endDate: str(r, ["endDate", "EndDate", "end_date"]),
    isGlobal: bool(r, ["isGlobal", "IsGlobal", "is_global"]),
    isActive: bool(r, ["isActive", "IsActive"], true),
  };
}

// ─── Loyalty Points Config ────────────────────────────────────────────────────

/**
 * Lấy các tham số cấu hình thành viên tích điểm của hệ thống, ví dụ tỷ lệ VNĐ đổi 1 điểm.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành cấu hình LoyaltyPointsConfig.
 */
export async function getLoyaltySettings(token: string): Promise<LoyaltyPointsConfig> {
  const res = await fetch(loyaltyAdminEndpoint("/points-config"), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return normalizeSettings(body);
}

/**
 * Cập nhật cấu hình tỷ lệ quy đổi tích điểm (quy đổi số tiền VNĐ tương ứng với 1 điểm).
 * 
 * @param token Token xác thực.
 * @param settings Các cài đặt cập nhật chứa tham số vndPerPoint.
 * @returns Hứa giải quyết khi cập nhật cấu hình hoàn tất thành công.
 */
export async function updateLoyaltySettings(
  token: string,
  settings: Partial<LoyaltyPointsConfig>,
): Promise<void> {
  if (settings.vndPerPoint !== undefined) {
    const payload: LoyaltyPointsConfigRaw = {
      configKey: "point_earn_rate",
      configValue: JSON.stringify({ VND_per_point: settings.vndPerPoint }),
    };
    const res = await fetch(loyaltyAdminEndpoint("/Update-points-config"), {
      method: "PUT",
      cache: "no-store",
      headers: authHeaders(token),
      body: JSON.stringify(payload),
    });
    await handleApiResponse<unknown>(res);
  }
}

// ─── Tiers ────────────────────────────────────────────────────────────────────

/**
 * Lấy tất cả các hạng thành viên (Rank) được cấu hình trong hệ thống dành cho Admin quản lý.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành mảng AdminTier.
 */
export async function getAdminTiers(token: string): Promise<AdminTier[]> {
  const params = new URLSearchParams({ pageSize: "50", pageIndex: "1" });
  const res = await fetch(`${tierEndpoint("/tiers")}?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeTier);
}

/**
 * Định hình và tạo mới một cấp độ hạng thành viên tích điểm mới.
 * 
 * @param token Token xác thực.
 * @param data Payload tạo mới (tên rank, số lần rửa tối thiểu, số ngày đặt trước ưu tiên).
 * @returns Hứa giải quyết khi hạng thành viên mới được đăng ký thành công.
 */
export async function createAdminTier(
  token: string,
  data: CreateTierPayload,
): Promise<void> {
  const res = await fetch(tierEndpoint("/create-tier"), {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify({
      name: data.name,
      level: data.level,
      requiredWashes: data.requiredWashes,
      priorityBookingDays: data.priorityBookingDays,
      description: data.description ?? "",
    }),
  });
  await handleApiResponse<unknown>(res);
}

/**
 * Cập nhật thông tin cấu hình cho một hạng thành viên (Rank) hiện có.
 * 
 * @param token Token xác thực.
 * @param id ID của cấp độ rank cần chỉnh sửa.
 * @param data Cấu hình cập nhật mới (tên, cấp độ, số lần rửa yêu cầu, mô tả).
 * @returns Hứa giải quyết khi việc cập nhật hoàn tất thành công.
 */
export async function updateAdminTier(
  token: string,
  id: string,
  data: UpdateTierPayload,
): Promise<void> {
  const res = await fetch(`${tierEndpoint(`/update-tier/${encodeURIComponent(id)}`)}`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

/**
 * Lấy tất cả các phần thưởng đổi điểm đã được cấu hình trong hệ thống.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành mảng AdminReward.
 */
export async function getAdminRewards(token: string): Promise<AdminReward[]> {
  const params = new URLSearchParams({ pageSize: "50", pageIndex: "1" });
  const res = await fetch(`${rewardEndpoint("/rewards")}?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeReward);
}

/**
 * Đăng ký một phần thưởng mới trong kho phần thưởng để khách đổi điểm lấy quà.
 * 
 * @param token Token xác thực.
 * @param data Payload tạo phần thưởng (tên quà, số điểm yêu cầu, loại số enum, số lượng có sẵn, số ngày hiệu lực).
 * @returns Hứa giải quyết khi tạo phần thưởng thành công.
 */
export async function createAdminReward(
  token: string,
  data: CreateRewardPayload,
): Promise<void> {
  const payload = {
    name: data.name,
    description: data.description,
    pointsRequired: data.pointsRequired,
    rewardType: data.rewardType,           // integer enum
    quantityAvailable: data.quantityAvailable,
    validDays: data.validDays,
    isActive: data.isActive,
    allowedTierIds: data.allowedTierIds ?? [],
  };
  const res = await fetch(rewardEndpoint("/create-rewards"), {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  await handleApiResponse<unknown>(res);
}

/**
 * Cập nhật chi tiết các thuộc tính thông tin của một phần thưởng đổi điểm hiện có.
 * 
 * @param token Token xác thực.
 * @param id ID phần thưởng cần chỉnh sửa.
 * @param data Các trường thay đổi (tên, mô tả, số điểm, số lượng tồn kho, trạng thái hoạt động).
 * @returns Hứa giải quyết khi việc cập nhật hoàn tất thành công.
 */
export async function updateAdminReward(
  token: string,
  id: string,
  data: UpdateRewardPayload,
): Promise<void> {
  const payload: Record<string, unknown> = {};
  if (data.name !== undefined) payload.name = data.name;
  if (data.description !== undefined) payload.description = data.description;
  if (data.pointsRequired !== undefined) payload.pointsRequired = data.pointsRequired;
  if (data.quantityAvailable !== undefined) payload.quantityAvailable = data.quantityAvailable;
  if (data.validDays !== undefined) payload.validDays = data.validDays;
  if (data.isActive !== undefined) payload.isActive = data.isActive;
  if (data.allowedTierIds !== undefined) payload.allowedTierIds = data.allowedTierIds;

  const res = await fetch(`${rewardEndpoint(`/update-reward/${encodeURIComponent(id)}`)}`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Promotions ───────────────────────────────────────────────────────────────

/**
 * Truy vấn tất cả các chương trình khuyến mại/mã giảm giá đang có trong hệ thống.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành danh sách các AdminPromotion.
 */
export async function getAdminPromotions(token: string): Promise<AdminPromotion[]> {
  const params = new URLSearchParams({ pageSize: "50", pageIndex: "1" });
  const res = await fetch(`${promotionEndpoint("/promotions")}?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizePromotion);
}

/**
 * Tạo một chiến dịch chương trình khuyến mại giảm giá mới.
 * 
 * @param token Token xác thực.
 * @param data Payload tạo khuyến mại (tên, mô tả, loại giảm giá, giá trị giảm, khung ngày hiệu lực, phạm vi).
 * @returns Hứa giải quyết khi chiến dịch khuyến mại được tạo thành công.
 */
export async function createAdminPromotion(
  token: string,
  data: CreatePromotionPayload,
): Promise<void> {
  const res = await fetch(promotionEndpoint("/create-promotion"), {
    method: "POST",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify({
      name: data.name,
      description: data.description,
      discountType: data.discountType,
      discountValue: data.discountValue,
      startDate: data.startDate,
      endDate: data.endDate,
      isGlobal: data.isGlobal,
      applicableTierIds: data.applicableTierIds ?? [],
    }),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Adjust Customer Points (Admin) ──────────────────────────────────────────

/**
 * Điều chỉnh số dư tích điểm của khách hàng (Cộng thêm hoặc Trừ đi điểm tích lũy thủ công kèm theo lý do cụ thể).
 * 
 * @param token Token xác thực.
 * @param customerId ID của khách hàng đích cần chỉnh sửa điểm.
 * @param payload Dữ liệu điều chỉnh điểm (loại hành động cộng/trừ, số điểm, lý do điều chỉnh).
 * @returns Hứa giải quyết khi việc điều chỉnh số dư điểm hoàn tất thành công.
 */
export async function adjustCustomerPoints(
  token: string,
  customerId: string,
  payload: AdjustPointsPayload,
): Promise<void> {
  const res = await fetch(
    legacyAdminEndpoint(`/customers/${encodeURIComponent(customerId)}/adjust-points`),
    {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(token),
      body: JSON.stringify({
        action: payload.action,
        points: payload.points,
        reason: payload.reason,
      }),
    },
  );
  await handleApiResponse<unknown>(res);
}

/**
 * Cập nhật cấu hình hệ thống trực tiếp thông qua cặp khóa-giá trị dạng chuỗi.
 * 
 * @param token Token xác thực.
 * @param key Khóa định danh của cấu hình hệ thống.
 * @param value Giá trị chuỗi của cấu hình hệ thống cần thiết lập.
 * @returns Hứa giải quyết khi cấu hình hệ thống được cập nhật thành công.
 */
export async function updateSystemConfig(
  token: string,
  key: string,
  value: string,
): Promise<void> {
  const payload: LoyaltyPointsConfigRaw = {
    configKey: key,
    configValue: value,
  };
  const res = await fetch(loyaltyAdminEndpoint("/Update-points-config"), {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  await handleApiResponse<unknown>(res);
}

/**
 * Xóa một hạng thành viên (Tier) khỏi hệ thống.
 */
export async function deleteAdminTier(token: string, id: string): Promise<void> {
  const res = await fetch(`${tierEndpoint(`/delete-tier/${encodeURIComponent(id)}`)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: authHeaders(token),
  });
  await handleApiResponse<unknown>(res);
}

/**
 * Xóa một phần thưởng (Reward) khỏi hệ thống.
 */
export async function deleteAdminReward(token: string, id: string): Promise<void> {
  const res = await fetch(`${rewardEndpoint(`/delete-reward/${encodeURIComponent(id)}`)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: authHeaders(token),
  });
  await handleApiResponse<unknown>(res);
}

/**
 * Xóa một chương trình khuyến mãi (Promotion) khỏi hệ thống.
 */
export async function deleteAdminPromotion(token: string, id: string): Promise<void> {
  const res = await fetch(`${promotionEndpoint(`/delete-promotion/${encodeURIComponent(id)}`)}`, {
    method: "DELETE",
    cache: "no-store",
    headers: authHeaders(token),
  });
  await handleApiResponse<unknown>(res);
}

export type UpdatePromotionPayload = Partial<{
  name: string;
  description: string;
  discountType: string;
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  isActive: boolean;
  applicableTierIds: string[];
}>;

/**
 * Cập nhật một chương trình khuyến mãi (Promotion) trong hệ thống.
 */
export async function updateAdminPromotion(
  token: string,
  id: string,
  data: UpdatePromotionPayload,
): Promise<void> {
  const res = await fetch(`${promotionEndpoint(`/update-promotion/${encodeURIComponent(id)}`)}`, {
    method: "PATCH",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  await handleApiResponse<unknown>(res);
}
