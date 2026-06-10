import { useState, useEffect, useCallback } from 'react'
import { FileText, Download, Filter, X, Loader2, FileSpreadsheet, BarChart2, TrendingUp, TrendingDown } from 'lucide-react'
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, PieChart, Pie, Cell } from 'recharts'
import { ControleLayout } from '../layout/ControleLayout'
import { controleStorage, type ControleEntry } from '../storage/controleStorage'
import { downloadPDF } from '../utils/pdfExport'
import { exportExcel, exportProjectionExcel } from '../utils/excelExport'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'
const COLORS  = ['#C9A258','#1B5E20','#1565C0','#C62828','#6A1B9A','#E65100','#00695C','#37474F']

const STATUS_COR: Record<string, string> = {
  pago: 'bg-emerald-100 text-emerald-700', pendente: 'bg-amber-100 text-amber-700',
  atrasado: 'bg-red-100 text-red-700', previsto: 'bg-gray-100 text-gray-600',
}

interface Filter {
  dataInicio: string; dataFim: string; tipo: 'receita' | 'despesa' | 'ambos'
  categoria: string; status: string; valorMin: string; valorMax: string
}

const EMPTY_FILTER: Filter = { dataInicio: '', dataFim: '', tipo: 'ambos', categoria: '', status: '', valorMin: '', valorMax: '' }

type ReportView = 'lista' | 'categorias' | 'evolucao' | 'projecoes'

