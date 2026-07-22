import { useState, useEffect, useMemo } from 'react'
import { AppLayout } from '../../components/Layout/AppLayout'
import { Card } from '../../components/ui/Card'
import { useStore } from '../../store/useStore'
import { agroApi, type AgroContrato } from '../../services/agroApi'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { RefreshCw, Calculator, ChevronDown, ChevronUp, Info, CheckSquare, Square } from 'lucide-react'

// ── Formatadores ──────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: Date) =>
  d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })

// ── Tipos ─────────────────────────────────────────────────────────────────────
type Sistema = 'price' | 'sac'
type Periodicidade = 'mensal' | 'semestral' | 'anual'

interface Cenario {
  id: 'A' | 'B'
  sistema: Sistema
  periodicidade: Periodicidade
  prazoMeses: number
  taxaAnual: number        // % a.a. nominal
  usaCDI: boolean
  cdiAnual: number         // % a.a. estimado
  spreadAnual: number      // % a.a. spread sobre CDI
  dataPrimeiraParcela: string // yyyy-mm-dd
}

interface ParcelaRow {
  num: number
  data: Date
  saldoInicial: number
  juros: number
  amortizacao: number
  parcela: number
  saldoFinal: number
}

// ── Motor financeiro ──────────────────────────────────────────────────────────

function taxaPeriodo(c: Cenario): number {
  // Taxa efetiva no período (mensal, semestral ou anual)
  let taxaAnualEfetiva: number
  if (c.usaCDI) {
    // spread + CDI composto
    taxaAnualEfetiva = (1 + c.spreadAnual / 100) * (1 + c.cdiAnual / 100) - 1
  } else {
    taxaAnualEfetiva = c.taxaAnual / 100
  }
  // Converte para taxa efetiva do período
  if (c.periodicidade === 'mensal')    return Math.pow(1 + taxaAnualEfetiva, 1 / 12) - 1
  if (c.periodicidade === 'semestral') return Math.pow(1 + taxaAnualEfetiva, 1 / 2) - 1
  return taxaAnualEfetiva // anual
}

function numPeriodos(c: Cenario): number {
  // prazoMeses agora armazena diretamente o número de parcelas
  return Math.max(1, Math.round(c.prazoMeses))
}

function mesesPorPeriodo(c: Cenario): number {
  if (c.periodicidade === 'mensal')    return 1
  if (c.periodicidade === 'semestral') return 6
  return 12
}

function gerarCronograma(saldo: number, c: Cenario): ParcelaRow[] {
  if (saldo <= 0) return []
  const i = taxaPeriodo(c)
  const n = numPeriodos(c)
  const mp = mesesPorPeriodo(c)
  const inicio = new Date(c.dataPrimeiraParcela + 'T00:00:00')
  const rows: ParcelaRow[] = []

  if (c.sistema === 'price') {
    const pmt = i === 0 ? saldo / n : saldo * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1)
    let saldoAtual = saldo
    for (let k = 1; k <= n; k++) {
      const data = new Date(inicio)
      data.setMonth(data.getMonth() + (k - 1) * mp)
      const juros = saldoAtual * i
      const amort = pmt - juros
      const saldoFinal = Math.max(0, saldoAtual - amort)
      rows.push({ num: k, data, saldoInicial: saldoAtual, juros, amortizacao: amort, parcela: pmt, saldoFinal })
      saldoAtual = saldoFinal
    }
  } else { // SAC
    const amortConst = saldo / n
    let saldoAtual = saldo
    for (let k = 1; k <= n; k++) {
      const data = new Date(inicio)
      data.setMonth(data.getMonth() + (k - 1) * mp)
      const juros = saldoAtual * i
      const parcela = amortConst + juros
      const saldoFinal = Math.max(0, saldoAtual - amortConst)
      rows.push({ num: k, data, saldoInicial: saldoAtual, juros, amortizacao: amortConst, parcela, saldoFinal })
      saldoAtual = saldoFinal
    }
  }
  return rows
}

function saldoDevedorContrato(c: AgroContrato): number {
  const restantes = Math.max(0, c.totalParcelas - (c.parcelaAtual || 0))
  return restantes * c.valorParcela
}

// ── Cores por cenário ─────────────────────────────────────────────────────────
const COR: Record<'A' | 'B', { bg: string; border: string; text: string; badge: string }> = {
  A: { bg: 'bg-blue-50',   border: 'border-blue-300',   text: 'text-blue-800',   badge: 'bg-blue-600 text-white' },
  B: { bg: 'bg-violet-50', border: 'border-violet-300', text: 'text-violet-800', badge: 'bg-violet-600 text-white' },
}

