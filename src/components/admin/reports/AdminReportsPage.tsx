"use client";

import { useCallback, useEffect, useState } from "react";
import { BarChart3, RefreshCw, Trophy, WalletCards } from "lucide-react";
import {
  getBranches,
  getLoyaltyReport,
  getRevenueReport,
  type AdminBranch,
  type LoyaltyReport,
  type RevenueReport,
} from "@/lib/api/admin";
import { AdminError, AdminPageHeader, AdminShell, MetricCard } from "@/components/admin/shared/AdminUi";
import { useAdminToken } from "@/components/admin/shared/useAdminToken";

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
 * Thành phần (Component) AdminReportsPage
 * 
 * Chức năng: Thành phần giao diện (UI Component) trong hệ thống AutoWash Pro.
 * Vai trò: Đảm nhận hiển thị và xử lý các sự kiện tương tác của người dùng.
 */
export function AdminReportsPage() {
  const token = useAdminToken();
  const initialRange = monthRange();
  const [fromDate, setFromDate] = useState(initialRange.from);
  const [toDate, setToDate] = useState(initialRange.to);
  const [branchId, setBranchId] = useState("");
  const [branches, setBranches] = useState<AdminBranch[]>([]);
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyReport | null>(null);
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

  const loadReports = useCallback(async () => {
    if (!token || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const [nextRevenue, nextLoyalty] = await Promise.all([
        getRevenueReport(token, {
          FromDate: fromDate,
          ToDate: toDate,
          BranchId: branchId || undefined,
        }),
        getLoyaltyReport(token, { FromDate: fromDate, ToDate: toDate }),
      ]);
      setRevenue(nextRevenue);
      setLoyalty(nextLoyalty);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Không thể tải báo cáo.");
    } finally {
      setLoading(false);
    }
  }, [branchId, fromDate, toDate, token]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadBranches(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadBranches]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => void loadReports(), 0);
    return () => window.clearTimeout(timeoutId);
  }, [loadReports]);

  return (
    <AdminShell>
      <AdminPageHeader
        title="Báo cáo"
        description="Xem báo cáo doanh thu và loyalty theo khoảng ngày."
        actions={
          <>
            <input type="date" value={fromDate} onChange={(event) => setFromDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <input type="date" value={toDate} onChange={(event) => setToDate(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100" />
            <select value={branchId} onChange={(event) => setBranchId(event.target.value)} className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100">
              {branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name}</option>
              ))}
            </select>
            <button type="button" onClick={loadReports} disabled={loading || !branchId} className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50" title="Tải lại">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} aria-hidden />
            </button>
          </>
        }
      />

      {error ? <AdminError message={error} onRetry={loadReports} /> : null}

      <div className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Doanh thu" value={formatVND(revenue?.totalRevenue ?? 0)} icon={WalletCards} tone="text-violet-600" />
        <MetricCard label="Tổng booking" value={revenue?.totalBookings ?? 0} icon={BarChart3} tone="text-blue-600" />
        <MetricCard label="Điểm loyalty" value={loyalty?.totalPoints ?? 0} icon={Trophy} tone="text-amber-600" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Chi tiết doanh thu</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(revenue, null, 2)}
          </pre>
        </section>
        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Chi tiết loyalty</h2>
          <pre className="mt-3 max-h-96 overflow-auto rounded-lg bg-slate-950 p-4 text-xs text-slate-100">
            {JSON.stringify(loyalty, null, 2)}
          </pre>
        </section>
      </div>
    </AdminShell>
  );
}
