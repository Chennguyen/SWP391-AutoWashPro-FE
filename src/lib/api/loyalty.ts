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
  description?: string;
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

/**
 * Ép kiểu một giá trị không xác định thành một đối tượng dạng Record.
 * 
 * @param value Giá trị cần kiểm tra.
 * @returns Đối tượng record được ép kiểu, hoặc một đối tượng rỗng nếu không phải là một dictionary hợp lệ.
 */
function rec(value: unknown): Rec {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Rec)
    : {};
}

/**
 * Tìm kiếm trong đối tượng record một loạt các tên khóa chuỗi có thể có và trả về biểu diễn chuỗi của nó.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Danh sách các khóa có thể tìm kiếm.
 * @param fallback Giá trị trả về nếu không tìm thấy khóa nào.
 * @returns Giá trị chuỗi được phân giải hoặc giá trị dự phòng.
 */
function str(obj: Rec, keys: string[], fallback = ""): string {
  for (const k of keys) {
    if (obj[k] !== undefined && obj[k] !== null) return String(obj[k]);
  }
  return fallback;
}

/**
 * Tìm kiếm trong đối tượng record các khóa có thể có và trả về giá trị số hữu hạn của nó.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Danh sách các khóa có thể tìm kiếm.
 * @param fallback Giá trị trả về nếu không tìm thấy khóa nào hoặc giá trị không phải là số.
 * @returns Giá trị số được phân giải hoặc giá trị dự phòng.
 */
function num(obj: Rec, keys: string[], fallback = 0): number {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return fallback;
}

/**
 * Lấy giá trị chuỗi từ các khóa, trả về null nếu trống.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Danh sách các khóa có thể tìm kiếm.
 * @returns Chuỗi được phân giải hoặc null nếu trống.
 */
function optStr(obj: Rec, keys: string[]): string | null {
  const v = str(obj, keys);
  return v || null;
}

/**
 * Lấy số hữu hạn từ các khóa, trả về null nếu trống hoặc không phải số hữu hạn.
 * 
 * @param obj Dictionary nguồn.
 * @param keys Danh sách các khóa có thể tìm kiếm.
 * @returns Số được phân giải hoặc null.
 */
function optNum(obj: Rec, keys: string[]): number | null {
  for (const k of keys) {
    const v = Number(obj[k]);
    if (Number.isFinite(v)) return v;
  }
  return null;
}

/**
 * Giải nén payload dữ liệu từ các lớp bao bọc phản hồi REST bên ngoài tiêu chuẩn.
 * 
 * @param body Đối tượng phản hồi API lồng nhau.
 * @returns Bản ghi đối tượng nội dung bên trong.
 */
function unwrap(body: unknown): Rec {
  const r = rec(body);
  if (r.data !== undefined) return rec(r.data);
  if (r.Data !== undefined) return rec(r.Data);
  return r;
}

/**
 * Hàm trợ trợ để xây dựng URL cho các endpoint tích điểm thành viên.
 * 
 * @param path Phân đoạn đường dẫn hậu tố.
 * @returns Chuỗi URL API đầy đủ.
 */
function loyaltyEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/loyalty${path}`;
}

/**
 * Hàm bổ trợ để xây dựng URL cho các endpoint phần thưởng khách hàng.
 * 
 * @param path Phân đoạn đường dẫn hậu tố.
 * @returns Chuỗi URL API đầy đủ.
 */
function rewardsEndpoint(path = ""): string {
  return `${apiBase()}/api/v1/rewards${path}`;
}

/**
 * Thiết lập các header yêu cầu với xác thực token bearer.
 * 
 * @param token Chứng chỉ xác thực.
 * @returns Đối tượng cấu hình các header yêu cầu.
 */
function authHeaders(token: string): HeadersInit {
  return {
    Authorization: `Bearer ${token}`,
    "Content-Type": "application/json",
  };
}

// ─── Normalizers ──────────────────────────────────────────────────────────────

/**
 * Chuẩn hóa biểu diễn hạng thành viên thô thành giao diện LoyaltyTier chuẩn.
 * Trích xuất các trường ưu đãi với kiểu dữ liệu thích hợp.
 * 
 * @param raw Đối tượng dữ liệu hạng thô.
 * @returns Cấu trúc LoyaltyTier được chuẩn hóa, hoặc null nếu thiếu các thuộc tính chính.
 */
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
    description: str(r, ["description", "Description"]) || undefined,
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

/**
 * Chuẩn hóa chi tiết điểm khách hàng và trạng thái cấp độ thành viên.
 * Xử lý cấu trúc phân cấp lồng nhau từ các endpoint backend.
 * 
 * @param body Phản hồi thô chứa thông tin điểm và hạng.
 * @returns Cấu trúc LoyaltyInfo được chuẩn hóa.
 */
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
      "nextTierMinPoints", "NextTierMinPoints",
    ]),
  };
}

/**
 * Định dạng bản ghi phần thưởng thô thành cấu trúc Reward chuẩn hóa.
 * Ánh xạ các số chỉ mục thành các hằng số chuỗi cụ thể (ví dụ: FREE_WASH, VOUCHER, GIFT).
 * 
 * @param raw Các thuộc tính phần thưởng thô.
 * @returns Cấu trúc Reward đã được chuẩn hóa sạch sẽ.
 */
function normalizeReward(raw: unknown): Reward {
  const r = rec(raw);
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

/**
 * Chuẩn hóa các thuộc tính đối tượng voucher bao gồm cả ngày hết hạn xác thực.
 * 
 * @param raw Các thuộc tính voucher thô.
 * @returns Đối tượng MyVoucher đã chuẩn hóa.
 */
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

/**
 * Chuẩn hóa các bản ghi lịch sử giao dịch phân bổ điểm.
 * 
 * @param raw Chi tiết giao dịch thô.
 * @returns Đối tượng PointTransaction đã định dạng.
 */
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

/**
 * Giải nén các tập hợp từ các thuộc tính mảng có thể có trong phong bì dữ liệu.
 * 
 * @param body Nội dung phản hồi REST.
 * @returns Mảng các phần tử được giải nén.
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

// ─── API Functions ────────────────────────────────────────────────────────────

/**
 * Lấy cấp độ thành viên và số dư điểm của khách hàng hiện tại đã được xác thực.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành LoyaltyInfo.
 */
export async function getLoyaltyInfo(token: string): Promise<LoyaltyInfo> {
  const res = await fetch(loyaltyEndpoint("/me"), {
    cache: "no-store",
    headers: authHeaders(token),
  });
  const body = await handleApiResponse<unknown>(res);
  return normalizeLoyaltyInfo(body);
}

/**
 * Lấy lịch sử giao dịch điểm cho khách hàng.
 * 
 * @param token Token xác thực.
 * @param params Tham số truy vấn (loại giao dịch, phân trang).
 * @returns Một promise giải quyết thành nhật ký giao dịch điểm.
 */
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

/**
 * Lấy danh sách phần thưởng hoạt động sẵn có mà khách hàng có thể đổi bằng điểm.
 * 
 * @param token Token xác thực.
 * @returns Một promise giải quyết thành danh sách các phần thưởng Reward.
 */
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
 * Lấy danh sách các voucher giảm giá đã đổi thuộc sở hữu của khách hàng cụ thể.
 * 
 * @param token Token xác thực.
 * @param userId ID của khách hàng đích.
 * @returns Một promise giải quyết thành mảng MyVoucher.
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
 * Sử dụng điểm tích lũy thành viên để đổi lấy một phần thưởng cụ thể.
 * 
 * @param token Token xác thực.
 * @param rewardId ID của phần thưởng cần đổi.
 * @param userId ID của khách hàng thực hiện hành động.
 * @returns Một promise giải quyết khi điểm được trừ thành công và phần thưởng được ghi nhận.
 */
export async function redeemReward(
  token: string,
  rewardId: string,
  userId: string,
): Promise<void> {
  const params = new URLSearchParams({ userId });
  const res = await fetch(
    `${apiBase()}/Reward/redeem-reward/${encodeURIComponent(rewardId)}?${params.toString()}`,
    {
      method: "POST",
      cache: "no-store",
      headers: authHeaders(token),
    },
  );
  await handleApiResponse<unknown>(res);
}

/**
 * Lấy tất cả các hạng thành viên được cấu hình từ cài đặt hệ thống (Mở cho cả khách vãng lai và khách hàng).
 * Dùng để hiển thị bảng so sánh quyền lợi các Rank.
 * 
 * @returns Một promise giải quyết thành danh sách LoyaltyTier.
 */
export async function getAllTiers(): Promise<LoyaltyTier[]> {
  const params = new URLSearchParams({ pageSize: "50", pageIndex: "1" });
  const res = await fetch(`${apiBase()}/Tier/tiers?${params.toString()}`, {
    cache: "no-store",
  });
  const body = await handleApiResponse<unknown>(res);
  return unwrapList(body).map(normalizeTier).filter((t): t is LoyaltyTier => t !== null);
}
