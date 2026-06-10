import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download, TrendingDown } from 'lucide-react'
import { payStorage } from '../../services/payStorage'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS = ['#EF4444','#F97316','#F59E0B','#EAB308','#84CC16','#14B8A6','#6366F1','#EC4899']

export function TabDespesas() {
  const [ano,       setAno]       = useState(new Date().getFullYear())
  const [mensal,    setMensal]    = useState<any[]>([])
  const [porCat,    setPorCat]    = useState<any[]>([])
  const [total,     setTotal]     = useState(0)

  useEffect(() => {
    const entries = payStorage.getEntries().filter(e => e.tipo === 'despesa')
    const doAno   = entries.filter(e => new Date(e.dataVenc).getFullYear() === ano)

    // Mensal
    const m = Array.from({ length: 12 }, (_, i) => {
      const mv = doAno.filter(e => new Date(e.dataVenc).getMonth() === i)
      return {
        mes: MESES[i],
        pago:     mv.filter(e => e.status === 'pago').reduce((s, e) => s + e.valor, 0),
        pendente: mv.filter(e => e.status !== 'pago').reduce((s, e) => s + e.valor, 0),
      }
    })
    setMensal(m)

    // Por categoria
    const catMap: Record<string, number> = {}
    doAno.forEach(e => { catMap[e.categoria] = (catMap[e.categoria] ?? 0) + e.valor })
    const cats = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    setPorCat(cats)
    setTotal(doAno.reduce((s, e) => s + e.valor, 0))
  }, [ano])

  const handleExport = () => {
    const entries = payStorage.getEntries().filter(e => e.tipo === 'despesa' && new Date(e.dataVenc).getFullYear() === ano)
    const header = 'Categoria,Descrição,Valor,Vencimento,Status'
    const rows = entries.map(e => `${e.categoria},"${e.descricao}",${e.valor},${e.dataVenc},${e.status}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `despesas-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Análise de Despesas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Evolução mensal e distribuição por categoria</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={ano} onChange={e => setAno(+e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            {[2024, 2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
          </select>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
            <Download size={13} /> CSV
          </button>
        </div>
      </div>

      {/* KPI */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-1"><TrendingDown size={16} className="text-red-600" /><p className="text-xs text-gray-500">Total de Despesas {ano}</p></div>
          <p className="text-2xl font-bold text-red-700">{fmtBRL(total)}</p>
          <p className="text-xs text-gray-400 mt-0.5">Média mensal: {fmtBRL(total / 12)}</p>
        </div>
        {porCat.slice(0, 2).map((c, i) => (
          <div key={c.name} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
            <p className="text-xs text-gray-500">#{i + 1} Maior Categoria</p>
            <p className="text-sm font-bold text-gray-900 mt-1 truncate">{c.name}</p>
            <p className="text-lg font-bold text-red-600">{fmtBRL(c.value)}</p>
          </div>
        ))}
      </div>

      {/* Gráfico mensal */}
      {mensal.some(m => m.pago + m.pendente > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Despesas Mensais — {ano}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={mensal}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="pago"     name="Pago"     fill="#EF4444" radius={[3,3,0,0]} stackId="a" />
              <Bar dataKey="pendente" name="Pendente"  fill="#FCA5A5" radius={[3,3,0,0]} stackId="a" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Pizza por categoria */}
      {porCat.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Por Categoria — {ano}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={porCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`} labelLine={false}>
                  {porCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
          <Card>
            <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Ranking por Categoria</div>
            <div className="divide-y divide-gray-50">
              {porCat.map((c, i) => (
                <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                    <span className="text-sm text-gray-700">{c.name}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-red-600">{fmtBRL(c.value)}</p>
                    <p className="text-xs text-gray-400">{total > 0 ? `${((c.value / total) * 100).toFixed(1)}%` : '—'}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>
      )}

      {total === 0 && (
        <div className="py-16 text-center text-gray-400">
          <TrendingDown size={48} className="mx-auto mb-4 opacity-20" />
          <p className="font-medium">Nenhuma despesa lançada em {ano}</p>
          <p className="text-sm mt-1">Adicione lançamentos em <strong>Contas a Pagar/Receber</strong></p>
        </div>
      )}
    </div>
  )
}
