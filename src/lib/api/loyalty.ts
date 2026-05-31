// ─── Loyalty API (Customer) ───────────────────────────────────────────────────
import { apiBase, handleApiResponse } from "./api-error";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TierBenefits = {
  prioritySlotBooking?: boolean;
  priorityBookingDays?: number;
  discountPercent?: number;
  [key: string]: unknown;
};

export type LoyaltyTier = {
  id: string;
  name: string;
  level: number;
  requiredWashes: number;
  priorityBookingDays: number;
  benefits?: TierBenefits;
};

export type LoyaltyInfo = {
  points: number;
  totalWashes: number;
  tier: LoyaltyTier | null;
  nextTierName: string | null;
  nextTierRequiredWashes: number | null;
};

export type RewardType = "FREE_WASH" | "VOUCHER" | "GIFT" | string;

export type Reward = {
  id: string;
  name: string;
  description: string;
  pointsRequired: number;
  rewardType: RewardType;
  quantityAvailable: number | null;
  validDays: number | null;
  isActive: boolean;
};

export type MyVoucher = {
  id: string;
  code: string;
  rewardName: string;
  discountAmount: number | null;
  rewardType: RewardType;
  expiresAt: string | null;
  isUsed: boolean;
};

export type PointTransactionType = "Earn" | "Redeem" | string;

