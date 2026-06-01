"use client";

import { useCallback, useEffect, useState } from "react";
import { Award, CheckCircle2, RefreshCw, ShieldCheck, Sparkles, TrendingUp } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getLoyaltyInfo, type LoyaltyInfo } from "@/lib/api/loyalty";
import { getNextRankTier, getRankProgress, RANK_TIERS, resolveRankTier } from "@/lib/rank";
import { cn } from "@/lib/utils";

interface RankPanelProps {
  token: string;
  onUnauthorized: () => void;
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

export function RankPanel({ token, onUnauthorized }: RankPanelProps) {
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRank = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      setInfo(await getLoyaltyInfo(token));
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
          <div className={cn("rounded-lg border p-5", currentRank.cardClass, currentRank.glowClass)}>
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-xs font-black uppercase tracking-widest opacity-75">Hạng hiện tại</p>
                <div className="mt-2 flex items-center gap-2">
                  <Award size={26} aria-hidden />
                  <p className="text-3xl font-black">{currentRank.name}</p>
                </div>
              </div>
              <span className={cn("rounded-full border px-3 py-1 text-xs font-bold", currentRank.badgeClass)}>
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
                  className={cn("h-full rounded-full bg-gradient-to-r transition-all", currentRank.progressClass)}
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          </div>

          <div className="grid gap-3 md:grid-cols-2">
            {RANK_TIERS.map((tier) => {
              const reached = currentRank.level >= tier.level;
              return (
                <article
                  key={tier.level}
                  className={cn(
                    "rank-tier-card rounded-lg border p-4 transition",
                    reached ? "rank-tier-card-reached" : "rank-tier-card-locked",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-500">Cấp {tier.level}</p>
                      <h3 className="mt-1 text-lg font-bold text-slate-950">{tier.name}</h3>
                    </div>
                    {reached ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-1 text-xs font-bold text-emerald-700">
                        <CheckCircle2 size={12} aria-hidden />
                        Đã đạt
                      </span>
                    ) : null}
                  </div>

                  <div className="mt-4 space-y-2 text-sm text-slate-600">
                    <p className="flex gap-2">
                      <TrendingUp size={15} className="mt-0.5 shrink-0 text-blue-600" aria-hidden />
                      Yêu cầu: {formatNumber(tier.requiredWashes)} lần rửa
                    </p>
                    <p className="flex gap-2">
                      <Sparkles size={15} className="mt-0.5 shrink-0 text-amber-600" aria-hidden />
                      {tier.discount}
                    </p>
                    <p className="flex gap-2">
                      <ShieldCheck size={15} className="mt-0.5 shrink-0 text-emerald-600" aria-hidden />
                      {tier.priority}
                    </p>
                    <p className="flex gap-2">
                      <Award size={15} className="mt-0.5 shrink-0 text-violet-600" aria-hidden />
                      {tier.bookingWindow}
                    </p>
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
