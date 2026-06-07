"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Star, WalletCards } from "lucide-react";
import { getLoyaltyInfo, type LoyaltyInfo } from "@/lib/api/loyalty";
import { getWallet, type Wallet } from "@/lib/api/wallet";
import { getCustomerProfile } from "@/lib/api/customer";
import { resolveRankTier } from "@/lib/rank";

function normalizeStoredToken(value: string): string {
  return value.replace(/^Bearer\s+/i, "").replace(/^"|"$/g, "").trim();
}

function readToken(): string {
  if (typeof window === "undefined") return "";
  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function readName(): string {
  if (typeof window === "undefined") return "Khách hàng";
  const firstName = window.localStorage.getItem("firstName");
  const lastName = window.localStorage.getItem("lastName");
  if (firstName || lastName) {
    return `${lastName ?? ""} ${firstName ?? ""}`.trim();
  }
  const email = window.localStorage.getItem("email") ?? "";
  if (!email) return "Khách hàng";
  const username = email.split("@")[0] ?? "";
  return username.charAt(0).toUpperCase() + username.slice(1);
}

function formatVND(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value);
}

/**
 * Thành phần (Component) BookingCustomerSummary
 *
 * Chức năng: Hiển thị thông tin tóm tắt tài khoản khách hàng tại trang đặt lịch.
 * Bao gồm: Tên khách hàng, Hạng thành viên, Điểm tích lũy và Số dư ví.
 * Lắng nghe sự kiện storage và autowash-auth để đồng bộ thời gian thực.
 */
export function BookingCustomerSummary() {
  const [name, setName] = useState("Khách hàng");
  const [token, setToken] = useState("");
  const [loyaltyInfo, setLoyaltyInfo] = useState<LoyaltyInfo | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);

  const lastTokenRef = useRef("");

  const loadData = useCallback(async (nextToken: string) => {
    if (!nextToken) {
      setLoyaltyInfo(null);
      setWallet(null);
      return;
    }

    setLoyaltyLoading(true);
    setWalletLoading(true);

    const [loyaltyResult, walletResult, profileResult] = await Promise.allSettled([
      getLoyaltyInfo(nextToken),
      getWallet(nextToken),
      getCustomerProfile(nextToken),
    ]);

    if (loyaltyResult.status === "fulfilled") {
      setLoyaltyInfo(loyaltyResult.value);
    }
    setLoyaltyLoading(false);

    if (walletResult.status === "fulfilled") {
      setWallet(walletResult.value);
    }
    setWalletLoading(false);

    if (profileResult.status === "fulfilled") {
      const profile = profileResult.value;
      const firstName = profile.firstName;
      const lastName = profile.lastName;
      const oldFirstName = window.localStorage.getItem("firstName");
      const oldLastName = window.localStorage.getItem("lastName");

      if (firstName !== oldFirstName || lastName !== oldLastName) {
        window.localStorage.setItem("firstName", firstName);
        window.localStorage.setItem("lastName", lastName);
        const fullName = `${lastName} ${firstName}`.trim();
        setName(fullName || "Khách hàng");
        window.dispatchEvent(new Event("autowash-auth"));
      } else {
        const fullName = `${lastName} ${firstName}`.trim();
        setName(fullName || "Khách hàng");
      }
    }
  }, []);

  useEffect(() => {
    function sync() {
      const nextToken = readToken();
      const nextName = readName();
      setToken(nextToken);
      setName(nextName);
      if (nextToken && nextToken !== lastTokenRef.current) {
        lastTokenRef.current = nextToken;
        void loadData(nextToken);
      }
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("autowash-auth", sync);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("autowash-auth", sync);
    };
  }, [loadData]);

  if (!token) return null;

  const rank = resolveRankTier(loyaltyInfo);
  const points = loyaltyInfo?.points ?? 0;
  const walletBalance = wallet?.balance ?? 0;

  return (
    <aside
      aria-label="Thông tin tài khoản"
      className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm"
    >
      {/* Avatar + Tên */}
      <div className="flex items-center gap-3">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-slate-950 text-lg font-black text-white select-none">
          {name.charAt(0).toUpperCase()}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Khách hàng
          </p>
          <p className="truncate text-base font-black text-slate-950">{name}</p>
        </div>
      </div>

      <hr className="my-4 border-slate-100" />

      {/* Hạng thành viên */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Hạng thành viên
          </p>
          <Star size={14} className="shrink-0 fill-amber-400 text-amber-400" aria-hidden />
        </div>
        <p className="text-xl font-black text-slate-950">
          {loyaltyLoading && !loyaltyInfo
            ? "Đang tải..."
            : rank.name === "Member"
              ? "Member"
              : `${rank.name} Member`}
        </p>
      </div>

      <hr className="my-4 border-slate-100" />

      {/* Điểm tích lũy */}
      <div className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
          Điểm tích lũy
        </p>
        <p className="text-xl font-black text-slate-950">
          {loyaltyLoading && !loyaltyInfo ? "..." : formatPoints(points)}
          <span className="ml-1.5 text-sm font-semibold text-slate-400">pts</span>
        </p>
      </div>

      <hr className="my-4 border-slate-100" />

      {/* Số dư ví */}
      <div className="space-y-1">
        <div className="flex items-center gap-1.5">
          <WalletCards size={13} className="text-slate-400" aria-hidden />
          <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
            Số dư ví
          </p>
        </div>
        <p className="text-xl font-black text-slate-950">
          {walletLoading && !wallet ? "..." : formatVND(walletBalance)}
        </p>
      </div>
    </aside>
  );
}
