import { useState, useEffect } from 'react'
import { ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend } from 'recharts'
import { pjApi } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtX   = (v: number) => `${v.toFixed(2)}x`

export function TabStressTest({ clientId }: { clientId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [variacao, setVariacao] = useState(0.3)
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { const r = await pjApi.stressTest.get(clientId); setData(r); if (r?.premissas) setVariacao(r.premissas.variacaoAlta) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleSavePremissas = async () => {
    setSaving(true)
    try {
      await pjApi.stressTest.savePremissas({ clientId, variacaoAlta: variacao, variacaoQueda: -variacao })
      load()
    } finally { setSaving(false) }
  }

  if (loading) return <div className="py-10 text-center text-gray-400">Calculando cenários...</div>
  if (!data) return (
    <div className="py-16 text-center text-gray-400">
      <p>Preencha o DRE primeiro para gerar os cenários</p>
    </div>
  )

  const { cenarios, meses12, premissas, statusAlta } = data
  const c = cenarios

  const statusColors = { 'Confortável': 'text-emerald-700 bg-emerald-50 border-emerald-200', 'Atenção': 'text-amber-700 bg-amber-50 border-amber-200', 'Crítico': 'text-red-700 bg-red-50 border-red-200' }
  const sc = statusColors[statusAlta as keyof typeof statusColors] ?? statusColors['Atenção']

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Stress Test — Cenários</h2>
          <p className="text-xs text-gray-500 mt-0.5">Impacto de variações nas vendas sobre resultado, EBITDA e caixa projetado</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-semibold text-gray-600">Variação Alta/Queda:</label>
            <input type="number" step="0.05" min="0.05" max="2" value={variacao}
              onChange={e => setVariacao(+e.target.value)}
              className="w-20 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-right" />
            <span className="text-xs text-gray-500">= {(variacao * 100).toFixed(0)}%</span>
          </div>
          <button onClick={handleSavePremissas} disabled={saving}
            className="bg-orange-500 text-white rounded-xl px-3 py-1.5 text-sm font-semibold hover:bg-orange-600 disabled:opacity-50">
            {saving ? 'Salvando...' : 'Recalcular'}
          </button>
        </div>
      </div>

      {/* Status geral */}
      <div className={`flex items-center gap-3 p-4 rounded-xl border-2 ${sc}`}>
        <span className="text-2xl">{statusAlta === 'Confortável' ? '✅' : statusAlta === 'Atenção' ? '⚠️' : '🚨'}</span>
        <div>
          <p className="font-bold">Cenário Alta: {statusAlta}</p>
          <p className="text-xs opacity-80">Com variação de +{(premissas.variacaoAlta * 100).toFixed(0)}% nas vendas, o caixa acumulado de 12 meses é {fmtBRL(meses12[11]?.saldoFinal ?? 0)}</p>
        </div>
      </div>

      {/* 3 cenários comparados */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Cenário Queda', k: 'queda', icon: '📉', color: 'border-red-300 bg-red-50' },
          { label: 'Cenário Base', k: 'base', icon: '📊', color: 'border-gray-200 bg-gray-50' },
          { label: 'Cenário Alta', k: 'alta', icon: '📈', color: 'border-emerald-300 bg-emerald-50' },
        ].map(({ label, k, icon, color }) => {
          const s = c[k]
          return (
            <div key={k} className={`rounded-2xl border-2 p-4 ${color}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-xl">{icon}</span>
                <div>
                  <p className="font-bold text-sm text-gray-900">{label}</p>
                  <p className="text-xs text-gray-500">{s.variacao >= 0 ? '+' : ''}{(s.variacao * 100).toFixed(0)}% nas vendas</p>
                </div>
              </div>
              <div className="space-y-1.5 text-xs">
                {[
                  ['Receita', fmtBRL(s.rec)],
                  ['CMV', fmtBRL(s.cmvP)],
                  ['Despesa Fixa', fmtBRL(s.despF)],
                  ['EBITDA', fmtBRL(s.ebitda)],
                  ['Margem EBITDA', fmtPct(s.margE)],
                  ['Cobertura Dívida', fmtX(s.cobD)],
                  ['Lucro Líquido', fmtBRL(s.lucLiq)],
                  ['Sobra de Caixa', fmtBRL(s.sobra)],
                ].map(([lbl, val]) => (
                  <div key={String(lbl)} className="flex justify-between">
                    <span className="text-gray-500">{lbl}</span>
                    <span className={`font-semibold ${String(val).startsWith('-') || String(val).startsWith('R$ -') ? 'text-red-700' : 'text-gray-900'}`}>{val}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Projeção 12 meses */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Projeção 12 Meses — Cenário Alta (+{(premissas.variacaoAlta * 100).toFixed(0)}%)</h3>
        <ResponsiveContainer width="100%" height={240}>
          <ComposedChart data={meses12}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="mes" tickFormatter={v => `M${v}`} tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
            <Tooltip formatter={(v: number) => fmtBRL(v)} labelFormatter={v => `Mês ${v}`} />
            <Legend />
            <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
            <Bar dataKey="ebitda" fill="#1565C0" name="EBITDA" opacity={0.8} radius={[2,2,0,0]} />
            <Bar dataKey="lucroLiq" fill="#10B981" name="Lucro Líquido" opacity={0.8} radius={[2,2,0,0]} />
            <Line type="monotone" dataKey="saldoFinal" stroke="#F9A825" strokeWidth={2.5} dot={{ r: 2 }} name="Saldo Caixa" />
          </ComposedChart>
        </ResponsiveContainer>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Mês', 'Receita', 'CMV', 'Desp. Fixa', 'EBITDA', 'Lucro Liq.', 'Geração', 'Saldo Caixa'].map(h => (
                  <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {meses12.map((m: any) => (
                <tr key={m.mes} className={`hover:bg-gray-50/50 ${m.saldoFinal < 0 ? 'bg-red-50/30' : ''}`}>
                  <td className="px-2 py-1.5 font-medium text-gray-900">M{m.mes}</td>
                  <td className="px-2 py-1.5">{fmtBRL(m.receita)}</td>
                  <td className="px-2 py-1.5 text-red-500">{fmtBRL(m.cmv)}</td>
                  <td className="px-2 py-1.5 text-red-500">{fmtBRL(m.despesaFixa)}</td>
                  <td className="px-2 py-1.5 font-semibold text-blue-700">{fmtBRL(m.ebitda)}</td>
                  <td className="px-2 py-1.5 font-semibold text-emerald-700">{fmtBRL(m.lucroLiq)}</td>
                  <td className={`px-2 py-1.5 font-semibold ${m.geracao >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(m.geracao)}</td>
                  <td className={`px-2 py-1.5 font-bold ${m.saldoFinal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmtBRL(m.saldoFinal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Premissas */}
      <Card className="p-4 bg-gray-50">
        <h3 className="font-semibold text-sm text-gray-700 mb-2">Premissas do Modelo</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-xs text-gray-600">
          <div><span className="text-gray-400">% Custo variável / receita:</span> <strong>{(premissas.pctCustoVar * 100).toFixed(1)}%</strong></div>
          <div><span className="text-gray-400">% Desp. fixa que varia:</span> <strong>{(premissas.pctDespFixaVar * 100).toFixed(1)}%</strong></div>
          <div><span className="text-gray-400">Variação queda:</span> <strong className="text-red-600">{(premissas.variacaoQueda * 100).toFixed(0)}%</strong></div>
          <div><span className="text-gray-400">Variação alta:</span> <strong className="text-emerald-600">+{(premissas.variacaoAlta * 100).toFixed(0)}%</strong></div>
        </div>
      </Card>
    </div>
  )
}
