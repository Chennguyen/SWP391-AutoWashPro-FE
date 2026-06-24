"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { Sparkles, X } from "lucide-react";
import { getLoyaltyInfo } from "@/features/loyalty/loyalty-service";
import { resolveRankTier, type RankTier } from "@/features/loyalty/utils";
import { FireworksCelebration } from "./fireworks-celebration";

const PREVIOUS_RANK_LEVEL_KEY = "autowash_prev_rank_level";

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function readToken(): string {
  if (typeof window === "undefined") return "";
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

export function RankUpgradeCelebration() {
  const [celebratedRank, setCelebratedRank] = useState<RankTier | null>(null);
  const isCheckingRef = useRef(false);
  const lastTokenRef = useRef("");

  const checkRankUpgrade = useCallback(async (isRealtime = false) => {
    const token = readToken();
    if (!token) return;

    if (isCheckingRef.current) return;
    isCheckingRef.current = true;

    try {
      const info = await getLoyaltyInfo(token);
      if (!info) return;

      const currentRank = resolveRankTier(info);
      const previousLevelRaw = window.localStorage.getItem(PREVIOUS_RANK_LEVEL_KEY);
      const previousLevel = previousLevelRaw ? Number(previousLevelRaw) : null;

      // Cập nhật lại level hiện tại trong localStorage
      window.localStorage.setItem(PREVIOUS_RANK_LEVEL_KEY, String(currentRank.level));
      // Đồng thời cập nhật cả lastTierId để đồng bộ với RankPanel nếu cần
      if (info.tier?.id) {
        window.localStorage.setItem("lastTierId", info.tier.id);
      }

      // Nếu level hiện tại lớn hơn level trước đó, kích hoạt chúc mừng thăng hạng!
      if (previousLevel !== null && Number.isFinite(previousLevel) && currentRank.level > previousLevel) {
        setCelebratedRank(currentRank);
        
        // Phát event autowash-auth để các widget khác (như DashboardRankWidget, RankPanel)
        // cùng biết để cập nhật lại dữ liệu giao diện của họ.
        window.dispatchEvent(new Event("autowash-auth"));
      } else if (isRealtime) {
        // Trong trường hợp real-time signalr bắn xuống thông báo thăng hạng,
        // nhưng level trong DB bằng hoặc thấp hơn level đã lưu (có thể do race condition,
        // hoặc do DB đã được cập nhật trước đó rồi), ta vẫn hiển thị chúc mừng nếu nó khác Member (level > 1)
        // để đảm bảo trải nghiệm người dùng luôn có hiệu ứng khi có event thăng hạng.
        if (currentRank.level > 1) {
          setCelebratedRank(currentRank);
          window.dispatchEvent(new Event("autowash-auth"));
        }
      }
    } catch (err) {
      console.error("Lỗi khi kiểm tra thăng hạng:", err);
    } finally {
      isCheckingRef.current = false;
    }
  }, []);

  useEffect(() => {
    lastTokenRef.current = readToken();

    // 1. Kiểm tra nâng hạng ngay khi component mount (khi chuyển trang hoặc F5)
    void checkRankUpgrade(false);

    // 2. Lắng nghe sự kiện thăng hạng thời gian thực từ SignalR
    function handleRealtimeUpgrade() {
      // Đợi 1 chút để DB backend cập nhật hoàn toàn trước khi fetch thông tin mới
      setTimeout(() => {
        void checkRankUpgrade(true);
      }, 800);
    }

    // Lắng nghe cả sự kiện thay đổi đăng nhập để đồng bộ lại rank cấp độ
    function handleAuthChange() {
      const currentToken = readToken();
      if (currentToken === lastTokenRef.current) {
        // Token không thay đổi, đây có thể là sự kiện cập nhật giao diện (không phải đăng nhập/đăng xuất thực sự)
        return;
      }
      lastTokenRef.current = currentToken;

      if (currentToken) {
        // Chỉ lưu cấp độ ban đầu khi đăng nhập mới, tránh hiển thị thăng hạng giả
        void getLoyaltyInfo(currentToken)
          .then((info) => {
            if (info) {
              const currentRank = resolveRankTier(info);
              window.localStorage.setItem(PREVIOUS_RANK_LEVEL_KEY, String(currentRank.level));
              if (info.tier?.id) {
                window.localStorage.setItem("lastTierId", info.tier.id);
              }
            }
          })
          .catch((err) => console.error(err));
      } else {
        window.localStorage.removeItem(PREVIOUS_RANK_LEVEL_KEY);
        window.localStorage.removeItem("lastTierId");
      }
    }

    window.addEventListener("autowash-rank-upgrade", handleRealtimeUpgrade);
    window.addEventListener("autowash-auth", handleAuthChange);

    return () => {
      window.removeEventListener("autowash-rank-upgrade", handleRealtimeUpgrade);
      window.removeEventListener("autowash-auth", handleAuthChange);
    };
  }, [checkRankUpgrade]);

  if (!celebratedRank) return null;

  return (
    <>
      <FireworksCelebration />
      <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/45 p-4 animate-in fade-in duration-300">
        <section
          className="w-full max-w-md rounded-lg border border-amber-200 bg-white p-6 text-center shadow-2xl animate-in zoom-in-95 duration-300"
          role="dialog"
          aria-modal="true"
        >
          <button
            type="button"
            onClick={() => setCelebratedRank(null)}
            className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
            aria-label="Đóng"
          >
            <X size={17} aria-hidden />
          </button>
          
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-amber-50 text-amber-600">
            <Sparkles size={28} className="animate-bounce" aria-hidden />
          </div>
          
          <h3 className="mt-4 text-2xl font-black text-slate-950">
            Chúc mừng bạn đã thăng hạng lên {celebratedRank.name === "Member" ? "Member" : `${celebratedRank.name} Member`}!
          </h3>
          
          <p className="mt-2 text-sm text-slate-500">
            Quyền lợi mới đã được tự động cập nhật vào tài khoản AutoWash Pro của bạn. Cảm ơn bạn đã đồng hành cùng chúng tôi!
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
  );
}
