"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import {
  AlertCircle,
  CalendarCheck,
  CalendarDays,
  CheckCircle2,
  Clock3,
  RefreshCw,
  Store,
  Users,
  WalletCards,
  XCircle,
} from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Button, buttonVariants } from "@/components/ui/button";
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
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  getDashboardStats,
  getBranches,
  getRevenueReport,
  type DashboardStats,
  type AdminBranch,
  type RevenueReport,
} from "@/features/admin/services";
import { AdminPageHeader, AdminShell } from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import {
  AreaSimple,
  type RevenueChartPoint,
} from "@/components/charts/area-simple";
import { cn } from "@/lib/utils";

function monthRange() {
  const now = new Date();
  const first = new Date(now.getFullYear(), now.getMonth(), 1);
  const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  return {
    from: first.toISOString().split("T")[0] ?? "",
    to: last.toISOString().split("T")[0] ?? "",
  };
}

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return `${day}/${month}/${year}`;
}

function safeRate(value: number, total: number) {
  if (total <= 0) return 0;
  return (value / total) * 100;
}

function formatRate(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: value > 0 && value < 10 ? 1 : 0,
  }).format(value);
}

function readNumber(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function formatAdminTime(value: string) {
  const timeMatch = value.match(/T?(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!timeMatch) return value || "Chưa có giờ";
  return `${timeMatch[1]?.padStart(2, "0")}:${timeMatch[2]}`;
}

function adminTimeSortValue(value: string) {
  const timeMatch = value.match(/T?(\d{1,2}):(\d{2})(?::\d{2})?/);
  if (!timeMatch) return Number.MAX_SAFE_INTEGER;
  return Number(timeMatch[1]) * 60 + Number(timeMatch[2]);
}

function statusMeta(status: string) {
  const normalized = status.trim().toLowerCase();
  const statusMap: Record<string, { label: string; tone: string }> = {
    available: { label: "Còn trống", tone: "neutral" },
    pending: { label: "Chờ xác nhận", tone: "warning" },
    confirmed: { label: "Đã xác nhận", tone: "info" },
    checkin: { label: "Đã check-in", tone: "info" },
    inprogress: { label: "Đang thực hiện", tone: "info" },
    completed: { label: "Hoàn thành", tone: "success" },
    cancelled: { label: "Đã hủy", tone: "danger" },
    canceled: { label: "Đã hủy", tone: "danger" },
  };

  return statusMap[normalized] ?? {
    label: status || "Chưa rõ trạng thái",
    tone: "neutral",
  };
}

function toRevenueChartData(report: RevenueReport | null): RevenueChartPoint[] {
  if (!report || !Array.isArray(report.details)) return [];

  return report.details
    .flatMap((item) => {
      const rawDate =
        item.date ??
        item.Date ??
        item.bookingDate ??
        item.BookingDate ??
        item.time ??
        item.Time ??
        item.day ??
        item.Day;
      const rawRevenue =
        item.revenue ??
        item.Revenue ??
        item.totalRevenue ??
        item.TotalRevenue ??
        item.amount ??
        item.Amount;
      const rawBookingCount = item.bookingCount ?? item.BookingCount;
      const rawCompletedBookingCount =
        item.completedBookingCount ?? item.CompletedBookingCount;

      if (!rawDate) return [];

      const dateStr = typeof rawDate === "string" ? rawDate : String(rawDate);
      if (!dateStr.trim()) return [];

      const revenue =
        typeof rawRevenue === "number" ? rawRevenue : Number(rawRevenue ?? 0);

      return [
        {
          date: dateStr,
          revenue: Number.isFinite(revenue) ? revenue : 0,
          bookingCount: readNumber(rawBookingCount),
          completedBookingCount: readNumber(rawCompletedBookingCount),
        },
      ];
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-label="Đang tải tổng quan vận hành">
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <Card key={index} size="sm">
            <CardHeader>
              <Skeleton className="h-3 w-28" />
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <Skeleton className="h-8 w-32" />
              <Skeleton className="h-3 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]">
        <Skeleton className="h-[420px] w-full rounded-xl" />
        <Skeleton className="h-[420px] w-full rounded-xl" />
      </div>
    </div>
  );
}

function DashboardKpiCard({
  label,
  value,
  context,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string | number;
  context: string;
  icon: typeof WalletCards;
  tone: "gold" | "neutral" | "success" | "danger";
}) {
  return (
    <Card size="sm" data-admin-kpi={tone}>
      <CardHeader>
        <CardTitle className="text-sm text-muted-foreground">{label}</CardTitle>
        <CardAction data-admin-tone={tone}>
          <Icon size={18} strokeWidth={1.8} aria-hidden />
        </CardAction>
      </CardHeader>
      <CardContent>
        <p data-admin-number className="text-2xl font-semibold tracking-[-0.035em] text-foreground lg:text-3xl">
          {value}
        </p>
      </CardContent>
      <CardFooter>
        <p className="text-xs text-muted-foreground">{context}</p>
      </CardFooter>
    </Card>
  );
}

/**
 * Thành phần (Component) AdminDashboardPage
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminDashboardPage() {
  const token = useAdminToken();
  const initialRange = monthRange();
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  // Follow-up: expose this filter only after the revenue endpoint applies BranchId.
  const [branchId] = useState("");
  const [, setBranches] = useState<AdminBranch[]>([]);
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [chartLoading, setChartLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [chartError, setChartError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getBranches(token, { isActive: true });
      setBranches(result);
    } catch {
      setBranches([]);
    }
  }, [token]);

  const loadDashboard = useCallback(async () => {
    if (!token || !fromDate || !toDate) return;
    setLoading(true);
    setChartLoading(true);
    setError(null);
    setChartError(null);

    const params = {
      FromDate: fromDate,
      ToDate: toDate,
      BranchId: branchId || undefined,
    };

    try {
      const [statsResult, revenueResult] = await Promise.allSettled([
        getDashboardStats(token, params),
        getRevenueReport(token, params),
      ]);

      if (statsResult.status === "fulfilled") {
        setStats(statsResult.value);
      } else {
        setStats(null);
        setError(errorMessage(statsResult.reason, "Không thể tải tổng quan."));
      }

      if (revenueResult.status === "fulfilled") {
        setRevenue(revenueResult.value);
      } else {
        setRevenue(null);
        setChartError(
          errorMessage(revenueResult.reason, "Không thể tải dữ liệu doanh thu."),
        );
      }
    } catch (loadError) {
      setStats(null);
      setRevenue(null);
      setError(errorMessage(loadError, "Không thể tải tổng quan."));
      setChartError(errorMessage(loadError, "Không thể tải dữ liệu doanh thu."));
    } finally {
      setLoading(false);
      setChartLoading(false);
    }
  }, [fromDate, toDate, token, branchId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadDashboard(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadDashboard]);

  const completionRate = safeRate(stats?.completedBookings ?? 0, stats?.totalBookings ?? 0);
  const cancellationRate = safeRate(stats?.cancelledBookings ?? 0, stats?.totalBookings ?? 0);
  const dateRangeText = `${formatDate(fromDate)} – ${formatDate(toDate)}`;
  const revenueChartData = toRevenueChartData(revenue);
  const todayBookings = [...(stats?.todayBookings ?? [])].sort(
    (left, right) => adminTimeSortValue(left.startTime) - adminTimeSortValue(right.startTime),
  );

  return (
    <AdminShell variant="dashboard">
      <AdminPageHeader
        variant="dashboard"
        eyebrow="Trung tâm vận hành"
        title="Tổng quan vận hành"
        description="Theo dõi doanh thu, lịch đặt và tình trạng vận hành từ dữ liệu hệ thống."
        actions={
          <div className="flex w-full items-end gap-2 sm:w-auto">
            <FieldGroup className="grid grid-cols-2 gap-2 sm:flex sm:flex-row">
              <Field className="min-w-0 sm:w-36">
                <FieldLabel htmlFor="dashboard-from-date" className="sr-only">
                  Từ ngày
                </FieldLabel>
                <Input
                  id="dashboard-from-date"
                  type="date"
                  value={fromDate}
                  onChange={(event) => setFromDate(event.target.value)}
                />
              </Field>
              <Field className="min-w-0 sm:w-36">
                <FieldLabel htmlFor="dashboard-to-date" className="sr-only">
                  Đến ngày
                </FieldLabel>
                <Input
                  id="dashboard-to-date"
                  type="date"
                  value={toDate}
                  onChange={(event) => setToDate(event.target.value)}
                />
              </Field>
            </FieldGroup>
            <Button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              variant="outline"
              size="icon"
              title="Tải lại"
              aria-label="Tải lại dữ liệu Dashboard"
            >
              <RefreshCw data-icon="inline-start" className={cn(loading && "animate-spin")} aria-hidden />
            </Button>
          </div>
        }
      />

      {loading && !stats ? <DashboardSkeleton /> : null}

      {error ? (
        <Alert variant="destructive" className="mb-4">
          <AlertCircle aria-hidden />
          <AlertTitle>Không thể tải tổng quan vận hành</AlertTitle>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-3">
            <span>{error}</span>
            <Button type="button" variant="outline" size="sm" onClick={loadDashboard}>
              <RefreshCw data-icon="inline-start" aria-hidden />
              Thử lại
            </Button>
          </AlertDescription>
        </Alert>
      ) : null}

      {stats ? (
        <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Chỉ số vận hành trong kỳ">
          <DashboardKpiCard
            label="Doanh thu trong kỳ"
            value={formatVND(stats.totalRevenue)}
            context={dateRangeText}
            icon={WalletCards}
            tone="gold"
          />
          <DashboardKpiCard
            label="Tổng lịch đặt"
            value={stats.totalBookings}
            context={`Trong khoảng ${dateRangeText}`}
            icon={CalendarCheck}
            tone="neutral"
          />
          <DashboardKpiCard
            label="Tỷ lệ hoàn thành"
            value={`${formatRate(completionRate)}%`}
            context={`${stats.completedBookings}/${stats.totalBookings} lịch trong khoảng`}
            icon={CheckCircle2}
            tone="success"
          />
          <DashboardKpiCard
            label="Tỷ lệ hủy"
            value={`${formatRate(cancellationRate)}%`}
            context={`${stats.cancelledBookings}/${stats.totalBookings} lịch trong khoảng`}
            icon={XCircle}
            tone="danger"
          />
        </section>
      ) : null}

      {!loading || stats ? (
        <section
          className={cn(
            "grid gap-4",
            stats && "xl:grid-cols-[minmax(0,1.65fr)_minmax(18rem,0.85fr)]",
          )}
          aria-label="Xu hướng doanh thu và lịch đặt hôm nay"
        >
          <AreaSimple
            data={revenueChartData}
            error={chartError}
            fromDate={fromDate}
            loading={chartLoading}
            toDate={toDate}
            totalRevenue={revenue?.totalRevenue ?? stats?.totalRevenue ?? 0}
            variant="admin-operations"
          />

          {stats ? (
            <Card size="sm" data-admin-panel="today-bookings">
              <CardHeader>
                <CardTitle>Lịch đặt hôm nay</CardTitle>
                <CardDescription>Không phụ thuộc khoảng ngày đang chọn.</CardDescription>
                <CardAction>
                  <Badge variant="outline" data-admin-status="info">
                    {todayBookings.length} lịch
                  </Badge>
                </CardAction>
              </CardHeader>
              <CardContent className="min-h-0 flex-1">
                {todayBookings.length === 0 ? (
                  <Alert className="min-h-56 content-center border-dashed">
                    <CalendarDays aria-hidden />
                    <AlertTitle>Chưa có lịch đặt hôm nay</AlertTitle>
                    <AlertDescription>Danh sách sẽ cập nhật khi hệ thống có lịch mới.</AlertDescription>
                  </Alert>
                ) : (
                  <ul className="flex max-h-80 flex-col gap-1 overflow-y-auto pr-1">
                    {todayBookings.map((booking, index) => {
                      const status = statusMeta(booking.status);
                      return (
                        <li
                          key={booking.id || `${booking.startTime}-${booking.branchName}-${booking.licensePlate}-${index}`}
                          className="grid grid-cols-[auto_minmax(0,1fr)] gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-muted/60"
                        >
                          <div className="flex items-start gap-1.5 pt-0.5 text-primary">
                            <Clock3 size={15} strokeWidth={1.8} aria-hidden />
                            <span data-admin-number className="text-sm font-semibold text-foreground">
                              {formatAdminTime(booking.startTime)}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <div className="flex flex-wrap items-center justify-between gap-2">
                              <p className="truncate text-sm font-medium text-foreground">{booking.licensePlate}</p>
                              <Badge variant="outline" data-admin-status={status.tone}>
                                {status.label}
                              </Badge>
                            </div>
                            <p className="mt-1 truncate text-xs text-muted-foreground">{booking.branchName}</p>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </CardContent>
              <CardFooter className="justify-end">
                <Link
                  href="/admin/bookings"
                  className={buttonVariants({ variant: "outline", size: "sm" })}
                >
                  Xem lịch đặt
                </Link>
              </CardFooter>
            </Card>
          ) : null}
        </section>
      ) : null}

      {stats ? (
        <section className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]" aria-label="Tổng hợp vận hành">
          <Card size="sm" data-admin-panel="operational-summary">
            <CardHeader>
              <CardTitle>Tổng hợp vận hành</CardTitle>
              <CardDescription>
                Toàn hệ thống, không phụ thuộc khoảng ngày đã chọn.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <dl className="grid gap-2 sm:grid-cols-2">
                <div className="rounded-lg bg-muted/45 p-3">
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users size={15} strokeWidth={1.8} aria-hidden />
                    Tổng customer
                  </dt>
                  <dd data-admin-number className="mt-2 text-xl font-semibold text-foreground">{stats.totalUsers}</dd>
                </div>
                <div className="rounded-lg bg-muted/45 p-3">
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <CheckCircle2 size={15} strokeWidth={1.8} aria-hidden />
                    Active customer
                  </dt>
                  <dd data-admin-number data-admin-tone="success" className="mt-2 text-xl font-semibold">
                    {stats.activeCustomers ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/45 p-3">
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <XCircle size={15} strokeWidth={1.8} aria-hidden />
                    Locked customer
                  </dt>
                  <dd data-admin-number data-admin-tone="danger" className="mt-2 text-xl font-semibold">
                    {stats.lockedCustomers ?? 0}
                  </dd>
                </div>
                <div className="rounded-lg bg-muted/45 p-3">
                  <dt className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Store size={15} strokeWidth={1.8} aria-hidden />
                    Active branch
                  </dt>
                  <dd data-admin-number className="mt-2 text-xl font-semibold text-foreground">
                    {stats.activeBranches ?? 0}/{stats.totalBranches ?? 0}
                  </dd>
                </div>
              </dl>
            </CardContent>
          </Card>

          <Card size="sm" data-admin-panel="top-branches">
            <CardHeader>
              <CardTitle>Top chi nhánh</CardTitle>
              <CardDescription>
                Doanh thu từ lịch hoàn thành trong khoảng {dateRangeText}.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {stats.topBranches.length === 0 ? (
                <Alert className="min-h-40 content-center border-dashed">
                  <Store aria-hidden />
                  <AlertTitle>Chưa có chi nhánh phát sinh doanh thu</AlertTitle>
                  <AlertDescription>Không có lịch hoàn thành trong khoảng đã chọn.</AlertDescription>
                </Alert>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Chi nhánh</TableHead>
                      <TableHead className="text-right">Hoàn thành</TableHead>
                      <TableHead className="text-right">Doanh thu</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {stats.topBranches.map((branch, index) => (
                      <TableRow key={branch.branchId || `${branch.branchName}-${index}`}>
                        <TableCell className="font-medium text-foreground">{branch.branchName}</TableCell>
                        <TableCell data-admin-number className="text-right text-muted-foreground">
                          {branch.completedBookings}
                        </TableCell>
                        <TableCell data-admin-number className="text-right font-medium text-foreground">
                          {formatVND(branch.revenue)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </section>
      ) : null}
    </AdminShell>
  );
}
