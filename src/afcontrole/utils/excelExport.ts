import * as XLSX from 'xlsx'
import type { ControleEntry } from '../storage/controleStorage'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('pt-BR') : ''

export interface ReportFilter {
  dataInicio?: string; dataFim?: string
  tipo?: 'receita' | 'despesa' | 'ambos'
  categoria?: string; status?: string
  valorMin?: number; valorMax?: number
}

function filterEntries(entries: ControleEntry[], f: ReportFilter): ControleEntry[] {
  return entries.filter(e => {
    if (f.tipo && f.tipo !== 'ambos' && e.tipo !== f.tipo) return false
    if (f.categoria && e.categoria !== f.categoria) return false
    if (f.status && e.status !== f.status) return false
    if (f.valorMin !== undefined && e.valor < f.valorMin) return false
    if (f.valorMax !== undefined && e.valor > f.valorMax) return false
    if (f.dataInicio && e.dataVenc < f.dataInicio) return false
    if (f.dataFim && e.dataVenc > f.dataFim) return false
    return true
  })
}

export function exportExcel(entries: ControleEntry[], filter: ReportFilter, title = 'AF Controle') {
  const filtered = filterEntries(entries, filter)

  const wb = XLSX.utils.book_new()

  // ── Aba Resumo ──────────────────────────────────────────────
  const receitas = filtered.filter(e => e.tipo === 'receita')
  const despesas = filtered.filter(e => e.tipo === 'despesa')
  const totRec   = receitas.reduce((s, e) => s + e.valor, 0)
  const totDesp  = despesas.reduce((s, e) => s + e.valor, 0)

  const resumo = [
    ['AF Controle — Relatório Financeiro'],
    ['Gerado em', new Date().toLocaleString('pt-BR')],
    [],
    ['Indicador', 'Valor'],
    ['Total Receitas', totRec],
    ['Total Despesas', totDesp],
    ['Resultado', totRec - totDesp],
    ['Margem Líquida', totRec > 0 ? `${((totRec - totDesp) / totRec * 100).toFixed(1)}%` : '0%'],
    ['Qtd. Receitas', receitas.length],
    ['Qtd. Despesas', despesas.length],
    ['Qtd. Total', filtered.length],
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(resumo), 'Resumo')

  // ── Aba Lançamentos ─────────────────────────────────────────
  const lancRows = [
    ['Data Venc.','Tipo','Categoria','Descrição','Valor','Status','Data Pag.','Observação'],
    ...filtered.map(e => [
      fmtDate(e.dataVenc), e.tipo, e.categoria, e.descricao,
      e.valor, e.status, fmtDate(e.dataPag ?? ''), e.obs ?? ''
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(lancRows), 'Lançamentos')

  // ── Aba Por Categoria ───────────────────────────────────────
  const catMap: Record<string, { receita: number; despesa: number; qtd: number }> = {}
  filtered.forEach(e => {
    if (!catMap[e.categoria]) catMap[e.categoria] = { receita: 0, despesa: 0, qtd: 0 }
    catMap[e.categoria][e.tipo] += e.valor
    catMap[e.categoria].qtd++
  })
  const catRows = [
    ['Categoria','Receitas','Despesas','Resultado','Qtd. Lançamentos'],
    ...Object.entries(catMap).sort((a, b) => (b[1].receita + b[1].despesa) - (a[1].receita + a[1].despesa)).map(
      ([cat, v]) => [cat, v.receita, v.despesa, v.receita - v.despesa, v.qtd]
    )
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(catRows), 'Por Categoria')

  // ── Aba Receitas ────────────────────────────────────────────
  const recRows = [
    ['Data Venc.','Categoria','Descrição','Valor','Status','Data Pag.'],
    ...receitas.sort((a, b) => a.dataVenc.localeCompare(b.dataVenc)).map(e => [
      fmtDate(e.dataVenc), e.categoria, e.descricao, e.valor, e.status, fmtDate(e.dataPag ?? '')
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(recRows), 'Receitas')

  // ── Aba Despesas ────────────────────────────────────────────
  const despRows = [
    ['Data Venc.','Categoria','Descrição','Valor','Status','Data Pag.'],
    ...despesas.sort((a, b) => a.dataVenc.localeCompare(b.dataVenc)).map(e => [
      fmtDate(e.dataVenc), e.categoria, e.descricao, e.valor, e.status, fmtDate(e.dataPag ?? '')
    ])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(despRows), 'Despesas')

  XLSX.writeFile(wb, `${title.replace(/\s+/g,'_')}_${new Date().toISOString().slice(0,10)}.xlsx`)
}

export function exportProjectionExcel(history: any[], projections: any[]) {
  const wb = XLSX.utils.book_new()

  const histRows = [
    ['Mês','Receita','Despesa','Resultado'],
    ...history.map(h => [h.mes, h.receita, h.despesa, h.resultado])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(histRows), 'Histórico')

  const projRows = [
    ['Mês (Projeção)','Receita Estimada','Despesa Estimada','Resultado Estimado'],
    ...projections.map(p => [p.mes, p.receita, p.despesa, p.resultado])
  ]
  XLSX.utils.book_append_sheet(wb, XLSX.utils.aoa_to_sheet(projRows), 'Projeções')

  XLSX.writeFile(wb, `AF_Controle_Projecoes_${new Date().toISOString().slice(0,10)}.xlsx`)
}
