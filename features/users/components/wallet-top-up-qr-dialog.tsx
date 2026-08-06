"use client";

import {
  Alert,
  AlertDescription,
  AlertTitle,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ApiError } from "@/lib/api-error";
import { cn } from "@/lib/utils";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, RefreshCw, ScanLine } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { getWalletTopUpStatus } from "../wallet-service";
import type {
  WalletTopUpPayment,
  WalletTopUpStatus,
  WalletTopUpStatusResult,
} from "../types/user-types";

interface WalletTopUpQrDialogProps {
  token: string;
  payment: WalletTopUpPayment | null;
  onCancel: () => void;
  onConfirmed: (payment: WalletTopUpPayment) => void;
  onUnauthorized: () => void;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function WalletTopUpQrDialog({
  token,
  payment,
  onCancel,
  onConfirmed,
  onUnauthorized,
}: WalletTopUpQrDialogProps) {
  const queryClient = useQueryClient();
  const confirmedTransactionRef = useRef<string | null>(null);
  const [expirationState, setExpirationState] = useState<{
    transactionId: string;
    expired: boolean;
  } | null>(null);
  const transactionId = payment?.transactionId ?? null;
  const expirationTime = payment ? Date.parse(payment.expiredAt) : Number.NaN;
  const expirationIsReady = expirationState?.transactionId === transactionId;
  const isExpiredByTime = Boolean(
    expirationIsReady && expirationState?.expired,
  );

  const statusQuery = useQuery<WalletTopUpStatusResult, ApiError>({
    queryKey: ["wallet-top-up-status", payment?.transactionId],
    queryFn: async () => {
      if (!token || !payment?.transactionId) {
        throw new Error("Wallet top-up transactionId is required");
      }
      return await getWalletTopUpStatus(token, payment.transactionId);
    },
    enabled: (query) => {
      const status = query.state.data?.status ?? payment?.status;
      return Boolean(
        payment &&
          token &&
          expirationIsReady &&
          status === "Pending" &&
          !isExpiredByTime,
      );
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status ?? payment?.status;
      const notExpired =
        !Number.isFinite(expirationTime) || Date.now() < expirationTime;
      return status === "Pending" && notExpired ? 3_000 : false;
    },
    refetchIntervalInBackground: true,
    refetchOnWindowFocus: (query) =>
      query.state.data?.status === "Pending",
    refetchOnReconnect: (query) => query.state.data?.status === "Pending",
    retry: 2,
  });

  const effectiveStatus: WalletTopUpStatus | null = isExpiredByTime
    ? "Expired"
    : (statusQuery.data?.status ?? payment?.status ?? null);

  useEffect(() => {
    if (!transactionId || !Number.isFinite(expirationTime)) return;

    const remainingMilliseconds = expirationTime - Date.now();
    const readyTimeoutId = window.setTimeout(
      () =>
        setExpirationState({
          transactionId,
          expired: remainingMilliseconds <= 0,
        }),
      0,
    );
    const expirationTimeoutId =
      remainingMilliseconds > 0
        ? window.setTimeout(
            () => setExpirationState({ transactionId, expired: true }),
            remainingMilliseconds,
          )
        : null;

    return () => {
      window.clearTimeout(readyTimeoutId);
      if (expirationTimeoutId !== null) {
        window.clearTimeout(expirationTimeoutId);
      }
    };
  }, [expirationTime, transactionId]);

  useEffect(() => {
    confirmedTransactionRef.current = null;
  }, [payment?.transactionId]);

  useEffect(() => {
    if (
      !payment ||
      effectiveStatus !== "Succeeded" ||
      confirmedTransactionRef.current === payment.transactionId
    ) {
      return;
    }

    confirmedTransactionRef.current = payment.transactionId;
    void queryClient.invalidateQueries({ queryKey: ["wallet-transactions"] });
    toast.success("Nạp tiền thành công", {
      id: `wallet-top-up-${payment.transactionId}`,
      description: `${formatCurrency(payment.amount)} đã được cộng vào ví của bạn.`,
    });
    onConfirmed(payment);
  }, [
    effectiveStatus,
    onConfirmed,
    payment,
    queryClient,
  ]);

  useEffect(() => {
    if (statusQuery.error?.status === 401) {
      onUnauthorized();
    }
  }, [onUnauthorized, statusQuery.error]);

  return (
    <Dialog
      open={Boolean(payment)}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <DialogContent className="customer-brand-dialog max-h-[calc(100dvh-2rem)] overflow-y-auto sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ScanLine className="text-primary" aria-hidden />
            Quét QR để nạp tiền
          </DialogTitle>
          <DialogDescription>
            Dùng ứng dụng ngân hàng quét mã bên dưới. Số dư chỉ cập nhật sau
            khi hệ thống nhận được xác nhận thanh toán.
          </DialogDescription>
        </DialogHeader>

        {payment ? (
          <div className="flex flex-col gap-4">
            {effectiveStatus === "Pending" ? (
              <div className="mx-auto w-fit rounded-xl border bg-background p-3 ring-1 ring-foreground/10">
                {/* QR URL được Backend tạo động nên không dùng bộ tối ưu ảnh tĩnh của Next.js. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payment.qrCode}
                  alt={`QR nạp ${formatCurrency(payment.amount)} vào ví`}
                  width={280}
                  height={280}
                  className="h-auto w-[min(72vw,280px)] rounded-lg"
                />
              </div>
            ) : null}

            <dl className="grid gap-3 rounded-xl border bg-muted/40 p-4 text-sm">
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Số tiền</dt>
                <dd className="font-semibold tabular-nums text-foreground">
                  {formatCurrency(payment.amount)}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Ngân hàng</dt>
                <dd className="text-right font-medium text-foreground">
                  {payment.bankName}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Số tài khoản</dt>
                <dd className="text-right font-mono font-medium text-foreground">
                  {payment.bankAccount}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="shrink-0 text-muted-foreground">
                  Nội dung chuyển khoản
                </dt>
                <dd className="break-all text-right font-mono text-xs font-medium text-foreground">
                  {payment.description}
                </dd>
              </div>
              <div className="flex items-start justify-between gap-4">
                <dt className="text-muted-foreground">Hết hạn</dt>
                <dd className="text-right font-medium text-foreground">
                  {new Date(payment.expiredAt).toLocaleString("vi-VN")}
                </dd>
              </div>
            </dl>

            {effectiveStatus === "Pending" ? (
              <Alert>
                <RefreshCw className="animate-spin" aria-hidden />
                <AlertTitle>Đang chờ xác nhận</AlertTitle>
                <AlertDescription>
                  Hệ thống tự động kiểm tra trạng thái giao dịch. Bạn không cần
                  bấm kiểm tra liên tục.
                </AlertDescription>
              </Alert>
            ) : null}

            {effectiveStatus === "Failed" ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>Giao dịch thất bại</AlertTitle>
                <AlertDescription>
                  Ví của bạn không bị thay đổi. Vui lòng tạo yêu cầu nạp tiền
                  mới.
                </AlertDescription>
              </Alert>
            ) : null}

            {effectiveStatus === "Expired" ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>QR đã hết hạn</AlertTitle>
                <AlertDescription>
                  Vui lòng đóng cửa sổ và tạo yêu cầu nạp tiền mới.
                </AlertDescription>
              </Alert>
            ) : null}

            {effectiveStatus === "Pending" &&
            statusQuery.isError &&
            statusQuery.error?.status !== 401 ? (
              <Alert variant="destructive">
                <AlertCircle aria-hidden />
                <AlertTitle>Chưa thể cập nhật trạng thái</AlertTitle>
                <AlertDescription>
                  Giao dịch chưa bị đánh dấu thất bại. Hệ thống sẽ tiếp tục
                  kiểm tra khi kết nối ổn định.
                </AlertDescription>
              </Alert>
            ) : null}
          </div>
        ) : null}

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onCancel}>
            Đóng
          </Button>
          {effectiveStatus === "Pending" ? (
            <Button
              type="button"
              onClick={() => void statusQuery.refetch()}
              disabled={statusQuery.isFetching}
            >
              <RefreshCw
                data-icon="inline-start"
                className={cn(statusQuery.isFetching && "animate-spin")}
                aria-hidden
              />
              Kiểm tra lại
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
