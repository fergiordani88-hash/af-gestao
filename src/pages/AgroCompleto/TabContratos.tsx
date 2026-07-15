import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, AlertTriangle, FileUp, Loader2, TableProperties, Filter, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import { agroApi, type AgroContrato, type AgroParcela } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'
import { clsx } from 'clsx'

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const MODALIDADES = ['Capital de giro', 'Rotativo', 'Repactuação', 'Custeio', 'Investimento', 'Investimento CDI', 'BNDES Finame', 'BNDES', 'FCO', 'CPR', 'Moderfrota', 'Outros']
const PERIODICIDADES = ['Mensal', 'Semestral', 'Anual', 'Trimestral', 'Único']

const INDEXADORES = ['Pré-fixado', 'CDI', 'SELIC', 'IPCA', 'TR']

// Taxas de referência vigentes (% a.a.) — atualizar conforme divulgação oficial
const TAXAS_REF: Record<string, number> = {
  CDI:  14.75, // Meta SELIC/CDI — COPOM jul/2025
  SELIC: 14.75,
  IPCA:  5.48, // IPCA acumulado 12 meses jun/2025 — IBGE
  TR:    0.88, // TR estimada — BACEN jul/2025
}
const taxaRef = (idx?: string) => TAXAS_REF[idx ?? ''] ?? 0

const SISTEMAS_AMORT = ['Price', 'SAC']

const EMPTY: Omit<AgroContrato, 'id'> = {
  clientId: '', modalidade: 'Capital de giro', banco: '', numeroContrato: '',
  dataContratacao: '', valorTomado: 0, totalParcelas: 1, parcelaAtual: 1,
  periodicidade: 'Mensal', taxa: 0, vencimento: '', valorParcela: 0, obs: '',
  indexador: 'Pré-fixado', spreadIndexador: 0, sistemaAmortizacao: 'Price',
}

// Calcula PMT (Price): parcela constante
function calcPMT(pv: number, taxaAnual: number, n: number, periodicidade: string): number {
  const np = periodicidade === 'Mensal' ? 12 : periodicidade === 'Semestral' ? 2 : periodicidade === 'Trimestral' ? 4 : 1
  const i = Math.pow(1 + taxaAnual, 1 / np) - 1
  if (i === 0) return pv / n
  return pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
}

// Calcula primeira parcela SAC (maior, pois juros sobre saldo cheio)
function calcPrimeiraSAC(pv: number, taxaAnual: number, n: number, periodicidade: string): number {
  const np = periodicidade === 'Mensal' ? 12 : periodicidade === 'Semestral' ? 2 : periodicidade === 'Trimestral' ? 4 : 1
  const i = Math.pow(1 + taxaAnual, 1 / np) - 1
  return pv / n + pv * i
}

// Calcula parcela SAC na posição k (k = parcelaAtual - 1 parcelas já pagas)
function calcParcelaAtualSAC(c: AgroContrato): number {
  if (!c.valorTomado || !c.totalParcelas || !c.taxa) return c.valorParcela
  const np = c.periodicidade === 'Mensal' ? 12 : c.periodicidade === 'Semestral' ? 2 : c.periodicidade === 'Trimestral' ? 4 : 1
  const i = Math.pow(1 + c.taxa, 1 / np) - 1
  const amort = c.valorTomado / c.totalParcelas
  const k = (c.parcelaAtual || 1) - 1
  const saldo = c.valorTomado - amort * k
  return amort + saldo * i
}

// Custo Efetivo Total anual: taxa contratual + índice de referência (quando pós-fixado)
function calcCET(taxa: number, indexador: string | undefined, spread: number | undefined): number {
  // Pós-fixado: CET = taxa_referência + spread (taxa nominal ignorada, igual ao backend)
  if (indexador && indexador !== 'Pré-fixado') return taxaRef(indexador) + (spread ?? 0) * 100
  // Pré-fixado: CET = taxa nominal
  return taxa * 100
}

// Estima valor futuro da parcela corrigida pelo indexador
function calcParcelaCorrigida(valorParcela: number, indexador: string | undefined, spread: number | undefined, periodicidade: string): number {
  if (!valorParcela || !indexador || indexador === 'Pré-fixado') return valorParcela
  const periodos = periodicidade === 'Mensal' ? 12 : periodicidade === 'Semestral' ? 2 : 1
  const taxaAnual = taxaRef(indexador) / 100 + (spread ?? 0)
  const taxaPeriodo = Math.pow(1 + taxaAnual, 1 / periodos) - 1
  return valorParcela * (1 + taxaPeriodo)
}

