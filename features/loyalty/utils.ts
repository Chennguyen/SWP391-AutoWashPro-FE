import type { LoyaltyInfo } from "@/features/loyalty/loyalty-service";

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
  priorityBookingDays: number;
};

export const RANK_TIERS: RankTier[] = [
  {
    level: 1,
    name: "Member",
    requiredWashes: 0,
    discount: "Tích điểm cho mỗi lần rửa",
    priority: "Quyền đổi voucher tiêu chuẩn",
    bookingWindow: "Đặt lịch theo khung giờ còn trống",
    cardClass: "border-amber-500/20 bg-gradient-to-br from-stone-900 via-stone-950 to-stone-900 text-stone-100",
    badgeClass: "border-amber-500/30 bg-amber-500/10 text-amber-300",
    glowClass: "shadow-[0_18px_45px_rgba(146,64,14,0.15)]",
    progressClass: "from-amber-600 to-orange-400",
    priorityBookingDays: 3,
  },
  {
    level: 2,
    name: "Bạc",
    requiredWashes: 5,
    discount: "Giảm giá nhẹ cho ưu đãi định kỳ",
    priority: "Ưu tiên xử lý khi đổi voucher",
    bookingWindow: "Đặt lịch trước nhiều ngày hơn Member",
    cardClass: "border-slate-800 bg-gradient-to-br from-slate-900 via-slate-800/80 to-slate-950 text-slate-100",
    badgeClass: "border-slate-700 bg-slate-800/55 text-slate-200",
    glowClass: "shadow-[0_18px_45px_rgba(148,163,184,0.15)]",
    progressClass: "from-slate-400 to-slate-100",
    priorityBookingDays: 5,
  },
  {
    level: 3,
    name: "Vàng",
    requiredWashes: 12,
    discount: "Giảm giá tốt hơn cho dịch vụ phổ biến",
    priority: "Ưu tiên đặt khung giờ cao điểm",
    bookingWindow: "Mở rộng thời gian đặt trước",
    cardClass: "border-amber-500/30 bg-gradient-to-br from-amber-950/60 via-stone-900 to-amber-900/40 text-amber-100",
    badgeClass: "border-amber-400/40 bg-amber-500/15 text-amber-300",
    glowClass: "shadow-[0_18px_45px_rgba(245,158,11,0.15)]",
    progressClass: "from-yellow-300 to-orange-400",
    priorityBookingDays: 7,
  },
  {
    level: 4,
    name: "Bạch kim",
    requiredWashes: 24,
    discount: "Ưu đãi cao cấp và quà tặng đặc biệt",
    priority: "Ưu tiên slot đẹp và giờ cao điểm",
    bookingWindow: "Quyền đặt trước dài nhất",
    cardClass: "border-cyan-500/30 bg-gradient-to-br from-indigo-950/90 via-slate-900 to-cyan-950/50 text-cyan-100",
    badgeClass: "border-cyan-400/30 bg-cyan-500/15 text-cyan-300",
    glowClass: "shadow-[0_18px_60px_rgba(99,102,241,0.25)]",
    progressClass: "from-cyan-300 via-violet-300 to-fuchsia-300",
    priorityBookingDays: 10,
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
