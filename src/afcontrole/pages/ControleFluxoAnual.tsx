import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { Download, TrendingUp, TrendingDown } from 'lucide-react'
import { controleStorage } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`

export function ControleFluxoAnual() {
  const [dados, setDados] = useState<any[]>([])

  useEffect(() => {
    const entries = controleStorage.getEntries()
    if (entries.length === 0) { setDados([]); return }

    const anos = [...new Set(entries.map(e => new Date(e.dataVenc).getFullYear()))].sort()
    const d = anos.map(ano => {
      const doAno = entries.filter(e => new Date(e.dataVenc).getFullYear() === ano)
      const rec  = doAno.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
      const desp = doAno.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)
      return { ano: ano.toString(), receita: rec, despesa: desp, resultado: rec - desp, margem: rec > 0 ? ((rec - desp) / rec) * 100 : 0 }
    })
    setDados(d)
  }, [])

  const handleExport = () => {
    const header = 'Ano,Receita,Despesa,Resultado,Margem%'
    const rows = dados.map(d => `${d.ano},${d.receita},${d.despesa},${d.resultado},${d.margem.toFixed(1)}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'fluxo-anual.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const melhorAno  = dados.reduce((best, d) => d.resultado > (best?.resultado ?? -Infinity) ? d : best, null as any)
  const piorAno    = dados.reduce((worst, d) => d.resultado < (worst?.resultado ?? Infinity)  ? d : worst, null as any)

  return (
    <ControleLayout title="Visão Anual" subtitle="Comparativo entre anos — receitas, despesas e resultado acumulado">
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Visão Anual</h2>
            <p className="text-xs text-gray-500 mt-0.5">Comparativo entre anos — receitas, despesas e resultado acumulado</p>
          </div>
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
            <Download size={13} /> CSV
          </button>
        </div>

        {/* Destaques */}
        {melhorAno && (
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 flex items-center gap-3">
              <TrendingUp size={24} className="text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs text-gray-500">Melhor Ano</p>
                <p className="text-lg font-bold text-emerald-700">{melhorAno.ano}</p>
                <p className="text-xs text-gray-500">Resultado: {fmtBRL(melhorAno.resultado)}</p>
              </div>
            </div>
            {piorAno && piorAno.ano !== melhorAno.ano && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
                <TrendingDown size={24} className="text-red-600 shrink-0" />
                <div>
                  <p className="text-xs text-gray-500">Pior Ano</p>
                  <p className="text-lg font-bold text-red-700">{piorAno.ano}</p>
                  <p className="text-xs text-gray-500">Resultado: {fmtBRL(piorAno.resultado)}</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Gráfico anual */}
        {dados.length > 0 && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Comparativo Anual</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="ano" tick={{ fontSize: 11 }} />
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

        {/* Tabela anual */}
        {dados.length > 0 ? (
          <Card>
            <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Tabela Comparativa Anual</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Ano','Receita Total','Despesa Total','Resultado','Margem (%)','Var. Receita','Situação'].map(h => (
                      <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {dados.map((d, i) => {
                    const prev = i > 0 ? dados[i - 1] : null
                    const varRec = prev && prev.receita > 0 ? ((d.receita - prev.receita) / prev.receita) * 100 : null
                    return (
                      <tr key={d.ano} className="hover:bg-gray-50/50">
                        <td className="px-4 py-3 font-bold text-gray-900 text-sm">{d.ano}</td>
                        <td className="px-4 py-3 text-emerald-700 font-semibold">{fmtBRL(d.receita)}</td>
                        <td className="px-4 py-3 text-red-600 font-semibold">{fmtBRL(d.despesa)}</td>
                        <td className={`px-4 py-3 font-bold ${d.resultado >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(d.resultado)}</td>
                        <td className={`px-4 py-3 font-semibold ${d.margem >= 15 ? 'text-emerald-700' : d.margem >= 0 ? 'text-amber-700' : 'text-red-700'}`}>{d.margem.toFixed(1)}%</td>
                        <td className="px-4 py-3">
                          {varRec !== null ? (
                            <span className={`font-semibold ${varRec >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                              {varRec >= 0 ? '+' : ''}{varRec.toFixed(1)}%
                            </span>
                          ) : <span className="text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-3">
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${d.resultado >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {d.resultado >= 0 ? 'Positivo' : 'Negativo'}
                          </span>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </Card>
        ) : (
          <div className="py-16 text-center text-gray-400">
            <TrendingUp size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">Nenhum dado anual disponível</p>
            <p className="text-sm mt-1">Registre lançamentos em <strong>Contas a Pagar/Receber</strong> para visualizar o comparativo anual</p>
          </div>
        )}
      </div>
    </ControleLayout>
  )
}
