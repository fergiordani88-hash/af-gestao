import { useState, useEffect } from 'react'
import { Plus, Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend, ReferenceLine
} from 'recharts'
import { historicoApi, type SnapshotPJ } from '../../services/historicoApi'
import { pjApi } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function VarBadge({ val, pct = false }: { val: number | null | undefined; pct?: boolean }) {
  if (val === null || val === undefined) return <span className="text-gray-300">—</span>
  const pos = val > 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={11} /> : val === 0 ? <Minus size={11} /> : <TrendingDown size={11} />}
      {pos ? '+' : ''}{pct ? `${val.toFixed(1)}pp` : `${val.toFixed(1)}%`}
    </span>
  )
}

const CLS_COLOR: Record<string, string> = {
  saudavel: 'bg-emerald-100 text-emerald-700', atencao: 'bg-amber-100 text-amber-700',
  critico: 'bg-orange-100 text-orange-700', reestruturacao: 'bg-red-100 text-red-700',
}

export function TabHistorico({ clientId }: { clientId: string }) {
  const [historico, setHistorico] = useState<SnapshotPJ[]>([])
  const [comparativo, setComparativo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [salvando, setSalvando] = useState(false)
  const [mesAno, setMesAno] = useState(() => {
    const d = new Date(); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  })

  const load = async () => {
    setLoading(true)
    try {
      const [h, c] = await Promise.all([
        historicoApi.historicoPJ(clientId),
        historicoApi.comparativoPJ(clientId),
      ])
      setHistorico(h); setComparativo(c)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  // Salva snapshot do DRE atual para o mês selecionado
  const handleSalvarSnapshot = async () => {
    setSalvando(true)
    try {
      const dreData = await pjApi.dre.get(clientId)
      if (!dreData) { alert('Preencha o DRE primeiro antes de salvar o snapshot.'); return }
      const [ano, mes] = mesAno.split('-').map(Number)
      await historicoApi.salvarSnapshot({ ...dreData, clientId, periodo: mesAno, ano, mes })
      load()
    } finally { setSalvando(false) }
  }

  const chartData = historico.map(s => ({
    periodo: `${MESES[s.mes - 1]}/${String(s.ano).slice(2)}`,
    receita: s.receitaBruta,
    ebitda:  s.ebitda,
    lucLiq:  s.lucLiq,
    margBruta:  (s.margBruta ?? 0) * 100,
    margEbitda: (s.margEbitda ?? 0) * 100,
    margLiq:    (s.margLiq ?? 0) * 100,
    liquidezC:  s.liquidezC,
    cobDivida:  s.cobDivida,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Histórico de Indicadores</h2>
          <p className="text-xs text-gray-500 mt-0.5">Evolução mensal dos principais indicadores — compare períodos e veja tendências</p>
        </div>
        <div className="flex items-center gap-3">
          <input type="month" value={mesAno} onChange={e => setMesAno(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm" />
          <button onClick={handleSalvarSnapshot} disabled={salvando}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Save size={14} /> {salvando ? 'Salvando...' : 'Salvar snapshot'}
          </button>
        </div>
      </div>

      {/* Comparativo: atual vs anterior vs ano passado */}
      {comparativo && (
        <div>
          <h3 className="font-semibold text-gray-900 mb-3">Comparativo de Períodos</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-xs border border-gray-100 rounded-2xl overflow-hidden">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-3 text-left font-semibold text-gray-500 uppercase">Indicador</th>
                  {[
                    { label: `Atual (${comparativo.atual?.periodo ?? '—'})`, data: comparativo.atual },
                    { label: `Anterior (${comparativo.anterior?.periodo ?? '—'})`, data: comparativo.anterior },
                    { label: `Ano passado (${comparativo.mesmoMesAnoPassado?.periodo ?? '—'})`, data: comparativo.mesmoMesAnoPassado },
                  ].map(col => (
                    <th key={col.label} className="px-4 py-3 text-right font-semibold text-gray-500 uppercase whitespace-nowrap">{col.label}</th>
                  ))}
                  <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase">Variação Mês</th>
                  <th className="px-4 py-3 text-right font-semibold text-gray-500 uppercase">Variação Ano</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[
                  { label: 'Receita Bruta',   key: 'receitaBruta', fmt: fmtBRL, varKey: 'varReceitaBruta' },
                  { label: 'EBITDA',          key: 'ebitda',       fmt: fmtBRL, varKey: 'varEbitda' },
                  { label: 'Lucro Líquido',   key: 'lucLiq',       fmt: fmtBRL, varKey: null },
                  { label: 'Margem Bruta',    key: 'margBruta',    fmt: fmtPct, varKey: 'varMargLiq', isPct: true },
                  { label: 'Margem EBITDA',   key: 'margEbitda',   fmt: fmtPct, varKey: null },
                  { label: 'Margem Líquida',  key: 'margLiq',      fmt: fmtPct, varKey: 'varMargLiq', isPct: true },
                  { label: 'Liquidez Corrente',key: 'liquidezC',   fmt: (v: number) => `${v.toFixed(2)}x`, varKey: 'varLiquidezC', isPct: true },
                  { label: 'Cobertura Dívida',key: 'cobDivida',    fmt: (v: number) => `${v.toFixed(2)}x`, varKey: null },
                  { label: 'Sobra de Caixa',  key: 'sobraCaixa',   fmt: fmtBRL, varKey: null },
                ].map(row => {
                  const a  = comparativo.atual?.[row.key]
                  const p  = comparativo.anterior?.[row.key]
                  const aa = comparativo.mesmoMesAnoPassado?.[row.key]
                  const varMes = a !== undefined && p !== undefined && p !== 0
                    ? ((a - p) / Math.abs(p)) * 100 : null
                  const varAno = a !== undefined && aa !== undefined && aa !== 0
                    ? ((a - aa) / Math.abs(aa)) * 100 : null
                  return (
                    <tr key={row.label} className="hover:bg-gray-50/50">
                      <td className="px-4 py-2.5 font-medium text-gray-700">{row.label}</td>
                      <td className="px-4 py-2.5 text-right font-bold text-gray-900">{a !== undefined ? row.fmt(a) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{p !== undefined ? row.fmt(p) : '—'}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500">{aa !== undefined ? row.fmt(aa) : '—'}</td>
                      <td className="px-4 py-2.5 text-right"><VarBadge val={varMes} /></td>
                      <td className="px-4 py-2.5 text-right"><VarBadge val={varAno} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gráficos de evolução */}
      {chartData.length >= 2 && (
        <>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Evolução da Receita e Resultado (R$)</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
                <Bar dataKey="receita"  fill="#1565C0" name="Receita Bruta" opacity={0.8} radius={[2,2,0,0]} />
                <Bar dataKey="ebitda"   fill="#10B981" name="EBITDA" radius={[2,2,0,0]} />
                <Bar dataKey="lucLiq"   fill="#6366F1" name="Lucro Líquido" radius={[2,2,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Evolução das Margens (%)</h3>
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                <Tooltip formatter={(v: number) => `${v.toFixed(1)}%`} />
                <Legend />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
                <Line type="monotone" dataKey="margBruta"  stroke="#1B5E20" strokeWidth={2} dot={{ r: 3 }} name="Margem Bruta" />
                <Line type="monotone" dataKey="margEbitda" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} name="Margem EBITDA" />
                <Line type="monotone" dataKey="margLiq"    stroke="#6366F1" strokeWidth={2} dot={{ r: 3 }} name="Margem Líquida" />
              </LineChart>
            </ResponsiveContainer>
          </Card>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Liquidez Corrente</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(1)}x`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
                  <ReferenceLine y={1.5} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Ideal 1.5x', position: 'right', fontSize: 9 }} />
                  <ReferenceLine y={1.2} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Mín 1.2x', position: 'right', fontSize: 9 }} />
                  <Line type="monotone" dataKey="liquidezC" stroke="#1565C0" strokeWidth={2.5} dot={{ r: 3 }} name="Liquidez" />
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Cobertura da Dívida</h3>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="periodo" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(1)}x`} />
                  <Tooltip formatter={(v: number) => `${v.toFixed(2)}x`} />
                  <ReferenceLine y={2} stroke="#10B981" strokeDasharray="4 4" label={{ value: 'Ideal ≥2x', position: 'right', fontSize: 9 }} />
                  <ReferenceLine y={1} stroke="#F59E0B" strokeDasharray="4 4" label={{ value: 'Mín 1x', position: 'right', fontSize: 9 }} />
                  <Line type="monotone" dataKey="cobDivida" stroke="#F59E0B" strokeWidth={2.5} dot={{ r: 3 }} name="Cobertura" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
        </>
      )}

      {/* Tabela histórica completa */}
      <Card>
        <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Histórico Completo</div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Período','Receita','EBITDA','Lucro Liq.','M.Bruta','M.EBITDA','M.Líquida','Liquidez','Cob.Dívida','Sobra Caixa','Status','Δ Rec.','Δ Marg.'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {[...historico].reverse().map(s => (
                  <tr key={s.periodo} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 font-bold text-gray-900 whitespace-nowrap">{MESES[s.mes-1]}/{s.ano}</td>
                    <td className="px-3 py-2.5 font-semibold">{fmtBRL(s.receitaBruta)}</td>
                    <td className={`px-3 py-2.5 font-semibold ${(s.ebitda??0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(s.ebitda??0)}</td>
                    <td className={`px-3 py-2.5 font-semibold ${(s.lucLiq??0) >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{fmtBRL(s.lucLiq??0)}</td>
                    <td className="px-3 py-2.5">{fmtPct(s.margBruta??0)}</td>
                    <td className="px-3 py-2.5">{fmtPct(s.margEbitda??0)}</td>
                    <td className="px-3 py-2.5">{fmtPct(s.margLiq??0)}</td>
                    <td className="px-3 py-2.5">{(s.liquidezC??0).toFixed(2)}x</td>
                    <td className="px-3 py-2.5">{(s.cobDivida??0).toFixed(2)}x</td>
                    <td className={`px-3 py-2.5 font-semibold ${(s.sobraCaixa??0) >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(s.sobraCaixa??0)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CLS_COLOR[s.classificacao ?? 'atencao']}`}>
                        {s.classificacao === 'saudavel' ? '✅ Saudável' : s.classificacao === 'atencao' ? '⚠️ Atenção' : s.classificacao === 'critico' ? '🚨 Crítico' : '🔴 Reest.'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5"><VarBadge val={s.varReceitaBruta} /></td>
                    <td className="px-3 py-2.5"><VarBadge val={s.varMargLiq ? s.varMargLiq * 100 : null} pct /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {historico.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                <p>Nenhum snapshot salvo ainda</p>
                <p className="text-xs mt-1">Preencha o DRE e clique em "Salvar snapshot" para registrar o mês</p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  )
}
