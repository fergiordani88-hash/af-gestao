import { useState, useEffect, useCallback } from 'react'
import {
  TrendingUp, TrendingDown, DollarSign, AlertTriangle, Clock,
  FileText, CheckCircle2, ArrowUpRight, ArrowDownRight, Target
} from 'lucide-react'
import {
  ResponsiveContainer, ComposedChart, BarChart, Bar, LineChart, Line, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell, ReferenceLine
} from 'recharts'
import { ControleLayout } from '../layout/ControleLayout'
import { controleStorage } from '../storage/controleStorage'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtK    = (v: number) => `${(v/1000).toFixed(0)}k`
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR')
const COLORS  = ['#C9A258','#1B5E20','#1565C0','#C62828','#6A1B9A','#E65100','#00695C','#37474F']

function KpiCard({ label, value, sub, icon, color, trend }: {
  label: string; value: string; sub?: string; icon: React.ReactNode; color: string; trend?: number
}) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>{icon}</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-500 mb-1">{label}</p>
        <p className="text-xl font-bold text-gray-900 truncate">{value}</p>
        {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
      </div>
      {trend !== undefined && (
        <div className={`flex items-center gap-1 text-xs font-semibold shrink-0 ${trend >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
          {trend >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
          {Math.abs(trend).toFixed(1)}%
        </div>
      )}
    </div>
  )
}

export function ControleDashboard() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1

  const [history,     setHistory]     = useState<any[]>([])
  const [projections, setProjections] = useState<any[]>([])
  const [curSummary,  setCurSummary]  = useState({ receita: 0, despesa: 0, resultado: 0, recPago: 0, despPago: 0 })
  const [prevSummary, setPrevSummary] = useState({ receita: 0, despesa: 0 })
  const [overdue,     setOverdue]     = useState<any[]>([])
  const [nextDue,     setNextDue]     = useState<any[]>([])
  const [recCat,      setRecCat]      = useState<any[]>([])
  const [despCat,     setDespCat]     = useState<any[]>([])
  const [recent,      setRecent]      = useState<any[]>([])
  const [contracts,   setContracts]   = useState<any[]>([])

  const load = useCallback(() => {
    const hist  = controleStorage.getLast12MonthsSummary()
    const proj  = controleStorage.getProjection(3)
    const cur   = controleStorage.getSummary(year, month)
    const prev  = controleStorage.getSummary(year, month - 1 || 12)
    const ovr   = controleStorage.getOverdue()
    const nxt   = controleStorage.getNextDue(7)
    const ctrs  = controleStorage.getContracts().filter(c => c.status === 'ativo')
    const entries = controleStorage.getEntries()

    // categoria
    const rMap: Record<string, number> = {}, dMap: Record<string, number> = {}
    entries.forEach(e => {
      if (e.tipo === 'receita') rMap[e.categoria] = (rMap[e.categoria] || 0) + e.valor
      else dMap[e.categoria] = (dMap[e.categoria] || 0) + e.valor
    })

    setHistory(hist)
    setProjections(proj)
    setCurSummary(cur)
    setPrevSummary(prev)
    setOverdue(ovr)
    setNextDue(nxt)
    setContracts(ctrs)
    setRecCat(Object.entries(rMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({name,value})))
    setDespCat(Object.entries(dMap).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([name,value])=>({name,value})))
    setRecent(entries.slice(0,5))
  }, [year, month])

  useEffect(() => { load() }, [load])

  const trendRec  = prevSummary.receita > 0 ? ((curSummary.receita - prevSummary.receita) / prevSummary.receita) * 100 : 0
  const trendDesp = prevSummary.despesa > 0 ? ((curSummary.despesa - prevSummary.despesa) / prevSummary.despesa) * 100 : 0
  const meses = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']

  // Saldo real em caixa: saldo inicial + todos os lançamentos pagos
  function calcSaldoAtual() {
    const si = controleStorage.getSaldoInicial()
    if (!si) return 0
    const today = new Date().toISOString().slice(0, 10)
    const ents = controleStorage.getEntries()
    let s = si.valor
    ents.forEach(e => {
      if (e.status === 'pago') {
        const dt = e.dataPag ?? e.dataVenc
        if (dt >= si.data && dt <= today) s += e.tipo === 'receita' ? (e.valorPago ?? e.valor) : -(e.valorPago ?? e.valor)
      }
    })
    return s
  }
  const saldoCaixa = calcSaldoAtual()

  // histórico + projeção para o gráfico combinado
  const chartData = [
    ...history.map(h => ({ ...h, tipo: 'real' })),
    ...projections.map(p => ({ ...p, tipo: 'projeção' }))
  ]

  // acumulado do ano
  const yearHistory = history.filter(h => h.ano === year)
  let acum = 0
  const acumData = yearHistory.map(h => { acum += h.resultado; return { ...h, acumulado: acum } })

  const isEmpty = history.every(h => h.receita === 0 && h.despesa === 0)

  return (
    <ControleLayout title="Dashboard" subtitle={`${meses[month-1]} ${year} — Visão Geral Financeira`}>
      {/* Banner sem dados */}
      {isEmpty && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-6 flex items-start gap-3">
          <AlertTriangle size={18} className="text-amber-500 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Nenhum dado registrado ainda</p>
            <p className="text-sm text-amber-700 mt-1">Acesse <strong>Lançamentos</strong> para começar a registrar receitas e despesas. O dashboard será atualizado automaticamente.</p>
          </div>
        </div>
      )}

      {/* ── KPIs ───────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label={`Receita ${meses[month-1]}`}  value={fmtBRL(curSummary.receita)}  icon={<TrendingUp size={20} className="text-white"/>}  color="bg-emerald-600" trend={trendRec}  />
        <KpiCard label={`Despesa ${meses[month-1]}`}  value={fmtBRL(curSummary.despesa)}  icon={<TrendingDown size={20} className="text-white"/>} color="bg-red-600"     trend={trendDesp} />
        <KpiCard label="Resultado do Mês"             value={fmtBRL(curSummary.resultado)} icon={<DollarSign size={20} className="text-white"/>}  color={curSummary.resultado>=0?"bg-blue-600":"bg-orange-600"} />
        <KpiCard label="Saldo em Caixa"               value={fmtBRL(saldoCaixa)}           icon={<Target size={20} className="text-white"/>}      color="bg-[#C9A258]"  sub="saldo acumulado em caixa" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <KpiCard label="Em Atraso"        value={String(overdue.length)}    sub={overdue.length>0?fmtBRL(overdue.reduce((s,e)=>s+e.valor,0)):undefined} icon={<AlertTriangle size={20} className="text-white"/>} color={overdue.length>0?"bg-red-500":"bg-gray-400"} />
        <KpiCard label="Vencem em 7 dias" value={String(nextDue.length)}    sub={nextDue.length>0?fmtBRL(nextDue.reduce((s,e)=>s+e.valor,0)):undefined} icon={<Clock size={20} className="text-white"/>}         color="bg-amber-500" />
        <KpiCard label="Contratos Ativos" value={String(contracts.length)}  sub={contracts.length>0?`${fmtBRL(contracts.filter(c=>c.tipo==='receita').reduce((s:number,c:any)=>s+c.valor,0))} receita/mês`:undefined} icon={<FileText size={20} className="text-white"/>} color="bg-purple-600" />
        <KpiCard label="Inadimplência"    value={`${curSummary.receita>0?(((curSummary.receita-curSummary.recPago)/curSummary.receita)*100).toFixed(1):0}%`} sub="receitas não recebidas" icon={<CheckCircle2 size={20} className="text-white"/>} color="bg-slate-600" />
      </div>

      {/* ── Gráficos principais ─────────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        {/* Evolução 12m + projeção */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-bold text-gray-900">Evolução Receitas × Despesas</h3>
              <p className="text-xs text-gray-400 mt-0.5">Últimos 12 meses + projeção 3 meses</p>
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-400">
              <div className="flex items-center gap-1"><div className="w-3 h-1.5 rounded" style={{background:'#C9A258'}}/>Projeção</div>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend iconSize={10} />
              <ReferenceLine x={history[history.length-1]?.mes} stroke="#C9A258" strokeDasharray="4 2" />
              <Bar dataKey="receita" name="Receita" fill="#1B5E20" radius={[2,2,0,0]} opacity={0.85} />
              <Bar dataKey="despesa" name="Despesa" fill="#C62828" radius={[2,2,0,0]} opacity={0.85} />
              <Line type="monotone" dataKey="resultado" name="Resultado" stroke="#C9A258" strokeWidth={2} dot={{ r: 3 }} />
            </ComposedChart>
          </ResponsiveContainer>
        </div>

        {/* Composição despesas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Despesas por Categoria</h3>
          <p className="text-xs text-gray-400 mb-3">Distribuição acumulada</p>
          {despCat.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={despCat} dataKey="value" cx="50%" cy="50%" outerRadius={70} innerRadius={35}>
                    {despCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
              <div className="space-y-1.5 mt-2">
                {despCat.map((c, i) => (
                  <div key={c.name} className="flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full shrink-0" style={{background: COLORS[i % COLORS.length]}} />
                    <span className="text-xs text-gray-600 flex-1 truncate">{c.name}</span>
                    <span className="text-xs font-semibold text-gray-800">{fmtBRL(c.value)}</span>
                  </div>
                ))}
              </div>
            </>
          ) : <p className="text-xs text-gray-400 py-8 text-center">Sem dados de despesa</p>}
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mb-6">
        {/* Saldo acumulado do ano */}
        <div className="xl:col-span-2 bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Saldo Acumulado — {year}</h3>
          <p className="text-xs text-gray-400 mb-4">Evolução do resultado ao longo do ano</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={acumData}>
              <defs>
                <linearGradient id="gradAcum" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#C9A258" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#C9A258" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <ReferenceLine y={0} stroke="#C62828" strokeDasharray="4 2" />
              <Area type="monotone" dataKey="acumulado" name="Saldo Acumulado" stroke="#C9A258" strokeWidth={2} fill="url(#gradAcum)" dot={{ r: 3, fill: '#C9A258' }} />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Fontes de receita */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-1">Fontes de Receita</h3>
          <p className="text-xs text-gray-400 mb-3">Top 5 categorias</p>
          {recCat.length > 0 ? (
            <div className="space-y-3">
              {recCat.map((c, i) => {
                const total = recCat.reduce((s, r) => s + r.value, 0)
                const pct   = total > 0 ? (c.value / total) * 100 : 0
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="text-gray-700 truncate flex-1">{c.name}</span>
                      <span className="font-semibold text-emerald-700 ml-2">{pct.toFixed(1)}%</span>
                    </div>
                    <div className="w-full h-1.5 bg-gray-100 rounded-full">
                      <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: COLORS[i % COLORS.length] }} />
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">{fmtBRL(c.value)}</p>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-xs text-gray-400 py-8 text-center">Sem dados de receita</p>}
        </div>
      </div>

      {/* ── Projeções ───────────────────────────────────────── */}
      {projections.length > 0 && (projections[0].receita > 0 || projections[0].despesa > 0) && (
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm mb-6">
          <div className="flex items-center gap-2 mb-4">
            <Target size={18} className="text-[#C9A258]" />
            <div>
              <h3 className="font-bold text-gray-900">Projeção — Próximos 3 Meses</h3>
              <p className="text-xs text-gray-400">Estimativa baseada na média móvel dos últimos 3 meses</p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            {projections.map((p, i) => (
              <div key={p.mes} className="rounded-xl border border-[#C9A258]/30 p-4" style={{ background: 'rgba(201,162,88,0.04)' }}>
                <p className="text-xs text-gray-500 mb-2 font-medium">{p.mes}</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Receita</span><span className="font-semibold text-emerald-700">{fmtBRL(p.receita)}</span></div>
                  <div className="flex justify-between text-sm"><span className="text-gray-500">Despesa</span><span className="font-semibold text-red-600">{fmtBRL(p.despesa)}</span></div>
                  <div className="flex justify-between text-sm border-t pt-1.5 mt-1"><span className="font-semibold text-gray-700">Resultado</span><span className={`font-bold ${p.resultado>=0?'text-blue-700':'text-red-700'}`}>{fmtBRL(p.resultado)}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Alertas + Recentes ───────────────────────────── */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* Alertas */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Alertas</h3>
          <div className="space-y-2">
            {overdue.length > 0 && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-100 rounded-xl p-3">
                <AlertTriangle size={15} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">{overdue.length} lançamento{overdue.length>1?'s':''} em atraso</p>
                  <p className="text-xs text-red-600">Total: {fmtBRL(overdue.reduce((s,e)=>s+e.valor,0))}</p>
                </div>
              </div>
            )}
            {nextDue.slice(0,3).map(e => (
              <div key={e.id} className="flex items-center gap-3 bg-amber-50 border border-amber-100 rounded-xl p-3">
                <Clock size={14} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-amber-800 truncate">{e.descricao}</p>
                  <p className="text-xs text-amber-600">Vence: {fmtDate(e.dataVenc)}</p>
                </div>
                <span className={`text-xs font-bold ${e.tipo==='receita'?'text-emerald-700':'text-red-600'}`}>{fmtBRL(e.valor)}</span>
              </div>
            ))}
            {overdue.length === 0 && nextDue.length === 0 && (
              <p className="text-sm text-gray-400 py-4 text-center">Nenhum alerta no momento</p>
            )}
          </div>
        </div>

        {/* Últimos lançamentos */}
        <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
          <h3 className="font-bold text-gray-900 mb-4">Últimos Lançamentos</h3>
          {recent.length > 0 ? (
            <div className="space-y-2">
              {recent.map(e => (
                <div key={e.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${e.tipo==='receita'?'bg-emerald-100':'bg-red-100'}`}>
                    {e.tipo==='receita' ? <TrendingUp size={14} className="text-emerald-700"/> : <TrendingDown size={14} className="text-red-700"/>}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.descricao}</p>
                    <p className="text-xs text-gray-400">{e.categoria} · {fmtDate(e.dataVenc)}</p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className={`text-sm font-bold ${e.tipo==='receita'?'text-emerald-700':'text-red-600'}`}>{fmtBRL(e.valor)}</p>
                    <p className="text-xs text-gray-400">{e.status}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 py-4 text-center">Nenhum lançamento registrado</p>
          )}
        </div>
      </div>
    </ControleLayout>
  )
}
