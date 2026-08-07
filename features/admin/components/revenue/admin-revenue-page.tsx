"use client";

import { useState, type FormEvent } from "react";
import {
  CircleAlert,
  CircleCheck,
  ChevronLeft,
  ChevronRight,
  FilterX,
  RefreshCw,
  Search,
  WalletCards,
} from "lucide-react";
import { AdminPageHeader, AdminShell } from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import {
  useWalletTopUpRevenueSummary,
  useWalletTopUpTransactions,
} from "@/features/admin/hooks/use-wallet-topup-transactions";
import type {
  WalletTopUpTransactionFilters,
  WalletTopUpTransactionStatus,
} from "@/features/admin/types/admin-types";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type DraftFilters = {
  keyword: string;
  status: "all" | WalletTopUpTransactionStatus;
  fromDate: string;
  toDate: string;
  minAmount: string;
  maxAmount: string;
};

const INITIAL_FILTERS: DraftFilters = {
  keyword: "",
  status: "all",
  fromDate: "",
  toDate: "",
  minAmount: "",
  maxAmount: "",
};

const STATUS_LABELS: Record<WalletTopUpTransactionStatus, string> = {
  Pending: "Đang chờ",
  Succeeded: "Thành công",
  Failed: "Thất bại",
  Expired: "Hết hạn",
};

const STATUS_VARIANTS: Record<
  WalletTopUpTransactionStatus,
  "default" | "secondary" | "destructive" | "outline"
> = {
  Pending: "secondary",
  Succeeded: "outline",
  Failed: "destructive",
  Expired: "outline",
};