export type PointTransaction = {
  id: string;
  type: PointTransactionType;
  points: number;
  description: string;
  createdAt: string;
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

function optStr(obj: Rec, keys: string[]): string | null {
  const v = str(obj, keys);
  return v || null;
}

function optNum(obj: Rec, keys: string[]): number | null {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

function unwrap(body: unknown): Rec {
  const r = rec(body);
  if (r.data !== undefined) return rec(r.data);
  if (r.Data !== undefined) return rec(r.Data);
  return r;
}

function loyaltyEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/loyalty${path}`;
}

function rewardsEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/rewards${path}`;
}

function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

function normalizeTier(raw: unknown): LoyaltyTier | null {
  if (!raw) return null;
  const r = rec(raw);
  const id = str(r, ["id", "Id", "tierId", "TierId"]);
  if (!id) return null;
  const benefitsRec = rec(r.benefits ?? r.Benefits);
  return {
    id,
    name: str(r, ["name", "Name", "tierName", "TierName"], "Member"),
    level: num(r, ["level", "Level"], 1),
    requiredWashes: num(r, ["requiredWashes", "RequiredWashes", "required_washes"], 0),
    priorityBookingDays: num(r, ["priorityBookingDays", "PriorityBookingDays", "priority_booking_days"], 0),
    benefits: {
      prioritySlotBooking:
        (r.prioritySlotBooking as boolean | undefined) ??
        (benefitsRec.prioritySlotBooking as boolean | undefined) ??
        false,
      priorityBookingDays:
        optNum(r, ["priorityBookingDays", "PriorityBookingDays"]) ??
        optNum(benefitsRec, ["priorityBookingDays", "priority_booking_days"]) ??
        undefined,
      discountPercent:
        optNum(benefitsRec, ["discountPercent", "discount_percent"]) ?? undefined,
    },
  };
}

function normalizeLoyaltyInfo(body: unknown): LoyaltyInfo {
  const data = unwrap(body);

  const profileData = rec(data.profileData ?? data.ProfileData);
  const tierRaw =
    data.tier ?? data.Tier ?? data.tierData ?? data.TierData ??
    profileData.tierData ?? profileData.TierData ?? null;

  return {
    points: num(data, ["totalPoints", "TotalPoints", "points", "Points"]),
    totalWashes: num(data, ["totalWashes", "TotalWashes", "washCount", "WashCount"]),
    tier: normalizeTier(tierRaw),
    nextTierName: optStr(data, ["nextTierName", "NextTierName"]),
    nextTierRequiredWashes: optNum(data, [
      "nextTierRequiredWashes", "NextTierRequiredWashes",
      "nextTierMinWashes", "NextTierMinWashes",
      // Fallback: BE cũ dùng nextTierMinPoints — có thể thực ra là washes
      "nextTierMinPoints", "NextTierMinPoints",
    ]),
  };
}

function normalizeReward(raw: unknown): Reward {
  const r = rec(raw);
  // rewardType có thể là int (0=FREE_WASH,1=VOUCHER,2=GIFT) hoặc string
  const rewardTypeRaw = r.rewardType ?? r.RewardType ?? r.reward_type ?? r.type ?? r.Type;
  let rewardType: RewardType = "VOUCHER";
  if (typeof rewardTypeRaw === "number") {
    const map: RewardType[] = ["FREE_WASH", "VOUCHER", "GIFT"];
    rewardType = map[rewardTypeRaw] ?? "VOUCHER";
  } else if (rewardTypeRaw) {
    rewardType = String(rewardTypeRaw);
  }
  return {
    id: str(r, ["id", "Id", "rewardId", "RewardId"]),
    name: str(r, ["name", "Name", "rewardName", "RewardName"], "Phần thưởng"),
    description: str(r, ["description", "Description"]),
    pointsRequired: num(r, ["pointsRequired", "PointsRequired", "points_required", "requiredPoints"]),
    rewardType,
    quantityAvailable: optNum(r, ["quantityAvailable", "QuantityAvailable", "stockQuantity", "StockQuantity", "stock_quantity"]),
    validDays: optNum(r, ["validDays", "ValidDays", "validDaysAfterRedeem", "ValidDaysAfterRedeem", "valid_days_after_redeem"]),
    isActive: Boolean(r.isActive ?? r.IsActive ?? (r.status === "active" || r.Status === "active")),
  };
}

function normalizeVoucher(raw: unknown): MyVoucher {
  const r = rec(raw);
  return {
    id: str(r, ["id", "Id", "voucherId", "VoucherId"]),
    code: str(r, ["code", "Code"]),
    rewardName: str(r, ["rewardName", "RewardName", "reward_name", "name", "Name"], "Phần thưởng"),
    discountAmount: optNum(r, ["discountAmount", "DiscountAmount", "discount_amount"]),
    rewardType: str(r, ["rewardType", "RewardType", "reward_type", "type", "Type"], "VOUCHER"),
    expiresAt: optStr(r, ["expiresAt", "ExpiresAt", "expiredAt", "ExpiredAt", "expires_at", "expireDate", "ExpireDate"]),
    isUsed: Boolean(r.isUsed ?? r.IsUsed ?? r.is_used ?? false),
  };
}

function normalizePointTransaction(raw: unknown): PointTransaction {
  const r = rec(raw);
  return {
    id: str(r, ["id", "Id", "transactionId", "TransactionId"]),
    type: str(r, ["type", "Type", "transactionType", "TransactionType"], "Earn"),
    points: num(r, ["points", "Points", "pointAmount", "PointAmount", "amount", "Amount"]),
    description: str(r, ["description", "Description", "note", "Note", "reason", "Reason"], ""),
    createdAt: str(r, ["createdAt", "CreatedAt", "date", "Date", "timestamp", "Timestamp"], ""),
  };
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

// ─── API Functions ────────────────────────────────────────────────────────────

export async function getLoyaltyInfo(token: string): Promise<LoyaltyInfo> {
  const res = await fetch(loyaltyEndpoint("/me"), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return normalizeLoyaltyInfo(body);
}

export async function getPointTransactions(
  token: string,
  params?: { type?: string; page?: number; pageSize?: number },
): Promise<PointTransaction[]> {
  const query = new URLSearchParams({
    Page: String(params?.page ?? 1),
    PageSize: String(params?.pageSize ?? 20),
  });
  if (params?.type) query.set("Type", params.type);

  const res = await fetch(`${loyaltyEndpoint("/point-transactions")}?${query.toString()}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizePointTransaction);
}

export async function getRewards(token: string): Promise<Reward[]> {
  const url = `${rewardsEndpoint()}?status=active`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeReward);
}

/**
 * Lấy danh sách Voucher của khách hàng.
 * BE endpoint: GET /Voucher/vouchers?userId={userId}&pageIndex=1&pageSize=50
 */
export async function getMyVouchers(
  token: string,
  userId: string,
): Promise<MyVoucher[]> {
  const params = new URLSearchParams({
    userId,
    pageIndex: "1",
    pageSize: "50",
  });
  const res = await fetch(`${apiBase()}/Voucher/vouchers?${params.toString()}`, {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeVoucher);
}

/**
 * Đổi điểm lấy phần thưởng.
 * BE endpoint: POST /Reward/redeem-reward?id={rewardId}&userId={userId}
 * Không cần body.
 */
export async function redeemReward(
  token: string,
  rewardId: string,
  userId: string,
): Promise<void> {
  const params = new URLSearchParams({ id: rewardId, userId });
  const res = await fetch(
    `${apiBase()}/Reward/redeem-reward?${params.toString()}`,
    {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(token),
    },
  );
  await handleApiResponse<unknown>(res);
}
