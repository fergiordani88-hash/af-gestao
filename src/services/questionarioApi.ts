const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
function tok() { try { const r = localStorage.getItem('af-auth'); return r ? JSON.parse(r)?.state?.token ?? null : null } catch { return null } }
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = tok()
  const r = await fetch(`${BASE}/questionarios${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }), ...opts.headers } })
  if (!r.ok) { const e = await r.json().catch(() => ({ error: 'Erro' })); throw new Error(e.error ?? `HTTP ${r.status}`) }
  if (r.status === 204) return undefined as T
  return r.json()
}

export interface Meta {
  id?: string; clientId: string; tipo: string; indicador: string; label: string
  valorMeta: number; unidade: string; prazo: string; status: string; obs?: string
}

export interface DreProjetado {
  clientId: string; ano: number; mes: number
  receitaBruta: number; cmv: number; despesasFixas: number; folha: number
  proLabore: number; tributos: number; despFinanceiras: number; parcela: number
}

export const questionarioApi = {
  pj: {
    get:       (cid: string) => req<any>(`/pj/${cid}`),
    save:      (d: any)      => req<any>('/pj', { method: 'POST', body: JSON.stringify(d) }),
    saveSecao: (cid: string, secao: string, respostas: Record<string, any>, pct?: number) =>
      req<any>(`/pj/${cid}/secao/${secao}`, { method: 'PATCH', body: JSON.stringify({ respostas, percentualConclusao: pct }) }),
  },
  agro: {
    get:       (cid: string) => req<any>(`/agro/${cid}`),
    save:      (d: any)      => req<any>('/agro', { method: 'POST', body: JSON.stringify(d) }),
    saveSecao: (cid: string, secao: string, respostas: Record<string, any>, pct?: number) =>
      req<any>(`/agro/${cid}/secao/${secao}`, { method: 'PATCH', body: JSON.stringify({ respostas, percentualConclusao: pct }) }),
  },
  metas: {
    list:   (cid: string) => req<Meta[]>(`/metas/${cid}`),
    create: (d: Meta)     => req<Meta>('/metas', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<Meta>) => req<Meta>(`/metas/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
    delete: (id: string)  => req<void>(`/metas/${id}`, { method: 'DELETE' }),
  },
  dreProjetado: {
    list:        (cid: string, ano: number) => req<DreProjetado[]>(`/dre-projetado/${cid}/${ano}`),
    save:        (d: DreProjetado)          => req<DreProjetado>('/dre-projetado', { method: 'POST', body: JSON.stringify(d) }),
    comparativo: (cid: string, ano: number) => req<any[]>(`/dre-comparativo/${cid}/${ano}`),
  },
}
