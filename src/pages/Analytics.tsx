import { useMemo, useState } from "react"
import { Eye, EyeOff, BarChart3, ArrowLeft } from "lucide-react"
import { useNavigate } from "react-router-dom"
import useSWR from "swr"

import AnalyticsPanel from "@/components/analytics/AnalyticsPanel"
import { EventVolumeChart } from "@/components/dashboard/event-volume-chart"
import NotificationSummary from "@/components/analytics/NotificationSummary"
import {
  computeNotificationStats,
  type NotificationAggregate,
  type NotificationBreakdownEntry,
  type NotificationSummaryData,
} from "@/components/analytics/utils/notificationStats"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import ErrorTrends from "@/components/dashboard/error-trends"

export default function AnalyticsPage() {
  const navigate = useNavigate()
  const [visibleSections, setVisibleSections] = useState({
    eventVolume: true,
    notificationSummary: true,
    detailedAnalytics: true,
    errorTrends: false,
  })
  const [summaryPOS, setSummaryPOS] = useState<string>("all")

  type NotificationSummaryResponse = {
    data: NotificationSummaryData
  }

  const {
    data: notificationResponse,
    isLoading: isLoadingNotifications,
    error: notificationError,
  } = useSWR<NotificationSummaryResponse>(
    "/api/v1/notifications/summary",
    (url: string) => fetch(url).then((res) => res.json()),
    {
      refreshInterval: 60_000,
      revalidateOnFocus: false,
    },
  )

  const notificationSummary: NotificationSummaryData = notificationResponse?.data ?? null
  const notificationBreakdown = useMemo<NotificationBreakdownEntry[]>(
    () => notificationSummary?.breakdown ?? [],
    [notificationSummary],
  )

  const heroFiltered = useMemo<NotificationBreakdownEntry[]>(() => {
    if (summaryPOS === "all") {
      return notificationBreakdown
    }

    return notificationBreakdown.filter((item) => String(item.pos) === summaryPOS)
  }, [notificationBreakdown, summaryPOS])

  const heroStats = useMemo<NotificationAggregate>(() => computeNotificationStats(heroFiltered), [heroFiltered])

  const heroTotal = heroStats.total_notifications
  const heroSuccessRate = heroTotal > 0 ? (heroStats.total_success / heroTotal) * 100 : 0
  const heroErrorRate = heroTotal > 0 ? (heroStats.total_errors / heroTotal) * 100 : 0
  const heroAvgDelay = heroTotal > 0 ? heroStats.total_delay / heroTotal : 0

  const toggle = (section: keyof typeof visibleSections) => {
    setVisibleSections((prev) => ({ ...prev, [section]: !prev[section] }))
  }

  const toggleAll = (value: boolean) => {
    setVisibleSections({
      eventVolume: value,
      notificationSummary: value,
      detailedAnalytics: value,
      errorTrends: value,
    })
  }

  return (
    <div className="bg-muted min-h-screen p-4 md:p-6">
      <main className="container mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader className="space-y-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="shrink-0"
                  title="Back to Dashboard"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
                <div className="rounded-full bg-primary/10 p-3 text-primary">
                  <BarChart3 className="h-7 w-7" />
                </div>
                <div>
                  <CardTitle className="text-3xl font-bold">Analytics Dashboard</CardTitle>
                  <CardDescription>
                    Comprehensive performance analysis and deep insights across your POS network.
                  </CardDescription>
                </div>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="sm" onClick={() => toggleAll(true)}>
                  Show all
                </Button>
                <Button variant="ghost" size="sm" onClick={() => toggleAll(false)}>
                  Hide all
                </Button>
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              Use the controls below to curate the analytics workspace for investigations, reviews, or reporting.
            </p>
          </CardHeader>
          <CardContent>
            {isLoadingNotifications ? (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className="bg-muted/60 border border-border/50 rounded-lg px-4 py-6 animate-pulse"
                  >
                    <div className="h-3 w-24 rounded-full bg-border/70" />
                    <div className="mt-3 h-7 w-20 rounded-full bg-border/40" />
                    <div className="mt-2 h-3 w-32 rounded-full bg-border/60" />
                  </div>
                ))}
              </div>
            ) : notificationError ? (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-destructive">
                Unable to load notification metrics. Please refresh to try again.
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <HeroMetric
                  label={summaryPOS === "all" ? "Total Notifications" : `POS ${summaryPOS} Notifications`}
                  primary={heroTotal.toLocaleString()}
                  secondary="Volume captured in the selected window"
                />
                <HeroMetric
                  label="Success Rate"
                  primary={`${heroSuccessRate.toFixed(1)}%`}
                  tone="success"
                  secondary="Delivered notifications across platforms"
                />
                <HeroMetric
                  label="Error Rate"
                  primary={`${heroErrorRate.toFixed(1)}%`}
                  tone="destructive"
                  secondary="Failures reported during delivery"
                />
                <HeroMetric
                  label="Avg Delay"
                  primary={heroAvgDelay < 1 ? `${Math.round(heroAvgDelay * 60)}m` : `${heroAvgDelay.toFixed(1)}h`}
                  secondary="Weighted delay across all alerts"
                />
              </div>
            )}
          </CardContent>
        </Card>

        <section className="space-y-4">
          <SectionToggle
            title="Event Volume Trends"
            visible={visibleSections.eventVolume}
            onToggle={() => toggle("eventVolume")}
          />
          {visibleSections.eventVolume && <EventVolumeChart />}
        </section>

        <section className="space-y-4">
          <SectionToggle
            title="Notification Performance"
            visible={visibleSections.notificationSummary}
            onToggle={() => toggle("notificationSummary")}
          />
          {visibleSections.notificationSummary && (
            <NotificationSummary
              summaryData={notificationSummary}
              isLoading={isLoadingNotifications}
              error={notificationError}
              selectedPOS={summaryPOS}
              onSelectedPOSChange={setSummaryPOS}
            />
          )}
        </section>

        <section className="space-y-4">
          <SectionToggle
            title="Error Trends"
            visible={visibleSections.errorTrends}
            onToggle={() => toggle("errorTrends")}
          />
          {visibleSections.errorTrends && <ErrorTrends />}
        </section>

        <section className="space-y-4">
          <SectionToggle
            title="Detailed Analytics"
            visible={visibleSections.detailedAnalytics}
            onToggle={() => toggle("detailedAnalytics")}
          />
          {visibleSections.detailedAnalytics && <AnalyticsPanel />}
        </section>
      </main>
    </div>
  )
}

