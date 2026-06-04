"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, RefreshCw, ShieldCheck, Sparkles, TrendingUp, Star } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getLoyaltyInfo, getAllTiers, type LoyaltyInfo, type LoyaltyTier } from "@/lib/api/loyalty";
import { getNextRankTier, getRankProgress, RANK_TIERS, resolveRankTier } from "@/lib/rank";
import { cn } from "@/lib/utils";

interface RankPanelProps {
  token: string;
  onUnauthorized: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/**
 * Thành phần (Component) RankPanel
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function RankPanel({ token, onUnauthorized }: RankPanelProps) {
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);
  const [tiers, setTiers] = useState<LoyaltyTier[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRank = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      const [fetchedInfo, fetchedTiers] = await Promise.all([
        getLoyaltyInfo(token),
        getAllTiers(),
      ]);
      setInfo(fetchedInfo);
      setTiers(fetchedTiers.sort((a, b) => a.level - b.level));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        onUnauthorized();
        return;
      }
      setError(err instanceof Error ? err.message : "Không thể tải thông tin bậc rank.");
    } finally {
      setLoading(false);
    }
  }, [onUnauthorized, token]);

  useEffect(() => {
    if (!token) return;
    const id = window.setTimeout(() => {
      setInfo(null);
      setError(null);
      void loadRank();
    }, 0);
    return () => window.clearTimeout(id);
  }, [loadRank, token]);

  // Rank-up celebration effect
  useEffect(() => {
    if (!info) return;
    const previousTierId = window.localStorage.getItem("lastTierId");
    if (previousTierId && info.tier?.id && previousTierId !== info.tier.id) {
      // Trigger simple notification
      alert(`🎉 Chúc mừng bạn đã thăng hạng lên ${info.tier.name}! 🎉`);
    }
    window.localStorage.setItem("lastTierId", info.tier?.id ?? "");
  }, [info]);

  if (!token) {
    return (
      <div className="flex min-h-60 items-center justify-center rounded-lg border border-dashed border-slate-200 text-center text-sm text-slate-500">
        Đăng nhập để xem bậc rank của bạn.
      </div>
    );
  }

  const currentRank = resolveRankTier(info);
  const nextRank = info ? getNextRankTier(currentRank.level) : null;
  const progress = getRankProgress(info);
  const washesToNext = nextRank && info ? Math.max(0, nextRank.requiredWashes - info.totalWashes) : 0;

  return (
    <section aria-label="Bậc rank" className="space-y-6">
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-4">
        <div>
          <h2 className="text-xl font-bold text-slate-950">Bậc rank</h2>
          <p className="mt-1 text-sm text-slate-500">
            Theo dõi hạng thành viên, số lần rửa và quyền lợi tiếp theo.
          </p>
        </div>
        <button
          type="button"
          onClick={loadRank}
          disabled={loading}
          className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-600 transition hover:bg-slate-50 disabled:opacity-60"
          title="Tải lại"
        >
          <RefreshCw size={15} className={loading ? "animate-spin" : ""} aria-hidden />
          <span className="sr-only">Tải lại</span>
        </button>
      </div>

      {error ? (
        <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      {loading && !info ? (
        <div className="space-y-4">
          <div className="h-56 animate-pulse rounded-lg bg-slate-100" />
          <div className="grid gap-3 md:grid-cols-2">
            {[1, 2, 3, 4].map((item) => (
              <div key={item} className="h-32 animate-pulse rounded-lg bg-slate-100" />
            ))}
          </div>
        </div>
      ) : null}

      {info ? (
        <>
          <div className={cn("rounded-lg border p-5 transition-all duration-700", currentRank.cardClass, currentRank.glowClass)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-75">Hạng hiện tại</p>
                <div className="mt-2 flex items-center gap-2">
                  <Award size={26} aria-hidden />
                  <p className="text-3xl font-black">{currentRank.name}</p>
                </div>
              </div>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-bold transition-all duration-700", currentRank.badgeClass)}>
                Cấp {currentRank.level}
              </span>
            </div>

            <div className="mt-6 grid gap-4 sm:grid-cols-3">
              <div>
                <p className="text-xs font-semibold opacity-70">Điểm hiện có</p>
                <p className="mt-1 text-2xl font-black">{formatNumber(info.points)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">Tổng lần rửa</p>
                <p className="mt-1 text-2xl font-black">{formatNumber(info.totalWashes)}</p>
              </div>
              <div>
                <p className="text-xs font-semibold opacity-70">Hạng tiếp theo</p>
                <p className="mt-1 text-2xl font-black">{nextRank?.name ?? "Tối đa"}</p>
              </div>
            </div>

            <div className="mt-5">
              <div className="flex justify-between text-xs font-semibold opacity-80">
                <span>{nextRank ? `Còn ${formatNumber(washesToNext)} lần rửa để lên ${nextRank.name}` : "Bạn đã ở hạng cao nhất"}</span>
                <span>{progress}%</span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-black/20">
                <div
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all duration-1000", currentRank.progressClass)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {(tiers.length > 0 ? tiers : (RANK_TIERS as unknown as LoyaltyTier[])).map((tierData, index) => {
              // Map dynamic tiers to styled rank UI
              const tierLevel = tierData.level;
              const reached = currentRank.level >= tierLevel;
              const styleTier = RANK_TIERS[index] || RANK_TIERS[0]; // fallback to first style if out of bounds

              return (
                <article
                  key={tierLevel}
                  className={cn(
                    "rank-tier-card rounded-lg border p-4 transition duration-500",
                    reached ? "rank-tier-card-reached" : "rank-tier-card-locked",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Cấp {tierLevel}</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950">{tierData.name}</h3>
                    </div>
                    {reached ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700 animate-in zoom-in duration-300">
                        <CheckCircle2 size={12} aria-hidden />
                        Đã đạt
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex gap-2">
                      <TrendingUp size={15} className="mt-0.5 shrink-0 text-blue-600" aria-hidden />
                      Yêu cầu: {formatNumber(tierData.requiredWashes)} lần rửa
                    </p>
                    
                    {tierData.description && (
                      <p className="flex gap-2">
                        <Star size={15} className="mt-0.5 shrink-0 text-amber-500" aria-hidden />
                        {tierData.description}
                      </p>
                    )}

                    {tierData.priorityBookingDays !== undefined && tierData.priorityBookingDays > 0 && (
                      <p className="flex gap-2">
                        <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                        Quyền đặt lịch trước tối đa {tierData.priorityBookingDays} ngày
                      </p>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </>
      ) : null}
    </section>
  );
}
