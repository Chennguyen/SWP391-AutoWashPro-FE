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
import { AlertCircle, BarChart3 } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from "recharts";

export type RevenueChartPoint = {
  date: string;
  revenue: number;
};

export type AreaSimpleProps = {
  data: RevenueChartPoint[];
  fromDate: string;
  toDate: string;
  totalRevenue: number;
  loading?: boolean;
  error?: string | null;
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
}: AreaSimpleProps) {
  return (
    <Card className="bg-white border border-slate-200 rounded-lg shadow-sm">
      <CardHeader>
        <CardTitle className="text-slate-950 font-bold">Xu hướng doanh thu</CardTitle>
        <CardDescription>
          Doanh thu theo ngày trong khoảng thời gian.
        </CardDescription>
      </CardHeader>

      <CardContent>
        {loading ? (
          <Skeleton className="h-60 w-full sm:h-70" />
        ) : error ? (
          <Alert variant="destructive" className="min-h-60 content-center bg-slate-50 border-slate-200">
            <AlertCircle aria-hidden />
            <AlertTitle>Không thể tải biểu đồ</AlertTitle>
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : data.length === 0 ? (
          <Alert className="min-h-60 content-center border-dashed bg-slate-50 border-slate-200">
            <BarChart3 aria-hidden />
            <AlertTitle>Chưa có dữ liệu doanh thu</AlertTitle>
            <AlertDescription>
              Hãy chọn khoảng thời gian hoặc chi nhánh khác để xem biểu đồ.
            </AlertDescription>
          </Alert>
        ) : (
          <ChartContainer
            className="h-60 w-full text-slate-500 sm:h-70"
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
                    className="border-slate-200 bg-white text-slate-950"
                    hideIndicator
                    labelFormatter={(_, payload) => {
                      const date = String(payload[0]?.payload?.date ?? "");
                      return formatDate(date, true);
                    }}
                    formatter={(value) => (
                      <div className="flex min-w-40 items-center justify-between gap-4">
                        <span className="text-slate-500">Doanh thu</span>
                        <span className="font-mono font-semibold text-slate-950">
                          {formatVND(Number(value))}
                        </span>
                      </div>
                    )}
                  />
                }
              />
              <Area
                dataKey="revenue"
                fill="var(--color-revenue)"
                fillOpacity={0.2}
                stroke="var(--color-revenue)"
                strokeWidth={2.5}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        )}
      </CardContent>

      <CardFooter className="flex flex-col items-start justify-between gap-1 bg-slate-50 sm:flex-row sm:items-center">
        <p className="font-medium text-slate-700">
          Tổng trong kỳ: {formatVND(totalRevenue)}
        </p>
        <p className="text-xs text-slate-500">
          {formatDate(fromDate, true)} - {formatDate(toDate, true)}
        </p>
      </CardFooter>
    </Card>
  );
}

export default AreaSimple;
