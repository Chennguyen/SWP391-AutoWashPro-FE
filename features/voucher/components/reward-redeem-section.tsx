"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Gift,
  RefreshCw,
  Sparkles,
  TicketPercent,
  X,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import { useGetMyVouchersQuery } from "@/features/loyalty/hooks/useLoyalty";
import type { MyVoucher } from "@/features/loyalty/types/loyalty-types";
import type { ApiError } from "@/lib/api-error";
import { useGetRewardsQuery } from "../hooks/useGetRewardsQuery";
import { useRedeemRewardMutation } from "../hooks/useRedeemRewardMutation";
import type { RedeemRewardResponse, Reward } from "../types";

const REDEEM_SUCCESS_FALLBACK =
  "Đổi thưởng thành công. Voucher đã được thêm vào ưu đãi của bạn.";
const REDEEM_ERROR_FALLBACK = "Đổi thưởng thất bại. Vui lòng thử lại.";

type RewardToast = {
  id: number;
  message: string;
  variant: "success" | "error";
};

interface RewardRedeemSectionProps {
  token: string;
  userId: string;
  customerId: string;
  currentPoints: number;
  pointsLoading: boolean;
  enabled: boolean;
  onBack: () => void;
}

interface RewardCardProps {
  reward: Reward;
  customerId: string;
  currentPoints: number;
  onSuccess: (response: RedeemRewardResponse) => void;
  onError: (error: ApiError) => void;
}

function formatNumber(value: number) {
  return new Intl.NumberFormat("vi-VN").format(value);
}

function formatVoucherDiscount(voucher: MyVoucher) {
  if (voucher.discountType.toLowerCase() === "percentage") {
    return `Giảm ${formatNumber(voucher.discountValue)}%`;
  }

  return `Giảm ${formatNumber(voucher.discountValue)}đ`;
}

function getVoucherAvailability(voucher: MyVoucher) {
  const status = voucher.status.toLowerCase();
  const expiresAt = voucher.expiresAt
    ? new Date(voucher.expiresAt).getTime()
    : null;

  if (voucher.isUsed || status === "used") {
    return { label: "Đã sử dụng", available: false };
  }
  if (
    status === "expired" ||
    (expiresAt !== null && Number.isFinite(expiresAt) && expiresAt <= Date.now())
  ) {
    return { label: "Đã hết hạn", available: false };
  }

  return { label: "Có thể sử dụng", available: true };
}

