const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
function tok() { try { const r = localStorage.getItem('af-auth'); return r ? JSON.parse(r)?.state?.token ?? null : null } catch { return null } }
async function req<T>(path: string): Promise<T> {
  const t = tok()
  const r = await fetch(`${BASE}${path}`, { headers: { ...(t && { Authorization: `Bearer ${t}` }) } })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

export const pjBenchmarkApi = {
  getPJ:   (segmento: string) => req<Record<string, any>>(`/pj/benchmark/pj/${segmento}`),
  getAgro: (cultura: string)  => req<Record<string, any>>(`/pj/benchmark/agro/${cultura}`),
}
