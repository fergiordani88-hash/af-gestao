import { useState, useEffect } from 'react'
import { dashboardApi } from '../services/api'

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
}

export function useDashboard() {
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    dashboardApi.get()
      .then(setData)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false))
  }, [])

  return { data, loading, error }
}
