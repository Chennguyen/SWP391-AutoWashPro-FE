"use client";

import { FormEvent, useMemo, useState } from "react";
import { CircleCheck, LoaderCircle, TriangleAlert, XCircle } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldError, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useCancelAdminBookingsByRangeMutation } from "@/features/admin/hooks/useAdmin";
import type {
  AdminBranch,
  AdminBulkCancelBookingsResult,
} from "@/features/admin/types/admin-types";
import { useNotifications } from "@/features/notifications/hooks/useNotifications";

type AdminBookingBulkCancelCardProps = {
  branches: AdminBranch[];
  token: string;
  onCompleted: () => Promise<void> | void;
};

type FormErrors = Partial<Record<"branchId" | "fromDate" | "toDate", string>>;

function todayIso() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function formatDate(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
}

function formatVnd(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

export function AdminBookingBulkCancelCard({
  branches,
  token,
  onCompleted,
}: AdminBookingBulkCancelCardProps) {
  const { showToast } = useNotifications();
  const cancelMutation = useCancelAdminBookingsByRangeMutation(token);
  const [branchId, setBranchId] = useState("");
  const [fromDate, setFromDate] = useState(todayIso());
  const [toDate, setToDate] = useState(todayIso());
  const [errors, setErrors] = useState<FormErrors>({});
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [result, setResult] = useState<AdminBulkCancelBookingsResult | null>(null);

  const branchItems = useMemo(
    () => branches.map((branch) => ({ label: branch.name, value: branch.id })),
    [branches],
  );
  const selectedBranch = branches.find((branch) => branch.id === branchId);

  function validateForm() {
    const nextErrors: FormErrors = {};
    if (!branchId) nextErrors.branchId = "Vui lòng chọn chi nhánh.";
    if (!fromDate) nextErrors.fromDate = "Vui lòng chọn ngày bắt đầu.";
    if (!toDate) nextErrors.toDate = "Vui lòng chọn ngày kết thúc.";
    if (fromDate && toDate && fromDate > toDate) {
      nextErrors.toDate = "Ngày kết thúc phải bằng hoặc sau ngày bắt đầu.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setResult(null);
    if (validateForm()) setConfirmationOpen(true);
  }

  async function handleConfirm() {
    if (!branchId || !fromDate || !toDate || cancelMutation.isPending) return;

    try {
      const nextResult = await cancelMutation.mutateAsync({
        BranchId: branchId,
        FromDate: fromDate,
        ToDate: toDate,
      });
      setResult(nextResult);
      setConfirmationOpen(false);

      showToast({
        title: "Đã xử lý hủy booking theo khoảng ngày",
        message:
          nextResult.cancelledBookingCount > 0
            ? `Đã hủy ${nextResult.cancelledBookingCount} booking và hoàn ${formatVnd(nextResult.totalRefundAmount)}.`
            : "Không có booking đã xác nhận trong khoảng ngày đã chọn.",
        type: "BookingCancelled",
      });

      await onCompleted();
    } catch (error) {
      showToast({
        title: "Không thể hủy booking theo khoảng ngày",
        message: error instanceof Error ? error.message : "Vui lòng thử lại sau.",
        type: "SystemAlert",
        tone: "error",
      });
    }
  }

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="gap-2">
          <CardTitle className="col-span-2 md:col-span-1">
            Hủy booking theo chi nhánh và khoảng ngày
          </CardTitle>
          <CardDescription className="col-span-2 md:col-span-1">
            Dùng khi chi nhánh có sự cố. Hệ thống chỉ hủy các booking đang ở trạng thái Đã xác nhận.
          </CardDescription>
          <CardAction className="col-span-2 col-start-1 row-start-3 justify-self-start md:col-span-1 md:col-start-2 md:row-span-2 md:row-start-1 md:justify-self-end">
            <Badge variant="secondary">Chỉ booking đã xác nhận</Badge>
          </CardAction>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} noValidate>
            <FieldGroup className="grid gap-4 md:grid-cols-3">
              <Field data-invalid={Boolean(errors.branchId)}>
                <FieldLabel htmlFor="bulk-cancel-branch">Chi nhánh</FieldLabel>
                <Select
                  items={branchItems}
                  value={branchId || null}
                  onValueChange={(value) => {
                    setBranchId(value ? String(value) : "");
                    setErrors((current) => ({ ...current, branchId: undefined }));
                  }}
                  disabled={cancelMutation.isPending || branches.length === 0}
                >
                  <SelectTrigger
                    id="bulk-cancel-branch"
                    className="w-full"
                    aria-invalid={Boolean(errors.branchId)}
                  >
                    <SelectValue>
                      {branchId ? selectedBranch?.name : "Chọn chi nhánh"}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    <SelectGroup>
                      {branches.map((branch) => (
                        <SelectItem key={branch.id} value={branch.id}>
                          {branch.name}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
                <FieldError>{errors.branchId}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.fromDate)}>
                <FieldLabel htmlFor="bulk-cancel-from-date">Ngày bắt đầu</FieldLabel>
                <Input
                  id="bulk-cancel-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => {
                    setFromDate(event.target.value);
                    setErrors((current) => ({ ...current, fromDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.fromDate)}
                  disabled={cancelMutation.isPending}
                />
                <FieldError>{errors.fromDate}</FieldError>
              </Field>

              <Field data-invalid={Boolean(errors.toDate)}>
                <FieldLabel htmlFor="bulk-cancel-to-date">Ngày kết thúc</FieldLabel>
                <Input
                  id="bulk-cancel-to-date"
                  type="date"
                  value={toDate}
                  min={fromDate || undefined}
                  onChange={(event) => {
                    setToDate(event.target.value);
                    setErrors((current) => ({ ...current, toDate: undefined }));
                  }}
                  aria-invalid={Boolean(errors.toDate)}
                  disabled={cancelMutation.isPending}
                />
                <FieldError>{errors.toDate}</FieldError>
              </Field>
            </FieldGroup>

            <div className="mt-4 flex justify-end">
              <Button type="submit" variant="destructive" disabled={!token || cancelMutation.isPending}>
                <XCircle data-icon="inline-start" aria-hidden />
                Kiểm tra và hủy
              </Button>
            </div>
          </form>

          {result ? (
            <Alert className="mt-4">
              <CircleCheck aria-hidden />
              <AlertTitle>Kết quả xử lý</AlertTitle>
              <AlertDescription>
                Đã hủy {result.cancelledBookingCount}/{result.totalBookingCount} booking, hoàn tiền cho {result.refundedBookingCount} booking, bỏ qua {result.skippedBookingCount} booking. Tổng tiền hoàn: {formatVnd(result.totalRefundAmount)}.
              </AlertDescription>
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Dialog
        open={confirmationOpen}
        onOpenChange={(open) => {
          if (!open && !cancelMutation.isPending) setConfirmationOpen(false);
        }}
      >
        <DialogContent
          showCloseButton={!cancelMutation.isPending}
          overlayClassName="bg-black/70 backdrop-blur-[3px]"
          className="admin-brand-surface border-border bg-popover text-popover-foreground shadow-2xl sm:max-w-md"
        >
          <DialogHeader>
            <DialogTitle>Xác nhận hủy hàng loạt</DialogTitle>
            <DialogDescription>
              Chi nhánh {selectedBranch?.name || "đã chọn"}, từ {formatDate(fromDate)} đến {formatDate(toDate)}.
            </DialogDescription>
          </DialogHeader>

          <Alert variant="destructive">
            <TriangleAlert aria-hidden />
            <AlertTitle>Không thể hoàn tác từ giao diện</AlertTitle>
            <AlertDescription>
              Backend sẽ hủy tất cả booking Đã xác nhận trong khoảng ngày, giải phóng voucher và tự xử lý hoàn tiền. Booking ở trạng thái khác sẽ được bỏ qua.
            </AlertDescription>
          </Alert>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={cancelMutation.isPending}
              onClick={() => setConfirmationOpen(false)}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              variant="destructive"
              disabled={cancelMutation.isPending}
              aria-busy={cancelMutation.isPending}
              onClick={() => void handleConfirm()}
            >
              {cancelMutation.isPending ? (
                <LoaderCircle data-icon="inline-start" className="animate-spin" aria-hidden />
              ) : (
                <XCircle data-icon="inline-start" aria-hidden />
              )}
              {cancelMutation.isPending ? "Đang xử lý..." : "Hủy các booking"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
