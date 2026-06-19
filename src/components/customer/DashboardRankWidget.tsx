"use client";

import { useCallback, useEffect, useState } from "react";
import { Star } from "lucide-react";
import { ApiError } from "@/lib/api/api-error";
import { getLoyaltyInfo, type LoyaltyInfo } from "@/lib/api/loyalty";
import { getMyVerificationStatus } from "@/lib/api/customer";
import { resolveRankTier } from "@/lib/rank";
import { cn } from "@/lib/utils";

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
  return rankName;
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
  const [status, setStatus] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const loadRank = useCallback(async (nextToken: string) => {
    if (!nextToken) {
      setInfo(null);
      setStatus(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    try {
      // Kiểm tra trạng thái xác minh trước tiên
      const verification = await getMyVerificationStatus(nextToken);
      setStatus(verification.status);

      if (verification.status === "Pending" || verification.status === "Rejected") {
        setInfo(null);
        setLoading(false);
        return;
      }

      const nextInfo = await getLoyaltyInfo(nextToken);
      setInfo(nextInfo);
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

  if (!token || status === "Pending" || status === "Rejected") {
    return null;
  }

  const rank = resolveRankTier(info);

  return (
    <section
      className={cn(
        "overflow-hidden rounded-lg border px-5 py-4 transition-all duration-700 shadow-sm",
        rank.cardClass,
        rank.glowClass
      )}
      aria-label="Bậc rank hiện tại"
    >
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="text-xs font-black uppercase tracking-widest opacity-75">
            Hạng hiện tại
          </p>
          <div className="mt-2 flex min-w-0 items-center gap-2">
            <h2 className="truncate text-2xl font-black leading-none">
              {loading && !info ? "Đang tải..." : getDisplayRankName(rank.name)}
            </h2>
            <Star size={18} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
          </div>
        </div>

        <div className="shrink-0 text-right">
          <p className="text-xs font-black uppercase tracking-widest opacity-75">
            Điểm hiện tại
          </p>
          <p className="mt-2 text-3xl font-black leading-none tracking-tight">
            {loading && !info ? "..." : formatNumber(info?.points ?? 0)}
          </p>
        </div>
      </div>
    </section>
  );
}
