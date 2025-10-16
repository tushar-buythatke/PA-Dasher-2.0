"use client";

import useSWR from "swr";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Area, AreaChart, Line, LineChart } from "recharts";
import { type ChartConfig, ChartContainer } from "@/components/ui/chart";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type GlobalStat = {
  date: string;
  platform: number;
  total_alerts_set: number;
  total_push_success: number;
  total_push_errors: number;
  total_email_success: number;
  total_email_errors: number;
  success_rate: number;
  avg_delay_hours: number;
};

const chartConfig = {
  alerts: {
    label: "Alerts",
    color: "hsl(var(--chart-1))",
  },
  success: {
    label: "Success Rate",
    color: "hsl(var(--chart-2))",
  },
} satisfies ChartConfig;

export default function GlobalStats() {
  const { data, isLoading } = useSWR<{ data: { global_stats: GlobalStat[] } }>(
    "/api/v1/stats/global",
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 120_000,
    }
  );

  const stats = data?.data?.global_stats || [];

  const todayStats = stats.reduce(
    (acc, stat) => {
      acc.total_alerts += stat.total_alerts_set || 0;
      acc.total_push_success += stat.total_push_success || 0;
      acc.total_push_errors += stat.total_push_errors || 0;
      acc.total_email_success += stat.total_email_success || 0;
      acc.total_email_errors += stat.total_email_errors || 0;
      acc.avg_delay += parseFloat(String(stat.avg_delay_hours || 0));
      acc.count += 1;
      return acc;
    },
    {
      total_alerts: 0,
      total_push_success: 0,
      total_push_errors: 0,
      total_email_success: 0,
      total_email_errors: 0,
      avg_delay: 0,
      count: 0,
    }
  );

  const totalSuccess = todayStats.total_push_success + todayStats.total_email_success;
  const totalErrors = todayStats.total_push_errors + todayStats.total_email_errors;
  const totalAttempts = totalSuccess + totalErrors;

  const avgDelay = todayStats.count > 0 ? todayStats.avg_delay / todayStats.count : 0;
  const successRate = totalAttempts > 0 ? (totalSuccess / totalAttempts) * 100 : 0;

  // Prepare chart data from stats
  const chartData = stats.slice(0, 7).map((stat) => ({
    date: new Date(stat.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    alerts: stat.total_alerts_set || 0,
    successRate: parseFloat(String(stat.success_rate || 0)),
  }));

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Alerts Card with Mini Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Alerts</CardDescription>
          <CardTitle className="text-3xl font-bold">
            {isLoading ? "..." : todayStats.total_alerts.toLocaleString()}
          </CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-green-500">+12.5%</span> from last period
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <ChartContainer config={chartConfig} className="h-[60px] w-full">
            <AreaChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <Area
                dataKey="alerts"
                fill="var(--color-alerts)"
                fillOpacity={0.2}
                stroke="var(--color-alerts)"
                strokeWidth={2}
                type="monotone"
              />
            </AreaChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Success Rate Card with Mini Chart */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Success Rate</CardDescription>
          <CardTitle className="text-3xl font-bold text-green-600">
            {isLoading ? "..." : `${successRate.toFixed(1)}%`}
          </CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <ArrowUpRight className="w-3 h-3 text-green-500" />
            <span className="text-green-500">+2.3%</span> from last period
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-2">
          <ChartContainer config={chartConfig} className="h-[60px] w-full">
            <LineChart
              data={chartData}
              margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
            >
              <Line
                type="monotone"
                dataKey="successRate"
                stroke="var(--color-success)"
                strokeWidth={2}
                dot={false}
              />
            </LineChart>
          </ChartContainer>
        </CardContent>
      </Card>

      {/* Total Errors Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Total Errors</CardDescription>
          <CardTitle className="text-3xl font-bold text-red-600">
            {isLoading ? "..." : totalErrors.toLocaleString()}
          </CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <ArrowDownRight className="w-3 h-3 text-red-500" />
            <span className="text-red-500">-8.1%</span> from last period
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between text-sm">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-orange-500" />
                <span className="text-muted-foreground">Push Errors</span>
              </div>
              <div className="font-mono font-bold">
                {todayStats.total_push_errors.toLocaleString()}
              </div>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-purple-500" />
                <span className="text-muted-foreground">Email Errors</span>
              </div>
              <div className="font-mono font-bold">
                {todayStats.total_email_errors.toLocaleString()}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Average Delay Card */}
      <Card>
        <CardHeader className="pb-2">
          <CardDescription>Avg Delay</CardDescription>
          <CardTitle className="text-3xl font-bold text-orange-600">
            {isLoading ? "..." : avgDelay < 1 ? `${Math.round(avgDelay * 60)}m` : `${avgDelay.toFixed(1)}h`}
          </CardTitle>
          <CardDescription className="flex items-center gap-1 text-xs">
            <ArrowDownRight className="w-3 h-3 text-green-500" />
            <span className="text-green-500">-15.2%</span> improvement
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Success</span>
              <span className="font-mono font-semibold text-green-600">
                {totalSuccess.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Attempts</span>
              <span className="font-mono font-semibold">
                {totalAttempts.toLocaleString()}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
