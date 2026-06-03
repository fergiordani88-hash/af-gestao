const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'
function tok() { try { const r = localStorage.getItem('af-auth'); return r ? JSON.parse(r)?.state?.token ?? null : null } catch { return null } }
async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const t = tok()
  const r = await fetch(`${BASE}/pj${path}`, { ...opts, headers: { 'Content-Type': 'application/json', ...(t && { Authorization: `Bearer ${t}` }), ...opts.headers } })
  if (!r.ok) { const e = await r.json().catch(() => ({ error: 'Erro' })); throw new Error(e.error ?? `HTTP ${r.status}`) }
  if (r.status === 204) return undefined as T
  return r.json()
}

export interface PJDRE {
  id?: string; clientId: string; periodo?: string
  receitaBruta: number; cmv: number; despesasFixas: number; folha: number
  proLabore: number; tributos: number; despesasFinanceiras: number; parcela: number
  caixa: number; aReceber: number; estoque: number; aFornecedores: number
  dividaTotal: number; dividaCP: number; diasEstoque: number; lucroInformadoSocio: number
}
export interface PJIndicadores {
  lucBruto: number; despOp: number; ebitda: number; lucLiq: number
  amortizacao: number; sobraCaixa: number; margBruta: number; margEbitda: number
  margLiq: number; ncg: number; liquidezC: number; liquidezS: number; cobDivida: number; peBS: number
}
export interface PJRecebimento { id?: string; clientId: string; forma: string; percentual: number; prazoMedio: number; parcelas: number; obs?: string }
export interface PJPagamento   { id?: string; clientId: string; forma: string; percentual: number; prazoMedio: number; parcelas: number; obs?: string }
export interface PJContrato    { id?: string; clientId: string; modalidade: string; banco: string; numeroContrato?: string; dataContratacao: string; valorTomado: number; totalParcelas: number; parcelaAtual: number; periodicidade: string; taxa: number; vencimento: string; valorParcela: number; obs?: string }
export interface PJDespesa     { id?: string; clientId: string; data: string; tipo: string; origem: string; descricao: string; valor: number }
export interface PJReceita     { id?: string; clientId: string; data: string; origem: string; tipo: string; descricao: string; valor: number }
export interface PJCustoFixo   { id?: string; clientId: string; categoria: string; item: string; valorMensal: number }

export const pjApi = {
  dre: {
    get:         (cid: string) => req<PJDRE | null>(`/dre/${cid}`),
    indicadores: (cid: string) => req<{ dre: PJDRE; indicadores: PJIndicadores } | null>(`/dre/${cid}/indicadores`),
    save:        (d: PJDRE)    => req<{ indicadores: PJIndicadores }>('/dre', { method: 'POST', body: JSON.stringify(d) }),
  },
  recebimentos: {
    list:   (cid: string) => req<PJRecebimento[]>(`/recebimentos/${cid}`),
    create: (d: PJRecebimento) => req<PJRecebimento>('/recebimentos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<PJRecebimento>) => req<PJRecebimento>(`/recebimentos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/recebimentos/${id}`, { method: 'DELETE' }),
  },
  pagamentos: {
    list:   (cid: string) => req<PJPagamento[]>(`/pagamentos/${cid}`),
    create: (d: PJPagamento) => req<PJPagamento>('/pagamentos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<PJPagamento>) => req<PJPagamento>(`/pagamentos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/pagamentos/${id}`, { method: 'DELETE' }),
  },
  contratos: {
    list:       (cid: string) => req<PJContrato[]>(`/contratos/${cid}`),
    cronograma: (cid: string) => req<any>(`/cronograma/${cid}`),
    create:     (d: PJContrato) => req<PJContrato>('/contratos', { method: 'POST', body: JSON.stringify(d) }),
    update:     (id: string, d: Partial<PJContrato>) => req<PJContrato>(`/contratos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete:     (id: string) => req<void>(`/contratos/${id}`, { method: 'DELETE' }),
  },
  despesas: {
    list:   (cid: string) => req<PJDespesa[]>(`/despesas/${cid}`),
    create: (d: PJDespesa) => req<PJDespesa>('/despesas', { method: 'POST', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/despesas/${id}`, { method: 'DELETE' }),
  },
  receitas: {
    list:   (cid: string) => req<PJReceita[]>(`/receitas/${cid}`),
    create: (d: PJReceita) => req<PJReceita>('/receitas', { method: 'POST', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/receitas/${id}`, { method: 'DELETE' }),
  },
  custosFixos: {
    list:   (cid: string) => req<PJCustoFixo[]>(`/custos-fixos/${cid}`),
    create: (d: PJCustoFixo) => req<PJCustoFixo>('/custos-fixos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<PJCustoFixo>) => req<PJCustoFixo>(`/custos-fixos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/custos-fixos/${id}`, { method: 'DELETE' }),
  },
  fluxoDiario: (cid: string, saldoInicial = 0) => req<any>(`/fluxo-diario/${cid}?saldoInicial=${saldoInicial}`),
  fluxoMensal: (cid: string, saldoInicial = 0) => req<any>(`/fluxo-mensal/${cid}?saldoInicial=${saldoInicial}`),
  stressTest: {
    get:          (cid: string) => req<any>(`/stress-test/${cid}`),
    savePremissas:(d: any)      => req<any>('/stress-test/premissas', { method: 'POST', body: JSON.stringify(d) }),
  },
}
