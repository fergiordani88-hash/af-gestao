import { useState, useEffect, useCallback } from 'react'
import { dashboardApi } from '../services/api'
import type { CalendarEvent, Reminder, StatusSuggestion, ActivityItem } from '../types'

interface DashboardData {
  kpis: {
    totalClients: number
    activeClients: number
    leadsCount: number
    negotiatingCount: number
    monthlyRevenue: number
    annualRevenue: number
    conversionRate: number
  }
  bySegment: Record<string, number>
  byStatus:  Record<string, number>
  recentClients: unknown[]
  actionsByStatus: Record<string, number>
  today: {
    events: CalendarEvent[]
    reminders: Reminder[]
  }
  recentActivity: ActivityItem[]
  statusSuggestions: StatusSuggestion[]
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refetch = useCallback(() => {
    return dashboardApi.get()
      .then((d) => { setData(d as DashboardData); setError(null) })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { refetch() }, [refetch])

  return { data, loading, error, refetch }
}
