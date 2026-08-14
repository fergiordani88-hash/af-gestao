// Serviço de API para o módulo Agro Completo

const BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

function tok() {
  try {
    const raw = localStorage.getItem('af-auth')
    return raw ? JSON.parse(raw)?.state?.token ?? null : null
  } catch { return null }
}

async function req<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const token = tok()
  const res = await fetch(`${BASE}/agro${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...opts.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }
  if (res.status === 204) return undefined as T
  return res.json()
}

// ── Types ──────────────────────────────────────────────────────
export interface CustoItem {
  categoria: string   // 'Sementes' | 'Fertilizantes' | 'Defensivos' | etc.
  valorHa: number     // sacas/ha (mesma unidade que custoPorHa)
}

export interface AgroProducao {
  id?: string; clientId: string; safra: string; tipo: string
  cultura: string; ordem: string; cotacao: number; area: number
  produtividade: number; custoPorHa: number; areaArrendada: number; custoArrendHa: number
  dataPagamento?: string
  dataColheita?: string
  custoItens?: CustoItem[]
}

export interface AgroContrato {
  id?: string; clientId: string; modalidade: string; banco: string
  numeroContrato?: string; dataContratacao: string; valorTomado: number
  totalParcelas: number; parcelaAtual: number; periodicidade: string
  taxa: number; vencimento: string; valorParcela: number; obs?: string
  indexador?: string
  spreadIndexador?: number
  sistemaAmortizacao?: string
  tomador?: string
  cronograma?: { numeroParcela: number; dataVencimento: string; valor: number; pago?: boolean }[]
}

export interface AgroParcela {
  contratoId: string; modalidade: string; banco: string; contrato: string
  dataContratacao: string; valorTomado: number; totalParcelas: number
  parcelaNum: number; periodicidade: string; taxa: number; vencimento: string; valorParcela: number
  indexador?: string; amortizacao?: number; juros?: number; saldoDevedor?: number
}

export interface AgroDespesa {
  id?: string; clientId: string; data: string; tipo: string
  origem: string; descricao: string; valor: number
}

export interface AgroReceita {
  id?: string; clientId: string; data: string; origem: string
  tipo: string; descricao: string; valor: number
}

export interface AgroCustoFixo {
  id?: string; clientId: string; categoria: string; item: string; valorMensal: number; diaVencimento?: number
}

export interface AgroPatrimonio {
  id?: string; clientId: string; categoria: string; descricao: string
  identificacao?: string; valorAvaliado: number; possuiOnus: boolean
  tipoOnus?: string; credor?: string; valorOnus: number; obs?: string
}

export interface AgroPecuariaLote {
  id?: string; clientId: string; categoria: string; quantidade: number
  idadeMediaMeses: number; pesoMedioKg: number; raca?: string; obs?: string
}

export interface AgroPecuariaConfig {
  id?: string; clientId?: string
  sistema: string; areaTotal: number; forrageira: string; lotacaoReferencia: number
  fatorSeca: number; estadoPasto: string; silagem?: number
  rotacao?: { numeroPiquetes: number; areaPorPiquete: number; diasOcupacaoChuva: number; diasOcupacaoSeca: number; diasDescansoChuva: number; diasDescansoSeca: number } | null
  suplementos: { id: string; tipo: string; consumoGDiaCab: number; custoKg: number; mesesAplicacao: number[] }[]
  ciclo: string; taxaPrenhez: number; taxaNatalidade: number; taxaMortalidadeBezerro: number
  taxaDesmame: number; idadeDesmameMeses: number; pesoDesmameKg: number; pesoAbateKg: number
  rendimentoCarcaca: number; arrobasAbate: number; idadeAbateMeses: number; taxaDescarteAnual: number
  diasConfinamento: number; ganhoMedioDiario: number; praca: string
  precoBoiGordoArroba: number; precoBezerroCabeca: number; precoGarroteCabeca: number
  precoVacaDescarteCabeca: number; dataPrecos?: string
  vacinacaoAftosaAnoCab: number; vacinacaoBrucelaAnoCab: number; vermifugacaoAnoCab: number
  outrosSanidadeAnoCab: number; manutencaoPastagemHaAno: number; reformaPastagemHa: number
  percentualReformaAno: number; areaArrendadaHa: number; custoArrendamentoHaAno: number
  numFuncionarios: number; salarioMedioMensal: number; encargosPct: number
  combustivelMensal: number; manutencaoEquipMensal: number; outrosMensal: number
}

export interface FluxoItem {
  data: string; mov: string; tipo: string; origem: string; descricao: string
  valor: number; saldoFinal: number; id?: string
}

export interface FluxoMensal {
  mes: string; saldoInicial: number; entradas: number; saidas: number; saldoFinal: number
}

// ── API calls ─────────────────────────────────────────────────
export const agroApi = {
  // Produção
  producao: {
    list:   (cid: string) => req<AgroProducao[]>(`/producao/${cid}`),
    create: (d: AgroProducao) => req<AgroProducao>('/producao', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<AgroProducao>) => req<AgroProducao>(`/producao/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/producao/${id}`, { method: 'DELETE' }),
  },

  // Contratos
  contratos: {
    list:       (cid: string) => req<AgroContrato[]>(`/contratos/${cid}`),
    cronograma: (cid: string) => req<{ parcelas: AgroParcela[]; porAno: Record<string, { parcelas: number; total: number; juros: number; amortizacao: number }>; totalEndividamento: number; totalFuturo: number; totalContratos: number }>(`/cronograma/${cid}`),
    create:     (d: AgroContrato) => req<AgroContrato>('/contratos', { method: 'POST', body: JSON.stringify(d) }),
    update:     (id: string, d: Partial<AgroContrato>) => req<AgroContrato>(`/contratos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete:     (id: string) => req<void>(`/contratos/${id}`, { method: 'DELETE' }),
  },

  // Despesas anuais (para projeção)
  despesasAnuais: (cid: string) =>
    req<Record<number, { custoAtiv: number; despAdmin: number; total: number }>>(`/despesas-anuais/${cid}`),

  // Despesas
  despesas: {
    list:   (cid: string) => req<AgroDespesa[]>(`/despesas/${cid}`),
    create: (d: AgroDespesa) => req<AgroDespesa>('/despesas', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<AgroDespesa>) => req<AgroDespesa>(`/despesas/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/despesas/${id}`, { method: 'DELETE' }),
  },

  // Receitas
  receitas: {
    list:   (cid: string) => req<AgroReceita[]>(`/receitas/${cid}`),
    create: (d: AgroReceita) => req<AgroReceita>('/receitas', { method: 'POST', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/receitas/${id}`, { method: 'DELETE' }),
  },

  // Custos fixos
  custosFixos: {
    list:   (cid: string) => req<AgroCustoFixo[]>(`/custos-fixos/${cid}`),
    create: (d: AgroCustoFixo) => req<AgroCustoFixo>('/custos-fixos', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<AgroCustoFixo>) => req<AgroCustoFixo>(`/custos-fixos/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/custos-fixos/${id}`, { method: 'DELETE' }),
  },

  // Patrimônio
  patrimonio: {
    list:   (cid: string) => req<AgroPatrimonio[]>(`/patrimonio/${cid}`),
    create: (d: AgroPatrimonio) => req<AgroPatrimonio>('/patrimonio', { method: 'POST', body: JSON.stringify(d) }),
    update: (id: string, d: Partial<AgroPatrimonio>) => req<AgroPatrimonio>(`/patrimonio/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    delete: (id: string) => req<void>(`/patrimonio/${id}`, { method: 'DELETE' }),
  },

  pecuaria: {
    get: (cid: string) => req<{ lotes: AgroPecuariaLote[]; config: AgroPecuariaConfig | null }>(`/pecuaria/${cid}`),
    saveConfig: (cid: string, d: Partial<AgroPecuariaConfig>) => req<AgroPecuariaConfig>(`/pecuaria/${cid}/config`, { method: 'PUT', body: JSON.stringify(d) }),
    createLote: (d: AgroPecuariaLote) => req<AgroPecuariaLote>('/pecuaria/lotes', { method: 'POST', body: JSON.stringify(d) }),
    updateLote: (id: string, d: Partial<AgroPecuariaLote>) => req<AgroPecuariaLote>(`/pecuaria/lotes/${id}`, { method: 'PUT', body: JSON.stringify(d) }),
    deleteLote: (id: string) => req<void>(`/pecuaria/lotes/${id}`, { method: 'DELETE' }),
  },

  // Fluxos
  fluxoDiario: (cid: string, saldoInicial = 0) =>
    req<{ fluxo: FluxoItem[]; saldoInicial: number; saldoFinal: number }>(`/fluxo-diario/${cid}?saldoInicial=${saldoInicial}`),
  fluxoMensal: (cid: string, saldoInicial = 0) =>
    req<{ mensal: FluxoMensal[]; porAno: Record<string, { entradas: number; saidas: number; resultado: number }>; saldoFinal: number }>(`/fluxo-mensal/${cid}?saldoInicial=${saldoInicial}`),

  // Importação de cadastro via PDF
  cadastroImport: {
    preview: async (form: FormData) => {
      const token = tok()
      const res = await fetch(`${BASE}/agro/cadastro/preview`, {
        method: 'POST',
        headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: form,
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.error ?? `HTTP ${res.status}`) }
      return res.json()
    },
    confirm: (body: { clientId: string; patrimonio: any[]; producao: any[]; contratos: any[] }) =>
      req<{ patrimonioImportado: number; patrimonioErros: number; producaoImportada: number; producaoErros: number; contratosImportados: number; contratosErros: number; erros?: string[] }>(
        '/cadastro/confirm', { method: 'POST', body: JSON.stringify(body) }
      ),
  },
}
