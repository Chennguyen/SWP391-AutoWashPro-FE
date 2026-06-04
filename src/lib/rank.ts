import type { LoyaltyInfo } from "@/lib/api/loyalty";

export type RankTier = {
  level: number;
  name: string;
  requiredWashes: number;
  discount: string;
  priority: string;
  bookingWindow: string;
  cardClass: string;
  badgeClass: string;
  glowClass: string;
  progressClass: string;
};

export const RANK_TIERS: RankTier[] = [
  {
    level: 1,
    name: "Member",
    requiredWashes: 0,
    discount: "Tích điểm cho mỗi lần rửa",
    priority: "Quyền đổi voucher tiêu chuẩn",
    bookingWindow: "Đặt lịch theo khung giờ còn trống",
    cardClass: "border-amber-200 bg-gradient-to-br from-stone-900 via-amber-950 to-stone-950 text-amber-50",
    badgeClass: "border-amber-300/40 bg-amber-300/15 text-amber-100",
    glowClass: "shadow-[0_18px_45px_rgba(146,64,14,0.25)]",
    progressClass: "from-amber-600 to-orange-400",
  },
  {
    level: 2,
    name: "Bạc",
    requiredWashes: 5,
    discount: "Giảm giá nhẹ cho ưu đãi định kỳ",
    priority: "Ưu tiên xử lý khi đổi voucher",
    bookingWindow: "Đặt lịch trước nhiều ngày hơn Member",
    cardClass: "border-slate-200 bg-gradient-to-br from-slate-200 via-slate-50 to-slate-400 text-slate-950",
    badgeClass: "border-slate-400 bg-white/70 text-slate-700",
    glowClass: "shadow-[0_18px_45px_rgba(148,163,184,0.35)]",
    progressClass: "from-slate-400 to-slate-100",
  },
  {
    level: 3,
    name: "Vàng",
    requiredWashes: 12,
    discount: "Giảm giá tốt hơn cho dịch vụ phổ biến",
    priority: "Ưu tiên đặt khung giờ cao điểm",
    bookingWindow: "Mở rộng thời gian đặt trước",
    cardClass: "border-yellow-300 bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 text-white",
    badgeClass: "border-white/40 bg-white/20 text-white",
    glowClass: "shadow-[0_18px_45px_rgba(245,158,11,0.35)]",
    progressClass: "from-yellow-300 to-orange-400",
  },
  {
    level: 4,
    name: "Bạch kim",
    requiredWashes: 24,
    discount: "Ưu đãi cao cấp và quà tặng đặc biệt",
    priority: "Ưu tiên slot đẹp và giờ cao điểm",
    bookingWindow: "Quyền đặt trước dài nhất",
    cardClass: "border-cyan-200/50 bg-gradient-to-br from-indigo-950 via-violet-900 to-cyan-950 text-white",
    badgeClass: "border-cyan-200/40 bg-cyan-200/15 text-cyan-50",
    glowClass: "shadow-[0_18px_60px_rgba(99,102,241,0.45)]",
    progressClass: "from-cyan-300 via-violet-300 to-fuchsia-300",
  },
];

/**
 * Phân giải cấu hình hạng thành viên (RankTier) hiện tại từ thông tin tích điểm của khách hàng.
 * So khớp theo cấp độ số hoặc tìm kiếm từ khóa trong tên hạng để dự phòng.
 * 
 * @param info Thông tin tích điểm thành viên hiện tại của khách hàng.
 * @returns Đối tượng cấu hình RankTier phù hợp.
 */
export function resolveRankTier(info: LoyaltyInfo | null): RankTier {
  const apiLevel = info?.tier?.level;
  if (apiLevel) {
    return RANK_TIERS.find((tier) => tier.level === apiLevel) ?? RANK_TIERS[0];
  }

  const apiName = info?.tier?.name.toLowerCase() ?? "";
  if (apiName.includes("platinum") || apiName.includes("bạch") || apiName.includes("bach")) return RANK_TIERS[3];
  if (apiName.includes("gold") || apiName.includes("vàng") || apiName.includes("vang")) return RANK_TIERS[2];
  if (apiName.includes("silver") || apiName.includes("bạc") || apiName.includes("bac")) return RANK_TIERS[1];
  return RANK_TIERS[0];
}

/**
 * Lấy thông tin cấu hình của hạng thành viên kế tiếp.
 * 
 * @param currentLevel Cấp độ hạng thành viên hiện tại.
 * @returns Cấu hình RankTier tiếp theo, hoặc null nếu đã đạt hạng cao nhất.
 */
export function getNextRankTier(currentLevel: number): RankTier | null {
  return RANK_TIERS.find((tier) => tier.level > currentLevel) ?? null;
}

/**
 * Tính toán tỷ lệ tiến trình nâng hạng hiện tại của khách hàng dưới dạng phần trăm (%).
 * 
 * @param info Thông tin tích điểm thành viên hiện tại của khách hàng.
 * @returns Số phần trăm biểu diễn từ 0 đến 100.
 */
export function getRankProgress(info: LoyaltyInfo | null): number {
  if (!info) return 0;
  const current = resolveRankTier(info);
  const next = getNextRankTier(current.level);
  if (!next) return 100;

  const previousRequired = current.requiredWashes;
  const needed = Math.max(1, next.requiredWashes - previousRequired);
  const completed = Math.max(0, info.totalWashes - previousRequired);
  return Math.min(100, Math.round((completed / needed) * 100));
}
