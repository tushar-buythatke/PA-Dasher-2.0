"use client"

import { useMemo, useState } from "react"
import useSWR from "swr"
import { Calendar as CalendarIcon, Download, Filter, TrendingUp, ArrowUpRight, ArrowDownRight, RefreshCw } from "lucide-react"
import { Line, LineChart, Bar, BarChart, XAxis, YAxis, CartesianGrid } from "recharts"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { type ChartConfig, ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Calendar } from "@/components/ui/calendar"
import { cn } from "@/lib/utils"
import { type DateRange } from "react-day-picker"
import { format } from "date-fns"

const fetcher = (url: string) => fetch(url).then((res) => res.json())

const FALLBACK_EVENT_COLORS = [
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--chart-6)",
]

const EVENT_COLOR_MAP: Record<string, string> = {
  PA_SET: "var(--chart-alerts-set)",
  PA_REMOVE: "var(--chart-alerts-removed)",
  PA_PUSH_SUCCESS: "var(--chart-push-success)",
  PA_PUSH_ERRORED: "var(--chart-push-errors)",
  PA_EMAIL_SUCCESS: "var(--chart-email-success)",
  PA_EMAIL_ERRORED: "var(--chart-email-errors)",
  PA_SPIDY_FEED: "var(--chart-feed-updates)",
  PA_SPIDY_RECEIVED: "var(--chart-feed-received)",
  PA_PRICE_UPDATED: "var(--chart-price-updates)",
}

const toTitle = (key: string) =>
  key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (char) => char.toUpperCase())

const errorChartConfig = {
  Android: {
    label: "Android Errors",
    color: "var(--chart-error-android)",
  },
  Chrome: {
    label: "Chrome Errors",
    color: "var(--chart-analytics-chrome)",
  },
  Email: {
    label: "Email Errors",
    color: "var(--chart-error-email)",
  },
} satisfies ChartConfig

type EventChartDatum = {
  date: string
  timestamp: number
} & Record<string, number | string>

type ErrorEntry = {
  date: string
  android_errors?: number | null
  chrome_errors?: number | null
  email_errors?: number | null
}

type PosEventEntry = {
  date: string
  event_name: string
  total_count?: number | null
}

type DelayMetrics = {
  total_alerts?: number | null
  avg_android_delay?: number | null
  avg_chrome_delay?: number | null
  avg_email_delay?: number | null
}

type PosStatsResponse = {
  data?: {
    errors?: ErrorEntry[]
    events?: PosEventEntry[]
    delays?: DelayMetrics
  }
}

type EventSummaryEntry = {
  event_name: string
  total_count?: number | null
  avg_per_day?: number | string | null
  trend?: string | null
}

type EventSummaryResponse = {
  data?: {
    summary?: EventSummaryEntry[]
  }
}

