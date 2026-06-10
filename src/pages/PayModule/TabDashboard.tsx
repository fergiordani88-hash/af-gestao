import { useState, useEffect } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle, CheckCircle, Clock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { payStorage } from '../../services/payStorage'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR')
const fmtK    = (v: number) => `${(v / 1000).toFixed(0)}k`

export function TabDashboard() {
  const [data, setData] = useState({ hist: [] as any[], nextDue: [] as any[], overdue: [] as any[], summary: null as any })

  useEffect(() => {
    const now = new Date()
    const summary = payStorage.getSummary(now.getFullYear(), now.getMonth() + 1)
    const hist    = payStorage.getLast6MonthsSummary()
    const nextDue = payStorage.getNextDue(7)
    const overdue = payStorage.getOverdue()
    setData({ hist, nextDue, overdue, summary })
  }, [])

  const { summary, hist, nextDue, overdue } = data
  const company = payStorage.getCompany()

  const kpis = summary ? [
    { label: 'Receita Prevista (mês)',  value: fmtBRL(summary.receita),        icon: TrendingUp,    bg: 'bg-emerald-50 border-emerald-200', txt: 'text-emerald-700' },
    { label: 'Despesas Previstas (mês)',value: fmtBRL(summary.despesa),        icon: TrendingDown,  bg: 'bg-red-50 border-red-200',         txt: 'text-red-700' },
    { label: 'Resultado Previsto',      value: fmtBRL(summary.resultado),      icon: DollarSign,    bg: summary.resultado >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200', txt: summary.resultado >= 0 ? 'text-blue-700' : 'text-red-700' },
    { label: 'Recebido (caixa)',        value: fmtBRL(summary.resultadoCaixa), icon: CheckCircle,   bg: 'bg-gray-50 border-gray-200',        txt: 'text-gray-700' },
  ] : []

  return (
    <div className="space-y-5">
      {/* Welcome */}
      <div>
        <h2 className="font-bold text-gray-900 text-lg">
          {company ? company.nomeFantasia : 'Dashboard Financeiro'}
        </h2>
        <p className="text-xs text-gray-500 mt-0.5">Visão geral do mês atual — acompanhe receitas, despesas e fluxo de caixa em tempo real</p>
      </div>

      {/* KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {kpis.map(k => (
            <div key={k.label} className={`p-4 rounded-xl border ${k.bg}`}>
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-gray-500">{k.label}</p>
                <k.icon size={14} className={k.txt} />
              </div>
              <p className={`text-xl font-bold ${k.txt}`}>{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Alertas */}
      {overdue.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-2">
            <AlertTriangle size={16} className="text-red-600" />
            <p className="font-semibold text-red-800 text-sm">{overdue.length} lançamento{overdue.length > 1 ? 's' : ''} em atraso</p>
          </div>
          <div className="space-y-1">
            {overdue.slice(0, 3).map(e => (
              <div key={e.id} className="flex items-center justify-between text-xs text-red-700">
                <span>{e.descricao}</span>
                <span className="font-semibold">{fmtBRL(e.valor)} · Vcto {fmtDate(e.dataVenc)}</span>
              </div>
            ))}
            {overdue.length > 3 && <p className="text-xs text-red-500 mt-1">+ {overdue.length - 3} outros em atraso</p>}
          </div>
        </div>
      )}

      {/* Gráfico histórico */}
      {hist.length > 0 && hist.some(h => h.receita > 0 || h.despesa > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Fluxo — Últimos 6 Meses</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={hist}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="receita" name="Receita"  fill="#1B5E20" radius={[3,3,0,0]} />
              <Bar dataKey="despesa" name="Despesa"  fill="#EF4444" radius={[3,3,0,0]} />
              <Bar dataKey="resultado" name="Resultado" fill="#1565C0" radius={[3,3,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Próximos vencimentos */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center gap-2">
          <Clock size={14} className="text-amber-500" />
          <span className="font-semibold text-sm text-gray-700">Vencimentos — Próximos 7 Dias</span>
        </div>
        {nextDue.length === 0 ? (
          <div className="py-8 text-center text-gray-400 text-sm">Nenhum vencimento nos próximos 7 dias</div>
        ) : (
          <div className="divide-y divide-gray-50">
            {nextDue.map(e => (
              <div key={e.id} className="flex items-center justify-between px-4 py-3">
                <div>
                  <p className="text-sm font-medium text-gray-900">{e.descricao}</p>
                  <p className="text-xs text-gray-400">{e.categoria} · Vcto {fmtDate(e.dataVenc)}</p>
                </div>
                <div className="text-right">
                  <p className={`text-sm font-bold ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {e.tipo === 'receita' ? '+' : '-'}{fmtBRL(e.valor)}
                  </p>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${e.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                    {e.tipo === 'receita' ? 'A receber' : 'A pagar'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Empty state */}
      {!summary?.receita && !summary?.despesa && (
        <div className="py-16 text-center text-gray-400">
          <DollarSign size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhum lançamento registrado ainda</p>
          <p className="text-sm mt-1">Vá em <strong>Contas a Pagar/Receber</strong> para registrar receitas e despesas</p>
        </div>
      )}
    </div>
  )
}