const CENARIO_DEFAULT: Omit<Cenario, 'id'> = {
  sistema: 'price',
  periodicidade: 'mensal',
  prazoMeses: 60,
  taxaAnual: 12,
  usaCDI: false,
  cdiAnual: 12.25,
  spreadAnual: 3,
  dataPrimeiraParcela: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
}

// ── Componente CenarioPanel ────────────────────────────────────────────────────
function CenarioPanel({
  cenario, saldoTotal, onChange,
}: {
  cenario: Cenario
  saldoTotal: number
  onChange: (c: Cenario) => void
}) {
  const c = cenario
  const cor = COR[c.id]
  const set = <K extends keyof Cenario>(k: K, v: Cenario[K]) => onChange({ ...c, [k]: v })

  const cronograma = useMemo(() => gerarCronograma(saldoTotal, c), [saldoTotal, c])
  const totalPago   = cronograma.reduce((s, r) => s + r.parcela, 0)
  const totalJuros  = cronograma.reduce((s, r) => s + r.juros, 0)
  const primParcela = cronograma[0]?.parcela ?? 0
  const ultParcela  = cronograma[cronograma.length - 1]?.parcela ?? 0
  const n = numPeriodos(c)

  const [showCrono, setShowCrono] = useState(false)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'

  return (
    <div className={`rounded-2xl border-2 ${cor.border} ${cor.bg} p-5 space-y-4`}>
      {/* Badge */}
      <div className="flex items-center justify-between">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cor.badge}`}>Cenário {c.id}</span>
        <span className={`text-xs font-semibold ${cor.text}`}>Saldo a renegociar: {fmtBRL(saldoTotal)}</span>
      </div>

      {/* Sistema + Periodicidade */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Sistema de amortização</label>
          <div className="flex gap-1">
            {(['price', 'sac'] as Sistema[]).map(s => (
              <button key={s} onClick={() => set('sistema', s)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${c.sistema === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {s === 'price' ? 'Price' : 'SAC'}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Periodicidade das parcelas</label>
          <div className="flex gap-1">
            {([['mensal','Mensal'],['semestral','Semes.'],['anual','Anual']] as [Periodicidade, string][]).map(([v, l]) => (
              <button key={v} onClick={() => set('periodicidade', v)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${c.periodicidade === v ? 'bg-gray-800 text-white border-gray-800' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'}`}>
                {l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Prazo + Taxa */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Número de parcelas</label>
          <input type="number" min={1} max={600} value={c.prazoMeses}
            onChange={e => set('prazoMeses', +e.target.value)} className={inp} />
          <p className="text-xs text-gray-400 mt-0.5">
            {n} {c.periodicidade === 'mensal' ? 'parcelas mensais' : c.periodicidade === 'semestral' ? 'parcelas semestrais' : 'parcelas anuais'}
            {' '}={' '}
            {c.periodicidade === 'mensal'
              ? n >= 12 ? `${(n / 12).toFixed(n % 12 === 0 ? 0 : 1)} anos` : `${n} meses`
              : c.periodicidade === 'semestral'
              ? `${(n / 2).toFixed(n % 2 === 0 ? 0 : 1)} anos`
              : `${n} anos`}
          </p>
        </div>
        <div>
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Data da 1ª parcela (carência)</label>
          <input type="date" value={c.dataPrimeiraParcela}
            onChange={e => set('dataPrimeiraParcela', e.target.value)} className={inp} />
        </div>
      </div>

      {/* Taxa */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-gray-600">Taxa de juros</label>
          <label className="flex items-center gap-1.5 cursor-pointer text-xs text-gray-600">
            <input type="checkbox" checked={c.usaCDI} onChange={e => set('usaCDI', e.target.checked)}
              className="w-3.5 h-3.5 accent-blue-600" />
            Corrigir pelo CDI
          </label>
        </div>
        {!c.usaCDI ? (
          <div className="flex items-center gap-2">
            <input type="number" step={0.25} min={0} value={c.taxaAnual}
              onChange={e => set('taxaAnual', +e.target.value)} className={`${inp} text-right`} />
            <span className="text-sm text-gray-500 whitespace-nowrap">% a.a.</span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">CDI estimado (% a.a.)</label>
              <input type="number" step={0.25} value={c.cdiAnual}
                onChange={e => set('cdiAnual', +e.target.value)} className={`${inp} text-right`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 mb-0.5 block">Spread (% a.a.)</label>
              <input type="number" step={0.25} value={c.spreadAnual}
                onChange={e => set('spreadAnual', +e.target.value)} className={`${inp} text-right`} />
            </div>
            <div className="col-span-2 text-xs text-blue-700 bg-blue-50 border border-blue-100 rounded-lg px-3 py-1.5">
              Taxa efetiva anual: {(((1 + c.spreadAnual / 100) * (1 + c.cdiAnual / 100) - 1) * 100).toFixed(2)}% a.a.
            </div>
          </div>
        )}
      </div>

      {/* Resultado resumido */}
      {cronograma.length > 0 && (
        <div className={`rounded-2xl bg-white border ${cor.border} p-4 space-y-3`}>
          <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Resultado da Simulação</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              { l: c.sistema === 'price' ? 'Parcela fixa' : '1ª Parcela', v: fmtBRL(primParcela) },
              { l: c.sistema === 'sac' ? 'Última Parcela' : 'Total pago', v: c.sistema === 'sac' ? fmtBRL(ultParcela) : fmtBRL(totalPago) },
              { l: 'Total de juros', v: fmtBRL(totalJuros) },
              { l: 'Total pago', v: fmtBRL(totalPago) },
            ].map(k => (
              <div key={k.l}>
                <p className="text-xs text-gray-500">{k.l}</p>
                <p className="font-bold text-gray-900">{k.v}</p>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-1 border-t border-gray-100 text-xs text-gray-500">
            <span>Custo efetivo total</span>
            <span className="font-semibold text-gray-800">
              {saldoTotal > 0 ? `+${(((totalPago / saldoTotal) - 1) * 100).toFixed(1)}%` : '—'}
            </span>
          </div>
        </div>
      )}

      {/* Cronograma */}
      {cronograma.length > 0 && (
        <div>
          <button onClick={() => setShowCrono(p => !p)}
            className="w-full flex items-center justify-between text-xs font-semibold text-gray-600 hover:text-gray-900 py-1.5 border-t border-gray-200 mt-1">
            <span>Ver cronograma completo ({cronograma.length} parcelas)</span>
            {showCrono ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
          {showCrono && (
            <div className="overflow-x-auto mt-2 rounded-xl border border-gray-200 max-h-72">
              <table className="w-full text-xs">
                <thead className="sticky top-0">
                  <tr className="bg-gray-100 border-b">
                    {['Nº', 'Data', 'Saldo Inicial', 'Juros', 'Amortização', 'Parcela', 'Saldo Final'].map(h => (
                      <th key={h} className="px-2.5 py-2 text-left font-semibold text-gray-500 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 bg-white">
                  {cronograma.map(r => (
                    <tr key={r.num} className="hover:bg-gray-50/60">
                      <td className="px-2.5 py-2 font-bold text-gray-700">{r.num}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{fmtDate(r.data)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{fmtBRL(r.saldoInicial)}</td>
                      <td className="px-2.5 py-2 text-red-500 whitespace-nowrap">{fmtBRL(r.juros)}</td>
                      <td className="px-2.5 py-2 text-blue-600 whitespace-nowrap">{fmtBRL(r.amortizacao)}</td>
                      <td className="px-2.5 py-2 font-semibold whitespace-nowrap">{fmtBRL(r.parcela)}</td>
                      <td className="px-2.5 py-2 whitespace-nowrap">{fmtBRL(r.saldoFinal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export function Reestruturacao() {
  const { clients } = useStore()
  const [clientId, setClientId] = useState('')
  const [contratos, setContratos] = useState<AgroContrato[]>([])
  const [loadingContratos, setLoadingContratos] = useState(false)
  const [selecionados, setSelecionados] = useState<Set<string>>(new Set())

  const [cenarioA, setCenarioA] = useState<Cenario>({ ...CENARIO_DEFAULT, id: 'A' })
  const [cenarioB, setCenarioB] = useState<Cenario>({ ...CENARIO_DEFAULT, id: 'B', taxaAnual: 8, prazoMeses: 84, sistema: 'sac' })
  const [comparar, setComparar] = useState(false)

  const client = clients.find(c => c.id === clientId)

  useEffect(() => {
    if (!clientId) { setContratos([]); setSelecionados(new Set()); return }
    setLoadingContratos(true)
    agroApi.contratos.list(clientId)
      .then(data => {
        setContratos(data)
        // Seleciona todos por padrão
        setSelecionados(new Set(data.map(c => c.id!).filter(Boolean)))
      })
      .catch(() => setContratos([]))
      .finally(() => setLoadingContratos(false))
  }, [clientId])

  const toggleContrato = (id: string) => {
    setSelecionados(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id); else next.add(id)
      return next
    })
  }

  const toggleTodos = () => {
    const todos = contratos.map(c => c.id!).filter(Boolean)
    if (selecionados.size === todos.length) setSelecionados(new Set())
    else setSelecionados(new Set(todos))
  }

  const saldoTotal = contratos
    .filter(c => c.id && selecionados.has(c.id))
    .reduce((s, c) => s + saldoDevedorContrato(c), 0)

  const contratosAgrupados = useMemo(() => {
    const grupos: Record<string, AgroContrato[]> = {}
    contratos.forEach(c => {
      const k = c.banco || 'Outros'
      if (!grupos[k]) grupos[k] = []
      grupos[k].push(c)
    })
    return grupos
  }, [contratos])

  // Dados para gráfico comparativo
  const chartData = useMemo(() => {
    if (!comparar || saldoTotal <= 0) return []
    const crA = gerarCronograma(saldoTotal, cenarioA)
    const crB = gerarCronograma(saldoTotal, cenarioB)
    const maxN = Math.max(crA.length, crB.length)
    return Array.from({ length: maxN }, (_, i) => ({
      periodo: i + 1,
      'Cenário A': crA[i]?.parcela ?? 0,
      'Cenário B': crB[i]?.parcela ?? 0,
    })).filter((_, i) => i % Math.max(1, Math.floor(maxN / 24)) === 0) // subsample para legibilidade
  }, [comparar, saldoTotal, cenarioA, cenarioB])

  const totalA = gerarCronograma(saldoTotal, cenarioA).reduce((s, r) => s + r.parcela, 0)
  const totalB = gerarCronograma(saldoTotal, cenarioB).reduce((s, r) => s + r.parcela, 0)
  const economia = totalA - totalB

  return (
    <AppLayout title="Reestruturação de Passivos" subtitle="Simulação e renegociação de dívidas · Tabela Price e SAC · Carência e CDI">
      <div className="space-y-5">

        {/* Seleção de cliente */}
        <Card className="p-5">
          <h3 className="font-bold text-gray-900 mb-4">1. Selecionar produtor / empresa</h3>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-60">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Cliente</label>
              <select value={clientId} onChange={e => setClientId(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200">
                <option value="">Selecione o cliente...</option>
                {clients.map(c => (
                  <option key={c.id} value={c.id}>{c.name} — {c.city}/{c.state}</option>
                ))}
              </select>
            </div>
            {client && (
              <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
                <p className="text-xs text-gray-500">Segmento</p>
                <p className="text-sm font-bold text-blue-800 capitalize">{client.segment}</p>
              </div>
            )}
          </div>
        </Card>

        {/* Endividamento atual */}
        {clientId && (
          <Card className="p-5">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <h3 className="font-bold text-gray-900">2. Endividamento atual — selecione as operações a renegociar</h3>
              {contratos.length > 0 && (
                <button onClick={toggleTodos}
                  className="flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-800">
                  {selecionados.size === contratos.length ? <CheckSquare size={14} /> : <Square size={14} />}
                  {selecionados.size === contratos.length ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
              )}
            </div>

            {loadingContratos && (
              <div className="flex items-center gap-2 text-gray-400 py-6">
                <RefreshCw size={18} className="animate-spin" /> Carregando contratos...
              </div>
            )}

            {!loadingContratos && contratos.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                <Info size={32} className="mx-auto mb-2 opacity-40" />
                <p className="text-sm">Nenhum contrato encontrado para este cliente.</p>
                <p className="text-xs mt-1">Lance os contratos na aba "Contratos & Cronograma" do módulo Agro Completo.</p>
              </div>
            )}

            {!loadingContratos && contratos.length > 0 && (
              <div className="space-y-4">
                {Object.entries(contratosAgrupados).map(([banco, lista]) => (
                  <div key={banco}>
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2 pb-1 border-b border-gray-100">{banco}</p>
                    <div className="space-y-2">
                      {lista.map(ct => {
                        const sel = ct.id ? selecionados.has(ct.id) : false
                        const saldo = saldoDevedorContrato(ct)
                        const restantes = Math.max(0, ct.totalParcelas - (ct.parcelaAtual || 0))
                        return (
                          <label key={ct.id}
                            className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${sel ? 'bg-blue-50 border-blue-300' : 'bg-gray-50 border-gray-100 hover:border-gray-200'}`}>
                            <input type="checkbox" checked={sel}
                              onChange={() => ct.id && toggleContrato(ct.id)}
                              className="mt-0.5 w-4 h-4 accent-blue-600 shrink-0" />
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                                <span className="font-semibold text-sm text-gray-900">{ct.modalidade}</span>
                                {ct.numeroContrato && <span className="text-xs text-gray-400">Nº {ct.numeroContrato}</span>}
                                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${sel ? 'bg-blue-100 text-blue-700' : 'bg-gray-200 text-gray-600'}`}>{ct.periodicidade}</span>
                              </div>
                              <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1 text-xs text-gray-500">
                                <span>Valor tomado: <span className="font-semibold text-gray-700">{fmtBRL(ct.valorTomado)}</span></span>
                                <span>Parcela: <span className="font-semibold text-gray-700">{fmtBRL(ct.valorParcela)}</span></span>
                                <span>Restantes: <span className="font-semibold text-gray-700">{restantes} de {ct.totalParcelas}</span></span>
                                <span>Vencimento: <span className="font-semibold text-gray-700">{ct.vencimento}</span></span>
                                <span>Taxa: <span className="font-semibold text-gray-700">{(ct.taxa * 100).toFixed(2)}% a.a.</span></span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="text-xs text-gray-400">Saldo devedor est.</p>
                              <p className={`font-bold text-sm ${sel ? 'text-blue-700' : 'text-gray-700'}`}>{fmtBRL(saldo)}</p>
                            </div>
                          </label>
                        )
                      })}
                    </div>
                  </div>
                ))}

                {/* Totalizador */}
                <div className="flex items-center justify-between bg-gray-900 text-white rounded-2xl px-5 py-3">
                  <div>
                    <p className="text-xs text-white/60">{selecionados.size} operação(ões) selecionada(s)</p>
                    <p className="font-bold text-lg">Saldo total a renegociar</p>
                  </div>
                  <p className="text-2xl font-bold text-green-400">{fmtBRL(saldoTotal)}</p>
                </div>
              </div>
            )}
          </Card>
        )}

        {/* Simulação */}
        {clientId && saldoTotal > 0 && (
          <>
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-gray-900">3. Simulação de renegociação</h3>
              <button onClick={() => setComparar(p => !p)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${comparar ? 'bg-violet-600 text-white border-violet-600' : 'bg-white text-gray-700 border-gray-200 hover:border-gray-400'}`}>
                <Calculator size={14} /> {comparar ? 'Ocultar Cenário B' : 'Comparar 2 cenários'}
              </button>
            </div>

            <div className={`grid gap-5 ${comparar ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1 max-w-2xl'}`}>
              <CenarioPanel cenario={cenarioA} saldoTotal={saldoTotal} onChange={setCenarioA} />
              {comparar && (
                <CenarioPanel cenario={cenarioB} saldoTotal={saldoTotal} onChange={setCenarioB} />
              )}
            </div>

            {/* Comparativo resumido */}
            {comparar && (
              <Card className="p-5 space-y-4">
                <h4 className="font-bold text-gray-900">Comparativo A × B</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  {[
                    { l: 'Total pago — Cenário A', v: fmtBRL(totalA), cor: 'text-blue-700' },
                    { l: 'Total pago — Cenário B', v: fmtBRL(totalB), cor: 'text-violet-700' },
                    { l: 'Diferença total', v: fmtBRL(Math.abs(economia)), cor: economia > 0 ? 'text-emerald-700' : 'text-red-600' },
                    { l: economia > 0 ? 'O Cenário B economiza' : 'O Cenário A economiza', v: `${((Math.abs(economia) / Math.max(totalA, totalB)) * 100).toFixed(1)}%`, cor: 'text-gray-900' },
                  ].map(k => (
                    <div key={k.l} className="bg-gray-50 rounded-2xl p-4 border border-gray-100">
                      <p className="text-xs text-gray-500">{k.l}</p>
                      <p className={`text-xl font-bold ${k.cor}`}>{k.v}</p>
                    </div>
                  ))}
                </div>

                {chartData.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold text-gray-600 mb-3">Evolução das parcelas (amostra)</p>
                    <ResponsiveContainer width="100%" height={220}>
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 10 }} label={{ value: 'Período', position: 'insideBottom', offset: -2, fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(v: number) => fmtBRL(v)} />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Cenário A" fill="#2563EB" radius={[2,2,0,0]} />
                        <Bar dataKey="Cenário B" fill="#7C3AED" radius={[2,2,0,0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </Card>
            )}
          </>
        )}

      </div>
    </AppLayout>
  )
}
