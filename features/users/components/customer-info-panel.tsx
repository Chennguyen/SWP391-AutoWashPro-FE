"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, Suspense } from "react";
import { Award, CarFront, ChevronRight, type LucideIcon, WalletCards, UserRound } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useGetVehiclesQuery } from "../hooks/useUserVehicles";
import { useGetWalletQuery } from "../hooks/useUserWallet";
import { cn } from "@/lib/utils";
import { VehicleList } from "./vehicle-list";
import { WalletPanel } from "./wallet-panel";
import { ProfilePanel } from "./profile-panel";
import { RankPanel } from "./rank-panel";

type InfoTab = "profile" | "vehicles" | "wallet" | "rank";

const SIDEBAR_ITEMS = [
  { id: "profile", label: "Thông tin cá nhân", icon: UserRound },
  { id: "vehicles", label: "Phương tiện", icon: CarFront },
  { id: "wallet", label: "Ví của tôi", icon: WalletCards },
  { id: "rank", label: "Hạng thành viên", icon: Award },
] satisfies Array<{ id: InfoTab; label: string; icon: LucideIcon }>;

function subscribeToToken(onStoreChange: () => void) {
  window.addEventListener("storage", onStoreChange);
  window.addEventListener("autowash-auth", onStoreChange);

  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener("autowash-auth", onStoreChange);
  };
}

function normalizeStoredToken(value: string): string {
  const trimmed = value.trim();
  const withoutBearer = trimmed.replace(/^Bearer\s+/i, "");

  if (
    (withoutBearer.startsWith('"') && withoutBearer.endsWith('"')) ||
    (withoutBearer.startsWith("'") && withoutBearer.endsWith("'"))
  ) {
    return withoutBearer.slice(1, -1).trim();
  }

  return withoutBearer;
}

function getTokenSnapshot(): string | null {
  if (typeof window === "undefined") {
    return null;
  }

  return normalizeStoredToken(window.localStorage.getItem("token") ?? "");
}

function getServerTokenSnapshot(): string | null {
  return null;
}

function getIsUnverifiedSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("is_unverified") === "true";
}

function getServerIsUnverifiedSnapshot() {
  return false;
}