export default function AnalyticsPanel() {
  const [dateRange, setDateRange] = useState<DateRange>(() => {
    const to = new Date()
    const from = new Date()
    from.setDate(from.getDate() - 7)
    return { from, to }
  })
  const [selectedPOS, setSelectedPOS] = useState<string>("2")

  const formatDelayHours = (seconds: number | null | undefined) => {
    const hours = Number(seconds ?? 0) / 3600
    const normalized = Math.abs(hours) < 0.05 ? 0 : hours
    return `${normalized.toFixed(1)}h`
  }

  const handleRangeSelect = (range?: DateRange) => {
    if (!range) {
      setDateRange({ from: undefined, to: undefined })
      return
    }
    const { from, to } = range
    if (from && to && from > to) {
      setDateRange({ from: to, to: from })
    } else {
      setDateRange({ from, to })
    }
  }

  const startDate = dateRange?.from ? format(dateRange.from, "yyyy-MM-dd") : undefined
  const endDate = dateRange?.to ? format(dateRange.to, "yyyy-MM-dd") : undefined

  const rangeDisabled = !startDate || !endDate

  const {
    data: posData,
    isLoading,
    mutate: mutatePosData,
    isValidating,
  } = useSWR<PosStatsResponse>(
    rangeDisabled ? null : `/api/v1/stats/pos/${selectedPOS}?startDate=${startDate}&endDate=${endDate}`,
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  )

  const { data: eventSummaryResponse, mutate: mutateEventSummary } = useSWR<EventSummaryResponse>(
    rangeDisabled ? null : `/api/v1/events/summary/all?pos=${selectedPOS}&startDate=${startDate}&endDate=${endDate}`,
    fetcher,
    {
      refreshInterval: 300_000,
      revalidateOnFocus: false,
      dedupingInterval: 60_000,
    },
  )

  const handleRefresh = () => {
    mutatePosData()
    mutateEventSummary()
  }

  const errors = posData?.data?.errors ?? []
  const events = posData?.data?.events ?? []
  const delays = posData?.data?.delays ?? {}
  const eventSummaryData = eventSummaryResponse?.data?.summary ?? []

  const errorChartData = errors
    .map((err) => {
      const parsedDate = new Date(err.date)
      return {
        date: parsedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        timestamp: parsedDate.getTime(),
        Android: Number(err.android_errors ?? 0),
        Chrome: Number(err.chrome_errors ?? 0),
        Email: Number(err.email_errors ?? 0),
      }
    })
    .sort((a, b) => a.timestamp - b.timestamp)

  const eventChartMap = events.reduce((map: Map<string, EventChartDatum>, event) => {
    const isoDate = String(event.date)
    const timestamp = new Date(isoDate).getTime()
    const formattedDate = new Date(isoDate).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    })

    if (!map.has(isoDate)) {
      map.set(isoDate, {
        date: formattedDate,
        timestamp,
      })
    }

    const entry = map.get(isoDate)!
    entry[event.event_name] = Number(event.total_count ?? 0)
    return map
  }, new Map<string, EventChartDatum>())

  const eventChartData: EventChartDatum[] = Array.from<EventChartDatum>(
    eventChartMap.values(),
  ).sort((a, b) => a.timestamp - b.timestamp)

  const eventSeriesKeys = useMemo(() => {
    if (!eventChartData.length) return []
    return Object.keys(eventChartData[0]).filter(
      (key) => key !== "date" && key !== "timestamp",
    )
  }, [eventChartData])

  const eventLineConfig = useMemo(() => {
    let fallbackIndex = 0
    return eventSeriesKeys.reduce((acc, key) => {
      const color =
        EVENT_COLOR_MAP[key] ??
        FALLBACK_EVENT_COLORS[fallbackIndex++ % FALLBACK_EVENT_COLORS.length]
      acc[key] = {
        label: toTitle(key),
        color,
      }
      return acc
    }, {} as ChartConfig)
  }, [eventSeriesKeys])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="w-6 h-6 text-primary" />
              <div>
                <CardTitle>Detailed Analytics</CardTitle>
                <CardDescription>Deep dive into POS performance metrics</CardDescription>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={handleRefresh}
                disabled={isValidating || rangeDisabled}
              >
                <RefreshCw className="w-4 h-4" />
              </Button>
              <Button variant="outline" className="gap-2">
                <Download className="w-4 h-4" />
                Export Report
              </Button>
            </div>
          </div>
          <div className="grid gap-4 sm:grid-cols-3 pt-4">
            <div className="flex flex-col gap-2">
              <Label htmlFor="analytics-pos" className="text-xs">
                <Filter className="w-3 h-3 inline mr-1" />
                Select POS
              </Label>
              <Select value={selectedPOS} onValueChange={setSelectedPOS}>
                <SelectTrigger id="analytics-pos">
                  <SelectValue placeholder="Select POS" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="2">POS 2 - Flipkart</SelectItem>
                  <SelectItem value="63">POS 63 - Amazon</SelectItem>
                  <SelectItem value="111">POS 111 - Myntra</SelectItem>
                  <SelectItem value="2191">POS 2191 - Ajio</SelectItem>
                  <SelectItem value="7376">POS 7376 - Meesho</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-2 sm:col-span-2">
              <Label className="text-xs flex items-center gap-1">
                <CalendarIcon className="w-3 h-3" />
                Date Range
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    id="analytics-date-range"
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      (!dateRange?.from || !dateRange?.to) && "text-muted-foreground",
                    )}
                  >
                    {dateRange?.from && dateRange?.to
                      ? `${format(dateRange.from, "dd MMM yyyy")} - ${format(dateRange.to, "dd MMM yyyy")}`
                      : "Pick a range"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="p-0" align="start">
                  <Calendar
                    mode="range"
                    selected={dateRange}
                    onSelect={handleRangeSelect}
                    numberOfMonths={1}
                    defaultMonth={dateRange?.from ?? dateRange?.to ?? new Date()}
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
        </CardHeader>
      </Card>

      {isLoading ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16">
            <div className="text-center space-y-2">
              <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-sm text-muted-foreground">Loading analytics...</p>
            </div>
          </CardContent>
        </Card>
      ) : rangeDisabled ? (
        <Card>
          <CardContent className="flex items-center justify-center py-16 text-muted-foreground">
            <p className="text-sm">Select a valid date range to view analytics</p>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Total Alerts</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600">
                  {Number(delays.total_alerts ?? 0).toLocaleString("en-US")}
                </CardTitle>
                <CardDescription className="flex items-center gap-1 text-xs">
                  <ArrowUpRight className="w-3 h-3 text-green-500" />
                  <span className="text-green-500">Active</span>
                </CardDescription>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Android Delay</CardDescription>
                <CardTitle className="text-3xl font-bold text-orange-600">
                  {formatDelayHours(delays.avg_android_delay)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Chrome Delay</CardDescription>
                <CardTitle className="text-3xl font-bold text-blue-600">
                  {formatDelayHours(delays.avg_chrome_delay)}
                </CardTitle>
              </CardHeader>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardDescription>Avg Email Delay</CardDescription>
                <CardTitle className="text-3xl font-bold text-purple-600">
                  {formatDelayHours(delays.avg_email_delay)}
                </CardTitle>
              </CardHeader>
            </Card>
          </div>

          {errorChartData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Error Breakdown by Platform</CardTitle>
                <CardDescription>Daily error distribution across platforms</CardDescription>
              </CardHeader>
              <CardContent>
                <ChartContainer config={errorChartConfig} className="h-[420px] w-full">
                  <BarChart data={errorChartData}>
                    <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="4 4" vertical={false} />
                    <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                    <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                    <ChartTooltip
                      cursor={{ fill: 'hsl(var(--muted) / 0.2)' }}
                      content={
                        <ChartTooltipContent
                          indicator="line"
                          hideIndicator
                          labelFormatter={(value) => value ?? ''}
                          formatter={(value) =>
                            typeof value === 'number'
                              ? value.toLocaleString()
                              : value ?? '—'
                          }
                        />
                      }
                    />
                    <Bar
                      dataKey="Android"
                      fill="#C9E4CA"
                      stroke="#C9E4CA"
                      fillOpacity={0.85}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="Chrome"
                      fill="var(--color-Chrome)"
                      stroke="var(--color-Chrome)"
                      fillOpacity={0.85}
                      radius={[8, 8, 0, 0]}
                    />
                    <Bar
                      dataKey="Email"
                      fill="var(--color-Email)"
                      stroke="var(--color-Email)"
                      fillOpacity={0.85}
                      radius={[8, 8, 0, 0]}
                    />
                  </BarChart>
                </ChartContainer>
              </CardContent>
            </Card>
          )}

          {eventChartData.length > 0 && eventSeriesKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Event Volume Trends</CardTitle>
                <CardDescription>Track event patterns over time</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-[400px] w-full">
                  <ChartContainer config={eventLineConfig} className="h-full w-full">
                    <LineChart data={eventChartData} margin={{ left: 4, right: 16, top: 12, bottom: 8 }}>
                      <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" vertical={false} />
                      <XAxis dataKey="date" tickLine={false} axisLine={false} tickMargin={8} />
                      <YAxis tickLine={false} axisLine={false} tickMargin={8} />
                      <ChartTooltip
                        cursor={{ stroke: 'hsl(var(--border))', strokeDasharray: '4 4' }}
                        content={
                          <ChartTooltipContent
                            indicator="line"
                            hideIndicator
                            labelFormatter={(value) => value ?? ''}
                          />
                        }
                      />
                      {eventSeriesKeys.map((eventName, idx) => {
                        const config = eventLineConfig[eventName]
                        const color = config?.color ?? FALLBACK_EVENT_COLORS[idx % FALLBACK_EVENT_COLORS.length]
                        return (
                          <Line
                            key={eventName}
                            type="monotone"
                            dataKey={eventName}
                            stroke={color}
                            strokeWidth={2.4}
                            dot={{
                              r: 4,
                              stroke: color,
                              strokeWidth: 1.2,
                              fill: 'var(--background)',
                            }}
                            activeDot={{
                              r: 6,
                              stroke: color,
                              strokeWidth: 1.8,
                              fill: 'var(--background)',
                            }}
                            connectNulls
                          />
                        )
                      })}
                    </LineChart>
                  </ChartContainer>
                </div>
              </CardContent>
            </Card>
          )}

          {eventSummaryData.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Event Summary</CardTitle>
                <CardDescription>Aggregated event statistics and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event</TableHead>
                      <TableHead className="text-right">Total Count</TableHead>
                      <TableHead className="text-right">Avg/Day</TableHead>
                      <TableHead className="text-right">Trend</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {eventSummaryData.map((event, idx) => {
                      const trendLabel = (event.trend ?? "stable").toString()
                      return (
                        <TableRow key={idx}>
                          <TableCell className="font-medium">{toTitle(event.event_name)}</TableCell>
                          <TableCell className="text-right font-mono">
                            {Number(event.total_count ?? 0).toLocaleString()}
                          </TableCell>
                          <TableCell className="text-right font-mono text-muted-foreground">
                            {Number.parseFloat(String(event.avg_per_day ?? 0)).toFixed(0)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Badge
                              variant={trendLabel === "up" ? "default" : trendLabel === "down" ? "secondary" : "outline"}
                              className="gap-1"
                            >
                              {trendLabel === "up" && <ArrowUpRight className="w-3 h-3" />}
                              {trendLabel === "down" && <ArrowDownRight className="w-3 h-3" />}
                              {toTitle(trendLabel)}
                            </Badge>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  )
}
