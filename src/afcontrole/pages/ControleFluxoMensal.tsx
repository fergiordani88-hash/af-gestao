import { useState, useEffect } from 'react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { Download } from 'lucide-react'
import { controleStorage } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

export function ControleFluxoMensal() {
  const [ano,    setAno]    = useState(new Date().getFullYear())
  const [dados,  setDados]  = useState<any[]>([])

  useEffect(() => {
    const entries = controleStorage.getEntries().filter(e => new Date(e.dataVenc).getFullYear() === ano)
    let saldoAcum = 0
    const d = MESES.map((mes, i) => {
      const doMes = entries.filter(e => new Date(e.dataVenc).getMonth() === i)
      const rec  = doMes.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
      const desp = doMes.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)
      const res  = rec - desp
      saldoAcum += res
      const recPago  = doMes.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
      const despPago = doMes.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
      return { mes, receita: rec, despesa: desp, resultado: res, saldoAcum, caixa: recPago - despPago }
    })
    setDados(d)
  }, [ano])

  const totalRec  = dados.reduce((s, d) => s + d.receita, 0)
  const totalDesp = dados.reduce((s, d) => s + d.despesa, 0)
  const totalRes  = totalRec - totalDesp

  const handleExport = () => {
    const header = 'Mês,Receita,Despesa,Resultado,Saldo Acumulado,Caixa Líquido'
    const rows = dados.map(d => `${d.mes},${d.receita},${d.despesa},${d.resultado},${d.saldoAcum},${d.caixa}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = `fluxo-mensal-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <ControleLayout title="Fluxo de Caixa Mensal" subtitle="Evolução mês a mês — receitas, despesas, resultado e saldo acumulado">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Fluxo de Caixa Mensal</h2>
            <p className="text-xs text-gray-500 mt-0.5">Evolução mês a mês — receitas, despesas, resultado e saldo acumulado</p>
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

        {/* KPIs anuais */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Receita Total {ano}</p>
            <p className="text-xl font-bold text-emerald-700">{fmtBRL(totalRec)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Média: {fmtBRL(totalRec / 12)}/mês</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">Despesa Total {ano}</p>
            <p className="text-xl font-bold text-red-700">{fmtBRL(totalDesp)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Média: {fmtBRL(totalDesp / 12)}/mês</p>
          </div>
          <div className={`border rounded-xl p-4 ${totalRes >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-gray-500">Resultado {ano}</p>
            <p className={`text-xl font-bold ${totalRes >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRes)}</p>
            <p className="text-xs text-gray-400 mt-0.5">{totalRec > 0 ? `Margem: ${((totalRes / totalRec) * 100).toFixed(1)}%` : '—'}</p>
          </div>
        </div>

        {/* Gráfico barras */}
        {dados.some(d => d.receita > 0 || d.despesa > 0) && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Receita vs Despesa — {ano}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="receita"  name="Receita"   fill="#1B5E20" radius={[3,3,0,0]} />
                <Bar dataKey="despesa"  name="Despesa"   fill="#EF4444" radius={[3,3,0,0]} />
                <Bar dataKey="resultado" name="Resultado" fill="#1565C0" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Gráfico saldo acumulado */}
        {dados.some(d => d.saldoAcum !== 0) && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Saldo Acumulado — {ano}</h3>
            <ResponsiveContainer width="100%" height={160}>
              <LineChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Line dataKey="saldoAcum" name="Saldo Acumulado" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Tabela mensal */}
        <Card>
          <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Detalhamento Mensal — {ano}</div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Mês','Receita','Despesa','Resultado','Saldo Acum.','Situação'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {dados.map(d => (
                  <tr key={d.mes} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-bold text-gray-900">{d.mes}</td>
                    <td className="px-4 py-2.5 text-emerald-700 font-semibold">{fmtBRL(d.receita)}</td>
                    <td className="px-4 py-2.5 text-red-600 font-semibold">{fmtBRL(d.despesa)}</td>
                    <td className={`px-4 py-2.5 font-bold ${d.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(d.resultado)}</td>
                    <td className={`px-4 py-2.5 font-semibold ${d.saldoAcum >= 0 ? 'text-gray-900' : 'text-red-700'}`}>{fmtBRL(d.saldoAcum)}</td>
                    <td className="px-4 py-2.5">
                      {d.receita === 0 && d.despesa === 0 ? (
                        <span className="text-gray-300 text-xs">Sem dados</span>
                      ) : (
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.resultado >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {d.resultado >= 0 ? 'Positivo' : 'Negativo'}
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
                <tr className="bg-gray-100 font-bold">
                  <td className="px-4 py-2.5 text-gray-700">TOTAL</td>
                  <td className="px-4 py-2.5 text-emerald-700">{fmtBRL(totalRec)}</td>
                  <td className="px-4 py-2.5 text-red-600">{fmtBRL(totalDesp)}</td>
                  <td className={`px-4 py-2.5 ${totalRes >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRes)}</td>
                  <td className="px-4 py-2.5 text-gray-700">{fmtBRL(totalRes)}</td>
                  <td className="px-4 py-2.5" />
                </tr>
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ControleLayout>
  )
}