/**
 * Thành phần (Component) CustomerInfoPanel
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function CustomerInfoPanel() {
  return (
    <Suspense fallback={<div className="min-h-80 animate-pulse rounded-2xl border border-white/10 bg-[#161619]" />}>
      <CustomerInfoPanelContent />
    </Suspense>
  );
}

function CustomerInfoPanelContent() {
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab") as InfoTab | null;
  const [activeTab, setActiveTab] = useState<InfoTab>("profile");

  useEffect(() => {
    if (tabParam && ["profile", "vehicles", "wallet", "rank"].includes(tabParam)) {
      const id = window.setTimeout(() => setActiveTab(tabParam), 0);
      return () => window.clearTimeout(id);
    }
  }, [tabParam]);
  const [sessionExpired, setSessionExpired] = useState(false);

  const tokenSnapshot = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const token = tokenSnapshot ?? "";
  const isUnverified = useSyncExternalStore(
    subscribeToToken,
    getIsUnverifiedSnapshot,
    getServerIsUnverifiedSnapshot,
  );

  const handleUnauthorized = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("role");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("email");
    window.localStorage.removeItem("firstName");
    window.localStorage.removeItem("lastName");
    window.dispatchEvent(new Event("autowash-auth"));
    setSessionExpired(true);
  }, []);

  // Queries (Disable when user is unverified to avoid 403 Console Errors)
  const vehiclesQuery = useGetVehiclesQuery(token, 1, 20, { enabled: !!token && !isUnverified });
  const walletQuery = useGetWalletQuery(token, { enabled: !!token && !isUnverified });

  const vehicles = vehiclesQuery.data || [];
  const vehiclesLoading = vehiclesQuery.isLoading;
  const vehiclesError = vehiclesQuery.error ? vehiclesQuery.error.message : null;

  const wallet = walletQuery.data || null;
  const walletLoading = walletQuery.isLoading;
  const walletError = walletQuery.error ? walletQuery.error.message : null;

  useEffect(() => {
    if (vehiclesQuery.error?.status === 401 || walletQuery.error?.status === 401) {
      const id = window.setTimeout(handleUnauthorized, 0);
      return () => window.clearTimeout(id);
    }
  }, [vehiclesQuery.error, walletQuery.error, handleUnauthorized]);

  const loadVehicles = useCallback(async () => {
    void vehiclesQuery.refetch();
  }, [vehiclesQuery]);

  const loadWallet = useCallback(async () => {
    void walletQuery.refetch();
  }, [walletQuery]);

  const navigation = (
    <nav aria-label="Trung tâm tài khoản" className="flex gap-2 overflow-x-auto p-3 lg:flex-col lg:overflow-visible lg:p-0">
      {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;

        return (
          <button
            key={id}
            type="button"
            onClick={() => setActiveTab(id)}
            data-active={active ? "true" : "false"}
            className={cn(
              "account-center-tab group flex min-h-11 shrink-0 items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-sm font-medium outline-none transition duration-200 focus-visible:ring-2 focus-visible:ring-[#bca374]/70 active:translate-y-px lg:w-full",
              active
                ? "bg-[#bca374] text-[#17130f] shadow-[0_8px_24px_rgba(188,163,116,0.16)]"
                : "bg-white/[0.035] text-[#a09c94] hover:bg-white/[0.075] hover:text-[#fffdf9] lg:bg-transparent",
            )}
            aria-current={active ? "page" : undefined}
          >
            <Icon className="size-[18px] shrink-0" strokeWidth={1.7} aria-hidden />
            <span>{label}</span>
            <ChevronRight className={cn("ml-auto hidden size-4 lg:block", active ? "text-[#17130f]/60" : "text-white/20 group-hover:text-[#d8c49f]")} aria-hidden />
          </button>
        );
      })}
    </nav>
  );

  return (
    <div className="account-center-shell overflow-hidden rounded-2xl border border-white/10 bg-[#161619] shadow-[0_24px_70px_rgba(8,8,10,0.28)]">
      <div className="border-b border-white/10 lg:hidden">{navigation}</div>

      <div className="grid lg:grid-cols-[17rem_minmax(0,1fr)]">
        <aside className="account-center-nav hidden border-r border-white/10 bg-[radial-gradient(circle_at_top_left,rgba(188,163,116,0.12),transparent_38%),#121214] p-4 lg:block lg:min-h-[42rem]">
          <div className="mb-5 px-2 pt-2">
            <p className="text-xs font-medium text-[#bca374]">Account Center</p>
            <h2 className="mt-1 text-lg font-semibold text-[#fffdf9]">Quản lý tài khoản</h2>
            <p className="mt-2 text-sm leading-6 text-[#8f8b84]">
              Thông tin cá nhân và các dịch vụ liên kết với tài khoản.
            </p>
          </div>
          {navigation}

          <div className="mt-6 rounded-xl border border-white/10 bg-white/[0.035] p-3">
            <p className="text-xs font-medium text-[#d8c49f]">Trạng thái hồ sơ</p>
            <p className="mt-1 text-sm text-[#a09c94]">
              {isUnverified ? "Đang chờ xác minh FaceID" : "Các tính năng tài khoản đã sẵn sàng"}
            </p>
          </div>
        </aside>

        <div className="min-w-0 p-4 sm:p-6 lg:p-8">
          {!token ? (
            <div className="flex min-h-96 items-center justify-center text-center">
              <div className="max-w-md">
                <span className="mx-auto flex size-12 items-center justify-center rounded-xl border border-[#bca374]/25 bg-[#bca374]/10 text-[#d8c49f]">
                  <UserRound className="size-5" strokeWidth={1.6} aria-hidden />
                </span>
                <p className="mt-4 font-semibold text-slate-800">
                  {sessionExpired
                    ? "Phiên đăng nhập đã hết hạn."
                    : "Bạn cần đăng nhập để xem thông tin này."}
                </p>
                <p className="mt-1 text-sm text-slate-500">
                  Đăng nhập lại để tải hồ sơ và dữ liệu tài khoản.
                </p>
                <Link
                  href="/sign-in"
                  className="mt-5 inline-flex items-center justify-center rounded-lg bg-[#bca374] px-4 py-2.5 text-sm font-semibold text-[#17130f] transition hover:bg-[#d8c49f] active:translate-y-px"
                >
                  Đăng nhập lại
                </Link>
              </div>
            </div>
          ) : null}

          {token && activeTab === "profile" ? (
            <ProfilePanel token={token} onUnauthorized={handleUnauthorized} />
          ) : null}

          {token && activeTab === "vehicles" ? (
            <VehicleList
              token={token}
              vehicles={vehicles}
              loading={vehiclesLoading}
              error={vehiclesError}
              onRefresh={loadVehicles}
              onUnauthorized={handleUnauthorized}
            />
          ) : null}

          {token && activeTab === "wallet" ? (
            <WalletPanel
              token={token}
              wallet={wallet}
              loading={walletLoading}
              error={walletError}
              onRefresh={loadWallet}
              onUnauthorized={handleUnauthorized}
            />
          ) : null}

          {token && activeTab === "rank" ? (
            <RankPanel token={token} onUnauthorized={handleUnauthorized} />
          ) : null}
        </div>
      </div>
    </div>
  );
}
