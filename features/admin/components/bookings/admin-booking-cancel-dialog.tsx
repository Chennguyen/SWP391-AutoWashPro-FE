"use client";

import { useState } from "react";
import { LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { useCancelAdminBookingMutation } from "@/features/admin/hooks/useAdmin";
import type { AdminBooking } from "@/features/admin/types/admin-types";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

type AdminBookingCancelDialogProps = {
  booking: AdminBooking | null;
  token: string;
  onClose: () => void;
  onCancelled: () => Promise<void> | void;
};

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminBookingCancelDialog({
  booking,
  token,
  onClose,
  onCancelled,
}: AdminBookingCancelDialogProps) {
  const { showToast } = useNotifications();
  const cancelMutation = useCancelAdminBookingMutation(token);
  const [reason, setReason] = useState("");
  const [reasonError, setReasonError] = useState<string | null>(null);

  function closeDialog() {
    setReason("");
    setReasonError(null);
    onClose();
  }

  async function handleCancelBooking() {
    if (!booking || cancelMutation.isPending) return;

    const normalizedReason = reason.trim();
    if (!normalizedReason) {
      setReasonError("Vui lòng nhập lý do hủy booking.");
      return;
    }

    setReasonError(null);
    try {
      const result = await cancelMutation.mutateAsync({
        id: booking.id,
        reason: normalizedReason,
      });

      showToast({
        title: "Đã hủy booking",
        message: result.refundApplied
          ? `Đã hoàn ${formatVnd(result.refundAmount)} vào ví khách hàng.`
          : result.message || "Booking đã được hủy thành công.",
        type: "BookingCancelled",
      });

      await onCancelled();
      closeDialog();
    } catch (error) {
      showToast({
        title: "Không thể hủy booking",
        message: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        type: "SystemAlert",
        tone: "error",
      });
    }
  }

  return (
    <Dialog
      open={booking !== null}
      onOpenChange={(open) => {
        if (!open && !cancelMutation.isPending) closeDialog();
      }}
    >
      <DialogContent
        showCloseButton={!cancelMutation.isPending}
        overlayClassName="bg-black/70 backdrop-blur-[3px]"
        className="admin-brand-surface border-border bg-popover text-popover-foreground shadow-2xl sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Hủy booking</DialogTitle>
          <DialogDescription>
            Xác nhận hủy lịch của {booking?.customerName || "khách hàng"} tại {booking?.branchName || "chi nhánh đã chọn"}.
          </DialogDescription>
        </DialogHeader>

        <Alert variant="destructive">
          <TriangleAlert aria-hidden />
          <AlertTitle>Thao tác ảnh hưởng trực tiếp đến khách hàng</AlertTitle>
          <AlertDescription>
            Backend sẽ hủy booking, giải phóng voucher và tự hoàn khoản đã thanh toán nếu đủ điều kiện.
          </AlertDescription>
        </Alert>

        <FieldGroup>
          <Field data-invalid={Boolean(reasonError)}>
            <FieldLabel htmlFor="admin-cancel-booking-reason">Lý do hủy</FieldLabel>
            <Input
              id="admin-cancel-booking-reason"
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                if (reasonError) setReasonError(null);
              }}
              placeholder="Ví dụ: Chi nhánh tạm ngưng hoạt động"
              aria-invalid={Boolean(reasonError)}
              disabled={cancelMutation.isPending}
              autoComplete="off"
            />
            <FieldDescription>Lý do này được gửi trong trường Reason theo contract backend.</FieldDescription>
            <FieldError>{reasonError}</FieldError>
          </Field>
        </FieldGroup>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={cancelMutation.isPending}
            onClick={closeDialog}
          >
            Giữ booking
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={cancelMutation.isPending}
            aria-busy={cancelMutation.isPending}
            onClick={() => void handleCancelBooking()}
          >
            {cancelMutation.isPending ? (
              <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden />
            ) : (
              <XCircle data-icon="inline-start" aria-hidden />
            )}
            {cancelMutation.isPending ? "Đang hủy..." : "Xác nhận hủy"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
