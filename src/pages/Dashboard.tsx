import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"

import { DynamicStatusBar } from "@/components/dashboard/dynamic-status-bar"
import { CriticalAlertsPanel } from "@/components/dashboard/critical-alerts"
import { RealtimeMetrics } from "@/components/dashboard/realtime-metrics"
import { DashboardToggles } from "@/components/dashboard/dashboard-toggles"
import AnalyticsPanel from "@/components/analytics/AnalyticsPanel"
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import GlobalStats from "@/components/dashboard/global-stats"
import POSStatsGrid from "@/components/dashboard/pos-stats-grid"
import ErrorTrends from "@/components/dashboard/error-trends"
import { EventVolumeChart } from "@/components/dashboard/event-volume-chart"
import { Button } from "@/components/ui/button"
import { Link } from "react-router-dom"

export default function DashboardPage() {
  const [showStatusBar, setShowStatusBar] = useState(true)
  const [showRealtime, setShowRealtime] = useState(true)
  const [showAlerts, setShowAlerts] = useState(true)
  const [showGlobalStats, setShowGlobalStats] = useState(true)
  const [showErrorTrends, setShowErrorTrends] = useState(true)
  const [showEventVolume, setShowEventVolume] = useState(true)
  const [showPOSGrid, setShowPOSGrid] = useState(true)
  const [showAnalytics, setShowAnalytics] = useState(false)
  const [enableSounds, setEnableSounds] = useState(false)

  return (
    <div className="bg-muted min-h-screen p-4 md:p-6">
      <main className="container mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <CardTitle className="text-3xl font-bold">PA-Dasher Analytics</CardTitle>
                <CardDescription className="mt-1">
                  Real-time monitoring and analytics dashboard for your POS systems
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 md:flex-row md:items-center md:gap-4">
                <DashboardToggles
                  showStatusBar={showStatusBar}
                  setShowStatusBar={setShowStatusBar}
                  showRealtime={showRealtime}
                  setShowRealtime={setShowRealtime}
                  showAlerts={showAlerts}
                  setShowAlerts={setShowAlerts}
                  enableSounds={enableSounds}
                  setEnableSounds={setEnableSounds}
                />
                <Button asChild variant="outline" className="whitespace-nowrap">
                  <Link to="/analytics">Go to Analytics</Link>
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {showStatusBar && (
          <div className="transition-all duration-300">
            <DynamicStatusBar enableSounds={enableSounds} />
          </div>
        )}

        <div className="space-y-4">
          <SectionToggle
            title="Real-Time Monitoring"
            visible={showRealtime || showAlerts}
            onToggle={() => {
              const next = !(showRealtime || showAlerts)
              setShowRealtime(next)
              setShowAlerts(next)
            }}
          />

          {(showRealtime || showAlerts) && (
            <div className="grid gap-6 lg:grid-cols-2">
              {showRealtime && (
                <div className="lg:col-span-2">
                  <RealtimeMetrics />
                </div>
              )}
              {showAlerts && (
                <div className="lg:col-span-2">
                  <CriticalAlertsPanel />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="space-y-4">
          <SectionToggle
            title="Global Statistics"
            visible={showGlobalStats}
            onToggle={() => setShowGlobalStats((value) => !value)}
          />
          {showGlobalStats && <GlobalStats />}
        </div>

        <div className="space-y-4">
          <SectionToggle
            title="Error Trends & Analysis"
            visible={showErrorTrends}
            onToggle={() => setShowErrorTrends((value) => !value)}
          />
          {showErrorTrends && <ErrorTrends />}
        </div>

        <div className="space-y-4">
          <SectionToggle
            title="Event Volume Trends"
            visible={showEventVolume}
            onToggle={() => setShowEventVolume((value) => !value)}
          />
          {showEventVolume && <EventVolumeChart />}
        </div>

        <div className="space-y-4">
          <SectionToggle
            title="POS Systems Overview"
            visible={showPOSGrid}
            onToggle={() => setShowPOSGrid((value) => !value)}
          />
          {showPOSGrid && <POSStatsGrid />}
        </div>

        <div className="space-y-4">
          <SectionToggle
            title="Advanced Analytics & Reports"
            visible={showAnalytics}
            onToggle={() => setShowAnalytics((value) => !value)}
          />
          {showAnalytics && <AnalyticsPanel />}
        </div>
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