function SectionToggle({
  title,
  visible,
  onToggle,
}: {
  title: string
  visible: boolean
  onToggle: () => void
}) {
  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="py-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg font-semibold">{title}</CardTitle>
          <Button variant="ghost" size="sm" onClick={onToggle} className="gap-2">
            {visible ? (
              <>
                <Eye className="h-4 w-4" />
                Hide
              </>
            ) : (
              <>
                <EyeOff className="h-4 w-4" />
                Show
              </>
            )}
          </Button>
        </div>
      </CardHeader>
    </Card>
  )
}

type HeroMetricTone = "default" | "success" | "destructive"

type HeroMetricProps = {
  label: string
  primary: string
  secondary?: string
  tone?: HeroMetricTone
}

function HeroMetric({ label, primary, secondary, tone = "default" }: HeroMetricProps) {
  const containerTone: Record<HeroMetricTone, string> = {
    default: "border-border/60 bg-background",
    success: "border-emerald-500/40 bg-emerald-500/10",
    destructive: "border-destructive/40 bg-destructive/10",
  }

  const valueTone: Record<HeroMetricTone, string> = {
    default: "text-foreground",
    success: "text-emerald-400",
    destructive: "text-destructive",
  }

  return (
    <div
      className={`rounded-lg border px-5 py-5 shadow-sm transition-colors ${containerTone[tone]}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-2 text-3xl font-bold ${valueTone[tone]}`}>{primary}</p>
      {secondary ? (
        <p className="mt-2 text-xs text-muted-foreground">{secondary}</p>
      ) : null}
    </div>
  )
}