function CustomerVoucherCard({ voucher }: { voucher: MyVoucher }) {
  const availability = getVoucherAvailability(voucher);

  return (
    <Card
      size="sm"
      className="min-h-36 gap-2 border border-white/10 bg-[#1d1d20] py-3 text-[#fffdf9] ring-0 shadow-[0_14px_34px_rgba(8,8,10,0.16)]"
    >
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 text-base font-semibold text-[#fffdf9]">
            <h3 className="line-clamp-2">{voucher.rewardName}</h3>
          </CardTitle>
          <Badge
            className={
              availability.available
                ? "border-[#bca374]/25 bg-[#bca374]/10 text-[#d8c49f]"
                : "border-white/10 bg-white/[0.05] text-[#8f8b84]"
            }
          >
            {availability.label}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col gap-3 px-4">
        <div>
          <p className="text-lg font-semibold text-[#d8c49f]">
            {formatVoucherDiscount(voucher)}
          </p>
          <p className="mt-1 font-mono text-xs tracking-[0.14em] text-[#c4c0b8]">
            {voucher.code}
          </p>
        </div>

        <p className="mt-auto text-xs leading-5 text-[#8f8b84]">
          {voucher.expiresAt
            ? `Hạn dùng ${new Date(voucher.expiresAt).toLocaleDateString("vi-VN")}`
            : "Không giới hạn ngày sử dụng"}
        </p>
      </CardContent>
    </Card>
  );
}

function getRedeemErrorMessage(error: ApiError) {
  const message = error.message.trim();
  const normalized = message.toLowerCase();

  if (normalized.includes("not enough points")) {
    return "Bạn không đủ điểm để đổi phần thưởng này.";
  }
  if (normalized.includes("reward out of stock")) {
    return "Phần thưởng này đã hết số lượng.";
  }
  if (normalized.includes("reward not found")) {
    return "Phần thưởng không tồn tại hoặc đã bị xóa.";
  }
  if (normalized.includes("reward is inactive")) {
    return "Phần thưởng này không còn hoạt động.";
  }
  if (normalized.includes("tier cannot redeem")) {
    return "Hạng thành viên hiện tại chưa đủ điều kiện đổi phần thưởng này.";
  }
  if (normalized.includes("customer not found")) {
    return "Không tìm thấy hồ sơ khách hàng. Vui lòng đăng nhập lại.";
  }
  if (!message || error.status >= 500) {
    return REDEEM_ERROR_FALLBACK;
  }

  return message;
}

function getUnavailableReason(
  reward: Reward,
  customerId: string,
  currentPoints: number,
) {
  if (!customerId) return "Điểm thành viên chưa sẵn sàng.";
  if (reward.quantityAvailable <= 0) return "Phần thưởng đã hết số lượng.";
  if (currentPoints < reward.pointsRequired) return "Bạn chưa đủ điểm để đổi.";
  if (!reward.isRedeemable) return "Hạng hiện tại chưa đủ điều kiện đổi.";
  return null;
}

function RewardFeedbackToast({
  toast,
  onDismiss,
}: {
  toast: RewardToast;
  onDismiss: () => void;
}) {
  useEffect(() => {
    const timeoutId = window.setTimeout(onDismiss, 5000);
    return () => window.clearTimeout(timeoutId);
  }, [onDismiss, toast.id]);

  const isSuccess = toast.variant === "success";
  const Icon = isSuccess ? CheckCircle2 : AlertCircle;

  return (
    <div
      className="fixed bottom-20 right-4 z-[100] w-[calc(100%-2rem)] max-w-sm sm:right-6"
      aria-live={isSuccess ? "polite" : "assertive"}
    >
      <div
        role={isSuccess ? "status" : "alert"}
        className={
          isSuccess
            ? "flex items-start gap-3 rounded-xl border border-emerald-400/30 bg-[#13251d] p-4 text-emerald-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
            : "flex items-start gap-3 rounded-xl border border-red-400/30 bg-[#2a1718] p-4 text-red-100 shadow-[0_18px_50px_rgba(0,0,0,0.35)]"
        }
      >
        <Icon className="mt-0.5 size-5 shrink-0" strokeWidth={1.8} aria-hidden />
        <p className="min-w-0 flex-1 text-sm font-medium leading-6">{toast.message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="shrink-0 rounded-lg p-1 outline-none transition hover:bg-white/10 focus-visible:ring-2 focus-visible:ring-current"
          aria-label="Đóng thông báo"
        >
          <X className="size-4" aria-hidden />
        </button>
      </div>
    </div>
  );
}

function RewardCard({
  reward,
  customerId,
  currentPoints,
  onSuccess,
  onError,
}: RewardCardProps) {
  const redeemMutation = useRedeemRewardMutation();
  const submittingRef = useRef(false);
  const unavailableReason = getUnavailableReason(
    reward,
    customerId,
    currentPoints,
  );
  const canRedeem = unavailableReason === null;
  const statusId = `reward-status-${reward.id}`;

  function handleRedeem() {
    if (!canRedeem || submittingRef.current) return;

    submittingRef.current = true;

    redeemMutation.mutate(
      { rewardId: reward.id, customerId },
      {
        onSuccess,
        onError,
        onSettled: () => {
          submittingRef.current = false;
        },
      },
    );
  }

  return (
    <Card
      size="sm"
      className="h-full min-h-64 gap-3 border border-white/10 bg-[#1d1d20] py-4 text-[#fffdf9] ring-0 shadow-[0_16px_38px_rgba(8,8,10,0.18)]"
    >
      <CardHeader className="gap-2 px-4">
        <div className="flex items-start justify-between gap-3">
          <CardTitle className="min-w-0 text-base font-semibold text-[#fffdf9]">
            <h3 className="line-clamp-2">{reward.name}</h3>
          </CardTitle>
          <Badge className="border-[#bca374]/25 bg-[#bca374]/10 text-[#d8c49f]">
            {formatNumber(reward.pointsRequired)} điểm
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="flex flex-1 flex-col space-y-4 px-4">
        <p className="line-clamp-3 text-sm leading-6 text-[#a09c94]">
          {reward.description || "Phần thưởng dành cho thành viên AutoWash Pro."}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="outline" className="border-white/10 text-[#c4c0b8]">
            {reward.quantityAvailable > 0
              ? `Còn ${formatNumber(reward.quantityAvailable)}`
              : "Đã hết"}
          </Badge>
          <Badge variant="outline" className="border-white/10 text-[#c4c0b8]">
            {formatNumber(reward.validDays)} ngày sử dụng
          </Badge>
        </div>

        {reward.allowedTiers.length > 0 ? (
          <p className="text-xs leading-5 text-[#8f8b84]">
            Hạng áp dụng: {reward.allowedTiers.map((tier) => tier.name).join(", ")}
          </p>
        ) : null}

        {unavailableReason ? (
          <p id={statusId} className="mt-auto text-xs leading-5 text-[#b8a98e]">
            {unavailableReason}
          </p>
        ) : null}
      </CardContent>

      <CardFooter className="border-white/10 bg-white/[0.02] px-4 py-4">
        <Button
          type="button"
          size="sm"
          onClick={handleRedeem}
          disabled={!canRedeem || redeemMutation.isPending}
          aria-describedby={unavailableReason ? statusId : undefined}
          className="w-full bg-[#bca374] px-3 font-semibold text-[#17130f] hover:bg-[#d8c49f] focus-visible:border-[#d8c49f] focus-visible:ring-[#d8c49f]/40 disabled:bg-white/10 disabled:text-white/45"
        >
          {redeemMutation.isPending ? "Đang đổi..." : "Đổi thưởng"}
        </Button>
      </CardFooter>
    </Card>
  );
}

export function RewardRedeemSection({
  token,
  userId,
  customerId,
  currentPoints,
  pointsLoading,
  enabled,
  onBack,
}: RewardRedeemSectionProps) {
  const queryClient = useQueryClient();
  const rewardsQuery = useGetRewardsQuery(token, { enabled });
  const vouchersQuery = useGetMyVouchersQuery(token, userId, {
    enabled: enabled && Boolean(userId),
  });
  const [toast, setToast] = useState<RewardToast | null>(null);
  const titleRef = useRef<HTMLHeadingElement>(null);

  const dismissToast = useCallback(() => setToast(null), []);

  useEffect(() => {
    titleRef.current?.focus();
  }, []);

  const handleRedeemSuccess = useCallback(
    (response: RedeemRewardResponse) => {
      const backendMessage = response.trim();
      setToast({
        id: Date.now(),
        variant: "success",
        message: backendMessage || REDEEM_SUCCESS_FALLBACK,
      });

      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["my-vouchers", token, userId] }),
        queryClient.invalidateQueries({ queryKey: ["loyalty-info", token] }),
        queryClient.invalidateQueries({ queryKey: ["loyalty-rewards", token] }),
        queryClient.invalidateQueries({ queryKey: ["point-transactions", token] }),
      ]);
    },
    [queryClient, token, userId],
  );

  const handleRedeemError = useCallback((error: ApiError) => {
    setToast({
      id: Date.now(),
      variant: "error",
      message: getRedeemErrorMessage(error),
    });
  }, []);

  const showLoading =
    rewardsQuery.isLoading || (rewardsQuery.isFetching && rewardsQuery.isError);
  const rewards = rewardsQuery.data ?? [];
  const vouchers = vouchersQuery.data ?? [];

  return (
    <section
      aria-labelledby="reward-redeem-title"
      className="overflow-hidden rounded-2xl border border-white/10 bg-[#161619] shadow-[0_20px_60px_rgba(8,8,10,0.22)]"
    >
      <header className="border-b border-white/10 px-4 py-5 sm:px-6 sm:py-6">
        <Button
          type="button"
          variant="ghost"
          onClick={onBack}
          className="-ml-2 text-[#d8c49f] hover:bg-white/5 hover:text-[#fffdf9] focus-visible:ring-[#bca374]/60"
        >
          <ArrowLeft data-icon="inline-start" aria-hidden />
          Quay lại tổng quan
        </Button>

        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2 text-[#d8c49f]">
              <Sparkles className="size-5" strokeWidth={1.7} aria-hidden />
              <h2
                ref={titleRef}
                id="reward-redeem-title"
                tabIndex={-1}
                className="text-2xl font-semibold tracking-tight text-[#fffdf9] outline-none sm:text-3xl"
              >
                Kho phần thưởng
              </h2>
            </div>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-[#a09c94]">
              Chọn voucher phù hợp với điểm và hạng thành viên của bạn.
            </p>
          </div>

          {pointsLoading ? (
            <Skeleton className="h-8 w-32 bg-white/10" />
          ) : (
            <div className="shrink-0 rounded-xl border border-[#bca374]/20 bg-[#bca374]/10 px-4 py-2.5">
              <p className="text-xs text-[#a09c94]">Điểm hiện có</p>
              <p className="mt-0.5 text-lg font-semibold tabular-nums text-[#d8c49f]">
                {customerId ? formatNumber(currentPoints) : "Chưa sẵn sàng"}
              </p>
            </div>
          )}
        </div>
      </header>

      <div className="space-y-8 p-4 sm:p-6">
        {!enabled ? (
          <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
            <Gift className="mx-auto size-8 text-[#bca374]/70" strokeWidth={1.5} aria-hidden />
            <p className="mt-3 text-sm font-medium text-[#fffdf9]">
              Chưa thể mở kho phần thưởng
            </p>
            <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
              Vui lòng đăng nhập bằng tài khoản đã được xác minh.
            </p>
          </div>
        ) : (
          <div className="space-y-8" aria-live="polite">
            <section aria-labelledby="customer-vouchers-title">
              <div>
                <h3
                  id="customer-vouchers-title"
                  className="text-lg font-semibold text-[#fffdf9]"
                >
                  Voucher của bạn
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
                  Những voucher đang có trong tài khoản của bạn.
                </p>
              </div>

              <div className="mt-4">
                {vouchersQuery.isLoading ? (
                  <div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    aria-label="Đang tải voucher của bạn"
                  >
                    {[1, 2, 3].map((item) => (
                      <Card
                        key={item}
                        size="sm"
                        className="min-h-36 gap-3 border border-white/10 bg-[#1d1d20] py-3 ring-0"
                      >
                        <CardHeader className="px-4">
                          <Skeleton className="h-5 w-2/3 bg-white/10" />
                        </CardHeader>
                        <CardContent className="space-y-3 px-4">
                          <Skeleton className="h-6 w-28 bg-white/10" />
                          <Skeleton className="h-4 w-36 bg-white/10" />
                          <Skeleton className="h-4 w-32 bg-white/10" />
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                ) : vouchersQuery.isError ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-8 text-center">
                    <AlertCircle
                      className="mx-auto size-7 text-red-300"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                      Chưa thể tải voucher của bạn
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#b8aaa5]">
                      {vouchersQuery.error.message || "Vui lòng thử lại sau."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void vouchersQuery.refetch()}
                      className="mt-4 text-[#d8c49f] hover:bg-white/5 hover:text-[#fffdf9]"
                    >
                      <RefreshCw data-icon="inline-start" aria-hidden />
                      Thử lại
                    </Button>
                  </div>
                ) : vouchers.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-10 text-center">
                    <TicketPercent
                      className="mx-auto size-8 text-[#bca374]/70"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                      Bạn chưa có voucher nào
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
                      Đổi điểm ở phần bên dưới để nhận voucher mới.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {vouchers.map((voucher) => (
                      <CustomerVoucherCard key={voucher.id} voucher={voucher} />
                    ))}
                  </div>
                )}
              </div>
            </section>

            <Separator className="bg-white/10" />

            <section aria-labelledby="available-rewards-title">
              <div>
                <h3
                  id="available-rewards-title"
                  className="text-lg font-semibold text-[#fffdf9]"
                >
                  Voucher hiện hành
                </h3>
                <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
                  Chọn voucher phù hợp và dùng điểm hiện có để quy đổi.
                </p>
              </div>

              <div className="mt-4">
                {showLoading ? (
                  <div
                    className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3"
                    aria-label="Đang tải phần thưởng"
                  >
                    {[1, 2, 3, 4, 5, 6].map((item) => (
                      <Card
                        key={item}
                        size="sm"
                        className="min-h-64 gap-4 border border-white/10 bg-[#1d1d20] py-4 ring-0"
                      >
                        <CardHeader className="px-4">
                          <Skeleton className="h-5 w-2/3 bg-white/10" />
                        </CardHeader>
                        <CardContent className="space-y-3 px-4">
                          <Skeleton className="h-4 w-full bg-white/10" />
                          <Skeleton className="h-4 w-4/5 bg-white/10" />
                          <Skeleton className="h-6 w-28 bg-white/10" />
                        </CardContent>
                        <CardFooter className="mt-auto border-white/10 bg-white/[0.02] px-4 py-4">
                          <Skeleton className="h-7 w-full bg-white/10" />
                        </CardFooter>
                      </Card>
                    ))}
                  </div>
                ) : rewardsQuery.isError ? (
                  <div className="rounded-xl border border-red-400/20 bg-red-400/[0.06] px-4 py-10 text-center">
                    <AlertCircle
                      className="mx-auto size-7 text-red-300"
                      strokeWidth={1.6}
                      aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                      Chưa thể tải danh sách phần thưởng
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#b8aaa5]">
                      {rewardsQuery.error.message || "Vui lòng thử lại sau."}
                    </p>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      onClick={() => void rewardsQuery.refetch()}
                      className="mt-4 text-[#d8c49f] hover:bg-white/5 hover:text-[#fffdf9]"
                    >
                      <RefreshCw data-icon="inline-start" aria-hidden />
                      Thử lại
                    </Button>
                  </div>
                ) : rewards.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 px-4 py-12 text-center">
                    <Gift
                      className="mx-auto size-8 text-[#bca374]/70"
                      strokeWidth={1.5}
                      aria-hidden
                    />
                    <p className="mt-3 text-sm font-medium text-[#fffdf9]">
                      Chưa có phần thưởng nào để đổi
                    </p>
                    <p className="mt-1 text-sm leading-6 text-[#8f8b84]">
                      Các phần thưởng mới sẽ xuất hiện tại đây.
                    </p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
                    {rewards.map((reward) => (
                      <RewardCard
                        key={reward.id}
                        reward={reward}
                        customerId={customerId}
                        currentPoints={currentPoints}
                        onSuccess={handleRedeemSuccess}
                        onError={handleRedeemError}
                      />
                    ))}
                  </div>
                )}
              </div>
            </section>
          </div>
        )}
      </div>

      {toast ? <RewardFeedbackToast toast={toast} onDismiss={dismissToast} /> : null}
    </section>
  );
}
