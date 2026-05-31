"use client";

import { useCallback, useEffect, useState } from "react";
import {
  Award,
  CheckCircle2,
  ChevronRight,
  Clock,
  Gift,
  History,
  RefreshCw,
  Sparkles,
  Star,
  Tag,
  Ticket,
  TrendingUp,
} from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import {
  getLoyaltyInfo,
  getMyVouchers,
  getPointTransactions,
  getRewards,
  redeemReward,
  type LoyaltyInfo,
  type MyVoucher,
  type PointTransaction,
  type Reward,
} from "@/lib/api/loyalty";

// ─── Props ────────────────────────────────────────────────────────────────────

interface LoyaltyPanelProps {
  token: string;
  onUnauthorized: () => void;
}

// ─── Tier Styling ─────────────────────────────────────────────────────────────

type TierStyle = {
  card: string;
  badge: string;
  icon: string;
  bar: string;
};

function getTierStyle(tierName: string | undefined): TierStyle {
  const name = tierName?.toLowerCase() ?? "";
  if (name.includes("platinum"))
    return {
      card: "from-purple-700 via-indigo-700 to-blue-700",
      badge: "bg-white/20 text-white",
      icon: "text-purple-200",
      bar: "bg-purple-300",
    };
  if (name.includes("gold"))
    return {
      card: "from-yellow-500 via-amber-500 to-orange-500",
      badge: "bg-white/20 text-white",
      icon: "text-yellow-200",
      bar: "bg-yellow-300",
    };
  if (name.includes("silver"))
    return {
      card: "from-slate-400 via-slate-500 to-slate-600",
      badge: "bg-white/20 text-white",
      icon: "text-slate-200",
      bar: "bg-slate-300",
    };
  return {
    card: "from-blue-600 via-blue-700 to-blue-800",
    badge: "bg-white/20 text-white",
    icon: "text-blue-200",
    bar: "bg-blue-300",
  };
}

function getTierEmoji(tierName: string | undefined): string {
  const name = tierName?.toLowerCase() ?? "";
  if (name.includes("platinum")) return "💎";
  if (name.includes("gold")) return "🥇";
  if (name.includes("silver")) return "🥈";
  return "⭐";
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatPoints(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n);
}

