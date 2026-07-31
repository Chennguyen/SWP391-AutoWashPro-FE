"use client";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { UpcomingBookingPanel } from "@/features/booking/components/upcoming-booking-panel";
import { useGetBookingsQuery } from "@/features/booking/hooks/useBookings";
import {
  getServerTokenSnapshot,
  getTokenSnapshot,
  isUpcomingStatus,
  subscribeToToken,
  toISODate,
} from "@/features/booking/utils";
import {
  useGetAllTiersQuery,
  useGetLoyaltyInfoQuery,
  useGetMyVouchersQuery,
  useGetPointTransactionsQuery,
} from "@/features/loyalty/hooks/useLoyalty";
import type { PointTransaction } from "@/features/loyalty/types/loyalty-types";
import { useGetVehiclesQuery } from "@/features/users/hooks/useUserVehicles";
import {
  useGetWalletQuery,
  useGetWalletTransactionsQuery,
} from "@/features/users/hooks/useUserWallet";
import { RewardRedeemSection } from "@/features/voucher/components/reward-redeem-section";
import { cn } from "@/lib/utils";
import type { TransactionItem } from "@/types/transaction";
import {
  ArrowRight,
  Award,
  Bot,
  CalendarClock,
  CarFront,
  ChevronRight,
  Clock3,
  Gift,
  History,
  MessageCircleMore,
  RefreshCw,
  Sparkles,
  Star,
  TicketPercent,
  WalletCards,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";

type ActivityItem = {
  id: string;
  title: string;
  description: string;
  value: string;
  date: string;
  icon: LucideIcon;
};

const QUICK_ACTIONS = [
  {
    label: "Đặt lịch rửa xe",
    description: "Chọn chi nhánh và khung giờ",
    href: "/customer/booking",
    icon: CalendarClock,
  },
  {
    label: "Lịch đang hoạt động",
    description: "Theo dõi lịch sắp tới",
    href: "/customer/history?tab=active",
    icon: Clock3,
  },
  {
    label: "Quản lý phương tiện",
    description: "Cập nhật xe của bạn",
    href: "/customer/profile?tab=vehicles",
    icon: CarFront,
  },
  {
    label: "Lịch sử rửa xe",
    description: "Xem các dịch vụ đã dùng",
    href: "/customer/history?tab=history",
    icon: History,
  },
  {
    label: "Ví của tôi",
    description: "Số dư và giao dịch",
    href: "/customer/profile?tab=wallet",
    icon: WalletCards,
  },
  {
    label: "Hạng và quyền lợi",
    description: "Điểm, hạng và phần thưởng",
    href: "/customer/profile?tab=rank",
    icon: Award,
  },
] satisfies Array<{
  label: string;
  description: string;
  href: string;
  icon: LucideIcon;
}>;

function getUserIdSnapshot() {
  if (typeof window === "undefined") return "";
  return window.localStorage.getItem("userId")?.trim() ?? "";
}

function getServerUserIdSnapshot() {
  return "";
}

function getUnverifiedSnapshot() {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem("is_unverified") === "true";
}

function getServerUnverifiedSnapshot() {
  return false;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Chưa có thời gian";
  return date.toLocaleString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function transactionTitle(transaction: TransactionItem) {
  const normalized = String(transaction.type).trim().toLowerCase();
  if (normalized === "2" || normalized === "wallettopup")
    return "Đã nạp tiền vào ví";
  if (normalized === "0" || normalized === "deposit")
    return "Đã thanh toán tiền cọc";
  if (normalized === "1" || normalized === "fullpayment")
    return "Đã thanh toán dịch vụ";
  return "Giao dịch ví";
}

function walletActivity(transaction: TransactionItem): ActivityItem {
  const normalized = String(transaction.type).trim().toLowerCase();
  const isTopUp = normalized === "2" || normalized === "wallettopup";
  return {
    id: `wallet-${transaction.transactionId}`,
    title: transactionTitle(transaction),
    description: transaction.description || "Giao dịch từ ví AutoWash Pro",
    value: `${isTopUp ? "+" : "-"}${formatCurrency(Math.abs(transaction.amount))}`,
    date: transaction.transactionDate || transaction.createdAt,
    icon: WalletCards,
  };
}

function pointActivity(transaction: PointTransaction): ActivityItem {
  const isEarned = transaction.type.trim().toLowerCase() === "earn";
  return {
    id: `point-${transaction.id}`,
    title: isEarned ? "Đã nhận điểm thành viên" : "Đã sử dụng điểm",
    description: transaction.description || "Cập nhật điểm thành viên",
    value: `${isEarned ? "+" : "-"}${formatNumber(Math.abs(transaction.points))} điểm`,
    date: transaction.createdAt,
    icon: Star,
  };
}

function SummaryMetric({
  icon: Icon,
  label,
  value,
  loading,
  emphasized,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  loading: boolean;
  emphasized?: boolean;
}) {
  return (
    <div
      className={cn(
        "min-w-0 bg-[#161619] px-4 py-4 sm:px-5",
        emphasized &&
          "col-span-2 bg-[radial-gradient(circle_at_top_left,rgba(188,163,116,0.16),transparent_68%)] sm:col-span-1",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-[#a09c94]">
        <Icon className="size-4 text-[#bca374]" strokeWidth={1.7} aria-hidden />
        <span>{label}</span>
      </div>
      {loading ? (
        <Skeleton className="mt-3 h-7 w-24 bg-white/10" />
      ) : (
        <p className="mt-2 break-words text-base font-semibold leading-tight text-[#fffdf9] tabular-nums sm:text-xl xl:text-2xl">
          {value}
        </p>
      )}
    </div>
  );
}

function QuickActions() {
  return (
    <section
      aria-labelledby="quick-actions-title"
      className="rounded-2xl border border-white/10 bg-[#161619] p-4 shadow-[0_18px_50px_rgba(8,8,10,0.2)] sm:p-5"
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2
            id="quick-actions-title"
            className="text-lg font-semibold text-[#fffdf9]"
          >
            Truy cập nhanh
          </h2>
          <p className="mt-1 text-sm text-[#a09c94]">
            Những việc bạn thường cần.
          </p>
        </div>
        <Sparkles
          className="size-5 text-[#bca374]"
          strokeWidth={1.6}
          aria-hidden
        />
      </div>

      <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-1">
        {QUICK_ACTIONS.map(({ label, description, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="group flex min-h-16 items-center gap-3 rounded-xl bg-white/[0.035] px-3 py-2.5 outline-none transition duration-200 hover:bg-white/[0.075] focus-visible:ring-2 focus-visible:ring-[#bca374]/70 active:translate-y-px"
          >
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg border border-[#bca374]/20 bg-[#bca374]/10 text-[#d8c49f] transition group-hover:border-[#bca374]/40">
              <Icon className="size-[18px]" strokeWidth={1.7} aria-hidden />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#fffdf9]">
                {label}
              </span>
              <span className="mt-0.5 block truncate text-xs text-[#8f8b84]">
                {description}
              </span>
            </span>
            <ChevronRight
              className="size-4 shrink-0 text-white/25 transition group-hover:translate-x-0.5 group-hover:text-[#d8c49f]"
              aria-hidden
            />
          </Link>
        ))}
      </div>
    </section>
  );
}

function openAiAssistant() {
  const trigger = document.querySelector<HTMLButtonElement>(
    'button[aria-label="Mở trợ lý AutoWash Pro"]',
  );
  trigger?.click();
}

export function CustomerDashboardOverview() {
  const [dashboardView, setDashboardView] = useState<"overview" | "rewards">(
    "overview",
  );
  const rewardTriggerRef = useRef<HTMLButtonElement>(null);
  const shouldRestoreRewardTriggerFocusRef = useRef(false);
  const tokenSnapshot = useSyncExternalStore(
    subscribeToToken,
    getTokenSnapshot,
    getServerTokenSnapshot,
  );
  const userId = useSyncExternalStore(
    subscribeToToken,
    getUserIdSnapshot,
    getServerUserIdSnapshot,
  );
  const isUnverified = useSyncExternalStore(
    subscribeToToken,
    getUnverifiedSnapshot,
    getServerUnverifiedSnapshot,
  );
  const token = tokenSnapshot ?? "";
  const enabled = Boolean(token) && !isUnverified;
  const unavailableText = isUnverified ? "Chờ xác minh" : "Chưa đăng nhập";

  const dateRange = useMemo(() => {
    const from = new Date();
    from.setDate(from.getDate() - 1);
    const to = new Date();
    to.setDate(to.getDate() + 60);
    return {
      fromDate: toISODate(from),
      toDate: toISODate(to),
      page: 1,
      pageSize: 50,
    };
  }, []);
  const transactionParams = useMemo(() => ({ pageIndex: 1, pageSize: 6 }), []);
  const pointParams = useMemo(() => ({ page: 1, pageSize: 6 }), []);

  const walletQuery = useGetWalletQuery(token, { enabled });
  const vehiclesQuery = useGetVehiclesQuery(token, 1, 50, { enabled });
  const bookingsQuery = useGetBookingsQuery(token, dateRange, { enabled });
  const loyaltyQuery = useGetLoyaltyInfoQuery(token, { enabled });
  const tiersQuery = useGetAllTiersQuery(token, { enabled });
  const pointTransactionsQuery = useGetPointTransactionsQuery(
    token,
    pointParams,
    { enabled },
  );
  const walletTransactionsQuery = useGetWalletTransactionsQuery(
    transactionParams,
    { enabled },
  );
  const vouchersQuery = useGetMyVouchersQuery(token, userId, {
    enabled: enabled && Boolean(userId),
  });

  const activeBookings = (bookingsQuery.data ?? []).filter((booking) =>
    isUpcomingStatus(booking.status),
  );
  const loyalty = loyaltyQuery.data;
  const currentTier = loyalty?.tier;
  const sortedTiers = [...(tiersQuery.data ?? [])].sort(
    (a, b) => a.level - b.level,
  );
  const nextTier = sortedTiers.find(
    (tier) => tier.level > (currentTier?.level ?? 0),
  );
  const nextRequiredWashes =
    loyalty?.nextTierRequiredWashes ?? nextTier?.requiredWashes ?? null;
  const currentRequiredWashes = currentTier?.requiredWashes ?? 0;
  const washesInTier = Math.max(
    0,
    (loyalty?.totalWashes ?? 0) - currentRequiredWashes,
  );
  const washesNeededInTier = nextRequiredWashes
    ? Math.max(1, nextRequiredWashes - currentRequiredWashes)
    : 1;
  const membershipProgress = nextRequiredWashes
    ? Math.min(100, Math.round((washesInTier / washesNeededInTier) * 100))
    : 100;
  const remainingWashes = nextRequiredWashes
    ? Math.max(0, nextRequiredWashes - (loyalty?.totalWashes ?? 0))
    : 0;

  const activities = useMemo(() => {
    const pointItems = (pointTransactionsQuery.data ?? []).map(pointActivity);
    const transactions = Array.isArray(
      walletTransactionsQuery.data?.transactions,
    )
      ? walletTransactionsQuery.data.transactions
      : [];
    const walletItems = transactions.map(walletActivity);
    return [...pointItems, ...walletItems]
      .sort((a, b) => {
        const aTime = new Date(a.date).getTime();
        const bTime = new Date(b.date).getTime();
        return (
          (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime)
        );
      })
      .slice(0, 6);
  }, [pointTransactionsQuery.data, walletTransactionsQuery.data]);

  const availableVouchers = (vouchersQuery.data ?? []).filter(
    (voucher) =>
      !voucher.isUsed &&
      voucher.status.trim().toLowerCase() === "active" &&
      (!voucher.expiresAt ||
        new Date(voucher.expiresAt).getTime() > vouchersQuery.dataUpdatedAt),
  );
  const nearestVoucherExpiry = availableVouchers.reduce<number | null>(
    (nearestExpiry, voucher) => {
      if (!voucher.expiresAt) return nearestExpiry;

      const expiryTime = new Date(voucher.expiresAt).getTime();
      if (!Number.isFinite(expiryTime)) return nearestExpiry;

      return nearestExpiry === null || expiryTime < nearestExpiry
        ? expiryTime
        : nearestExpiry;
    },
    null,
  );
  const activityLoading =
    pointTransactionsQuery.isLoading || walletTransactionsQuery.isLoading;
  const activityError =
    pointTransactionsQuery.isError && walletTransactionsQuery.isError;

  useEffect(() => {
    if (
      dashboardView === "overview" &&
      shouldRestoreRewardTriggerFocusRef.current
    ) {
      rewardTriggerRef.current?.focus();
      shouldRestoreRewardTriggerFocusRef.current = false;
    }
  }, [dashboardView]);

  if (dashboardView === "rewards") {
    return (
      <RewardRedeemSection
        token={token}
        userId={userId}
        customerId={loyalty?.customerId ?? ""}
        currentPoints={loyalty?.points ?? 0}
        pointsLoading={loyaltyQuery.isLoading}
        enabled={enabled}
        onBack={() => {
          shouldRestoreRewardTriggerFocusRef.current = true;
          setDashboardView("overview");
        }}
      />
    );
  }

  return (
    <>
      <section
        aria-label="Tổng quan tài khoản"
        className="mb-6 overflow-hidden rounded-2xl border border-white/10 bg-white/10 shadow-[0_20px_60px_rgba(8,8,10,0.24)]"
      >
        <div className="grid grid-cols-2 gap-px xl:grid-cols-[1.15fr_repeat(4,minmax(0,1fr))]">
          <SummaryMetric
            icon={Award}
            label="Hạng thành viên"
            value={
              !enabled
                ? unavailableText
                : (currentTier?.name ??
                  (loyaltyQuery.isError ? "Chưa tải được" : "Member"))
            }
            loading={enabled && loyaltyQuery.isLoading}
            emphasized
          />
          <SummaryMetric
            icon={Star}
            label="Điểm thưởng"
            value={
              !enabled
                ? unavailableText
                : loyaltyQuery.isError
                  ? "Chưa tải được"
                  : formatNumber(loyalty?.points ?? 0)
            }
            loading={enabled && loyaltyQuery.isLoading}
          />
          <SummaryMetric
            icon={WalletCards}
            label="Số dư ví"
            value={
              !enabled
                ? unavailableText
                : walletQuery.isError
                  ? "Chưa tải được"
                  : formatCurrency(walletQuery.data?.balance ?? 0)
            }
            loading={enabled && walletQuery.isLoading}
          />
          <SummaryMetric
            icon={CalendarClock}
            label="Lịch đang hoạt động"
            value={
              !enabled
                ? unavailableText
                : bookingsQuery.isError
                  ? "Chưa tải được"
                  : formatNumber(activeBookings.length)
            }
            loading={enabled && bookingsQuery.isLoading}
          />
          <SummaryMetric
            icon={CarFront}
            label="Phương tiện"
            value={
              !enabled
                ? unavailableText
                : vehiclesQuery.isError
                  ? "Chưa tải được"
                  : formatNumber(vehiclesQuery.data?.length ?? 0)
            }
            loading={enabled && vehiclesQuery.isLoading}
          />
        </div>
      </section>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(19rem,0.75fr)]">
        <div className="min-w-0 space-y-6">
          <div className="customer-home-upcoming">
            <UpcomingBookingPanel />
          </div>

          <section
            aria-labelledby="activity-title"
            className="overflow-hidden rounded-2xl border border-white/10 bg-[#161619] shadow-[0_18px_50px_rgba(8,8,10,0.2)]"
          >
            <div className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-4 sm:px-5">
              <div>
                <h2
                  id="activity-title"
                  className="text-lg font-semibold text-[#fffdf9]"
                >
                  Hoạt động gần đây
                </h2>
                <p className="mt-1 text-sm text-[#a09c94]">
                  Giao dịch ví và điểm thành viên mới nhất.
                </p>
              </div>
              <Clock3
                className="size-5 text-[#bca374]"
                strokeWidth={1.6}
                aria-hidden
              />
            </div>

            {activityLoading ? (
              <div className="space-y-3 p-4 sm:p-5">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="flex items-center gap-3">
                    <Skeleton className="size-10 rounded-xl bg-white/10" />
                    <div className="flex-1 space-y-2">
                      <Skeleton className="h-4 w-40 bg-white/10" />
                      <Skeleton className="h-3 w-56 max-w-full bg-white/10" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activityError ? (
              <div className="px-5 py-10 text-center">
                <p className="text-sm font-medium text-[#fffdf9]">
                  Chưa thể tải hoạt động gần đây.
                </p>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    void pointTransactionsQuery.refetch();
                    void walletTransactionsQuery.refetch();
                  }}
                  className="mt-3 text-[#d8c49f] hover:bg-white/5 hover:text-[#fffdf9]"
                >
                  <RefreshCw data-icon="inline-start" aria-hidden />
                  Thử lại
                </Button>
              </div>
            ) : activities.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <Clock3
                  className="mx-auto size-8 text-[#bca374]/70"
                  strokeWidth={1.4}
                  aria-hidden
                />
                <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                  Chưa có hoạt động để hiển thị
                </p>
                <p className="mx-auto mt-1 max-w-md text-sm text-[#a09c94]">
                  Giao dịch ví và thay đổi điểm sẽ xuất hiện tại đây.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-white/10 px-4 sm:px-5">
                {activities.map((activity) => {
                  const Icon = activity.icon;
                  return (
                    <article
                      key={activity.id}
                      className="flex items-center gap-3 py-3.5"
                    >
                      <span className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-white/[0.05] text-[#d8c49f]">
                        <Icon
                          className="size-[18px]"
                          strokeWidth={1.7}
                          aria-hidden
                        />
                      </span>
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate text-sm font-medium text-[#fffdf9]">
                          {activity.title}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-[#8f8b84]">
                          {activity.description}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-semibold text-[#d8c49f] tabular-nums">
                          {activity.value}
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#77736d]">
                          {formatActivityDate(activity.date)}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </div>

        <aside className="space-y-6">
          <QuickActions />

          <section
            aria-labelledby="membership-title"
            className="rounded-2xl border border-[#bca374]/20 bg-[radial-gradient(circle_at_top_right,rgba(188,163,116,0.17),transparent_55%),#161619] p-5 shadow-[0_18px_50px_rgba(8,8,10,0.22)]"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-[#bca374]">
                  Thành viên AutoWash
                </p>
                <h2
                  id="membership-title"
                  className="mt-1 text-xl font-semibold text-[#fffdf9]"
                >
                  {currentTier?.name ??
                    (enabled ? "Member" : "Chưa có dữ liệu")}
                </h2>
              </div>
              <span className="flex size-10 items-center justify-center rounded-xl border border-[#bca374]/25 bg-[#bca374]/10 text-[#d8c49f]">
                <Award className="size-5" strokeWidth={1.6} aria-hidden />
              </span>
            </div>

            {!enabled ? (
              <p className="mt-6 text-sm leading-6 text-[#a09c94]">
                {isUnverified
                  ? "Tiến trình sẽ hiển thị sau khi hồ sơ được xác minh."
                  : "Đăng nhập để xem tiến trình thành viên."}
              </p>
            ) : loyaltyQuery.isLoading || tiersQuery.isLoading ? (
              <div className="mt-6 space-y-3">
                <Skeleton className="h-2 w-full bg-white/10" />
                <Skeleton className="h-4 w-48 bg-white/10" />
              </div>
            ) : loyaltyQuery.isError ? (
              <p className="mt-6 text-sm text-[#a09c94]">
                Chưa thể tải tiến trình thành viên.
              </p>
            ) : (
              <div className="mt-6">
                <div className="flex items-center justify-between gap-3 text-xs">
                  <span className="text-[#a09c94] text-lg">
                    {nextTier?.name ?? loyalty?.nextTierName ?? "Hạng cao nhất"}
                  </span>
                  <span className="font-semibold text-[#d8c49f] tabular-nums">
                    {membershipProgress}%
                  </span>
                </div>
                <div
                  className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10"
                  role="progressbar"
                  aria-label="Tiến trình hạng thành viên"
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-valuenow={membershipProgress}
                >
                  <div
                    className="h-full rounded-full bg-[#bca374] transition-[width] duration-500 motion-reduce:transition-none"
                    style={{ width: `${membershipProgress}%` }}
                  />
                </div>
                <p className="mt-3 text-sm leading-6 text-[#a09c94]">
                  {nextRequiredWashes
                    ? `Cần thêm ${formatNumber(remainingWashes)} lần rửa để đạt ${nextTier?.name ?? loyalty?.nextTierName ?? "hạng tiếp theo"}.`
                    : "Bạn đã đạt hạng thành viên cao nhất hiện tại."}
                </p>
                <Link
                  href="/customer/profile?tab=rank"
                  className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#d8c49f] outline-none transition hover:text-[#fffdf9] focus-visible:ring-2 focus-visible:ring-[#bca374]/70"
                >
                  Xem quyền lợi
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              </div>
            )}
          </section>

          <section
            aria-labelledby="offers-title"
            className="relative overflow-hidden rounded-2xl border border-white/10 bg-[#1d1d20] p-5 shadow-[0_18px_50px_rgba(8,8,10,0.2)]"
          >
            <div className="pointer-events-none absolute -right-10 -top-10 size-36 rounded-full bg-[#bca374]/10 blur-3xl" />
            <div className="relative">
              <div className="flex items-center gap-2 text-[#d8c49f]">
                <TicketPercent
                  className="size-5"
                  strokeWidth={1.6}
                  aria-hidden
                />
                <h2
                  id="offers-title"
                  className="text-base font-semibold text-[#fffdf9]"
                >
                  Ưu đãi của bạn
                </h2>
              </div>

              {!enabled ? (
                <div className="mt-5">
                  <Gift
                    className="size-8 text-[#bca374]/70"
                    strokeWidth={1.4}
                    aria-hidden
                  />
                  <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                    Chưa thể tải ưu đãi
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a09c94]">
                    {isUnverified
                      ? "Ưu đãi sẽ hiển thị sau khi hồ sơ được xác minh."
                      : "Đăng nhập để xem voucher của bạn."}
                  </p>
                </div>
              ) : vouchersQuery.isLoading ? (
                <div className="mt-5 space-y-3">
                  <Skeleton className="h-6 w-32 bg-white/10" />
                  <Skeleton className="h-4 w-full bg-white/10" />
                </div>
              ) : availableVouchers.length > 0 ? (
                <div className="mt-5">
                  <p className="text-3xl font-semibold tracking-tight text-[#fffdf9] tabular-nums">
                    {formatNumber(availableVouchers.length)}
                    <span className="ml-2 text-base font-medium tracking-normal text-[#c4c0b8]">
                      voucher khả dụng
                    </span>
                  </p>
                  <p className="mt-3 text-sm leading-6 text-[#a09c94]">
                    {nearestVoucherExpiry !== null
                      ? `Voucher có hạn gần nhất hết hạn vào ngày ${new Date(nearestVoucherExpiry).toLocaleDateString("vi-VN")}.`
                      : "Các voucher hiện tại không có ngày hết hạn."}
                  </p>
                </div>
              ) : (
                <div className="mt-5">
                  <Gift
                    className="size-8 text-[#bca374]/70"
                    strokeWidth={1.4}
                    aria-hidden
                  />
                  <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                    Chưa có voucher khả dụng
                  </p>
                  <p className="mt-1 text-sm leading-6 text-[#a09c94]">
                    Voucher đã đổi từ điểm thành viên sẽ xuất hiện tại đây.
                  </p>
                  <Link
                    href="/customer/profile?tab=rank"
                    className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-[#d8c49f] hover:text-[#fffdf9]"
                  >
                    Xem hạng thành viên
                    <ArrowRight className="size-4" aria-hidden />
                  </Link>
                </div>
              )}

              <Button
                ref={rewardTriggerRef}
                type="button"
                onClick={() => setDashboardView("rewards")}
                disabled={!enabled}
                className="mt-5 w-full justify-between bg-[#bca374] px-3.5 font-semibold text-[#17130f] hover:bg-[#d8c49f] focus-visible:border-[#d8c49f] focus-visible:ring-[#d8c49f]/40 disabled:bg-white/10 disabled:text-white/45"
              >
                <span className="flex items-center gap-2">
                  <Sparkles
                    data-icon="inline-start"
                    style={{
                      color: enabled ? "#17130f" : "rgba(255, 255, 255, 0.45)",
                    }}
                    aria-hidden
                  />
                  <b
                    className="font-semibold"
                    style={{
                      color: enabled ? "#17130f" : "rgba(255, 255, 255, 0.45)",
                    }}
                  >
                    Xem và đổi voucher
                  </b>
                </span>
                <ArrowRight data-icon="inline-end" aria-hidden />
              </Button>
            </div>
          </section>

          <section
            aria-labelledby="support-title"
            className="rounded-2xl border border-white/10 bg-[#161619] p-5"
          >
            <div className="flex items-start gap-3">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-[#bca374]/20 bg-[#bca374]/10 text-[#d8c49f]">
                <Bot className="size-5" strokeWidth={1.6} aria-hidden />
              </span>
              <div>
                <h2
                  id="support-title"
                  className="text-base font-semibold text-[#fffdf9]"
                >
                  Cần hỗ trợ?
                </h2>
                <p className="mt-1 text-sm leading-6 text-[#a09c94]">
                  Trợ lý AI có thể hỗ trợ thông tin lịch đặt và dịch vụ.
                </p>
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              onClick={openAiAssistant}
              className="mt-4 w-full justify-between border border-white/10 bg-white/[0.035] px-3 text-[#fffdf9] hover:bg-white/[0.075] hover:text-[#fffdf9]"
            >
              <span className="flex items-center gap-2">
                <MessageCircleMore data-icon="inline-start" aria-hidden />
                Mở trợ lý AutoWash
              </span>
              <ChevronRight data-icon="inline-end" aria-hidden />
            </Button>
          </section>
        </aside>
      </div>
    </>
  );
}
