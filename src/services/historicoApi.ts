const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
function tok() { try { const r = localStorage.getItem('af-auth'); return r ? JSON.parse(r)?.state?.token ?? null : null } catch { return null } }
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = tok()
  const r = await fetch(`${BASE}/historico${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }), ...opts.headers } })
  if (!r.ok) { const e = await r.json().catch(() => ({ error: 'Erro' })); throw new Error(e.error ?? `HTTP ${r.status}`) }
  if (r.status === 204) return undefined as T
  return r.json()
}

export interface SnapshotPJ {
  id?: string; clientId: string; periodo: string; ano: number; mes: number
  receitaBruta: number; cmv: number; despesasFixas: number; folha: number
  proLabore: number; tributos: number; despesasFinanceiras: number; parcela: number
  caixa: number; aReceber: number; estoque: number; dividaTotal: number
  lucBruto?: number; ebitda?: number; lucLiq?: number; sobraCaixa?: number
  margBruta?: number; margEbitda?: number; margLiq?: number; liquidezC?: number
  cobDivida?: number; ncg?: number; peBS?: number; classificacao?: string
  varReceitaBruta?: number | null; varMargLiq?: number | null; varEbitda?: number | null
}

export interface Inadimplencia {
  id?: string; clientId: string; cliente: string; documento?: string
  valor: number; dataVenc: string; diasAtraso?: number; faixa?: string
  status: string; obs?: string
}

export interface DRERural {
  id?: string; clientId: string; safra: string
  recSojaVolume: number; recSojaPreco: number
  recMilhoVolume: number; recMilhoPreco: number
  recFeijaoVolume: number; recFeijaoPreco: number; recOutras: number
  custoAtivTotal: number; totalAreaCusteada: number
  custoSementesHa: number; custoFertilizHa: number; custoDefensivosHa: number
  custoDieselHa: number; custoServicosHa: number; custoOutrosHa: number
  arrendamentoHa: number; areaArrendada: number
  folha: number; proLabore: number; contabilidade: number; energia: number
  internet: number; manutencaoVeic: number; seguros: number; outrasAdmin: number
  despFinanceiras: number; amortizacoes: number; depreciacao: number
  calculado?: {
    recSoja: number; recMilho: number; recFeijao: number; recBruta: number; custoAtiv: number; arrendamento: number
    lucBruto: number; margBruta: number; despAdmin: number; ebitda: number; margEbitda: number
    depreciacao: number; ebit: number; despFin: number; amort: number; lucLiq: number
    sobraCaixa: number; margLiq: number; custoPorHaTotal: number; peVolumeTotal: number; classificacao: string
  }
}

export interface HistoricoSafra {
  id?: string; clientId: string; safra: string; tipo: string
  totalArea: number; totalReceita: number; totalCusto: number; totalResultado: number
  margem: number; revenueHa: number; resultadoHa: number; totalDivida: number; comprometimento: number
  culturas: string; varReceita?: number | null; varMargem?: number | null; varResultadoHa?: number | null
}

export const historicoApi = {
  // PJ - Histórico de indicadores
  salvarSnapshot:  (d: SnapshotPJ) => req<SnapshotPJ>('/pj/snapshot', { method: 'POST', body: JSON.stringify(d) }),
  historicoPJ:     (cid: string)   => req<SnapshotPJ[]>(`/pj/historico/${cid}`),
  comparativoPJ:   (cid: string)   => req<{ atual: SnapshotPJ; anterior: SnapshotPJ | null; mesmoMesAnoPassado: SnapshotPJ | null; evolucao12meses: SnapshotPJ[] } | null>(`/pj/comparativo/${cid}`),
  cicloOperacional:(d: any)        => req<any>('/pj/ciclo-operacional', { method: 'POST', body: JSON.stringify(d) }),

  // PJ - Inadimplência
  listarInadimplencia:  (cid: string) => req<{ items: Inadimplencia[]; resumo: any[]; totalCarteira: number; totalVencido: number; taxaInadimpl: number }>(`/pj/inadimplencia/${cid}`),
  criarInadimplencia:   (d: Inadimplencia) => req<Inadimplencia>('/pj/inadimplencia', { method: 'POST', body: JSON.stringify(d) }),
  atualizarInadimplencia:(id: string, d: Partial<Inadimplencia>) => req<Inadimplencia>(`/pj/inadimplencia/${id}`, { method: 'PATCH', body: JSON.stringify(d) }),
  deletarInadimplencia: (id: string) => req<void>(`/pj/inadimplencia/${id}`, { method: 'DELETE' }),

  // Agro - DRE Rural
  getDRERural:    (cid: string, safra: string) => req<DRERural | null>(`/agro/dre-rural/${cid}/${encodeURIComponent(safra)}`),
  listarDRERural: (cid: string)                => req<DRERural[]>(`/agro/dre-rural/${cid}`),
  salvarDRERural: (d: DRERural)                => req<DRERural>('/agro/dre-rural', { method: 'POST', body: JSON.stringify(d) }),

  // Agro - Histórico de safras
  salvarHistoricoSafra: (d: HistoricoSafra) => req<HistoricoSafra>('/agro/historico-safra', { method: 'POST', body: JSON.stringify(d) }),
  historicoSafras:      (cid: string)       => req<HistoricoSafra[]>(`/agro/historico-safra/${cid}`),
}
