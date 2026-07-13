"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CalendarCheck, RefreshCw, Store, Users, WalletCards, XCircle } from "lucide-react";
import {
  getDashboardStats,
  getBranches,
  getRevenueReport,
  type DashboardStats,
  type AdminBranch,
  type RevenueReport,
} from "@/features/admin/services";
import { AdminError, AdminLoading, AdminPageHeader, AdminShell, MetricCard } from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import {
  AreaSimple,
  type RevenueChartPoint,
} from "@/components/charts/area-simple";

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

      if (!rawDate) return [];

      const dateStr = typeof rawDate === "string" ? rawDate : String(rawDate);
      if (!dateStr.trim()) return [];

      const revenue =
        typeof rawRevenue === "number" ? rawRevenue : Number(rawRevenue ?? 0);

      return [
        {
          date: dateStr,
          revenue: Number.isFinite(revenue) ? revenue : 0,
        },
      ];
    })
    .sort((left, right) => left.date.localeCompare(right.date));
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
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
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<AdminBranch[]>([]);
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

  return (
    <AdminShell>
      <AdminPageHeader
        title="Tổng quan"
        description="Theo dõi hoạt động và hiệu suất kinh doanh từ API admin."
        actions={
          <>
            <input
              type="date"
              value={fromDate}
              onChange={(event) => setFromDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />
            <input
              type="date"
              value={toDate}
              onChange={(event) => setToDate(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            />

            <button
              type="button"
              onClick={loadDashboard}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:bg-slate-50 disabled:opacity-50"
              title="Tải lại"
            >
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
            </button>
          </>
        }
      />

      {loading && !stats ? <AdminLoading /> : null}
      {error ? <AdminError message={error} onRetry={loadDashboard} /> : null}

      <div className="mb-4">
        <AreaSimple
          data={toRevenueChartData(revenue)}
          error={chartError}
          fromDate={fromDate}
          loading={chartLoading}
          toDate={toDate}
          totalRevenue={revenue?.totalRevenue ?? stats?.totalRevenue ?? 0}
        />
      </div>

      {stats && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Tổng lịch đặt" value={stats.totalBookings} icon={CalendarCheck} tone="text-blue-600" />
          <MetricCard label="Hoàn thành" value={stats.completedBookings} icon={BadgeCheck} tone="text-emerald-600" />
          <MetricCard label="Đã hủy" value={stats.cancelledBookings} icon={XCircle} tone="text-red-600" />
          <MetricCard label="Tổng doanh thu" value={formatVND(stats.totalRevenue)} icon={WalletCards} tone="text-violet-600" />
          <MetricCard label="Tổng người dùng" value={stats.totalUsers} icon={Users} tone="text-indigo-600" />
          <MetricCard label="Người dùng hoạt động" value={stats.activeCustomers ?? 0} icon={Users} tone="text-indigo-600" />
          <MetricCard label="Tổng chi nhánh" value={stats.totalBranches ?? 0} icon={Store} tone="text-amber-500" />
        </div>
      ) : null}
    </AdminShell>
  );
}