function daysUntilExpiry(expiresAt: string | null): number | null {
  if (!expiresAt) return null;
  const diff = new Date(expiresAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatExpiry(expiresAt: string | null): string {
  if (!expiresAt) return "Không giới hạn";
  return new Date(expiresAt).toLocaleDateString("vi-VN");
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function MembershipCard({ info }: { info: LoyaltyInfo }) {
  const tierStyle = getTierStyle(info.tier?.name);
  const emoji = getTierEmoji(info.tier?.name);

  // Tiến độ dựa trên số lần rửa (requiredWashes)
  const nextWashes = info.nextTierRequiredWashes;
  const progress =
    nextWashes && nextWashes > 0
      ? Math.min(100, Math.round((info.totalWashes / nextWashes) * 100))
      : 100;

  return (
    <div
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br ${tierStyle.card} p-6 text-white shadow-lg`}
    >
      {/* Background decoration */}
      <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
      <div className="pointer-events-none absolute -bottom-10 -left-6 h-32 w-32 rounded-full bg-white/5" />

      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-white/60">
            Hạng thành viên
          </p>
          <p className="mt-1 text-2xl font-black tracking-tight">
            {emoji} {info.tier?.name ?? "Member"}
          </p>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-bold ${tierStyle.badge}`}>
          Cấp {info.tier?.level ?? 1}
        </span>
      </div>

      {/* Points + Washes */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <div>
          <p className="text-xs font-medium text-white/60">Tổng điểm tích lũy</p>
          <p className="mt-0.5 text-3xl font-black tabular-nums">
            {formatPoints(info.points)}
            <span className="ml-1 text-sm font-semibold text-white/70">điểm</span>
          </p>
        </div>
        <div>
          <p className="text-xs font-medium text-white/60">Số lần rửa xe</p>
          <p className="mt-0.5 text-3xl font-black tabular-nums">
            {formatPoints(info.totalWashes)}
            <span className="ml-1 text-sm font-semibold text-white/70">lần</span>
          </p>
        </div>
      </div>

      {/* Progress to next tier */}
      {info.nextTierName && nextWashes && (
        <div className="mt-5">
          <div className="flex justify-between text-xs text-white/70">
            <span>Tiến độ lên {info.nextTierName}</span>
            <span>
              {formatPoints(info.totalWashes)} / {formatPoints(nextWashes)} lần
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-white/20">
            <div
              className={`h-2 rounded-full transition-all ${tierStyle.bar}`}
              style={{ width: `${progress}%` }}
            />
          </div>
          <p className="mt-1 text-right text-xs text-white/60">{progress}%</p>
        </div>
      )}

      {/* Benefits */}
      {info.tier?.priorityBookingDays ? (
        <div className="mt-4 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Sparkles size={14} className={tierStyle.icon} />
          <p className="text-xs font-semibold">
            Đặt lịch trước tối đa {info.tier.priorityBookingDays} ngày
          </p>
        </div>
      ) : null}
      {info.tier?.benefits?.prioritySlotBooking ? (
        <div className="mt-2 flex items-center gap-2 rounded-xl bg-white/10 px-3 py-2">
          <Star size={14} className={tierStyle.icon} />
          <p className="text-xs font-semibold">Ưu tiên đặt slot giờ cao điểm</p>
        </div>
      ) : null}
    </div>
  );
}

function VoucherCard({ voucher }: { voucher: MyVoucher }) {
  const days = daysUntilExpiry(voucher.expiresAt);
  const expiringSoon = days !== null && days <= 7 && days >= 0;
  const expired = days !== null && days < 0;

  return (
    <article
      className={`relative overflow-hidden rounded-xl border bg-white p-4 shadow-sm transition ${
        expired ? "opacity-50" : "hover:border-blue-300 hover:shadow-md"
      }`}
    >
      {/* Dashed left edge (voucher style) */}
      <div className="absolute left-0 top-0 flex h-full flex-col justify-between py-4">
        <div className="h-3 w-3 -translate-x-1.5 rounded-full bg-slate-100 border border-slate-200" />
        <div className="h-3 w-3 -translate-x-1.5 rounded-full bg-slate-100 border border-slate-200" />
      </div>
      <div className="border-l border-dashed border-slate-200 pl-4">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="font-bold text-slate-950 text-sm">{voucher.rewardName}</p>
            {voucher.discountAmount ? (
              <p className="mt-0.5 text-xs text-slate-500">
                Giảm {new Intl.NumberFormat("vi-VN").format(voucher.discountAmount)}₫
              </p>
            ) : null}
          </div>
          {expiringSoon && (
            <span className="shrink-0 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-600">
              Sắp hết hạn
            </span>
          )}
          {expired && (
            <span className="shrink-0 rounded-full bg-red-100 px-2 py-0.5 text-xs font-bold text-red-600">
              Hết hạn
            </span>
          )}
        </div>
        <div className="mt-3 flex items-center gap-2">
          <Tag size={13} className="text-slate-400" />
          <code className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold tracking-widest text-slate-700">
            {voucher.code || "N/A"}
          </code>
        </div>
        <div className="mt-2 flex items-center gap-1.5 text-xs text-slate-500">
          <Clock size={12} />
          {expired
            ? "Đã hết hạn"
            : days !== null
            ? `Còn ${days} ngày`
            : formatExpiry(voucher.expiresAt)}
        </div>
      </div>
    </article>
  );
}

function RewardCard({
  reward,
  userPoints,
  onRedeem,
  redeeming,
}: {
  reward: Reward;
  userPoints: number;
  onRedeem: (reward: Reward) => void;
  redeeming: boolean;
}) {
  const canRedeem = userPoints >= reward.pointsRequired;

  return (
    <article className="flex flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
          <Gift size={20} aria-hidden />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-slate-950 text-sm leading-tight">{reward.name}</p>
          {reward.description && (
            <p className="mt-1 text-xs text-slate-500 line-clamp-2">{reward.description}</p>
          )}
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-600">
            <Star size={11} />
            {formatPoints(reward.pointsRequired)} điểm
          </span>
          {reward.validDays ? (
            <p className="mt-1 text-xs text-slate-400">Hiệu lực {reward.validDays} ngày</p>
          ) : null}
        </div>
        <button
          type="button"
          onClick={() => onRedeem(reward)}
          disabled={!canRedeem || redeeming}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold transition ${
            canRedeem
              ? "bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-60"
              : "cursor-not-allowed bg-slate-100 text-slate-400"
          }`}
        >
          {redeeming ? (
            <RefreshCw size={12} className="animate-spin" />
          ) : (
            <ChevronRight size={12} />
          )}
          {canRedeem ? "Đổi ngay" : "Chưa đủ điểm"}
        </button>
      </div>

      {!canRedeem && (
        <p className="mt-2 text-xs text-slate-400">
          Cần thêm {formatPoints(reward.pointsRequired - userPoints)} điểm nữa
        </p>
      )}
    </article>
  );
}

function PointTransactionItem({ tx }: { tx: PointTransaction }) {
  const isEarn = tx.type === "Earn" || tx.type === "earn";
  return (
    <div className="flex items-center justify-between gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-3">
        <div
          className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${
            isEarn ? "bg-emerald-50 text-emerald-600" : "bg-amber-50 text-amber-600"
          }`}
        >
          {isEarn ? <TrendingUp size={14} /> : <Gift size={14} />}
        </div>
        <div>
          <p className="text-sm font-medium text-slate-800">
            {tx.description || (isEarn ? "Tích điểm" : "Đổi thưởng")}
          </p>
          <p className="text-xs text-slate-400">{formatDateTime(tx.createdAt)}</p>
        </div>
      </div>
      <span
        className={`text-sm font-bold tabular-nums ${
          isEarn ? "text-emerald-600" : "text-amber-600"
        }`}
      >
        {isEarn ? "+" : "-"}{formatPoints(tx.points)} điểm
      </span>
    </div>
  );
}

// ─── Main Panel ───────────────────────────────────────────────────────────────

type PanelSection = "overview" | "history";

export function LoyaltyPanel({ token, onUnauthorized }: LoyaltyPanelProps) {
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [vouchers, setVouchers] = useState<MyVoucher[]>([]);
  const [transactions, setTransactions] = useState<PointTransaction[]>([]);
  const [loading, setLoading] = useState(false);
  const [txLoading, setTxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [redeemingId, setRedeemingId] = useState<string | null>(null);
  const [redeemSuccess, setRedeemSuccess] = useState<string | null>(null);
  const [redeemError, setRedeemError] = useState<string | null>(null);
  const [section, setSection] = useState<PanelSection>("overview");

  // userId từ localStorage
  function getUserId(): string {
    if (typeof window === "undefined") return "";
    return window.localStorage.getItem("userId") ?? "";
  }

  const handleUnauthorizedInternal = useCallback(() => {
    onUnauthorized();
  }, [onUnauthorized]);

  const loadAll = useCallback(async () => {
    if (!token) return;
    const userId = getUserId();
    setLoading(true);
    setError(null);
    try {
      const [info, rewardList, voucherList] = await Promise.all([
        getLoyaltyInfo(token),
        getRewards(token),
        userId ? getMyVouchers(token, userId) : Promise.resolve([]),
      ]);
      setLoyaltyInfo(info);
      setRewards(rewardList);
      setVouchers(voucherList);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorizedInternal();
        return;
      }
      setError(err instanceof Error ? err.message : "Không thể tải dữ liệu loyalty.");
    } finally {
      setLoading(false);
    }
  }, [token, handleUnauthorizedInternal]);

  const loadTransactions = useCallback(async () => {
    if (!token) return;
    setTxLoading(true);
    try {
      const list = await getPointTransactions(token, { page: 1, pageSize: 30 });
      setTransactions(list);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorizedInternal();
        return;
      }
      // Lịch sử giao dịch lỗi thì bỏ qua, không hiển thị error chặn cả trang
    } finally {
      setTxLoading(false);
    }
  }, [token, handleUnauthorizedInternal]);

  // Reset + reload khi token thay đổi
  useEffect(() => {
    setLoyaltyInfo(null);
    setRewards([]);
    setVouchers([]);
    setTransactions([]);
    setError(null);
    setRedeemSuccess(null);
    setRedeemError(null);

    if (!token) return;
    const id = window.setTimeout(() => void loadAll(), 0);
    return () => window.clearTimeout(id);
  }, [token, loadAll]);

  // Load giao dịch khi chuyển sang tab lịch sử
  useEffect(() => {
    if (section === "history" && token && transactions.length === 0) {
      void loadTransactions();
    }
  }, [section, token, loadTransactions, transactions.length]);

  async function handleRedeem(reward: Reward) {
    if (!loyaltyInfo || loyaltyInfo.points < reward.pointsRequired) return;
    const userId = getUserId();
    if (!userId) {
      setRedeemError("Không tìm thấy thông tin tài khoản. Vui lòng đăng nhập lại.");
      return;
    }
    const confirmed = window.confirm(
      `Bạn có chắc muốn đổi "${reward.name}" với ${formatPoints(reward.pointsRequired)} điểm không?`,
    );
    if (!confirmed) return;

    setRedeemingId(reward.id);
    setRedeemSuccess(null);
    setRedeemError(null);
    try {
      await redeemReward(token, reward.id, userId);
      setRedeemSuccess(`Đổi thưởng "${reward.name}" thành công! Voucher đã được thêm vào tài khoản.`);
      await loadAll(); // refresh điểm + voucher
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        handleUnauthorizedInternal();
        return;
      }
      setRedeemError(err instanceof Error ? err.message : "Không thể đổi thưởng.");
    } finally {
      setRedeemingId(null);
    }
  }

  if (!token) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-sm text-slate-500">
        Đăng nhập để xem điểm tích lũy và ưu đãi.
      </div>
    );
  }

  return (
    <section aria-label="Điểm & Ưu đãi" className="space-y-6">
      {/* Title + controls */}
      <div className="flex items-center justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Điểm & Ưu đãi</h2>
          <p className="mt-1 text-sm text-slate-500">
            Xem điểm tích lũy, hạng thành viên và đổi phần thưởng.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSection("overview")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              section === "overview"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Award size={13} />
            Tổng quan
          </button>
          <button
            type="button"
            onClick={() => setSection("history")}
            className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold transition ${
              section === "history"
                ? "bg-blue-600 text-white"
                : "border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <History size={13} />
            Lịch sử điểm
          </button>
          <button
            type="button"
            onClick={loadAll}
            disabled={loading}
            title="Tải lại"
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
            <span className="sr-only">Tải lại</span>
          </button>
        </div>
      </div>

      {/* Loading skeleton */}
      {loading && !loyaltyInfo ? (
        <div className="space-y-4">
          <div className="h-52 animate-pulse rounded-2xl bg-slate-200" />
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {[1, 2].map((i) => (
              <div key={i} className="h-24 animate-pulse rounded-xl bg-slate-100" />
            ))}
          </div>
        </div>
      ) : null}

      {/* Error */}
      {!loading && error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
          <button
            type="button"
            onClick={loadAll}
            className="ml-3 font-semibold underline hover:no-underline"
          >
            Thử lại
          </button>
        </div>
      ) : null}

      {/* ── SECTION: Overview ── */}
      {section === "overview" && loyaltyInfo && (
        <>
          {/* Membership Card */}
          <MembershipCard info={loyaltyInfo} />

          {/* Redeem feedback */}
          {redeemSuccess && (
            <div
              role="status"
              className="flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700"
            >
              <CheckCircle2 size={16} />
              {redeemSuccess}
            </div>
          )}
          {redeemError && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {redeemError}
            </div>
          )}

          {/* My Vouchers */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Ticket size={18} className="text-blue-600" aria-hidden />
              <h3 className="text-base font-bold text-slate-950">Voucher của tôi</h3>
              {vouchers.length > 0 && (
                <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-bold text-blue-700">
                  {vouchers.length}
                </span>
              )}
            </div>

            {vouchers.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                Bạn chưa có voucher nào. Đổi điểm để nhận voucher!
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {vouchers.map((v) => (
                  <VoucherCard key={v.id} voucher={v} />
                ))}
              </div>
            )}
          </div>

          {/* Redeem Rewards */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Award size={18} className="text-blue-600" aria-hidden />
              <h3 className="text-base font-bold text-slate-950">Đổi điểm lấy phần thưởng</h3>
            </div>

            {rewards.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-500">
                Hiện chưa có phần thưởng khả dụng.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {rewards.map((r) => (
                  <RewardCard
                    key={r.id}
                    reward={r}
                    userPoints={loyaltyInfo.points}
                    onRedeem={handleRedeem}
                    redeeming={redeemingId === r.id}
                  />
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── SECTION: Point History ── */}
      {section === "history" && (
        <div>
          <div className="mb-3 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <History size={18} className="text-blue-600" aria-hidden />
              <h3 className="text-base font-bold text-slate-950">Lịch sử giao dịch điểm</h3>
            </div>
            <button
              type="button"
              onClick={loadTransactions}
              disabled={txLoading}
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw size={12} className={txLoading ? "animate-spin" : ""} />
              Làm mới
            </button>
          </div>

          {txLoading && transactions.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-14 animate-pulse rounded-lg bg-slate-100" />
              ))}
            </div>
          ) : transactions.length === 0 ? (
            <div className="rounded-lg border border-dashed border-slate-200 py-10 text-center text-sm text-slate-500">
              Chưa có giao dịch điểm nào.
            </div>
          ) : (
            <div className="rounded-xl border border-slate-200 bg-white px-4 shadow-sm">
              {transactions.map((tx) => (
                <PointTransactionItem key={tx.id} tx={tx} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}
