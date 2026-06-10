import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, BarChart2, Calendar } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, ReferenceLine, Legend, PieChart, Pie, Cell
} from 'recharts'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { payStorage } from '../services/payStorage'

const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const MESES_ABR  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#1B5E20','#2E7D32','#388E3C','#43A047','#4CAF50','#66BB6A','#81C784','#A5D6A7','#C8E6C9','#E8F5E9','#F57F17','#FF8F00']

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`

interface MonthRow { month: string; entradas: number; saidas: number; saldo: number }
interface CategoryRow { name: string; value: number }

type Tab = 'fluxo' | 'dre' | 'indicadores'

export function Financeiro() {
  const [tab, setTab]               = useState<Tab>('fluxo')
  const [year, setYear]             = useState(new Date().getFullYear())
  const [cashFlow, setCashFlow]     = useState<MonthRow[]>([])
  const [despCat, setDespCat]       = useState<CategoryRow[]>([])
  const [recCat, setRecCat]         = useState<CategoryRow[]>([])
  const [totReceita, setTotReceita] = useState(0)
  const [totDespesa, setTotDespesa] = useState(0)

  const load = useCallback(() => {
    // ── Fluxo mensal ────────────────────────────────────────────
    const flow: MonthRow[] = MESES_ABR.map((mes, i) => {
      const s = payStorage.getSummary(year, i + 1)
      return { month: mes, entradas: s.receita, saidas: s.despesa, saldo: s.resultado }
    })
    setCashFlow(flow)

    // ── Totais do ano ────────────────────────────────────────────
    const entries = payStorage.getEntries().filter(e => new Date(e.dataVenc).getFullYear() === year)
    const rec  = entries.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
    const desp = entries.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)
    setTotReceita(rec)
    setTotDespesa(desp)

    // ── Despesas por categoria ───────────────────────────────────
    const dMap: Record<string, number> = {}
    entries.filter(e => e.tipo === 'despesa').forEach(e => {
      dMap[e.categoria] = (dMap[e.categoria] || 0) + e.valor
    })
    setDespCat(Object.entries(dMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })))

    // ── Receitas por categoria ───────────────────────────────────
    const rMap: Record<string, number> = {}
    entries.filter(e => e.tipo === 'receita').forEach(e => {
      rMap[e.categoria] = (rMap[e.categoria] || 0) + e.valor
    })
    setRecCat(Object.entries(rMap).sort((a, b) => b[1] - a[1]).map(([name, value]) => ({ name, value })))
  }, [year])

  useEffect(() => { load() }, [load])

  const resultado       = totReceita - totDespesa
  const margemLiq       = totReceita > 0 ? (resultado / totReceita) * 100 : 0
  const activeMonths    = cashFlow.filter(m => m.entradas > 0 || m.saidas > 0).length
  const avgMensal       = activeMonths > 0 ? totReceita / activeMonths : 0
  const criticalMonths  = cashFlow.filter(m => m.saldo < 0)
  const melhorMes       = cashFlow.reduce((best, m) => m.saldo > (best?.saldo ?? -Infinity) ? m : best, null as MonthRow | null)
  const piorMes         = cashFlow.reduce((worst, m) => (m.entradas > 0 || m.saidas > 0) && m.saldo < (worst?.saldo ?? Infinity) ? m : worst, null as MonthRow | null)

  // Saldo acumulado para o gráfico de linha
  const cashFlowAcum = cashFlow.reduce<(MonthRow & { acumulado: number })[]>((acc, m) => {
    const prev = acc[acc.length - 1]?.acumulado ?? 0
    return [...acc, { ...m, acumulado: prev + m.saldo }]
  }, [])

  const years = Array.from(new Set(
    payStorage.getEntries().map(e => new Date(e.dataVenc).getFullYear())
  )).sort()
  const yearOptions = years.length ? years : [new Date().getFullYear()]

  const isEmpty = totReceita === 0 && totDespesa === 0

  return (
    <AppLayout title="Planejamento Financeiro" subtitle="Dados reais integrados com o módulo Pay">
      {/* Seletor de ano + tabs */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
        <div className="flex gap-1 bg-gray-100 p-1 rounded-xl">
          {(['fluxo', 'dre', 'indicadores'] as Tab[]).map(t => (
            <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
              {t === 'fluxo' ? 'Fluxo de Caixa' : t === 'dre' ? 'DRE Gerencial' : 'Indicadores'}
            </button>
          ))}
        </div>

        <select
          value={year}
          onChange={e => setYear(Number(e.target.value))}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm font-medium text-gray-700 focus:outline-none focus:ring-2 focus:ring-af-green/40"
        >
          {yearOptions.map(y => <option key={y} value={y}>{y}</option>)}
        </select>
      </div>

      {/* Banner quando sem dados */}
      {isEmpty && (
        <Card className="p-5 mb-6 border border-amber-200 bg-amber-50">
          <div className="flex items-start gap-3">
            <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-800 text-sm">Nenhum lançamento encontrado para {year}</p>
              <p className="text-xs text-amber-700 mt-1">
                Acesse <strong>Lançamentos</strong> no menu para registrar receitas e despesas. Os dados aparecerão aqui automaticamente.
              </p>
            </div>
          </div>
        </Card>
      )}

      {/* ── FLUXO DE CAIXA ──────────────────────────────────── */}
      {tab === 'fluxo' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Receitas" value={fmtBRL(totReceita)} icon={<TrendingUp size={18} />} color="green" />
            <StatCard label="Total Despesas" value={fmtBRL(totDespesa)} icon={<TrendingDown size={18} />} color="gold" />
            <StatCard label="Resultado Anual" value={fmtBRL(resultado)} icon={<DollarSign size={18} />} color={resultado >= 0 ? 'green' : 'red'} />
            <StatCard label="Meses Críticos" value={String(criticalMonths.length)} sub="saldo negativo" icon={<AlertTriangle size={18} />} color={criticalMonths.length > 0 ? 'red' : 'green'} />
          </div>

          <Card className="p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">Fluxo de Caixa Mensal — {year}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashFlowAcum}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
                <Bar dataKey="entradas" fill="#1B5E20" name="Receitas" radius={[2,2,0,0]} opacity={0.85} />
                <Bar dataKey="saidas"   fill="#F9A825" name="Despesas" radius={[2,2,0,0]} opacity={0.85} />
                <Line type="monotone" dataKey="acumulado" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} name="Acumulado" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {/* Melhor / Pior mês */}
          {melhorMes && (
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">Melhor Mês</p>
                <p className="text-lg font-bold text-emerald-700">{melhorMes.month}</p>
                <p className="text-xs text-gray-500">Resultado: {fmtBRL(melhorMes.saldo)}</p>
              </div>
              {piorMes && piorMes.month !== melhorMes.month && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-1">Pior Mês</p>
                  <p className="text-lg font-bold text-red-700">{piorMes.month}</p>
                  <p className="text-xs text-gray-500">Resultado: {fmtBRL(piorMes.saldo)}</p>
                </div>
              )}
            </div>
          )}

          {criticalMonths.length > 0 && (
            <Card className="p-4 border border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Meses com Saldo Negativo</p>
                  <p className="text-xs text-red-600 mt-1">
                    {criticalMonths.map(m => `${m.month} (${fmtBRL(m.saldo)})`).join(' | ')}
                  </p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {/* ── DRE GERENCIAL ───────────────────────────────────── */}
      {tab === 'dre' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* DRE simplificado baseado em dados reais */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-1">DRE Gerencial — {year}</h3>
            <p className="text-xs text-gray-400 mb-4">Baseado nos lançamentos do módulo Pay</p>
            <div className="space-y-2">
              {[
                { label: 'Receita Total',          value: totReceita,              level: 0, bold: false, positive: true },
                { label: '(–) Despesas Totais',    value: -totDespesa,             level: 1, bold: false, positive: false },
                { label: '= Resultado Líquido',    value: resultado,               level: 0, bold: true,  positive: resultado >= 0 },
                { label: 'Margem Líquida',         value: null, text: `${margemLiq.toFixed(1)}%`, level: 0, bold: false, positive: margemLiq >= 0 },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between text-sm py-1.5 border-b border-gray-50 ${row.level === 1 ? 'pl-3' : ''}`}>
                  <span className={row.bold ? 'font-bold text-gray-900' : 'text-gray-600'}>{row.label}</span>
                  <span className={`${row.bold ? 'font-bold' : 'font-medium'} ${row.positive ? 'text-af-green' : 'text-red-500'}`}>
                    {row.text ?? fmtBRL(row.value ?? 0)}
                  </span>
                </div>
              ))}
            </div>

            {/* Despesas por categoria */}
            {despCat.length > 0 && (
              <div className="mt-5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Despesas por Categoria</p>
                <div className="space-y-2">
                  {despCat.slice(0, 6).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                      <span className="text-xs font-semibold text-gray-800">{fmtBRL(c.value)}</span>
                      <span className="text-xs text-gray-400 w-10 text-right">{totDespesa > 0 ? ((c.value / totDespesa) * 100).toFixed(1) : 0}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </Card>

          <div className="space-y-4">
            {/* Gráfico despesas por categoria */}
            {despCat.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-4">Composição das Despesas</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <PieChart>
                    <Pie data={despCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false} fontSize={10}>
                      {despCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  </PieChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Receitas por categoria */}
            {recCat.length > 0 && (
              <Card className="p-5">
                <h3 className="font-semibold text-gray-900 mb-3">Fontes de Receita</h3>
                <div className="space-y-2">
                  {recCat.slice(0, 5).map((c, i) => (
                    <div key={c.name} className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full shrink-0 bg-af-green" style={{ opacity: 1 - i * 0.15 }} />
                      <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                      <span className="text-xs font-semibold text-af-green">{fmtBRL(c.value)}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            <Card className="p-4 bg-af-green-pale/40 border border-af-green/20">
              <h3 className="font-semibold text-af-green mb-2 text-sm">Resumo {year}</h3>
              <div className="grid grid-cols-2 gap-2 text-center">
                {[
                  ['Receita', fmtBRL(totReceita)],
                  ['Despesa', fmtBRL(totDespesa)],
                  ['Resultado', fmtBRL(resultado)],
                  ['Margem', `${margemLiq.toFixed(1)}%`],
                ].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className={`text-sm font-bold ${l === 'Despesa' || (l === 'Resultado' && resultado < 0) || (l === 'Margem' && margemLiq < 0) ? 'text-red-500' : 'text-af-green'}`}>{v}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* ── INDICADORES ─────────────────────────────────────── */}
      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: 'Margem Líquida', value: `${margemLiq.toFixed(1)}%`, status: margemLiq >= 10 ? 'ok' : margemLiq >= 0 ? 'warn' : 'bad', benchmark: '≥ 10%' },
              { label: 'Receita Média Mensal', value: fmtBRL(avgMensal), status: avgMensal > 0 ? 'ok' : 'info', benchmark: `${activeMonths} meses ativos` },
              { label: 'Meses Superavitários', value: String(cashFlow.filter(m => m.saldo > 0).length), status: cashFlow.filter(m => m.saldo > 0).length >= 10 ? 'ok' : cashFlow.filter(m => m.saldo > 0).length >= 6 ? 'warn' : 'bad', benchmark: '≥ 10 meses' },
              { label: 'Meses Deficitários', value: String(criticalMonths.length), status: criticalMonths.length === 0 ? 'ok' : criticalMonths.length <= 3 ? 'warn' : 'bad', benchmark: '0 meses' },
            ].map(ind => (
              <Card key={ind.label} className="p-5 flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${ind.status === 'ok' ? 'bg-emerald-400' : ind.status === 'warn' ? 'bg-amber-400' : ind.status === 'bad' ? 'bg-red-400' : 'bg-blue-400'}`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{ind.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{ind.value}</p>
                  <p className="text-xs text-gray-400">Referência: {ind.benchmark}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${ind.status === 'ok' ? 'bg-emerald-50 text-emerald-700' : ind.status === 'warn' ? 'bg-amber-50 text-amber-700' : ind.status === 'bad' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {ind.status === 'ok' ? 'Saudável' : ind.status === 'warn' ? 'Atenção' : ind.status === 'bad' ? 'Crítico' : 'Info'}
                </div>
              </Card>
            ))}
          </div>

          {/* Evolução mensal simplificada */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Resultado Mês a Mês — {year}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={cashFlow}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
                <Bar dataKey="saldo" name="Resultado" radius={[3,3,0,0]}
                  fill="#1B5E20"
                  label={false}
                >
                  {cashFlow.map((entry, i) => (
                    <Cell key={i} fill={entry.saldo >= 0 ? '#1B5E20' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Cenários */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Análise de Cenários — Stress Test</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Conservador', icon: '📉', pct: -15, color: 'bg-red-50 border-red-200' },
                { name: 'Base',        icon: '📊', pct: 0,   color: 'bg-gray-50 border-gray-200' },
                { name: 'Otimista',    icon: '📈', pct: 20,  color: 'bg-emerald-50 border-emerald-200' },
              ].map(s => {
                const adjRec   = totReceita * (1 + s.pct / 100)
                const adjRes   = adjRec - totDespesa
                const adjMarg  = adjRec > 0 ? (adjRes / adjRec) * 100 : 0
                return (
                  <div key={s.name} className={`rounded-xl border p-4 ${s.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">Receita {s.pct > 0 ? '+' : ''}{s.pct}%</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Receita</span><span className="font-semibold">{fmtBRL(adjRec)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Despesa</span><span className="font-semibold">{fmtBRL(totDespesa)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Resultado</span><span className={`font-bold ${adjRes < 0 ? 'text-red-500' : 'text-emerald-700'}`}>{fmtBRL(adjRes)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Margem</span><span className={`font-bold ${adjMarg < 0 ? 'text-red-500' : ''}`}>{adjMarg.toFixed(1)}%</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}
