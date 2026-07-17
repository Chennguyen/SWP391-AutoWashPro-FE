"use client";

import {
  AdminError,
  AdminPageHeader,
  AdminShell,
  MetricCard,
} from "@/features/admin/components/admin-ui";
import { useAdminToken } from "@/features/admin/hooks/use-admin-token";
import {
  getLoyaltyReport,
  getRevenueReport,
  type LoyaltyReport,
  type RevenueReport,
} from "@/features/admin/services";
import { BarChart3, RefreshCw, WalletCards } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { AreaSimple, type RevenueChartPoint } from "@/components/charts/area-simple";

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
  const [revenue, setRevenue] = useState<RevenueReport | null>(null);
  const [loyalty, setLoyalty] = useState<LoyaltyReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!token || !fromDate || !toDate) return;
    setLoading(true);
    setError(null);
    try {
      const [nextRevenue, nextLoyalty] = await Promise.all([
        getRevenueReport(token, {
          FromDate: fromDate,
          ToDate: toDate,
        }),
        getLoyaltyReport(token, { FromDate: fromDate, ToDate: toDate }),
      ]);
      setRevenue(nextRevenue);
      setLoyalty(nextLoyalty);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Không thể tải báo cáo.",
      );
    } finally {
      setLoading(false);
    }
  }, [fromDate, toDate, token]);

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
              onClick={loadReports}
              disabled={loading}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50"
              title="Tải lại"
            >
              <RefreshCw
                size={16}
                className={loading ? "animate-spin" : ""}
                aria-hidden
              />
            </button>
          </>
        }
      />

      {error ? <AdminError message={error} onRetry={loadReports} /> : null}

      <div className="grid gap-4 md:grid-cols-2">
        <MetricCard
          label="Doanh thu"
          value={formatVND(revenue?.totalRevenue ?? 0)}
          icon={WalletCards}
          tone="text-violet-600"
        />
        <MetricCard
          label="Tổng booking"
          value={revenue?.totalBookings ?? 0}
          icon={BarChart3}
          tone="text-blue-600"
        />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-2">
        <AreaSimple
          data={toRevenueChartData(revenue)}
          fromDate={fromDate}
          toDate={toDate}
          totalRevenue={revenue?.totalRevenue ?? 0}
          loading={loading}
        />

        <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="font-bold text-slate-950">Chi tiết loyalty</h2>
          {loyalty ? (
            <div className="mt-3 space-y-4">
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">
                    Điểm tích lũy
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {loyalty.summary.totalPointsEarned}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">
                    Điểm đã đổi
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {loyalty.summary.totalPointsRedeemed}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">
                    Quà đã nhận
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {loyalty.summary.totalRewardsRedeemed}
                  </span>
                </div>
                <div className="rounded-xl border border-slate-100 bg-slate-50/50 p-3">
                  <span className="block text-xs font-medium text-slate-500">
                    Lượt nâng hạng
                  </span>
                  <span className="text-lg font-bold text-slate-800">
                    {loyalty.summary.tierUpgradeCount}
                  </span>
                </div>
              </div>

              {/* Tier Distribution Table */}
              {loyalty.tierDistribution.length > 0 ? (
                <div className="mt-4">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    Phân bố hạng thành viên
                  </h3>
                  <div className="overflow-hidden rounded-lg border border-slate-200">
                    <table className="w-full text-left text-sm text-slate-500 border-collapse">
                      <thead className="bg-slate-50 text-xs font-semibold text-slate-700 uppercase tracking-wider border-b border-slate-200">
                        <tr>
                          <th scope="col" className="px-4 py-2">
                            Hạng
                          </th>
                          <th scope="col" className="px-4 py-2 text-right">
                            Số lượng khách hàng
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {loyalty.tierDistribution.map(
                          (tier) => (
                            <tr
                              key={tier.tierName}
                              className="hover:bg-slate-50 transition-colors"
                            >
                              <td className="px-4 py-2 font-medium text-slate-900">
                                {tier.tierName ?? "Chưa rõ"}
                              </td>
                              <td className="px-4 py-2 text-right text-slate-700 font-semibold">
                                {tier.customerCount ?? 0}
                              </td>
                            </tr>
                          ),
                        )}
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
