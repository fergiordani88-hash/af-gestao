import { useState, useEffect } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Legend, LineChart, Line, ComposedChart } from 'recharts'
import { FileDown } from 'lucide-react'
import { agroApi, type FluxoMensal } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'
import { exportarFluxoMensalPDF } from './FluxoPDF'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK = (v: number) => `${(v / 1000).toFixed(0)}k`

export function TabFluxoMensal({ clientId }: { clientId: string }) {
  const [mensal, setMensal] = useState<FluxoMensal[]>([])
  const [porAno, setPorAno] = useState<Record<string, { entradas: number; saidas: number; resultado: number }>>({})
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [saldoStr, setSaldoStr] = useState('0')
  const [loading, setLoading] = useState(true)
  const [exportando, setExportando] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { mensal: m, porAno: pa } = await agroApi.fluxoMensal(clientId, saldoInicial)
      setMensal(m)
      setPorAno(pa)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId, saldoInicial])

  const mesesCriticos = mensal.filter(m => m.saldoFinal < 0)
  const anos = Object.keys(porAno).sort()

  const chartData = mensal.map(m => ({
    mes: m.mes.slice(0, 7),
    entradas: m.entradas,
    saidas: m.saidas,
    saldo: m.saldoFinal,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Fluxo Sintético Mensal</h2>
          <p className="text-xs text-gray-500 mt-0.5">Resumo mensal automático — projeção plurianual</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Saldo inicial:</label>
          <input
            value={saldoStr}
            onChange={e => setSaldoStr(e.target.value)}
            onBlur={() => setSaldoInicial(Number(saldoStr.replace(/[^\d]/g, '')) || 0)}
            className="w-36 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-right"
            placeholder="R$ 0"
          />
          <button
            onClick={async () => {
              setExportando(true)
              try { await exportarFluxoMensalPDF(mensal, porAno, saldoInicial) }
              finally { setExportando(false) }
            }}
            disabled={exportando || mensal.length === 0}
            className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-3 py-1.5"
          >
            <FileDown size={14} />
            {exportando ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {/* Alertas */}
      {mesesCriticos.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
          <p className="text-sm font-bold text-red-800 mb-1">⚠️ {mesesCriticos.length} meses com saldo negativo</p>
          <p className="text-xs text-red-600">
            {mesesCriticos.slice(0, 6).map(m => `${m.mes} (${fmtBRL(m.saldoFinal)})`).join(' · ')}
            {mesesCriticos.length > 6 && ` ... +${mesesCriticos.length - 6} mais`}
          </p>
        </div>
      )}

      {/* Gráfico */}
      {mensal.length > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Entradas × Saídas × Saldo — Projeção Mensal</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
              <Bar dataKey="entradas" fill="#10B981" name="Entradas" opacity={0.8} radius={[2,2,0,0]} />
              <Bar dataKey="saidas" fill="#EF4444" name="Saídas" opacity={0.8} radius={[2,2,0,0]} />
              <Line type="monotone" dataKey="saldo" stroke="#1B5E20" strokeWidth={2.5} dot={{ r: 2 }} name="Saldo" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Resumo por ano */}
      {anos.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {anos.map(ano => {
            const a = porAno[ano]
            return (
              <div key={ano} className="bg-white border border-gray-100 rounded-xl p-4">
                <p className="text-sm font-bold text-gray-900 mb-2">{ano}</p>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between"><span className="text-gray-500">Entradas</span><span className="text-emerald-700 font-semibold">{fmtBRL(a.entradas)}</span></div>
                  <div className="flex justify-between"><span className="text-gray-500">Saídas</span><span className="text-red-600 font-semibold">{fmtBRL(a.saidas)}</span></div>
                  <div className="flex justify-between border-t pt-1"><span className="font-semibold text-gray-700">Resultado</span><span className={`font-bold ${a.resultado >= 0 ? 'text-af-green' : 'text-red-600'}`}>{fmtBRL(a.resultado)}</span></div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Tabela mensal */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Detalhamento Mensal</div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Calculando...</div> : (
          <div className="overflow-x-auto max-h-[50vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>
                  {['Mês', 'Saldo Inicial', 'Entradas', 'Saídas', 'Saldo Final'].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {mensal.map((m, i) => (
                  <tr key={i} className={`hover:bg-gray-50/50 ${m.saldoFinal < 0 ? 'bg-red-50/40' : ''}`}>
                    <td className="px-4 py-2.5 font-medium text-gray-900">{m.mes}</td>
                    <td className="px-4 py-2.5 text-gray-600">{fmtBRL(m.saldoInicial)}</td>
                    <td className="px-4 py-2.5 text-emerald-700 font-semibold">{m.entradas > 0 ? fmtBRL(m.entradas) : '—'}</td>
                    <td className="px-4 py-2.5 text-red-600 font-semibold">{m.saidas > 0 ? fmtBRL(m.saidas) : '—'}</td>
                    <td className={`px-4 py-2.5 font-bold ${m.saldoFinal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmtBRL(m.saldoFinal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {mensal.length === 0 && <div className="py-12 text-center text-gray-400 text-sm">Nenhum dado — cadastre contratos, despesas ou receitas</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