function formatCurrency(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDateTime(value: string | null) {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "short",
    timeStyle: "medium",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(date);
}

function toDateBoundary(value: string, endOfDay: boolean) {
  if (!value) return undefined;
  const time = endOfDay ? "23:59:59.999" : "00:00:00.000";
  return new Date(`${value}T${time}+07:00`).toISOString();
}

function toOptionalAmount(value: string) {
  if (!value.trim()) return undefined;
  const amount = Number(value);
  return Number.isFinite(amount) ? amount : undefined;
}

function toAppliedFilters(draft: DraftFilters): WalletTopUpTransactionFilters {
  return {
    keyword: draft.keyword.trim() || undefined,
    status: draft.status === "all" ? undefined : draft.status,
    fromDate: toDateBoundary(draft.fromDate, false),
    toDate: toDateBoundary(draft.toDate, true),
    minAmount: toOptionalAmount(draft.minAmount),
    maxAmount: toOptionalAmount(draft.maxAmount),
  };
}

function StatusBadge({ status }: { status: WalletTopUpTransactionStatus | null }) {
  if (!status) return <Badge variant="outline">Không xác định</Badge>;
  return (
    <Badge variant={STATUS_VARIANTS[status]}>
      {status === "Succeeded" ? <CircleCheck data-icon="inline-start" aria-hidden /> : null}
      {STATUS_LABELS[status]}
    </Badge>
  );
}

function RevenueSummary({
  totalRevenue,
  totalTransactions,
  succeededTransactions,
  loading,
}: {
  totalRevenue: number;
  totalTransactions: number;
  succeededTransactions: number;
  loading: boolean;
}) {
  return (
    <Card aria-live="polite">
      <CardHeader>
        <CardTitle>Tổng đã nạp thành công</CardTitle>
        <CardDescription>
          Tổng hợp từ các giao dịch thành công trong bộ lọc hiện tại.
        </CardDescription>
        <CardAction>
          <WalletCards aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent className="grid gap-5 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,0.55fr)] md:items-end">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">Doanh thu nạp ví</p>
          {loading ? (
            <Skeleton className="mt-2 h-9 w-56 max-w-full" />
          ) : (
            <p className="mt-1 truncate text-3xl font-semibold tracking-tight text-primary md:text-4xl">
              {formatCurrency(totalRevenue)}
            </p>
          )}
        </div>
        <Separator orientation="vertical" className="hidden md:block" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Theo bộ lọc</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">{totalTransactions}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Thành công</p>
            {loading ? (
              <Skeleton className="mt-2 h-7 w-16" />
            ) : (
              <p className="mt-1 text-2xl font-semibold tabular-nums">
                {succeededTransactions}
              </p>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function TransactionTableSkeleton() {
  return Array.from({ length: 6 }, (_, rowIndex) => (
    <TableRow key={rowIndex}>
      {Array.from({ length: 6 }, (_, cellIndex) => (
        <TableCell key={cellIndex}>
          <Skeleton className="h-5 w-full min-w-24" />
        </TableCell>
      ))}
    </TableRow>
  ));
}

export function AdminRevenuePage() {
  const token = useAdminToken();
  const [draftFilters, setDraftFilters] = useState<DraftFilters>(INITIAL_FILTERS);
  const [appliedFilters, setAppliedFilters] =
    useState<WalletTopUpTransactionFilters>({});
  const [pageIndex, setPageIndex] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [filterError, setFilterError] = useState<string | null>(null);

  const transactionsQuery = useWalletTopUpTransactions(token, {
    ...appliedFilters,
    pageIndex,
    pageSize,
  });
  const summaryQuery = useWalletTopUpRevenueSummary(token, appliedFilters);
  const totalItems = transactionsQuery.data?.totalItems ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  function applyFilters(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const minAmount = toOptionalAmount(draftFilters.minAmount);
    const maxAmount = toOptionalAmount(draftFilters.maxAmount);

    if (minAmount !== undefined && minAmount < 0) {
      setFilterError("Số tiền tối thiểu không được nhỏ hơn 0.");
      return;
    }
    if (maxAmount !== undefined && maxAmount < 0) {
      setFilterError("Số tiền tối đa không được nhỏ hơn 0.");
      return;
    }
    if (minAmount !== undefined && maxAmount !== undefined && minAmount > maxAmount) {
      setFilterError("Số tiền tối thiểu phải nhỏ hơn hoặc bằng số tiền tối đa.");
      return;
    }
    if (
      draftFilters.fromDate &&
      draftFilters.toDate &&
      draftFilters.fromDate > draftFilters.toDate
    ) {
      setFilterError("Ngày bắt đầu phải trước hoặc bằng ngày kết thúc.");
      return;
    }

    setFilterError(null);
    setPageIndex(1);
    setAppliedFilters(toAppliedFilters(draftFilters));
  }

  function resetFilters() {
    setDraftFilters(INITIAL_FILTERS);
    setAppliedFilters({});
    setFilterError(null);
    setPageIndex(1);
  }

  return (
    <AdminShell variant="dashboard">
      <AdminPageHeader
        title="Doanh thu"
        description="Theo dõi toàn bộ giao dịch nạp ví và thông tin khách hàng từ SePay."
        variant="dashboard"
        actions={
          <Button
            type="button"
            variant="outline"
            onClick={() => {
              void transactionsQuery.refetch();
              void summaryQuery.refetch();
            }}
            disabled={transactionsQuery.isFetching || summaryQuery.isFetching}
          >
            <RefreshCw
              data-icon="inline-start"
              className={
                transactionsQuery.isFetching || summaryQuery.isFetching
                  ? "animate-spin"
                  : undefined
              }
            />
            Làm mới
          </Button>
        }
      />

      <div className="flex flex-col gap-4">
        <Card size="sm">
          <CardHeader>
            <CardTitle>Bộ lọc giao dịch</CardTitle>
            <CardDescription>
              Tìm theo khách hàng, mã giao dịch, thời gian, trạng thái và số tiền.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={applyFilters} className="flex flex-col gap-4">
              <FieldGroup className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
                <Field className="md:col-span-2">
                  <FieldLabel htmlFor="revenue-keyword">Từ khóa</FieldLabel>
                  <Input
                    id="revenue-keyword"
                    value={draftFilters.keyword}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        keyword: event.target.value,
                      }))
                    }
                    placeholder="Tên, email, số điện thoại hoặc mã giao dịch"
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="revenue-status">Trạng thái</FieldLabel>
                  <Select
                    value={draftFilters.status}
                    onValueChange={(value) =>
                      setDraftFilters((current) => ({
                        ...current,
                        status: (value ?? "all") as DraftFilters["status"],
                      }))
                    }
                  >
                    <SelectTrigger id="revenue-status" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectGroup>
                        <SelectItem value="all">Tất cả trạng thái</SelectItem>
                        <SelectItem value="Pending">Đang chờ</SelectItem>
                        <SelectItem value="Succeeded">Thành công</SelectItem>
                        <SelectItem value="Failed">Thất bại</SelectItem>
                        <SelectItem value="Expired">Hết hạn</SelectItem>
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                </Field>
                <Field>
                  <FieldLabel htmlFor="revenue-from-date">Từ ngày</FieldLabel>
                  <Input
                    id="revenue-from-date"
                    type="date"
                    value={draftFilters.fromDate}
                    max={draftFilters.toDate || undefined}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        fromDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="revenue-to-date">Đến ngày</FieldLabel>
                  <Input
                    id="revenue-to-date"
                    type="date"
                    value={draftFilters.toDate}
                    min={draftFilters.fromDate || undefined}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        toDate: event.target.value,
                      }))
                    }
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="revenue-min-amount">Số tiền tối thiểu</FieldLabel>
                  <Input
                    id="revenue-min-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={draftFilters.minAmount}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        minAmount: event.target.value,
                      }))
                    }
                    placeholder="0"
                    aria-invalid={Boolean(filterError)}
                  />
                </Field>
                <Field>
                  <FieldLabel htmlFor="revenue-max-amount">Số tiền tối đa</FieldLabel>
                  <Input
                    id="revenue-max-amount"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={draftFilters.maxAmount}
                    onChange={(event) =>
                      setDraftFilters((current) => ({
                        ...current,
                        maxAmount: event.target.value,
                      }))
                    }
                    placeholder="Không giới hạn"
                    aria-invalid={Boolean(filterError)}
                  />
                </Field>
              </FieldGroup>

              {filterError ? (
                <Alert variant="destructive">
                  <CircleAlert aria-hidden />
                  <AlertTitle>Bộ lọc chưa hợp lệ</AlertTitle>
                  <AlertDescription>{filterError}</AlertDescription>
                </Alert>
              ) : null}

              <div className="flex flex-wrap justify-end gap-2">
                <Button type="button" variant="outline" onClick={resetFilters}>
                  <FilterX data-icon="inline-start" />
                  Xóa bộ lọc
                </Button>
                <Button type="submit">
                  <Search data-icon="inline-start" />
                  Áp dụng
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {transactionsQuery.error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>Không thể tải giao dịch</AlertTitle>
            <AlertDescription>
              {transactionsQuery.error.message || "Vui lòng thử lại sau."}
            </AlertDescription>
          </Alert>
        ) : null}

        {summaryQuery.error ? (
          <Alert variant="destructive">
            <CircleAlert aria-hidden />
            <AlertTitle>Không thể tổng hợp doanh thu</AlertTitle>
            <AlertDescription>
              Danh sách giao dịch vẫn có thể sử dụng. Hãy thử làm mới để tải lại phần tổng hợp.
            </AlertDescription>
          </Alert>
        ) : null}

        <RevenueSummary
          totalRevenue={summaryQuery.data?.totalRevenue ?? 0}
          totalTransactions={totalItems}
          succeededTransactions={summaryQuery.data?.succeededTransactions ?? 0}
          loading={summaryQuery.isPending || transactionsQuery.isPending}
        />

        <Card>
          <CardHeader>
            <CardTitle>Tất cả giao dịch</CardTitle>
            <CardDescription>
              Hiển thị {totalItems} giao dịch khớp với bộ lọc hiện tại.
            </CardDescription>
            <CardAction>
              <Select
                value={String(pageSize)}
                onValueChange={(value) => {
                  setPageSize(Number(value ?? 10));
                  setPageIndex(1);
                }}
              >
                <SelectTrigger aria-label="Số giao dịch mỗi trang">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value="10">10 mỗi trang</SelectItem>
                    <SelectItem value="20">20 mỗi trang</SelectItem>
                    <SelectItem value="50">50 mỗi trang</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </CardAction>
          </CardHeader>
          <CardContent className="-mx-(--card-spacing)">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="pl-(--card-spacing)">Khách hàng</TableHead>
                  <TableHead>Giao dịch</TableHead>
                  <TableHead>Số tiền</TableHead>
                  <TableHead>Trạng thái</TableHead>
                  <TableHead>Nhà cung cấp</TableHead>
                  <TableHead className="pr-(--card-spacing)">Thời gian</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactionsQuery.isPending ? <TransactionTableSkeleton /> : null}
                {!transactionsQuery.isPending && transactionsQuery.data?.items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="h-44 text-center">
                      <div className="mx-auto flex max-w-sm flex-col items-center gap-2 whitespace-normal">
                        <WalletCards aria-hidden />
                        <p className="font-medium">Không có giao dịch phù hợp</p>
                        <p className="text-sm text-muted-foreground">
                          Hãy thay đổi hoặc xóa bộ lọc để xem dữ liệu khác.
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : null}
                {transactionsQuery.data?.items.map((transaction) => (
                  <TableRow key={transaction.transactionId}>
                    <TableCell className="max-w-72 whitespace-normal pl-(--card-spacing) align-top">
                      <p className="font-medium text-foreground">{transaction.customerName}</p>
                      <p className="mt-1 break-all text-muted-foreground">{transaction.email}</p>
                      <p className="text-muted-foreground">{transaction.phone || "Chưa có số điện thoại"}</p>
                    </TableCell>
                    <TableCell className="max-w-80 whitespace-normal align-top">
                      <p className="break-all font-medium text-foreground">
                        {transaction.referenceCode || "Chưa có mã tham chiếu"}
                      </p>
                      <p className="mt-1 break-all text-xs text-muted-foreground">
                        Mã bên ngoài: {transaction.externalTransactionId || "Chưa có"}
                      </p>
                    </TableCell>
                    <TableCell className="align-top font-semibold tabular-nums text-primary">
                      {formatCurrency(transaction.amount)}
                    </TableCell>
                    <TableCell className="align-top">
                      <StatusBadge status={transaction.status} />
                    </TableCell>
                    <TableCell className="align-top">
                      {transaction.provider || "Chưa xác định"}
                    </TableCell>
                    <TableCell className="whitespace-normal pr-(--card-spacing) align-top">
                      <p className="font-medium">Tạo lúc</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatDateTime(transaction.createdAt)}
                      </p>
                      <p className="mt-2 font-medium">Thanh toán lúc</p>
                      <p className="mt-1 text-muted-foreground">
                        {formatDateTime(transaction.paidAt)}
                      </p>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
          <CardFooter className="flex flex-col gap-3 sm:flex-row sm:justify-between">
            <p className="text-sm text-muted-foreground">
              Trang {Math.min(pageIndex, totalPages)} / {totalPages}
            </p>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((current) => Math.max(1, current - 1))}
                disabled={pageIndex <= 1 || transactionsQuery.isFetching}
              >
                <ChevronLeft data-icon="inline-start" />
                Trước
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPageIndex((current) => Math.min(totalPages, current + 1))}
                disabled={pageIndex >= totalPages || transactionsQuery.isFetching}
              >
                Sau
                <ChevronRight data-icon="inline-end" />
              </Button>
            </div>
          </CardFooter>
        </Card>
      </div>
    </AdminShell>
  );
}
