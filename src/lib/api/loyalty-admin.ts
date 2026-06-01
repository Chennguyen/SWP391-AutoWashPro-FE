// ─── Loyalty Admin API ────────────────────────────────────────────────────────
import { apiBase, handleApiResponse } from "./api-error";

// ─── Types ────────────────────────────────────────────────────────────────────

/**
 * AdminTier — schema theo đúng BE.
 * BE dùng requiredWashes (số lần rửa) và priorityBookingDays (ngày đặt trước ưu tiên)
 * KHÔNG dùng minPointsRequired hay discountPercent trực tiếp trong Tier.
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
 * LoyaltyPointsConfig — cấu hình điểm tích lũy theo định dạng BE.
 * BE lưu dạng configKey / configValue (JSON string).
 * FE sẽ parse configValue để hiển thị các trường thân thiện.
 */
export type LoyaltyPointsConfig = {
  vndPerPoint: number;      // configKey: "point_earn_rate" → configValue: { VND_per_point }
  slotDurationMinutes?: number; // configKey: "SlotDurationMinutes" → configValue: "30"
  workingStartHour?: string;    // configKey: "WorkingStartHour" → configValue: "08:00"
  workingEndHour?: string;      // configKey: "WorkingEndHour" → configValue: "17:00"
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
};

export type UpdateRewardPayload = Partial<{
  name: string;
  description: string;
  pointsRequired: number;
  quantityAvailable: number;
  validDays: number;
  isActive: boolean;
}>;

export type AdminPromotion = {
  id: string;
  name: string;
  description: string;
  discountType: number;   // 0 = percent, 1 = fixed amount
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
  isActive?: boolean;
};

export type CreatePromotionPayload = {
  name: string;
  description: string;
  discountType: number;
  discountValue: number;
  startDate: string;
  endDate: string;
  isGlobal: boolean;
};

export type AdjustPointsAction = "ADD" | "SUBTRACT";

export type AdjustPointsPayload = {
  action: AdjustPointsAction;
  points: number;
  reason: string;
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

type Rec = Record<string, unknown>;

function rec(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : {};
}

function str(obj: Rec, keys: string[], fallback = ""): string {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
  }
  return fallback;
}

function num(obj: Rec, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return fallback;
}

function optNum(obj: Rec, keys: string[]): number | null {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function bool(obj: Rec, keys: string[], fallback = false): boolean {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "boolean") return v;
    if (v === "true" || v === "1") return true;
    if (v === "false" || v === "0") return false;
  }
  return fallback;
}

function unwrap(body: unknown): Rec {
  const r = rec(body);
  if (r.data !== undefined) return rec(r.data);
  if (r.Data !== undefined) return rec(r.Data);
  return r;
}

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

function loyaltyAdminEndpoint(path: string): string {
  return `${apiBase()}/api/v1/loyalty/admin${path}`;
}

function tierEndpoint(path: string): string {
  return `${apiBase()}/Tier/admin${path}`;
}

function rewardEndpoint(path: string): string {
  return `${apiBase()}/Reward/admin${path}`;
}

function promotionEndpoint(path: string): string {
  return `${apiBase()}/Promotion/admin${path}`;
}

function legacyAdminEndpoint(path: string): string {
  return `${apiBase()}/api/v1/admin${path}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeTier(raw: unknown): AdminTier {
  const r = rec(raw);
  return {
    id: str(r, ["id", "Id", "tierId", "TierId"]),
    name: str(r, ["name", "Name", "tierName", "TierName"], "Tier"),
    level: num(r, ["level", "Level"], 1),
    requiredWashes: num(r, ["requiredWashes", "RequiredWashes", "required_washes", "minWashes", "MinWashes"], 0),
    priorityBookingDays: num(r, ["priorityBookingDays", "PriorityBookingDays", "priority_booking_days"], 0),
    description: str(r, ["description", "Description"]) || undefined,
  };
}

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

function normalizeSettings(body: unknown): LoyaltyPointsConfig {
  // GET /api/v1/loyalty/admin/points-config trả về array của LoyaltyPointsConfigRaw
  // hoặc có thể là single object
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

  // Fallback: if body is a single object (not array)
  if (list.length === 0) {
    const r = unwrap(body);
    vndPerPoint = num(r, [
      "earnRatePerAmount", "EarnRatePerAmount",
      "earn_rate_per_amount", "vndPerPoint", "VndPerPoint",
    ], 10000);
  }

  return { vndPerPoint, slotDurationMinutes, workingStartHour, workingEndHour };
}

function normalizeReward(raw: unknown): AdminReward {
  const r = rec(raw);

  // rewardType có thể là int (0,1,2) hoặc string
  const rewardTypeRaw = r.rewardType ?? r.RewardType ?? r.reward_type ?? r.type ?? r.Type;
  let rewardTypeEnum: AdminRewardTypeEnum = 1; // default VOUCHER
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

function normalizePromotion(raw: unknown): AdminPromotion {
  const r = rec(raw);
  return {
    id: str(r, ["id", "Id", "promotionId", "PromotionId"]),
    name: str(r, ["name", "Name"], "Khuyến mãi"),
    description: str(r, ["description", "Description"]),
    discountType: num(r, ["discountType", "DiscountType", "discount_type"]),
    discountValue: num(r, ["discountValue", "DiscountValue", "discount_value"]),
    startDate: str(r, ["startDate", "StartDate", "start_date"]),
    endDate: str(r, ["endDate", "EndDate", "end_date"]),
    isGlobal: bool(r, ["isGlobal", "IsGlobal", "is_global"]),
    isActive: bool(r, ["isActive", "IsActive"], true),
  };
}

// ─── Loyalty Points Config ────────────────────────────────────────────────────

/**
 * GET /api/v1/loyalty/admin/points-config
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
 * PUT /api/v1/loyalty/admin/Update-points-config
 * Body: { configKey, configValue (JSON string) }
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
 * GET /Tier/admin/tiers?pageSize=10&pageIndex=1
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
 * POST /Tier/admin/create-tier
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
 * PUT /Tier/admin/update-tier?id={id}
 */
export async function updateAdminTier(
  token: string,
  id: string,
  data: UpdateTierPayload,
): Promise<void> {
  const res = await fetch(`${tierEndpoint("/update-tier")}?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Rewards ─────────────────────────────────────────────────────────────────

/**
 * GET /Reward/admin/rewards (inferred — không có trong cURL docs, dùng endpoint hợp lý)
 */
export async function getAdminRewards(token: string): Promise<AdminReward[]> {
  const res = await fetch(rewardEndpoint("/rewards"), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeReward);
}

/**
 * POST /Reward/admin/create-rewards
 * rewardType là integer enum: 0=FREE_WASH, 1=VOUCHER, 2=GIFT
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
 * PUT /Reward/admin/update-reward?id={id}
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

  const res = await fetch(`${rewardEndpoint("/update-reward")}?id=${encodeURIComponent(id)}`, {
    method: "PUT",
    cache: "no-store",
    headers: authHeaders(token),
    body: JSON.stringify(payload),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Promotions ───────────────────────────────────────────────────────────────

/**
 * GET /Promotion/admin/promotions (inferred — dùng endpoint hợp lý)
 */
export async function getAdminPromotions(token: string): Promise<AdminPromotion[]> {
  const res = await fetch(promotionEndpoint("/promotions"), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizePromotion);
}

/**
 * POST /Promotion/admin/create-promotion
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
    }),
  });
  await handleApiResponse<unknown>(res);
}

// ─── Adjust Customer Points (Admin) ──────────────────────────────────────────

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
