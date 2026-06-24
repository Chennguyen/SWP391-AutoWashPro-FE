"use client";

import { useCallback, useEffect, useState, useSyncExternalStore, Suspense } from "react";
import { Award, Car, type LucideIcon, Star, WalletCards, User, UserCog } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { getVehicles } from "@/features/booking/vehicle-service";
import { getWallet, type Wallet } from "@/features/users/wallet-service";
import { ApiError } from "@/lib/api-error";
import type { Vehicle } from "@/features/booking/vehicle-types";
import { cn } from "@/lib/utils";
import { VehicleList } from "./vehicle-list";
import { WalletPanel } from "./wallet-panel";
import { ProfilePanel } from "./profile-panel";
import { RankPanel } from "./rank-panel";

type InfoTab = "profile" | "vehicles" | "wallet" | "rank";

const SIDEBAR_ITEMS = [
  { id: "profile", label: "Thông tin cá nhân", icon: User },
  { id: "vehicles", label: "Thông tin xe", icon: Car },
  { id: "wallet", label: "Thông tin ví", icon: WalletCards },
  { id: "rank", label: "Bậc rank", icon: Award },
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

/**
 * Thành phần (Component) CustomerInfoPanel
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function CustomerInfoPanel() {
  return (
    <Suspense fallback={<div className="py-12 text-center text-sm text-slate-500">Đang tải thông tin cá nhân...</div>}>
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
  const authChecked = tokenSnapshot !== null;

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [vehiclesLoading, setVehiclesLoading] = useState(false);
  const [vehiclesError, setVehiclesError] = useState<string | null>(null);

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<string | null>(null);

  const handleUnauthorized = useCallback(() => {
    window.localStorage.removeItem("token");
    window.localStorage.removeItem("role");
    window.localStorage.removeItem("userId");
    window.localStorage.removeItem("email");
    window.dispatchEvent(new Event("autowash-auth"));
    setSessionExpired(true);
    setVehiclesLoading(false);
    setWalletLoading(false);
    setVehiclesError(null);
    setWalletError(null);
  }, []);

  const loadVehicles = useCallback(async () => {
    if (!token) {
      return;
    }

    setVehiclesLoading(true);
    setVehiclesError(null);
    try {
      const nextVehicles = await getVehicles(token, 1, 20);
      setVehicles(nextVehicles);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setVehiclesError(
        error instanceof Error
          ? error.message
          : "Không thể tải danh sách xe.",
      );
    } finally {
      setVehiclesLoading(false);
    }
  }, [handleUnauthorized, token]);

  const loadWallet = useCallback(async () => {
    if (!token) {
      return;
    }

    setWalletLoading(true);
    setWalletError(null);
    try {
      const nextWallet = await getWallet(token);
      setWallet(nextWallet);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        handleUnauthorized();
        return;
      }

      setWalletError(
        error instanceof Error
          ? error.message
          : "Không thể tải thông tin ví.",
      );
    } finally {
      setWalletLoading(false);
    }
  }, [handleUnauthorized, token]);

  const loadAll = useCallback(async () => {
    await Promise.all([loadVehicles(), loadWallet()]);
  }, [loadVehicles, loadWallet]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      setVehicles([]);
      setWallet(null);
      setVehiclesError(null);
      setWalletError(null);
    }, 0);
    return () => window.clearTimeout(id);
  }, [token]);

  useEffect(() => {
    if (!authChecked || !token) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      void loadAll();
    }, 0);

    return () => window.clearTimeout(timeoutId);
  }, [authChecked, loadAll, token]);

  return (
    <div className="grid gap-4 lg:grid-cols-[220px_minmax(0,1fr)]">
      <aside className="rounded-lg border border-slate-200 bg-white p-2 lg:sticky lg:top-20 lg:self-start">
        <nav aria-label="Thông tin cá nhân" className="space-y-1">
          {SIDEBAR_ITEMS.map(({ id, label, icon: Icon }) => {
            const active = activeTab === id;

            return (
              <button
                key={id}
                type="button"
                onClick={() => setActiveTab(id)}
                className={cn(
                  "flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left text-sm font-semibold transition",
                  active
                    ? "bg-blue-600 text-white"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-950",
                )}
                aria-current={active ? "page" : undefined}
              >
                <Icon size={17} aria-hidden />
                <span>{label}</span>
              </button>
            );
          })}
        </nav>
      </aside>

      <div className="min-h-[520px] rounded-lg border border-slate-200 bg-white p-4 shadow-sm md:p-6">
        {authChecked && !token ? (
          <div className="flex min-h-80 items-center justify-center text-center">
            <div>
              <p className="font-semibold text-slate-800">
                {sessionExpired
                  ? "Phiên đăng nhập đã hết hạn."
                  : "Bạn cần đăng nhập để xem thông tin này."}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Đăng nhập lại để tải thông tin xe và ví.
              </p>
              <Link
                href="/sign-in"
                className="mt-5 inline-flex items-center justify-center rounded-lg bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-blue-700"
              >
                Đăng nhập lại
              </Link>
            </div>
          </div>
        ) : null}

        {(!authChecked || token) && activeTab === "profile" ? (
          <ProfilePanel
            token={token}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}



        {(!authChecked || token) && activeTab === "vehicles" ? (
          <VehicleList
            token={token}
            vehicles={vehicles}
            loading={vehiclesLoading}
            error={vehiclesError}
            onRefresh={loadVehicles}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}

        {(!authChecked || token) && activeTab === "wallet" ? (
          <WalletPanel
            token={token}
            wallet={wallet}
            loading={walletLoading}
            error={walletError}
            onRefresh={loadWallet}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}


        {(!authChecked || token) && activeTab === "rank" ? (
          <RankPanel
            token={token}
            onUnauthorized={handleUnauthorized}
          />
        ) : null}
      </div>
    </div>
  );
}