export function ControleRelatorios() {
  const [entries,     setEntries]     = useState<ControleEntry[]>([])
  const [filtered,    setFiltered]    = useState<ControleEntry[]>([])
  const [filter,      setFilter]      = useState<Filter>(EMPTY_FILTER)
  const [view,        setView]        = useState<ReportView>('lista')
  const [pdfLoading,  setPdfLoading]  = useState(false)
  const [xlsLoading,  setXlsLoading]  = useState(false)
  const [categories,  setCategories]  = useState<string[]>([])
  const [history,     setHistory]     = useState<any[]>([])
  const [projections, setProjections] = useState<any[]>([])
  const company = controleStorage.getCompany()

  const load = useCallback(() => {
    const all  = controleStorage.getEntries()
    const hist = controleStorage.getLast12MonthsSummary()
    const proj = controleStorage.getProjection(3)
    const cats = [...new Set(all.map(e => e.categoria))].sort()
    setEntries(all)
    setHistory(hist)
    setProjections(proj)
    setCategories(cats)
  }, [])

  useEffect(() => { load() }, [load])

  useEffect(() => {
    let result = [...entries]
    if (filter.tipo !== 'ambos') result = result.filter(e => e.tipo === filter.tipo)
    if (filter.categoria)        result = result.filter(e => e.categoria === filter.categoria)
    if (filter.status)           result = result.filter(e => e.status === filter.status)
    if (filter.dataInicio)       result = result.filter(e => e.dataVenc >= filter.dataInicio)
    if (filter.dataFim)          result = result.filter(e => e.dataVenc <= filter.dataFim)
    if (filter.valorMin)         result = result.filter(e => e.valor >= Number(filter.valorMin))
    if (filter.valorMax)         result = result.filter(e => e.valor <= Number(filter.valorMax))
    result.sort((a, b) => b.dataVenc.localeCompare(a.dataVenc))
    setFiltered(result)
  }, [entries, filter])

  const totRec  = filtered.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
  const totDesp = filtered.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)

  const catMap: Record<string, { receita: number; despesa: number; qtd: number }> = {}
  filtered.forEach(e => {
    if (!catMap[e.categoria]) catMap[e.categoria] = { receita: 0, despesa: 0, qtd: 0 }
    catMap[e.categoria][e.tipo] += e.valor
    catMap[e.categoria].qtd++
  })
  const catList = Object.entries(catMap).sort((a, b) => (b[1].receita + b[1].despesa) - (a[1].receita + a[1].despesa))

  const handlePDF = async () => {
    setPdfLoading(true)
    try {
      await downloadPDF(filtered, {
        dataInicio: filter.dataInicio || undefined,
        dataFim: filter.dataFim || undefined,
        tipo: filter.tipo,
        categoria: filter.categoria || undefined,
        status: filter.status || undefined,
        valorMin: filter.valorMin ? Number(filter.valorMin) : undefined,
        valorMax: filter.valorMax ? Number(filter.valorMax) : undefined,
      }, company?.nomeFantasia)
    } finally { setPdfLoading(false) }
  }

  const handleExcel = () => {
    setXlsLoading(true)
    try {
      exportExcel(filtered, {
        dataInicio: filter.dataInicio || undefined,
        dataFim: filter.dataFim || undefined,
        tipo: filter.tipo,
        categoria: filter.categoria || undefined,
        status: filter.status || undefined,
        valorMin: filter.valorMin ? Number(filter.valorMin) : undefined,
        valorMax: filter.valorMax ? Number(filter.valorMax) : undefined,
      }, company?.nomeFantasia ?? 'AF_Controle')
    } finally { setXlsLoading(false) }
  }

  const handleProjectionExcel = () => {
    exportProjectionExcel(history, projections)
  }

  const hasFilter = Object.values(filter).some(v => v && v !== 'ambos')

  const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#C9A258]/40 focus:border-[#C9A258] bg-white'

  return (
    <ControleLayout title="Relatórios" subtitle="Gere relatórios em PDF e Excel com filtros completos">
      {/* Painel de filtros */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 mb-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Filter size={16} className="text-[#C9A258]" />
            <span className="font-semibold text-gray-900">Filtros</span>
            {hasFilter && <span className="text-xs bg-[#C9A258] text-black px-2 py-0.5 rounded-full font-medium">Ativo</span>}
          </div>
          {hasFilter && (
            <button onClick={() => setFilter(EMPTY_FILTER)} className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700">
              <X size={13} /> Limpar
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Data Inicial</label>
            <input type="date" className={inp + ' w-full'} value={filter.dataInicio}
              onChange={e => setFilter(f => ({ ...f, dataInicio: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Data Final</label>
            <input type="date" className={inp + ' w-full'} value={filter.dataFim}
              onChange={e => setFilter(f => ({ ...f, dataFim: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Tipo</label>
            <select className={inp + ' w-full'} value={filter.tipo}
              onChange={e => setFilter(f => ({ ...f, tipo: e.target.value as any, categoria: '' }))}>
              <option value="ambos">Todos</option>
              <option value="receita">Receitas</option>
              <option value="despesa">Despesas</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoria</label>
            <select className={inp + ' w-full'} value={filter.categoria}
              onChange={e => setFilter(f => ({ ...f, categoria: e.target.value }))}>
              <option value="">Todas</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
            <select className={inp + ' w-full'} value={filter.status}
              onChange={e => setFilter(f => ({ ...f, status: e.target.value }))}>
              <option value="">Todos</option>
              <option value="pago">Pago</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
              <option value="previsto">Previsto</option>
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor Mínimo</label>
            <input type="number" className={inp + ' w-full'} placeholder="R$ 0,00" value={filter.valorMin}
              onChange={e => setFilter(f => ({ ...f, valorMin: e.target.value }))} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor Máximo</label>
            <input type="number" className={inp + ' w-full'} placeholder="Sem limite" value={filter.valorMax}
              onChange={e => setFilter(f => ({ ...f, valorMax: e.target.value }))} />
          </div>
        </div>
      </div>

      {/* Totais do filtro + botões de export */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-3">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Registros</p>
            <p className="text-lg font-bold text-gray-900">{filtered.length}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Total Receitas</p>
            <p className="text-lg font-bold text-emerald-700">{fmtBRL(totRec)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Total Despesas</p>
            <p className="text-lg font-bold text-red-600">{fmtBRL(totDesp)}</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 text-center">
            <p className="text-xs text-gray-500">Resultado</p>
            <p className={`text-lg font-bold ${totRec - totDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totRec - totDesp)}</p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button onClick={handlePDF} disabled={pdfLoading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: '#C62828' }}>
            {pdfLoading ? <Loader2 size={15} className="animate-spin" /> : <FileText size={15} />}
            PDF
          </button>
          <button onClick={handleExcel} disabled={xlsLoading || filtered.length === 0}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 transition-colors"
            style={{ background: '#1B5E20' }}>
            {xlsLoading ? <Loader2 size={15} className="animate-spin" /> : <FileSpreadsheet size={15} />}
            Excel
          </button>
          <button onClick={handleProjectionExcel}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold border border-[#C9A258] text-[#C9A258] hover:bg-[#C9A258]/10 transition-colors">
            <TrendingUp size={15} />
            Projeções Excel
          </button>
        </div>
      </div>

      {/* Abas de visualização */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-5">
        {([['lista','Lista'], ['categorias','Por Categoria'], ['evolucao','Evolução'], ['projecoes','Projeções']] as [ReportView, string][]).map(([v, l]) => (
          <button key={v} onClick={() => setView(v)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${view === v ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {l}
          </button>
        ))}
      </div>

      {/* ── LISTA ──────────────────────────────────────────── */}
      {view === 'lista' && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          {filtered.length === 0 ? (
            <div className="py-16 text-center text-gray-400">
              <FileText size={40} className="mx-auto mb-3 opacity-20" />
              <p className="font-medium">Nenhum lançamento encontrado</p>
              <p className="text-sm mt-1">Ajuste os filtros acima</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-900 text-white">
                    {['Data Venc.','Tipo','Categoria','Descrição','Valor','Status','Data Pag.'].map(h => (
                      <th key={h} className="px-4 py-3 text-left font-semibold whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((e, i) => (
                    <tr key={e.id} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap">{fmtDate(e.dataVenc)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full font-medium text-xs ${e.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {e.tipo}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{e.categoria}</td>
                      <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{e.descricao}</td>
                      <td className={`px-4 py-3 font-bold ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(e.valor)}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[e.status]}`}>{e.status}</span>
                      </td>
                      <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{e.dataPag ? fmtDate(e.dataPag) : '—'}</td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-100 font-bold">
                    <td colSpan={4} className="px-4 py-3 text-gray-700">Total ({filtered.length} registros)</td>
                    <td className="px-4 py-3">
                      <span className="text-emerald-700 block">{fmtBRL(totRec)}</span>
                      <span className="text-red-600 block">-{fmtBRL(totDesp)}</span>
                      <span className={`block border-t pt-1 mt-1 ${totRec - totDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totRec - totDesp)}</span>
                    </td>
                    <td colSpan={2} />
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── CATEGORIAS ──────────────────────────────────────── */}
      {view === 'categorias' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b font-semibold text-gray-900 flex items-center gap-2">
              <BarChart2 size={16} className="text-[#C9A258]" /> Por Categoria
            </div>
            {catList.length === 0 ? (
              <p className="text-sm text-gray-400 py-8 text-center">Sem dados</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 border-b">
                    {['Categoria','Receitas','Despesas','Resultado','Qtd'].map(h => <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
                  </tr></thead>
                  <tbody className="divide-y divide-gray-50">
                    {catList.map(([cat, v]) => (
                      <tr key={cat} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-semibold text-gray-900">{cat}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">{fmtBRL(v.receita)}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{fmtBRL(v.despesa)}</td>
                        <td className={`px-4 py-3 font-bold ${v.receita - v.despesa >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(v.receita - v.despesa)}</td>
                        <td className="px-4 py-3 text-gray-500">{v.qtd}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {catList.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Distribuição por Categoria</h3>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={catList.map(([name, v]) => ({ name, receita: v.receita, despesa: v.despesa }))} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis type="number" tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 9 }} width={90} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend />
                  <Bar dataKey="receita" name="Receita" fill="#1B5E20" radius={[0,4,4,0]} />
                  <Bar dataKey="despesa" name="Despesa" fill="#C62828" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* ── EVOLUÇÃO ────────────────────────────────────────── */}
      {view === 'evolucao' && (
        <div className="space-y-5">
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-1">Evolução Mensal — Últimos 12 Meses</h3>
            <p className="text-xs text-gray-400 mb-4">Receitas, despesas e resultado mês a mês</p>
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={history}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#1B5E20" radius={[2,2,0,0]} />
                <Bar dataKey="despesa" name="Despesa" fill="#C62828" radius={[2,2,0,0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#C9A258" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Tabela histórico */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b font-semibold text-gray-900">Histórico Mensal</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead><tr className="bg-gray-50 border-b">
                  {['Mês','Receita','Despesa','Resultado','Margem %'].map(h => <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500">{h}</th>)}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {history.map((h, i) => {
                    const margin = h.receita > 0 ? ((h.resultado / h.receita) * 100) : 0
                    return (
                      <tr key={h.mes} className={i % 2 === 1 ? 'bg-gray-50/50' : ''}>
                        <td className="px-4 py-3 font-semibold text-gray-900">{h.mes}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">{fmtBRL(h.receita)}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{fmtBRL(h.despesa)}</td>
                        <td className={`px-4 py-3 font-bold ${h.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(h.resultado)}</td>
                        <td className={`px-4 py-3 font-semibold ${margin >= 15 ? 'text-emerald-700' : margin >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{margin.toFixed(1)}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ── PROJEÇÕES ───────────────────────────────────────── */}
      {view === 'projecoes' && (
        <div className="space-y-5">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <TrendingUp size={16} className="text-amber-500 mt-0.5 shrink-0" />
            <p className="text-xs text-amber-800">Projeções calculadas pela <strong>média móvel dos últimos 3 meses</strong>. Os valores são estimativas baseadas no histórico de lançamentos registrados.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {projections.map(p => (
              <div key={p.mes} className="bg-white rounded-2xl border border-[#C9A258]/30 shadow-sm p-5">
                <div className="flex items-center gap-2 mb-4">
                  <TrendingUp size={16} className="text-[#C9A258]" />
                  <p className="font-bold text-gray-900">{p.mes}</p>
                  <span className="text-xs bg-[#C9A258]/15 text-[#C9A258] px-2 py-0.5 rounded-full font-medium ml-auto">Projeção</span>
                </div>
                <div className="space-y-2.5">
                  {[
                    { l: 'Receita Estimada', v: p.receita, c: 'text-emerald-700' },
                    { l: 'Despesa Estimada', v: p.despesa, c: 'text-red-600' },
                    { l: 'Resultado Estimado', v: p.resultado, c: p.resultado >= 0 ? 'text-blue-700' : 'text-red-700' },
                  ].map(r => (
                    <div key={r.l} className="flex justify-between items-center">
                      <span className="text-xs text-gray-500">{r.l}</span>
                      <span className={`text-sm font-bold ${r.c}`}>{fmtBRL(r.v)}</span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900">Histórico + Projeção</h3>
              <button onClick={handleProjectionExcel} className="flex items-center gap-1.5 text-xs border border-[#C9A258] text-[#C9A258] rounded-xl px-3 py-1.5 hover:bg-[#C9A258]/10">
                <FileSpreadsheet size={13} /> Excel
              </button>
            </div>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={[...history, ...projections.map(p => ({ ...p, projetado: true }))]}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="receita" name="Receita" fill="#1B5E20" radius={[2,2,0,0]} opacity={0.85} />
                <Bar dataKey="despesa" name="Despesa" fill="#C62828" radius={[2,2,0,0]} opacity={0.85} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}
    </ControleLayout>
  )
}
