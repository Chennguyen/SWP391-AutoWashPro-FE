"use client";

import { useCallback, useEffect, useState } from "react";
import { Sparkles, Star, X } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getLoyaltyInfo, type LoyaltyInfo } from "@/lib/api/loyalty";
import { resolveRankTier, type RankTier } from "@/lib/rank";
import { FireworksCelebration } from "./FireworksCelebration";

const PREVIOUS_RANK_LEVEL_KEY = "autowash_prev_rank_level";

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function readToken(): string {
  if (typeof window === "undefined") return "";
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function getDisplayRankName(rankName: string): string {
  return rankName === "Member" ? "Member" : `${rankName} Member`;
}

/**
 * Thành phần (Component) DashboardRankWidget
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function DashboardRankWidget() {
  const [token, setToken] = useState("");
  const [info, setInfo] = useState<LoyaltyInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [celebratedRank, setCelebratedRank] = useState<RankTier | null>(null);

  const loadRank = useCallback(async (nextToken: string) => {
    if (!nextToken) {
      setInfo(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      const nextInfo = await getLoyaltyInfo(nextToken);
      const currentRank = resolveRankTier(nextInfo);
      const previousLevelRaw = window.localStorage.getItem(PREVIOUS_RANK_LEVEL_KEY);
      const previousLevel = previousLevelRaw ? Number(previousLevelRaw) : null;

      setInfo(nextInfo);

      if (previousLevel !== null && Number.isFinite(previousLevel) && currentRank.level > previousLevel) {
        setCelebratedRank(currentRank);
      }

      window.localStorage.setItem(PREVIOUS_RANK_LEVEL_KEY, String(currentRank.level));
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        window.localStorage.removeItem("token");
        window.dispatchEvent(new Event("autowash-auth"));
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    function syncToken() {
      const nextToken = readToken();
      setToken(nextToken);
      void loadRank(nextToken);
    }

    syncToken();
    window.addEventListener("storage", syncToken);
    window.addEventListener("autowash-auth", syncToken);
    return () => {
      window.removeEventListener("storage", syncToken);
      window.removeEventListener("autowash-auth", syncToken);
    };
  }, [loadRank]);

  if (!token) {
    return null;
  }

  const rank = resolveRankTier(info);

  return (
    <>
      <section
        className="overflow-hidden rounded-lg border border-slate-700/70 bg-[#111114] px-5 py-4 text-white shadow-sm"
        aria-label="Bậc rank hiện tại"
      >
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Current status
            </p>
            <div className="mt-2 flex min-w-0 items-center gap-2">
              <h2 className="truncate text-2xl font-black leading-none text-white">
                {loading && !info ? "Đang tải..." : getDisplayRankName(rank.name)}
              </h2>
              <Star size={18} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
            </div>
          </div>

          <div className="shrink-0 text-right">
            <p className="text-xs font-black uppercase tracking-widest text-slate-400">
              Available points
            </p>
            <p className="mt-2 text-3xl font-black leading-none tracking-tight text-white">
              {loading && !info ? "..." : formatNumber(info?.points ?? 0)}
            </p>
          </div>
        </div>
      </section>

      {celebratedRank ? (
        <>
          <FireworksCelebration />
          <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4">
            <section className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 text-center shadow-2xl" role="dialog" aria-modal="true">
              <button
                type="button"
                onClick={() => setCelebratedRank(null)}
                className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
                aria-label="Đóng"
              >
                <X size={17} aria-hidden />
              </button>
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
                <Sparkles size={28} aria-hidden />
              </div>
              <h3 className="mt-4 text-2xl font-black text-slate-950">
                Chúc mừng bạn đã thăng hạng lên {celebratedRank.name}!
              </h3>
              <p className="mt-2 text-sm text-slate-500">
                Quyền lợi mới đã được cập nhật vào tài khoản AutoWash Pro của bạn.
              </p>
              <button
                type="button"
                onClick={() => setCelebratedRank(null)}
                className="mt-5 w-full rounded-lg bg-slate-950 px-4 py-2.5 text-sm font-bold text-white transition hover:bg-slate-800"
              >
                Tuyệt vời
              </button>
            </section>
          </div>
        </>
      ) : null}
    </>
  );
}
