"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { Star, WalletCards } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { getLoyaltyInfo, type LoyaltyInfo } from "@/features/loyalty/loyalty-service";
import { getWallet, type Wallet } from "@/features/users/wallet-service";
import { getCustomerProfile } from "@/features/users/customer-service";
import { resolveRankTier } from "@/features/loyalty/utils";
import { cn } from "@/lib/utils";

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

type BookingCustomerSummaryProps = {
  className?: string;
};

function SummaryValue({
  loading,
  children,
  skeletonClassName,
}: {
  loading: boolean;
  children: ReactNode;
  skeletonClassName?: string;
}) {
  if (loading) {
    return <Skeleton className={cn("mt-1 h-6 w-24", skeletonClassName)} />;
  }

  return (
    <p className="mt-1 truncate text-lg font-semibold text-foreground tabular-nums">
      {children}
    </p>
  );
}

/**
 * Thành phần (Component) BookingCustomerSummary
 *
 * Chức năng: Hiển thị thông tin tóm tắt tài khoản khách hàng tại trang đặt lịch.
 * Bao gồm: Tên khách hàng, Hạng thành viên, Điểm tích lũy và Số dư ví.
 * Lắng nghe sự kiện storage, autowash-auth và autowash-wallet-updated để đồng bộ thời gian thực.
 */
export function BookingCustomerSummary({ className }: BookingCustomerSummaryProps) {
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

    // Cập nhật số dư ví ngay lập tức khi nhận được tín hiệu sau đặt lịch thành công
    function handleWalletUpdated(e: Event) {
      const wallet = (e as CustomEvent).detail;
      if (wallet) setWallet(wallet);
    }

    sync();
    window.addEventListener("storage", sync);
    window.addEventListener("autowash-auth", sync);
    window.addEventListener("autowash-wallet-updated", handleWalletUpdated);

    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("autowash-auth", sync);
      window.removeEventListener("autowash-wallet-updated", handleWalletUpdated);
    };
  }, [loadData]);

  if (!token) return null;

  const rank = resolveRankTier(loyaltyInfo);
  const points = loyaltyInfo?.points ?? 0;
  const walletBalance = wallet?.balance ?? 0;

  return (
    <aside
      aria-label="Thông tin tài khoản"
      className={cn("booking-brand-surface w-full", className)}
    >
      <Card size="sm" className="h-full">
        <CardHeader className="border-b">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 select-none items-center justify-center rounded-xl bg-primary text-lg font-semibold text-primary-foreground">
              {name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Khách hàng
              </p>
              <CardTitle className="truncate text-base">{name}</CardTitle>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex flex-col gap-4">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Hạng thành viên
              </p>
              <SummaryValue loading={loyaltyLoading && !loyaltyInfo} skeletonClassName="w-32">
                {loyaltyLoading && !loyaltyInfo
                  ? null
                  : rank.name === "Member"
                    ? "Member"
                    : `${rank.name} Member`}
              </SummaryValue>
            </div>
            <Badge variant="secondary">
              <Star data-icon="inline-start" aria-hidden />
              Rank
            </Badge>
          </div>

          <Separator />

          <div>
            <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
              Điểm tích lũy
            </p>
            <SummaryValue loading={loyaltyLoading && !loyaltyInfo}>
              {formatPoints(points)}
              <span className="ml-1.5 text-sm font-medium text-muted-foreground">pts</span>
            </SummaryValue>
          </div>

          <Separator />

          <div>
            <div className="flex items-center gap-1.5">
              <WalletCards className="text-muted-foreground" aria-hidden />
              <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">
                Số dư ví
              </p>
            </div>
            <SummaryValue loading={walletLoading && !wallet} skeletonClassName="w-36">
              {formatVND(walletBalance)}
            </SummaryValue>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
