// Utilitário compartilhado — geração de parcelas e cálculo de PMT
// Usado por Pay (payStorage) e AF Controle (controleStorage)

export interface ContractBase {
  id: string
  tipo: 'receita' | 'despesa'
  parte: string
  descricao: string
  valor: number
  dataInicio: string
  dataFim?: string
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'pontual'
  diaVencimento: number
  status: 'ativo' | 'encerrado' | 'suspenso'
  obs?: string
  tipoTaxa?: 'prefixada' | 'posfixada'
  taxaAnual?: number      // % a.a. (pré) ou spread sobre indexador (pós)
  indexador?: 'selic' | 'cdi' | 'ipca'
  valorParcela?: number   // PMT calculado — armazenado para exibição
}

export interface InstallmentEntry {
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  dataVenc: string
  status: 'pago' | 'pendente' | 'atrasado' | 'previsto'
  recorrente: boolean
  periodicidade?: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
  contrato?: string
  obs?: string
}

export const PERIOD_MONTHS: Record<string, number> = {
  mensal: 1, trimestral: 3, semestral: 6, anual: 12, pontual: 0,
}

const PERIOD_LABEL: Record<string, string> = {
  mensal: 'mensal', trimestral: 'trimestral', semestral: 'semestral', anual: 'anual',
}

// ── API do Banco Central — Meta SELIC ───────────────────────────
let selicCache: { value: number; ts: number } | null = null

export async function fetchSelicRate(): Promise<number> {
  if (selicCache && Date.now() - selicCache.ts < 3_600_000) return selicCache.value
  try {
    const res = await fetch(
      'https://api.bcb.gov.br/dados/serie/bcdata.sgs.4390/dados/ultimos/1?formato=json',
      { signal: AbortSignal.timeout(5000) }
    )
    const data = await res.json()
    const value = parseFloat(data[0]?.valor ?? '14.75')
    selicCache = { value, ts: Date.now() }
    return value
  } catch {
    return selicCache?.value ?? 14.75
  }
}

// ── Helpers de data ─────────────────────────────────────────────
function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function nthInstallmentDate(start: Date, periodicidade: string, n: number, dia: number): Date {
  const d = new Date(start)
  const months = PERIOD_MONTHS[periodicidade] || 1
  d.setMonth(d.getMonth() + n * months)
  d.setDate(Math.min(dia, daysInMonth(d.getFullYear(), d.getMonth())))
  d.setHours(0, 0, 0, 0)
  return d
}

// ── Cálculo de PMT ──────────────────────────────────────────────
export function calcPMT(
  principal: number,
  annualRatePct: number,
  nPeriods: number,
  periodicidade: string
): number {
  if (nPeriods <= 0) return principal
  if (annualRatePct <= 0) return principal / nPeriods
  const months = PERIOD_MONTHS[periodicidade] || 1
  const r = Math.pow(1 + annualRatePct / 100, months / 12) - 1
  if (r <= 0) return principal / nPeriods
  return (principal * r * Math.pow(1 + r, nPeriods)) / (Math.pow(1 + r, nPeriods) - 1)
}

// ── Contagem de parcelas ────────────────────────────────────────
export function countInstallments(contract: ContractBase): number {
  if (contract.periodicidade === 'pontual') return 1
  if (!contract.dataFim) return 24 // contrato aberto: gera 24 períodos à frente
  const start = new Date(contract.dataInicio)
  const end   = new Date(contract.dataFim)
  const months = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth())
  return Math.max(1, Math.round(months / (PERIOD_MONTHS[contract.periodicidade] || 1)))
}

// ── Geração de parcelas ─────────────────────────────────────────
export function generateInstallments(contract: ContractBase, selicRate = 14.75): InstallmentEntry[] {
  const nPeriods = countInstallments(contract)
  const start    = new Date(contract.dataInicio)
  const end      = contract.dataFim ? new Date(contract.dataFim) : null
  const today    = new Date(); today.setHours(0, 0, 0, 0)

  // Taxa efetiva anual
  let effectiveRate = 0
  if (contract.tipoTaxa === 'prefixada') {
    effectiveRate = contract.taxaAnual ?? 0
  } else if (contract.tipoTaxa === 'posfixada') {
    effectiveRate = selicRate + (contract.taxaAnual ?? 0)
  }

  // Valor da parcela (PMT ou valor simples)
  const pmt = effectiveRate > 0 && nPeriods > 0
    ? calcPMT(contract.valor, effectiveRate, nPeriods, contract.periodicidade)
    : contract.valor
  const valorParcela = Math.round(pmt * 100) / 100

  const totalLabel = nPeriods > 0 ? nPeriods.toString() : '?'
  const entries: InstallmentEntry[] = []

  for (let i = 0; i < nPeriods; i++) {
    const d = nthInstallmentDate(start, contract.periodicidade, i, contract.diaVencimento)
    if (end && d > end) break
    if (contract.periodicidade === 'pontual' && i > 0) break

    entries.push({
      tipo:          contract.tipo,
      categoria:     'Contratos',
      descricao:     `${contract.descricao} — ${contract.parte} (${i + 1}/${totalLabel})`,
      valor:         valorParcela,
      dataVenc:      d.toISOString().slice(0, 10),
      status:        d < today ? 'atrasado' : 'previsto',
      recorrente:    contract.periodicidade !== 'pontual',
      periodicidade: PERIOD_LABEL[contract.periodicidade] as any,
      contrato:      contract.id,
      obs:           `Parcela ${i + 1}/${totalLabel} — contrato ${contract.descricao}`,
    })
  }

  return entries
}