function ContratoModal({ contrato, clientId, onClose, onSaved, prefill }: {
  contrato?: AgroContrato; clientId: string; onClose: () => void; onSaved: () => void; prefill?: Partial<AgroContrato>
}) {
  const [form, setForm] = useState<Omit<AgroContrato, 'id'>>(
    contrato ? { ...contrato } : { ...EMPTY, clientId, ...prefill }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof AgroContrato, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.banco || !form.dataContratacao || !form.vencimento || !form.valorTomado) {
      setError('Preencha banco, datas e valor tomado')
      return
    }
    setSaving(true); setError('')
    try {
      if (contrato?.id) await agroApi.contratos.update(contrato.id, form)
      else await agroApi.contratos.create(form as AgroContrato)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{contrato ? 'Editar Contrato' : 'Novo Contrato de Crédito'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Modalidade *</label>
            <select className={inp} value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Banco / Instituição *</label>
            <input className={inp} value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: SICOOB, Bradesco, BB" />
          </div>
          <div>
            <label className={lbl}>Nº do Contrato</label>
            <input className={inp} value={form.numeroContrato ?? ''} onChange={e => set('numeroContrato', e.target.value)} placeholder="Ex: 842709" />
          </div>
          <div>
            <label className={lbl}>Data de Contratação *</label>
            <input type="date" className={inp} value={form.dataContratacao?.toString().split('T')[0] ?? ''} onChange={e => set('dataContratacao', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Valor Tomado (R$) *</label>
            <input type="number" className={inp} value={form.valorTomado || ''} onChange={e => set('valorTomado', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Total de Parcelas</label>
            <input type="number" className={inp} value={form.totalParcelas || ''} onChange={e => set('totalParcelas', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Parcela Atual (nº)</label>
            <input type="number" className={inp} value={form.parcelaAtual || ''} onChange={e => set('parcelaAtual', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Periodicidade</label>
            <select className={inp} value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>
              {PERIODICIDADES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Taxa nominal (% a.a.)</label>
            <input type="number" step="0.01" className={inp} value={form.taxa ? (form.taxa * 100).toFixed(4) : ''} onChange={e => set('taxa', Number(e.target.value) / 100)} placeholder="Ex: 9.5 para 9,5% a.a." />
          </div>
          <div>
            <label className={lbl}>Indexador</label>
            <select className={inp} value={form.indexador ?? 'Pré-fixado'} onChange={e => set('indexador', e.target.value)}>
              {INDEXADORES.map(i => <option key={i}>{i}</option>)}
            </select>
          </div>
          {form.indexador && form.indexador !== 'Pré-fixado' && (
            <div className="col-span-2 bg-amber-50 border border-amber-200 rounded-xl p-3 grid grid-cols-2 gap-3">
              <div>
                <label className={lbl}>Spread sobre {form.indexador} (% a.a.)</label>
                <input type="number" step="0.01" className={inp} value={form.spreadIndexador ? (form.spreadIndexador * 100).toFixed(2) : ''} onChange={e => set('spreadIndexador', Number(e.target.value) / 100)} placeholder="Ex: 2.5 para 2,5% a.a." />
              </div>
              <div>
                <label className={lbl}>{form.indexador} atual usado no cálculo (% a.a.)</label>
                <input type="number" step="0.01" className={`${inp} bg-gray-100`} value={taxaRef(form.indexador)} readOnly />
                <p className="text-xs text-amber-700 mt-1">CET estimado: {calcCET(form.taxa, form.indexador, form.spreadIndexador).toFixed(2)}% a.a.</p>
              </div>
            </div>
          )}
          {/* Sistema de Amortização — só para pré-fixados; pós-fixados sempre SAC */}
          {(!form.indexador || form.indexador === 'Pré-fixado') && (
            <div className="col-span-2">
              <label className={lbl}>Sistema de Amortização</label>
              <div className="flex gap-3">
                {SISTEMAS_AMORT.map(s => (
                  <button key={s} type="button"
                    onClick={() => set('sistemaAmortizacao', s)}
                    className={`flex-1 py-2 rounded-xl text-sm font-semibold border transition-colors ${
                      form.sistemaAmortizacao === s
                        ? 'bg-af-green text-white border-af-green'
                        : 'bg-white text-gray-600 border-gray-200 hover:border-af-green'
                    }`}>
                    {s === 'Price' ? 'Price (parcela fixa)' : 'SAC (amort. constante)'}
                  </button>
                ))}
              </div>
              {/* Preview da parcela calculada */}
              {form.valorTomado > 0 && form.totalParcelas > 0 && form.taxa > 0 && (
                <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded-lg px-3 py-2 flex gap-4">
                  {form.sistemaAmortizacao === 'Price' ? (
                    <span>Parcela fixa estimada: <strong className="text-af-green">
                      {calcPMT(form.valorTomado, form.taxa, form.totalParcelas, form.periodicidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </strong></span>
                  ) : (
                    <>
                      <span>1ª parcela (maior): <strong className="text-af-green">
                        {calcPrimeiraSAC(form.valorTomado, form.taxa, form.totalParcelas, form.periodicidade).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong></span>
                      <span>Amort. fixa: <strong>
                        {(form.valorTomado / form.totalParcelas).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                      </strong></span>
                    </>
                  )}
                </div>
              )}
            </div>
          )}
          <div>
            <label className={lbl}>Vencimento da Próxima Parcela *</label>
            <input type="date" className={inp} value={form.vencimento?.toString().split('T')[0] ?? ''} onChange={e => set('vencimento', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Valor da Parcela (R$) {form.sistemaAmortizacao === 'SAC' ? '— 1ª parcela' : ''}</label>
            <input type="number" className={inp} value={form.valorParcela || ''} onChange={e => set('valorParcela', Number(e.target.value))} /></div>
          <div className="col-span-2">
            <label className={lbl}>Observações</label>
            <input className={inp} value={form.obs ?? ''} onChange={e => set('obs', e.target.value)} placeholder="Garantias, condições especiais, etc." />
          </div>
        </div>

        {error && <p className="px-6 pb-2 text-sm text-red-600 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>}

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-af-green hover:bg-af-green-light disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm">
            {saving ? 'Salvando...' : contrato ? 'Salvar alterações' : 'Adicionar contrato'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export function TabContratos({ clientId }: { clientId: string }) {
  const [contratos, setContratos] = useState<AgroContrato[]>([])
  const [cronograma, setCronograma] = useState<{ parcelas: AgroParcela[]; porAno: Record<string, { parcelas: number; total: number }>; totalEndividamento: number; totalFuturo: number }>()
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AgroContrato | 'new' | null>(null)
  const [prefill, setPrefill] = useState<Partial<AgroContrato> | undefined>()
  const [importing, setImporting] = useState(false)
  const [importMsg, setImportMsg] = useState('')
  const [prefillQueue, setPrefillQueue] = useState<Partial<AgroContrato>[]>([])
  const [queueTotal, setQueueTotal] = useState(0)
  const fileRef = useRef<HTMLInputElement>(null)
  const [anoExpandido, setAnoExpandido] = useState<string | null>(null)
  const [contratoExpandido, setContratoExpandido] = useState<string | null>(null)

  // Filtros
  const [showFilters, setShowFilters] = useState(false)
  const [filterBanco, setFilterBanco] = useState('')
  const [filterModalidade, setFilterModalidade] = useState('')
  const [filterValorMin, setFilterValorMin] = useState('')
  const [filterValorMax, setFilterValorMax] = useState('')
  const [filterCETMax, setFilterCETMax] = useState('')
  const [filterVencAte, setFilterVencAte] = useState('')

  // Ordenação
  type SortKey = 'modalidade' | 'banco' | 'numeroContrato' | 'dataContratacao' | 'valorTomado' | 'totalParcelas' | 'parcelaAtual' | 'periodicidade' | 'sistemaAmortizacao' | 'cet' | 'vencimento' | 'valorParcela'
  const [sortKey, setSortKey] = useState<SortKey | null>(null)
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortKey(key); setSortDir('asc') }
  }

  const contratosFiltrados = contratos
    .filter(c => {
      if (filterBanco && !c.banco.toLowerCase().includes(filterBanco.toLowerCase())) return false
      if (filterModalidade && c.modalidade !== filterModalidade) return false
      if (filterValorMin && c.valorTomado < Number(filterValorMin)) return false
      if (filterValorMax && c.valorTomado > Number(filterValorMax)) return false
      if (filterCETMax && calcCET(c.taxa, c.indexador, c.spreadIndexador) > Number(filterCETMax)) return false
      if (filterVencAte && new Date(c.vencimento) > new Date(filterVencAte)) return false
      return true
    })
    .sort((a, b) => {
      if (!sortKey) return 0
      let va: string | number = 0
      let vb: string | number = 0
      if (sortKey === 'cet') {
        va = calcCET(a.taxa, a.indexador, a.spreadIndexador)
        vb = calcCET(b.taxa, b.indexador, b.spreadIndexador)
      } else if (sortKey === 'valorParcela') {
        va = a.sistemaAmortizacao === 'SAC' && (!a.indexador || a.indexador === 'Pré-fixado') ? calcParcelaAtualSAC(a) : a.valorParcela
        vb = b.sistemaAmortizacao === 'SAC' && (!b.indexador || b.indexador === 'Pré-fixado') ? calcParcelaAtualSAC(b) : b.valorParcela
      } else {
        va = a[sortKey] ?? ''
        vb = b[sortKey] ?? ''
      }
      if (va < vb) return sortDir === 'asc' ? -1 : 1
      if (va > vb) return sortDir === 'asc' ? 1 : -1
      return 0
    })

  const filtrosAtivos = [filterBanco, filterModalidade, filterValorMin, filterValorMax, filterCETMax, filterVencAte].filter(Boolean).length

  function exportarCSV() {
    const header = ['Modalidade', 'Banco', 'Contrato', 'Contratação', 'Vencimento', 'Valor Tomado', 'Total Parc.', 'Parc. Atual', 'Periodicidade', 'Amortização', 'Taxa Nominal (%aa)', 'Indexador', 'Spread (%)', 'CET (%aa)', 'Parc. Nominal', 'Obs']
    const rows = contratosFiltrados.map(c => [
      c.modalidade,
      c.banco,
      c.numeroContrato ?? '',
      c.dataContratacao,
      c.vencimento,
      c.valorTomado,
      c.totalParcelas,
      c.parcelaAtual,
      c.periodicidade,
      c.sistemaAmortizacao ?? 'Price',
      (c.taxa * 100).toFixed(4),
      c.indexador ?? 'Pré-fixado',
      ((c.spreadIndexador ?? 0) * 100).toFixed(4),
      calcCET(c.taxa, c.indexador, c.spreadIndexador).toFixed(2),
      c.sistemaAmortizacao === 'SAC' && (!c.indexador || c.indexador === 'Pré-fixado')
        ? calcParcelaAtualSAC(c).toFixed(2)
        : c.valorParcela.toFixed(2),
      c.obs ?? '',
    ])
    const csv = [header, ...rows].map(r => r.map(v => `"${String(v).replace(/"/g, '""')}"`).join(';')).join('\r\n')
    const bom = '﻿'
    const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `contratos_credito.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const load = async () => {
    setLoading(true)
    try {
      const [c, cr] = await Promise.all([
        agroApi.contratos.list(clientId),
        agroApi.contratos.cronograma(clientId),
      ])
      setContratos(c)
      setCronograma(cr)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contrato?')) return
    await agroApi.contratos.delete(id)
    load()
  }

  const getToken = () => {
    try {
      const raw = localStorage.getItem('af-auth')
      return raw ? JSON.parse(raw)?.state?.token ?? null : null
    } catch { return null }
  }

  // Normaliza valores antigos/vindos de PDF que podem conter sufixos como "- ÍNDICE MENSAL"
  const normalizeIndexador = (v?: string): string => {
    if (!v) return 'Pré-fixado'
    if (v.toUpperCase().includes('CDI'))  return 'CDI'
    if (v.toUpperCase().includes('SELIC')) return 'SELIC'
    if (v.toUpperCase().includes('IPCA')) return 'IPCA'
    if (v.toUpperCase().includes('TR'))   return 'TR'
    return INDEXADORES.includes(v) ? v : 'Pré-fixado'
  }

  const mapFields = (data: any): Partial<AgroContrato> => ({
    banco:           data.banco        ?? '',
    numeroContrato:  data.numeroContrato ?? '',
    modalidade:      data.modalidade   ?? 'Capital de giro',
    dataContratacao: data.dataContratacao ?? '',
    vencimento:      data.vencimento   ?? '',
    valorTomado:     data.valorTomado  ?? 0,
    valorParcela:    data.valorParcela ?? 0,
    totalParcelas:   data.totalParcelas ?? 1,
    parcelaAtual:    data.parcelaAtual ?? 1,
    taxa:            data.taxa         ?? 0,
    periodicidade:   data.periodicidade ?? 'Mensal',
    obs:             data.obs          ?? 'Importado via PDF — verifique os dados.',
    indexador:          normalizeIndexador(data.indexador),
    spreadIndexador:    data.spreadIndexador ?? 0,
    sistemaAmortizacao: data.sistemaAmortizacao === 'SAC' ? 'SAC' : 'Price',
  })

  const handleImportPdf = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setImporting(true)
    setImportMsg('Analisando PDF com IA...')
    try {
      const token = getToken()
      const fd = new FormData()
      fd.append('pdf', file)
      const res = await fetch(`${API_BASE}/agro/contratos/import-pdf`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Erro ao processar')

      // PDF com múltiplos contratos — abre um a um no modal para revisão
      if (Array.isArray(data.contratos) && data.contratos.length > 0) {
        const queue = data.contratos.map((ct: any) => mapFields(ct)).filter((f: Partial<AgroContrato>) => f.banco || f.valorTomado)
        if (queue.length === 0) throw new Error('Nenhum contrato identificado no PDF.')
        setQueueTotal(queue.length)
        const [first, ...rest] = queue
        setPrefillQueue(rest)
        setPrefill({ ...first, clientId })
        setModal('new')
        setImportMsg(`✅ ${queue.length} contrato(s) identificado(s) — revise e salve um a um.`)
      } else {
        // Contrato único — abre modal para conferência
        const pre = mapFields(data)
        setQueueTotal(1)
        setPrefillQueue([])
        setPrefill({ ...pre, clientId })
        setModal('new')
        const found = [pre.banco, pre.valorTomado, pre.dataContratacao, pre.vencimento, pre.totalParcelas].filter(v => v && v !== 0 && v !== '').length
        setImportMsg(`✅ ${found} campo(s) identificado(s) — confira e salve.`)
      }
    } catch (err: any) {
      setImportMsg('❌ ' + err.message)
    } finally {
      setImporting(false)
      if (fileRef.current) fileRef.current.value = ''
    }
  }

  const anos = cronograma ? Object.keys(cronograma.porAno).sort() : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h2 className="font-bold text-gray-900">Contratos de Crédito</h2>
          <p className="text-xs text-gray-500 mt-0.5">Lançamento contrato a contrato → cronograma ordenado automático</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={exportarCSV}
            className="flex items-center gap-2 border border-gray-300 text-gray-600 rounded-xl px-4 py-2 text-sm font-semibold hover:bg-gray-50"
            title="Exportar para Excel (CSV)"
          >
            <Download size={15} /> Exportar Excel
          </button>
          <button
            onClick={() => setShowFilters(v => !v)}
            className={`flex items-center gap-2 border rounded-xl px-4 py-2 text-sm font-semibold ${showFilters || filtrosAtivos > 0 ? 'border-af-green text-af-green bg-af-green/5' : 'border-gray-300 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter size={15} />
            Filtros
            {filtrosAtivos > 0 && <span className="bg-af-green text-white text-xs rounded-full w-4 h-4 flex items-center justify-center leading-none">{filtrosAtivos}</span>}
          </button>
          <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={handleImportPdf} />
          <button
            onClick={() => fileRef.current?.click()}
            disabled={importing}
            className="flex items-center gap-2 border border-af-green text-af-green rounded-xl px-4 py-2 text-sm font-semibold hover:bg-af-green/5 disabled:opacity-60"
          >
            {importing ? <Loader2 size={15} className="animate-spin" /> : <FileUp size={15} />}
            {importing ? 'Lendo...' : 'Importar PDF'}
          </button>
          <button onClick={() => { setPrefill(undefined); setModal('new') }} className="flex items-center gap-2 bg-af-green text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-af-green-light">
            <Plus size={15} /> Novo Contrato
          </button>
        </div>
      </div>
      {importMsg && (
        <div className="flex items-center gap-2 text-sm px-4 py-2 bg-blue-50 border border-blue-200 rounded-xl text-blue-700">
          <AlertTriangle size={14} /> {importMsg}
        </div>
      )}

      {/* Painel de Filtros */}
      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Banco</label>
              <input
                type="text"
                value={filterBanco}
                onChange={e => setFilterBanco(e.target.value)}
                placeholder="Ex: Sicredi"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Modalidade</label>
              <select
                value={filterModalidade}
                onChange={e => setFilterModalidade(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              >
                <option value="">Todas</option>
                {MODALIDADES.map(m => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Valor Tomado Mín. (R$)</label>
              <input
                type="number"
                value={filterValorMin}
                onChange={e => setFilterValorMin(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Valor Tomado Máx. (R$)</label>
              <input
                type="number"
                value={filterValorMax}
                onChange={e => setFilterValorMax(e.target.value)}
                placeholder="ilimitado"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">CET Máx. (% a.a.)</label>
              <input
                type="number"
                value={filterCETMax}
                onChange={e => setFilterCETMax(e.target.value)}
                placeholder="ilimitado"
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 mb-1">Próx. Venc. até</label>
              <input
                type="date"
                value={filterVencAte}
                onChange={e => setFilterVencAte(e.target.value)}
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
          </div>
          {filtrosAtivos > 0 && (
            <div className="mt-3 flex items-center gap-3">
              <span className="text-xs text-gray-500">{contratosFiltrados.length} de {contratos.length} contrato(s)</span>
              <button
                onClick={() => { setFilterBanco(''); setFilterModalidade(''); setFilterValorMin(''); setFilterValorMax(''); setFilterCETMax(''); setFilterVencAte('') }}
                className="text-xs text-red-500 hover:underline"
              >
                Limpar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* KPIs */}
      {cronograma && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Contratos', value: String(contratos.length) },
            { label: 'Endividamento Total', value: fmtBRL(cronograma.totalEndividamento) },
            { label: 'Total Futuro (parcelas)', value: fmtBRL(cronograma.totalFuturo) },
            { label: 'Parcelas Restantes', value: String(cronograma.parcelas.length) },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className="text-lg font-bold text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de contratos cadastrados */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Contratos Cadastrados</div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto overflow-y-auto max-h-[520px]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 z-10">
                <tr className="bg-gray-50 border-b">
                  {([
                    { label: 'Modalidade',      key: 'modalidade' },
                    { label: 'Banco',           key: 'banco' },
                    { label: 'Contrato',        key: 'numeroContrato' },
                    { label: 'Contratação',     key: 'dataContratacao' },
                    { label: 'Valor Tomado',    key: 'valorTomado' },
                    { label: 'Total Parc.',     key: 'totalParcelas' },
                    { label: 'Parc. Atual',     key: 'parcelaAtual' },
                    { label: 'Period.',         key: 'periodicidade' },
                    { label: 'Amort.',          key: 'sistemaAmortizacao' },
                    { label: 'CET a.a.',        key: 'cet' },
                    { label: 'Próx. Venc.',     key: 'vencimento' },
                    { label: 'Parc. Nominal',   key: 'valorParcela' },
                    { label: 'Parc. c/ Índice', key: null },
                    { label: '',                key: null },
                  ] as { label: string; key: SortKey | null }[]).map(({ label, key }) => (
                    <th
                      key={label}
                      onClick={() => key && toggleSort(key)}
                      className={`px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap ${key ? 'cursor-pointer select-none hover:text-gray-800 hover:bg-gray-100' : ''}`}
                    >
                      <span className="inline-flex items-center gap-1">
                        {label}
                        {key && (sortKey === key
                          ? (sortDir === 'asc' ? <ArrowUp size={11} className="text-af-green" /> : <ArrowDown size={11} className="text-af-green" />)
                          : <ArrowUpDown size={11} className="text-gray-300" />
                        )}
                      </span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratosFiltrados.map(c => {
                const parcContrato = cronograma?.parcelas.filter(p => p.contratoId === c.id) ?? []
                return (<>
                  <tr key={c.id} className="hover:bg-gray-50/50 group">
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{c.modalidade}</td>
                    <td className="px-3 py-2.5 text-gray-700">{c.banco}</td>
                    <td className="px-3 py-2.5 text-gray-500">{c.numeroContrato ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(c.dataContratacao)}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(c.valorTomado)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{c.totalParcelas}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{c.parcelaAtual}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.periodicidade}</td>
                    <td className="px-3 py-2.5 text-center">
                      {(() => {
                        const isPosFix = c.indexador && c.indexador !== 'Pré-fixado'
                        const isSAC = isPosFix || c.sistemaAmortizacao === 'SAC'
                        return (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${isSAC ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'}`}>
                            {isSAC ? 'SAC' : 'Price'}
                          </span>
                        )
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">
                      <span className="font-semibold">{calcCET(c.taxa, c.indexador, c.spreadIndexador).toFixed(2)}%</span>
                      {c.indexador && c.indexador !== 'Pré-fixado' && (
                        <span className="ml-1 text-xs bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">{c.indexador}</span>
                      )}
                    </td>
                    <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${new Date(c.vencimento) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmtDate(c.vencimento)}
                    </td>
                    <td className="px-3 py-2.5 text-gray-700 whitespace-nowrap">
                      {c.sistemaAmortizacao === 'SAC' && (!c.indexador || c.indexador === 'Pré-fixado')
                        ? <span title="Parcela atual calculada (SAC decrescente)">{fmtBRL(calcParcelaAtualSAC(c))}</span>
                        : fmtBRL(c.valorParcela)
                      }
                    </td>
                    <td className="px-3 py-2.5 font-bold text-gray-900">
                      {c.indexador && c.indexador !== 'Pré-fixado'
                        ? <span className="text-amber-700">{fmtBRL(calcParcelaCorrigida(c.valorParcela, c.indexador, c.spreadIndexador, c.periodicidade))}</span>
                        : <span className="text-gray-400 text-xs">—</span>
                      }
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        <button onClick={() => setContratoExpandido(contratoExpandido === c.id ? null : c.id ?? null)} className="p-1.5 hover:bg-gray-100 text-gray-500 rounded" title="Tabela de amortização"><TableProperties size={14} /></button>
                        <button onClick={() => setModal(c)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded" title="Editar"><Edit2 size={14} /></button>
                        <button onClick={() => c.id && handleDelete(c.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded" title="Excluir"><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                  {contratoExpandido === c.id && (
                    <tr key={`exp-${c.id}`}>
                      <td colSpan={14} className="px-4 py-3 bg-blue-50/40 border-b border-blue-100">
                        <div className="text-xs font-semibold text-blue-700 mb-2 flex items-center gap-2">
                          <TableProperties size={13} />
                          Tabela de Amortização — {c.banco} {c.numeroContrato ?? ''} ({c.sistemaAmortizacao ?? 'Price'})
                        </div>
                        {parcContrato.length === 0 ? (
                          <p className="text-xs text-gray-400">Nenhuma parcela futura.</p>
                        ) : (
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-blue-200">
                                  {['Nº', 'Vencimento', 'Amortização', 'Juros', 'Total Parcela', 'Saldo Devedor'].map(h => (
                                    <th key={h} className="py-1.5 pr-4 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-blue-100">
                                {parcContrato.map((p, idx) => (
                                  <tr key={idx} className="hover:bg-blue-50">
                                    <td className="py-1.5 pr-4 text-gray-500">{p.parcelaNum}/{p.totalParcelas}</td>
                                    <td className="py-1.5 pr-4 font-medium text-gray-800 whitespace-nowrap">{fmtDate(p.vencimento)}</td>
                                    <td className="py-1.5 pr-4 text-gray-700">{fmtBRL(p.amortizacao ?? 0)}</td>
                                    <td className="py-1.5 pr-4 text-red-600">{fmtBRL(p.juros ?? 0)}</td>
                                    <td className="py-1.5 pr-4 font-bold text-gray-900">{fmtBRL(p.valorParcela)}</td>
                                    <td className="py-1.5 pr-4 text-gray-500">{fmtBRL(p.saldoDevedor ?? 0)}</td>
                                  </tr>
                                ))}
                                <tr className="border-t-2 border-blue-300 font-bold">
                                  <td colSpan={2} className="py-1.5 pr-4 text-gray-600">TOTAL</td>
                                  <td className="py-1.5 pr-4 text-gray-800">{fmtBRL(parcContrato.reduce((s, p) => s + (p.amortizacao ?? 0), 0))}</td>
                                  <td className="py-1.5 pr-4 text-red-700">{fmtBRL(parcContrato.reduce((s, p) => s + (p.juros ?? 0), 0))}</td>
                                  <td className="py-1.5 pr-4 text-gray-900">{fmtBRL(parcContrato.reduce((s, p) => s + p.valorParcela, 0))}</td>
                                  <td />
                                </tr>
                              </tbody>
                            </table>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </>)})}
              </tbody>
            </table>
            {contratosFiltrados.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">{contratos.length === 0 ? 'Nenhum contrato cadastrado' : 'Nenhum contrato corresponde aos filtros'}</div>}
          </div>
        )}
      </Card>

      {/* Resumo por ano */}
      {cronograma && anos.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Resumo por Ano</div>
          <div className="divide-y divide-gray-50">
            {anos.map(ano => {
              const info = cronograma.porAno[ano]
              const parcelasAno = cronograma.parcelas.filter(p => new Date(p.vencimento).getFullYear().toString() === ano)
              const isOpen = anoExpandido === ano
              return (
                <div key={ano}>
                  <button
                    onClick={() => setAnoExpandido(isOpen ? null : ano)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span className="font-bold text-gray-900">{ano}</span>
                      <span className="text-gray-500">{info.parcelas} parcelas</span>
                    </div>
                    <span className="font-bold text-gray-900">{fmtBRL(info.total)}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {['Vencimento', 'Modalidade', 'Banco', 'Contrato', 'Parcela', 'Amortização', 'Juros', 'Total Parcela', 'Saldo Devedor'].map(h => (
                              <th key={h} className="py-1.5 text-left text-gray-400 font-semibold uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parcelasAno.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="py-1.5 font-medium text-gray-900 whitespace-nowrap">{fmtDate(p.vencimento)}</td>
                              <td className="py-1.5 text-gray-700">{p.modalidade}</td>
                              <td className="py-1.5 text-gray-600">{p.banco}</td>
                              <td className="py-1.5 text-gray-500">{p.contrato || '—'}</td>
                              <td className="py-1.5 text-gray-600">{p.parcelaNum}/{p.totalParcelas}</td>
                              <td className="py-1.5 text-gray-700">{p.amortizacao != null ? fmtBRL(p.amortizacao) : '—'}</td>
                              <td className="py-1.5 text-amber-700">{p.juros != null ? fmtBRL(p.juros) : '—'}</td>
                              <td className="py-1.5 font-semibold text-gray-900">{fmtBRL(p.valorParcela)}</td>
                              <td className="py-1.5 text-gray-500">{p.saldoDevedor != null ? fmtBRL(p.saldoDevedor) : '—'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex justify-between px-4 py-3 bg-gray-50 font-bold text-sm">
              <span>Total Geral</span>
              <span>{fmtBRL(cronograma.totalFuturo)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Cronograma completo ordenado */}
      {cronograma && cronograma.parcelas.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">
            Cronograma Completo — Ordenado por Vencimento ({cronograma.parcelas.length} parcelas)
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  {['Vencimento', 'Modalidade', 'Banco', 'Contrato', 'Contratação', 'Valor Tomado', 'Parcela', 'Period.', 'Taxa', 'Amortização', 'Juros', 'Total Parcela', 'Saldo Devedor'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cronograma.parcelas.map((p, i) => {
                  const venc = new Date(p.vencimento)
                  const vencida = venc < new Date()
                  return (
                    <tr key={i} className={clsx('hover:bg-gray-50/50', vencida && 'bg-red-50/30')}>
                      <td className={clsx('px-3 py-2 font-medium whitespace-nowrap', vencida ? 'text-red-600' : 'text-gray-900')}>{fmtDate(p.vencimento)}</td>
                      <td className="px-3 py-2 text-gray-700">{p.modalidade}</td>
                      <td className="px-3 py-2 text-gray-700">{p.banco}</td>
                      <td className="px-3 py-2 text-gray-500">{p.contrato || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(p.dataContratacao)}</td>
                      <td className="px-3 py-2 text-gray-700">{fmtBRL(p.valorTomado)}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{p.parcelaNum}/{p.totalParcelas}</td>
                      <td className="px-3 py-2 text-gray-600">{p.periodicidade}</td>
                      <td className="px-3 py-2 text-gray-600">{(p.taxa * 100).toFixed(2)}%</td>
                      <td className="px-3 py-2 text-gray-700">{p.amortizacao != null ? fmtBRL(p.amortizacao) : '—'}</td>
                      <td className="px-3 py-2 text-red-600">{p.juros != null ? fmtBRL(p.juros) : '—'}</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{fmtBRL(p.valorParcela)}</td>
                      <td className="px-3 py-2 text-gray-500">{p.saldoDevedor != null ? fmtBRL(p.saldoDevedor) : '—'}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <ContratoModal
          contrato={modal === 'new' ? undefined : modal}
          clientId={clientId}
          prefill={modal === 'new' ? prefill : undefined}
          onClose={() => { setModal(null); setPrefill(undefined); setPrefillQueue([]); setImportMsg('') }}
          onSaved={() => {
            load()
            if (prefillQueue.length > 0) {
              const [next, ...rest] = prefillQueue
              setPrefillQueue(rest)
              setPrefill({ ...next, clientId })
              setModal('new')
              const done = queueTotal - prefillQueue.length
              setImportMsg(`✅ ${done}/${queueTotal} salvo(s) — revise o próximo contrato.`)
            } else {
              setModal(null)
              setPrefill(undefined)
              setImportMsg(`✅ Todos os contratos importados com sucesso.`)
            }
          }}
        />
      )}
    </div>
  )
}
