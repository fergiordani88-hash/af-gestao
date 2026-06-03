import { useState, useEffect } from 'react'
import { Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'
import { questionarioApi, type DreProjetado } from '../../services/questionarioApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`
const MESES  = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

function VarBadge({ val }: { val: number | null }) {
  if (val === null) return <span className="text-gray-300 text-xs">—</span>
  const pos = val > 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={10} /> : val === 0 ? <Minus size={10} /> : <TrendingDown size={10} />}
      {pos ? '+' : ''}{val.toFixed(1)}%
    </span>
  )
}

const EMPTY_PROJ: Omit<DreProjetado, 'clientId' | 'ano' | 'mes'> = {
  receitaBruta: 0, cmv: 0, despesasFixas: 0, folha: 0,
  proLabore: 0, tributos: 0, despFinanceiras: 0, parcela: 0,
}

export function TabDREProjetado({ clientId }: { clientId: string }) {
  const [ano,         setAno]         = useState(new Date().getFullYear())
  const [comparativo, setComparativo] = useState<any[]>([])
  const [loading,     setLoading]     = useState(true)
  const [mesEdit,     setMesEdit]     = useState<number | null>(null)
  const [formEdit,    setFormEdit]    = useState<Omit<DreProjetado,'clientId'|'ano'|'mes'>>(EMPTY_PROJ)
  const [saving,      setSaving]      = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const c = await questionarioApi.dreProjetado.comparativo(clientId, ano)
      setComparativo(c)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId, ano])

  const handleEdit = (mes: number, p: any) => {
    setMesEdit(mes)
    setFormEdit(p ? {
      receitaBruta: p.receitaBruta, cmv: p.cmv, despesasFixas: p.despesasFixas, folha: p.folha,
      proLabore: p.proLabore, tributos: p.tributos, despFinanceiras: p.despFinanceiras, parcela: p.parcela,
    } : { ...EMPTY_PROJ })
  }

  const handleSave = async () => {
    if (!mesEdit) return
    setSaving(true)
    try {
      await questionarioApi.dreProjetado.save({ ...formEdit, clientId, ano, mes: mesEdit })
      setMesEdit(null)
      load()
    } finally { setSaving(false) }
  }

  // Calcula EBITDA projetado
  const ebitdaProj = (p: any) => p ? p.receitaBruta - p.cmv - p.despesasFixas - p.folha - p.proLabore : 0
  const ebitdaReal = (r: any) => r?.ebitda ?? 0

  const chartData = comparativo.map((m: any) => ({
    mes: MESES[m.mes - 1],
    'Receita Proj.': m.projetado?.receitaBruta ?? 0,
    'Receita Real':  m.realizado?.receitaBruta ?? 0,
    'EBITDA Proj.':  ebitdaProj(m.projetado),
    'EBITDA Real':   ebitdaReal(m.realizado),
  }))

  const totalProjRec  = comparativo.reduce((s, m) => s + (m.projetado?.receitaBruta ?? 0), 0)
  const totalRealRec  = comparativo.reduce((s, m) => s + (m.realizado?.receitaBruta ?? 0), 0)
  const varTotalRec   = totalProjRec > 0 ? ((totalRealRec - totalProjRec) / totalProjRec) * 100 : null

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">DRE Projetado vs. Realizado</h2>
          <p className="text-xs text-gray-500 mt-0.5">Orçamento mensal × resultado real — identifique desvios e corrija o rumo</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={ano} onChange={e => setAno(+e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* KPIs anuais */}
      {(totalProjRec > 0 || totalRealRec > 0) && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Receita Projetada (ano)', value: fmtBRL(totalProjRec), cor: 'bg-blue-50 border-blue-200' },
            { label: 'Receita Realizada (ano)', value: fmtBRL(totalRealRec), cor: totalRealRec >= totalProjRec ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
            { label: 'Variação Anual', value: varTotalRec !== null ? `${varTotalRec > 0 ? '+' : ''}${varTotalRec.toFixed(1)}%` : '—', cor: varTotalRec !== null && varTotalRec >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200' },
          ].map(k => (
            <div key={k.label} className={`p-4 rounded-xl border ${k.cor}`}>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-lg font-bold text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Gráfico comparativo */}
      {chartData.some(d => d['Receita Proj.'] > 0 || d['Receita Real'] > 0) && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Receita Projetada vs. Realizada — {ano}</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend />
              <Bar dataKey="Receita Proj." fill="#93C5FD" radius={[2,2,0,0]} />
              <Bar dataKey="Receita Real"  fill="#1565C0" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Tabela mês a mês */}
      <Card>
        <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700 flex items-center justify-between">
          <span>Comparativo Mensal — {ano}</span>
          <span className="text-xs text-gray-400">Clique em um mês para lançar o orçamento projetado</span>
        </div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Mês','Rec. Projetada','Rec. Realizada','Var.','EBITDA Proj.','EBITDA Real','Var.','Status',''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {comparativo.map((m: any) => {
                  const hasProj = m.projetado !== null
                  const hasReal = m.realizado !== null
                  const epj = ebitdaProj(m.projetado)
                  const erl = ebitdaReal(m.realizado)
                  const varRec  = hasProj && hasReal && m.projetado.receitaBruta > 0
                    ? ((m.realizado.receitaBruta - m.projetado.receitaBruta) / m.projetado.receitaBruta) * 100 : null
                  const varEbt  = hasProj && hasReal && epj !== 0
                    ? ((erl - epj) / Math.abs(epj)) * 100 : null

                  return (
                    <tr key={m.mes} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 font-bold text-gray-900">{MESES[m.mes - 1]}</td>
                      <td className="px-3 py-2.5 text-blue-700">{hasProj ? fmtBRL(m.projetado.receitaBruta) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{hasReal ? fmtBRL(m.realizado.receitaBruta) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5"><VarBadge val={varRec} /></td>
                      <td className="px-3 py-2.5 text-blue-700">{hasProj ? fmtBRL(epj) : <span className="text-gray-300">—</span>}</td>
                      <td className={`px-3 py-2.5 font-semibold ${erl >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{hasReal ? fmtBRL(erl) : <span className="text-gray-300">—</span>}</td>
                      <td className="px-3 py-2.5"><VarBadge val={varEbt} /></td>
                      <td className="px-3 py-2.5">
                        {hasProj && hasReal ? (
                          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${varRec !== null && varRec >= -5 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                            {varRec !== null && varRec >= -5 ? 'No plano' : 'Abaixo'}
                          </span>
                        ) : hasProj ? (
                          <span className="text-xs text-gray-400">Aguardando real</span>
                        ) : (
                          <span className="text-xs text-gray-300">Sem projeção</span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <button onClick={() => handleEdit(m.mes, m.projetado)}
                          className="text-xs text-blue-600 hover:underline">{hasProj ? 'Editar proj.' : '+ Projetar'}</button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {/* Modal de edição de projeção */}
      {mesEdit !== null && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="text-lg font-bold">Projeção — {MESES[mesEdit - 1]}/{ano}</h2>
              <button onClick={() => setMesEdit(null)} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
            </div>
            <div className="p-6 grid grid-cols-2 gap-4">
              {[
                ['receitaBruta', 'Receita Bruta'],['cmv','CMV'],['despesasFixas','Despesas Fixas'],
                ['folha','Folha de Pagamento'],['proLabore','Pró-labore'],['tributos','Tributos'],
                ['despFinanceiras','Desp. Financeiras'],['parcela','Parcela Bancária'],
              ].map(([key, label]) => (
                <div key={key}>
                  <label className={lbl}>{label} (R$)</label>
                  <input type="number" className={inp} value={(formEdit as any)[key] || ''}
                    onChange={e => setFormEdit(f => ({ ...f, [key]: +e.target.value }))} />
                </div>
              ))}
              {/* Preview EBITDA projetado */}
              <div className="col-span-2 bg-blue-50 rounded-xl p-3">
                <p className="text-xs text-blue-600 font-semibold">EBITDA Projetado:</p>
                <p className="text-xl font-bold text-blue-800">
                  {fmtBRL(formEdit.receitaBruta - formEdit.cmv - formEdit.despesasFixas - formEdit.folha - formEdit.proLabore)}
                </p>
              </div>
            </div>
            <div className="px-6 pb-6 flex gap-3">
              <button onClick={handleSave} disabled={saving}
                className="flex-1 bg-blue-600 text-white rounded-xl py-2.5 text-sm font-semibold hover:bg-blue-700 disabled:opacity-50">
                {saving ? 'Salvando...' : 'Salvar Projeção'}
              </button>
              <button onClick={() => setMesEdit(null)} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
