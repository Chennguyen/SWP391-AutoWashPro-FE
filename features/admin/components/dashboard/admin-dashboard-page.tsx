"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeCheck, CalendarCheck, RefreshCw, Users, WalletCards, XCircle } from "lucide-react";
import { getDashboardStats, getBranches, type DashboardStats, type AdminBranch } from "@/features/admin/services";
import { AdminError, AdminLoading, AdminPageHeader, AdminShell, MetricCard } from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";

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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBranches = useCallback(async () => {
    if (!token) return;
    try {
      const result = await getBranches(token, { isActive: true });
      setBranches(result);
      if (result.length > 0 && !branchId) {
        setBranchId(result[0].id);
      }
    } catch {
      setBranches([]);
    }
  }, [token, branchId]);

  const loadStats = useCallback(async () => {
    if (!token || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const nextStats = await getDashboardStats(token, {
        FromDate: fromDate,
        ToDate: toDate,
        BranchId: branchId || undefined,
      });
      setStats(nextStats);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải tổng quan.");
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, token, branchId]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadStats(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadStats]);

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
            <select
              value={branchId}
              onChange={(event) => setBranchId(event.target.value)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
            >
              <option value="">Tất cả chi nhánh</option>
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>
                  {branch.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={loadStats}
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
      {error ? <AdminError message={error} onRetry={loadStats} /> : null}

      {stats && !error ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <MetricCard label="Tổng lịch đặt" value={stats.totalBookings} icon={CalendarCheck} tone="text-blue-600" />
          <MetricCard label="Hoàn thành" value={stats.completedBookings} icon={BadgeCheck} tone="text-emerald-600" />
          <MetricCard label="Đã hủy" value={stats.cancelledBookings} icon={XCircle} tone="text-red-600" />
          <MetricCard label="Tổng doanh thu" value={formatVND(stats.totalRevenue)} icon={WalletCards} tone="text-violet-600" />
          <MetricCard label="Tổng người dùng" value={stats.totalUsers} icon={Users} tone="text-indigo-600" />
          <MetricCard label="Người dùng mới" value={stats.newUsers} icon={Users} tone="text-amber-600" />
        </div>
      ) : null}
    </AdminShell>
  );
}
