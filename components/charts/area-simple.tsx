"use client";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  type ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { AlertCircle, BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type RevenueChartPoint = {
  date: string;
  revenue: number;
  bookingCount?: number;
  completedBookingCount?: number;
};

export type AreaSimpleProps = {
  data: RevenueChartPoint[];
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  loading?: boolean;
  error?: string | null;
  variant?: "default" | "admin-operations";
};

const chartConfig = {
  revenue: {
    label: "Doanh thu",
    color: "#bca374",
  },
} satisfies ChartConfig;

function formatVND(value: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string, includeYear = false) {
  const [year, month, day] = value.slice(0, 10).split("-");
  if (!year || !month || !day) return value;
  return includeYear ? `${day}/${month}/${year}` : `${day}/${month}`;
}

export function AreaSimple({
  data,
  fromDate,
  toDate,
  totalRevenue,
  loading = false,
  error = null,
  variant = "default",
}: AreaSimpleProps) {
  const isAdminOperations = variant === "admin-operations";
  const allRevenueZero = data.length > 0 && data.every((point) => point.revenue === 0);
  const bookingCount = data.reduce((total, point) => total + (point.bookingCount ?? 0), 0);
  const completedBookingCount = data.reduce(
    (total, point) => total + (point.completedBookingCount ?? 0),
    0,
  );

  return (
    <Card
      size={isAdminOperations ? "sm" : "default"}
      className={cn(!isAdminOperations && "rounded-lg border border-slate-200 bg-white shadow-sm")}
      data-admin-chart={isAdminOperations ? "operations" : undefined}
    >
      <CardHeader className={cn(isAdminOperations && "pb-0")}>
        <CardTitle className={cn(!isAdminOperations && "font-bold text-slate-950")}>Xu hướng doanh thu</CardTitle>
        <CardDescription>
          {isAdminOperations
            ? "Doanh thu theo ngày trong khoảng đã chọn."
            : "Doanh thu theo ngày trong khoảng thời gian."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className={cn("w-full", isAdminOperations ? "h-[300px] sm:h-[336px]" : "h-60 sm:h-70")} />
        ) : error ? (
          <Alert
            variant="destructive"
            className={cn("content-center", isAdminOperations ? "min-h-[300px] sm:min-h-[336px]" : "min-h-60 border-slate-200 bg-slate-50")}
          >
            <AlertCircle aria-hidden />
            <AlertTitle>Không thể tải biểu đồ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : data.length === 0 || (isAdminOperations && allRevenueZero) ? (
          <Alert
            className={cn("content-center border-dashed", isAdminOperations ? "min-h-[300px] sm:min-h-[336px]" : "min-h-60 border-slate-200 bg-slate-50")}
          >
            <BarChart3 aria-hidden />
            <AlertTitle>
              {allRevenueZero ? "Chưa phát sinh doanh thu" : "Chưa có dữ liệu doanh thu"}
            </AlertTitle>
            <AlertDescription>
              {isAdminOperations && allRevenueZero
                ? `${bookingCount} lịch đặt, ${completedBookingCount} lịch hoàn thành trong khoảng đã chọn.`
                : isAdminOperations
                  ? "Hãy chọn khoảng thời gian khác để xem biểu đồ."
                  : "Hãy chọn khoảng thời gian hoặc chi nhánh khác để xem biểu đồ."}
            </AlertDescription>
          </Alert>
        ) : (
          <ChartContainer
            className={cn("w-full", isAdminOperations ? "h-[300px] text-muted-foreground sm:h-[336px]" : "h-60 text-slate-500 sm:h-70")}
            config={chartConfig}
          >
            <AreaChart
              accessibilityLayer
              data={data}
              margin={{ left: 4, right: 4, top: 20 }}
            >
              <CartesianGrid
                vertical={false}
              />
              <YAxis
                hide={true}
                domain={[0, (dataMax: number) => dataMax * 1.15]}
              />
              <XAxis
                axisLine={false}
                dataKey="date"
                minTickGap={24}
                tickFormatter={(value: string) => formatDate(value)}
                tickLine={false}
                tickMargin={10}
              />
              <ChartTooltip
                cursor={false}
                content={
                  <ChartTooltipContent
                    className={cn(
                      !isAdminOperations && "border-slate-200 bg-white text-slate-950",
                      isAdminOperations && "border-border bg-popover text-popover-foreground",
                    )}
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const date = String(payload[0]?.payload?.date ?? "");
                      return formatDate(date, true);
                    }}
                    formatter={(value, _name, item) => {
                      const point = item.payload as RevenueChartPoint;
                      return (
                        <div className="flex min-w-48 flex-col gap-1.5">
                          <div className="flex items-center justify-between gap-4">
                            <span className={cn(isAdminOperations ? "text-muted-foreground" : "text-slate-500")}>
                              Doanh thu
                            </span>
                            <span data-admin-number className={cn("font-semibold", !isAdminOperations && "font-mono text-slate-950")}>
                              {formatVND(Number(value))}
                            </span>
                          </div>
                          {isAdminOperations ? (
                            <>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Lịch đặt</span>
                                <span data-admin-number className="font-semibold">{point.bookingCount ?? 0}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <span className="text-muted-foreground">Hoàn thành</span>
                                <span data-admin-number className="font-semibold">{point.completedBookingCount ?? 0}</span>
                              </div>
                            </>
                          ) : null}
                        </div>
                      );
                    }}
                  />
                }
              />
              <Area
                dataKey="revenue"
                fill="var(--color-revenue)"
                fillOpacity={0.2}
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
                type={isAdminOperations ? "linear" : "monotone"}
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>

      <CardFooter className={cn("flex flex-col items-start justify-between gap-1 sm:flex-row sm:items-center", !isAdminOperations && "bg-slate-50")}>
        <p data-admin-number className={cn("font-medium", !isAdminOperations && "text-slate-700")}>
          Tổng trong kỳ: {formatVND(totalRevenue)}
        </p>
        <p className={cn("text-xs", isAdminOperations ? "text-muted-foreground" : "text-slate-500")}>
          {formatDate(fromDate, true)} - {formatDate(toDate, true)}
        </p>
      </CardFooter>
    </Card>
  );
}

export default AreaSimple;
