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
    if (!token || !fromDate || !toDate || !branchId) return;
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
          {revenue && Array.isArray((revenue as any).data) && ((revenue as any).data as any[]).length > 0 ? (
            <div className="mt-3 max-h-96 overflow-auto rounded-lg border border-slate-200">
              <table className="w-full text-left text-sm text-slate-500 border-collapse">
                <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider sticky top-0 border-b border-slate-200">
                  <tr>
                    <th scope="col" className="px-4 py-3">Ngày</th>
                    <th scope="col" className="px-4 py-3 text-center">Tổng đặt</th>
                    <th scope="col" className="px-4 py-3 text-center">Hoàn thành</th>
                    <th scope="col" className="px-4 py-3 text-right">Doanh thu</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 bg-white">
                  {((revenue as any).data as any[]).map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-2.5 font-medium text-slate-900">
                        {item.date ? item.date.split("-").reverse().join("/") : "-"}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-700">{item.bookingCount ?? 0}</td>
                      <td className="px-4 py-2.5 text-center text-slate-700">{item.completedBookingCount ?? 0}</td>
                      <td className="px-4 py-2.5 text-right font-semibold text-emerald-600">
                        {formatVND(item.revenue ?? 0)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              Không có dữ liệu doanh thu chi tiết.
            </div>
          )}
        </section>

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Chi tiết loyalty</h2>
          {loyalty ? (
            <div className="mt-3 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">Điểm tích lũy</span>
                  <span className="text-lg font-bold text-slate-800">
                    {(loyalty as any).summary?.totalPointsEarned ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">Điểm đã đổi</span>
                  <span className="text-lg font-bold text-slate-800">
                    {(loyalty as any).summary?.totalPointsRedeemed ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">Quà đã nhận</span>
                  <span className="text-lg font-bold text-slate-800">
                    {(loyalty as any).summary?.totalRewardsRedeemed ?? 0}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">Lượt nâng hạng</span>
                  <span className="text-lg font-bold text-slate-800">
                    {(loyalty as any).summary?.tierUpgradeCount ?? 0}
                  </span>
                </div>
              </div>

              {/* Tier Distribution Table */}
              {Array.isArray((loyalty as any).tierDistribution) && ((loyalty as any).tierDistribution as any[]).length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Phân bố hạng thành viên</h3>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-500 border-collapse">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th scope="col" className="px-4 py-2">Hạng</th>
                          <th scope="col" className="px-4 py-2 text-right">Số lượng khách hàng</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {((loyalty as any).tierDistribution as any[]).map((tier: any, idx: number) => (
                          <tr key={idx} className="hover:bg-slate-50 transition-colors">
                            <td className="px-4 py-2 font-medium text-slate-900">{tier.tierName ?? "Chưa rõ"}</td>
                            <td className="px-4 py-2 text-right text-slate-700 font-semibold">{tier.customerCount ?? 0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : null}
            </div>
          ) : (
            <div className="mt-3 rounded-lg border border-dashed border-slate-200 py-8 text-center text-sm text-slate-400">
              Không có dữ liệu loyalty chi tiết.
            </div>
          )}
        </section>
      </div>
    </AdminShell>
  );
}
