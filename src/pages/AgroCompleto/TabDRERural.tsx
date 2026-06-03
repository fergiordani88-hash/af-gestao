import { useState, useEffect } from 'react'
import { Save, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, ReferenceLine } from 'recharts'
import { historicoApi, type DRERural, type HistoricoSafra } from '../../services/historicoApi'
import { agroApi } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtK   = (v: number) => `${(v / 1000).toFixed(0)}k`

const CLS_INFO: Record<string, { emoji: string; label: string; cor: string }> = {
  saudavel:       { emoji: '✅', label: 'Saudável',  cor: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
  atencao:        { emoji: '⚠️', label: 'Atenção',   cor: 'bg-amber-50 border-amber-300 text-amber-800' },
  critico:        { emoji: '🚨', label: 'Crítico',   cor: 'bg-orange-50 border-orange-300 text-orange-800' },
  reestruturacao: { emoji: '🔴', label: 'Reestruturação', cor: 'bg-red-50 border-red-300 text-red-800' },
}

const SAFRAS = ['2022/23', '2023/24', '2024/25', '2025/26']

const EMPTY_DRE: DRERural = {
  clientId: '', safra: '2024/25',
  recSojaVolume: 0, recSojaPreco: 0, recMilhoVolume: 0, recMilhoPreco: 0, recOutras: 0,
  custoSementesHa: 0, custoFertilizHa: 0, custoDefensivosHa: 0, custoDieselHa: 0, custoServicosHa: 0, custoOutrosHa: 0,
  totalAreaCusteada: 0, arrendamentoHa: 0, areaArrendada: 0,
  folha: 0, proLabore: 0, contabilidade: 0, energia: 0, internet: 0, manutencaoVeic: 0, seguros: 0, outrasAdmin: 0,
  despFinanceiras: 0, amortizacoes: 0, depreciacao: 0,
}

function VarBadge({ val }: { val: number | null | undefined }) {
  if (val === null || val === undefined) return <span className="text-gray-300">—</span>
  const pos = val > 0
  return (
    <span className={`flex items-center gap-0.5 text-xs font-semibold ${pos ? 'text-emerald-600' : 'text-red-500'}`}>
      {pos ? <TrendingUp size={11} /> : val === 0 ? <Minus size={11} /> : <TrendingDown size={11} />}
      {pos ? '+' : ''}{val.toFixed(1)}%
    </span>
  )
}

export function TabDRERural({ clientId }: { clientId: string }) {
  const [safra, setSafra] = useState('2024/25')
  const [dre, setDre]     = useState<DRERural>({ ...EMPTY_DRE, clientId, safra })
  const [calc, setCalc]   = useState<DRERural['calculado']>(undefined)
  const [historico, setHistorico] = useState<HistoricoSafra[]>([])
  const [dirty, setDirty] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const [dreData, hist] = await Promise.all([
        historicoApi.getDRERural(clientId, safra),
        historicoApi.historicoSafras(clientId),
      ])
      if (dreData) { setDre({ ...dreData, clientId }); setCalc(dreData.calculado) }
      else { setDre({ ...EMPTY_DRE, clientId, safra }); setCalc(undefined) }
      setHistorico(hist)
      setDirty(false)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId, safra])

  const set = (k: keyof DRERural, v: number) => { setDre(d => ({ ...d, [k]: v })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const result = await historicoApi.salvarDRERural({ ...dre, clientId, safra })
      setCalc(result.calculado)
      setDirty(false)

      // Salva snapshot no histórico de safras automaticamente
      if (result.calculado) {
        const c = result.calculado
        const totalArea = dre.totalAreaCusteada
        await historicoApi.salvarHistoricoSafra({
          clientId, safra, tipo: 'preenchido',
          totalArea,
          totalReceita:   c.recBruta,
          totalCusto:     c.custoAtiv + c.arrendamento + c.despAdmin,
          totalResultado: c.sobraCaixa,
          margem:         c.margBruta,
          revenueHa:      totalArea > 0 ? c.recBruta / totalArea : 0,
          resultadoHa:    totalArea > 0 ? c.sobraCaixa / totalArea : 0,
          totalDivida:    dre.amortizacoes * 12, // estimativa
          comprometimento: c.recBruta > 0 ? (dre.amortizacoes * 12) / c.recBruta : 0,
          culturas: JSON.stringify([
            { cultura: 'Soja',     volume: dre.recSojaVolume,  preco: dre.recSojaPreco, receita: c.recSoja },
            { cultura: 'Milho 2ª', volume: dre.recMilhoVolume, preco: dre.recMilhoPreco, receita: c.recMilho },
          ]),
        })
        load()
      }
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'
  const sec = 'text-xs font-bold text-gray-500 uppercase tracking-wide mb-3 mt-4 pb-1 border-b border-gray-100'

  const cls = calc?.classificacao ? CLS_INFO[calc.classificacao] : null

  const chartData = historico.map(h => ({
    safra:       h.safra,
    receita:     h.totalReceita,
    resultado:   h.totalResultado,
    margem:      h.margem * 100,
    resultadoHa: h.resultadoHa,
    varReceita:  h.varReceita,
  }))

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">DRE Rural Formal</h2>
          <p className="text-xs text-gray-500 mt-0.5">Demonstrativo de Resultado do Exercício — produtor rural · por safra</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={safra} onChange={e => setSafra(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            {SAFRAS.map(s => <option key={s}>{s}</option>)}
          </select>
          <button onClick={handleSave} disabled={saving || !dirty}
            className="flex items-center gap-2 bg-af-green hover:bg-af-green-light disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Save size={14} /> {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
      </div>

      {cls && (
        <div className={`flex items-center gap-3 p-4 rounded-2xl border-2 ${cls.cor}`}>
          <span className="text-2xl">{cls.emoji}</span>
          <div>
            <p className="font-bold">{cls.label} — Safra {safra}</p>
            <p className="text-xs opacity-80">
              Geração livre de caixa: {calc ? fmtBRL(calc.sobraCaixa) : '—'} ·
              Margem Bruta: {calc ? fmtPct(calc.margBruta) : '—'}
            </p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formulário */}
        <Card className="p-5">
          <p className={sec}>Receitas da Safra</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Soja — Volume (sacas)</label><input type="number" className={inp} value={dre.recSojaVolume || ''} onChange={e => set('recSojaVolume', +e.target.value)} /></div>
            <div><label className={lbl}>Soja — Preço (R$/sc)</label><input type="number" className={inp} value={dre.recSojaPreco || ''} onChange={e => set('recSojaPreco', +e.target.value)} /></div>
            <div><label className={lbl}>Milho 2ª — Volume (sacas)</label><input type="number" className={inp} value={dre.recMilhoVolume || ''} onChange={e => set('recMilhoVolume', +e.target.value)} /></div>
            <div><label className={lbl}>Milho 2ª — Preço (R$/sc)</label><input type="number" className={inp} value={dre.recMilhoPreco || ''} onChange={e => set('recMilhoPreco', +e.target.value)} /></div>
            <div className="col-span-2"><label className={lbl}>Outras receitas (R$)</label><input type="number" className={inp} value={dre.recOutras || ''} onChange={e => set('recOutras', +e.target.value)} /></div>
          </div>

          <p className={sec}>Custo da Atividade (R$/ha)</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Área custeada total (ha)</label><input type="number" className={inp} value={dre.totalAreaCusteada || ''} onChange={e => set('totalAreaCusteada', +e.target.value)} /></div>
            <div><label className={lbl}>Sementes</label><input type="number" className={inp} value={dre.custoSementesHa || ''} onChange={e => set('custoSementesHa', +e.target.value)} /></div>
            <div><label className={lbl}>Fertilizantes</label><input type="number" className={inp} value={dre.custoFertilizHa || ''} onChange={e => set('custoFertilizHa', +e.target.value)} /></div>
            <div><label className={lbl}>Defensivos</label><input type="number" className={inp} value={dre.custoDefensivosHa || ''} onChange={e => set('custoDefensivosHa', +e.target.value)} /></div>
            <div><label className={lbl}>Diesel / Combustível</label><input type="number" className={inp} value={dre.custoDieselHa || ''} onChange={e => set('custoDieselHa', +e.target.value)} /></div>
            <div><label className={lbl}>Serviços (plantio, colheita)</label><input type="number" className={inp} value={dre.custoServicosHa || ''} onChange={e => set('custoServicosHa', +e.target.value)} /></div>
            <div><label className={lbl}>Outros custos/ha</label><input type="number" className={inp} value={dre.custoOutrosHa || ''} onChange={e => set('custoOutrosHa', +e.target.value)} /></div>
          </div>

          <p className={sec}>Arrendamento</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Área arrendada (ha)</label><input type="number" className={inp} value={dre.areaArrendada || ''} onChange={e => set('areaArrendada', +e.target.value)} /></div>
            <div><label className={lbl}>Custo arrendamento (R$/ha)</label><input type="number" className={inp} value={dre.arrendamentoHa || ''} onChange={e => set('arrendamentoHa', +e.target.value)} /></div>
          </div>

          <p className={sec}>Despesas Administrativas (R$/ano)</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Folha de pagamento</label><input type="number" className={inp} value={dre.folha || ''} onChange={e => set('folha', +e.target.value)} /></div>
            <div><label className={lbl}>Pró-labore</label><input type="number" className={inp} value={dre.proLabore || ''} onChange={e => set('proLabore', +e.target.value)} /></div>
            <div><label className={lbl}>Contabilidade</label><input type="number" className={inp} value={dre.contabilidade || ''} onChange={e => set('contabilidade', +e.target.value)} /></div>
            <div><label className={lbl}>Energia elétrica</label><input type="number" className={inp} value={dre.energia || ''} onChange={e => set('energia', +e.target.value)} /></div>
            <div><label className={lbl}>Manutenção de veículos</label><input type="number" className={inp} value={dre.manutencaoVeic || ''} onChange={e => set('manutencaoVeic', +e.target.value)} /></div>
            <div><label className={lbl}>Seguros</label><input type="number" className={inp} value={dre.seguros || ''} onChange={e => set('seguros', +e.target.value)} /></div>
            <div><label className={lbl}>Outras administrativas</label><input type="number" className={inp} value={dre.outrasAdmin || ''} onChange={e => set('outrasAdmin', +e.target.value)} /></div>
          </div>

          <p className={sec}>Financeiro</p>
          <div className="grid grid-cols-2 gap-3">
            <div><label className={lbl}>Juros pagos (R$)</label><input type="number" className={inp} value={dre.despFinanceiras || ''} onChange={e => set('despFinanceiras', +e.target.value)} /></div>
            <div><label className={lbl}>Amortizações de dívida (R$)</label><input type="number" className={inp} value={dre.amortizacoes || ''} onChange={e => set('amortizacoes', +e.target.value)} /></div>
            <div><label className={lbl}>Depreciação (R$)</label><input type="number" className={inp} value={dre.depreciacao || ''} onChange={e => set('depreciacao', +e.target.value)} /></div>
          </div>
        </Card>

        {/* DRE Calculada */}
        {calc && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">DRE Rural — Safra {safra}</h3>
            <div className="space-y-1 text-sm">
              {[
                { label: 'Receita Bruta — Soja',     val: calc.recSoja,      indent: true },
                { label: 'Receita Bruta — Milho 2ª', val: calc.recMilho,     indent: true },
                { label: '= RECEITA BRUTA TOTAL',    val: calc.recBruta,     total: true },
                { label: '(–) Custo da Atividade',   val: -calc.custoAtiv,   neg: true, indent: true },
                { label: '(–) Custo de Arrendamento',val: -calc.arrendamento,neg: true, indent: true },
                { label: '= LUCRO BRUTO DA ATIVIDADE', val: calc.lucBruto,   total: true, pct: fmtPct(calc.margBruta) },
                { label: '(–) Despesas Administrativas', val: -calc.despAdmin, neg: true, indent: true },
                { label: '= EBITDA RURAL',           val: calc.ebitda,       total: true, pct: fmtPct(calc.margEbitda) },
                { label: '(–) Depreciação',          val: -calc.depreciacao, neg: true, indent: true },
                { label: '= EBIT (Resultado Operacional)', val: calc.ebit,   total: false },
                { label: '(–) Juros e Desp. Financeiras', val: -calc.despFin, neg: true, indent: true },
                { label: '= LUCRO LÍQUIDO',          val: calc.lucLiq,       total: true, pct: fmtPct(calc.margLiq) },
                { label: '(–) Amortização de Dívidas', val: -calc.amort,    neg: true, indent: true },
                { label: '= GERAÇÃO LIVRE DE CAIXA', val: calc.sobraCaixa,  total: true, highlight: true },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between py-1.5 border-b border-gray-50 ${r.highlight ? 'bg-af-green text-white px-2 rounded-xl' : r.total ? 'bg-green-50/60 px-2 rounded font-bold' : ''}`}>
                  <span className={`${r.indent ? 'pl-4 text-gray-500' : r.highlight ? 'text-white font-bold' : 'font-medium text-gray-800'} text-xs`}>{r.label}</span>
                  <div className="flex items-center gap-2">
                    {r.pct && <span className="text-xs text-gray-400">{r.pct}</span>}
                    <span className={`text-xs font-semibold ${r.highlight ? 'text-white text-sm' : r.val < 0 ? 'text-red-600' : r.total ? 'text-af-green' : 'text-gray-900'}`}>
                      {fmtBRL(r.val)}
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {/* KPIs resumidos */}
            <div className="grid grid-cols-2 gap-3 mt-4">
              {[
                { l: 'Custo Total/ha', v: fmtBRL(calc.custoPorHaTotal) },
                { l: 'Geração/ha', v: fmtBRL(dre.totalAreaCusteada > 0 ? calc.sobraCaixa / dre.totalAreaCusteada : 0) },
                { l: 'Margem Bruta', v: fmtPct(calc.margBruta), ok: calc.margBruta > 0.10 },
                { l: 'Margem Líquida', v: fmtPct(calc.margLiq), ok: calc.margLiq > 0 },
              ].map(k => (
                <div key={k.l} className={`p-3 rounded-xl border ${k.ok === false ? 'bg-red-50 border-red-200' : k.ok === true ? 'bg-emerald-50 border-emerald-200' : 'bg-gray-50 border-gray-100'}`}>
                  <p className="text-xs text-gray-500">{k.l}</p>
                  <p className={`text-lg font-bold ${k.ok === false ? 'text-red-700' : k.ok === true ? 'text-emerald-700' : 'text-gray-900'}`}>{k.v}</p>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {/* Histórico de safras */}
      {historico.length >= 2 && (
        <>
          <h3 className="font-bold text-gray-900">Evolução por Safra</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card className="p-5">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Receita e Resultado</h4>
              <ResponsiveContainer width="100%" height={200}>
                <BarChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="safra" tick={{ fontSize: 10 }} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Legend />
                  <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
                  <Bar dataKey="receita"   fill="#1B5E20" name="Receita" opacity={0.8} radius={[2,2,0,0]} />
                  <Bar dataKey="resultado" fill="#F9A825" name="Geração de Caixa" radius={[2,2,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-5">
              <h4 className="font-semibold text-gray-900 mb-3 text-sm">Margem & Resultado/ha</h4>
              <ResponsiveContainer width="100%" height={200}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="safra" tick={{ fontSize: 10 }} />
                  <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={v => `${v.toFixed(0)}%`} />
                  <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                  <Tooltip />
                  <Legend />
                  <ReferenceLine yAxisId="left" y={10} stroke="#10B981" strokeDasharray="4 4" />
                  <Line yAxisId="left" type="monotone" dataKey="margem" stroke="#1B5E20" strokeWidth={2.5} dot={{ r: 4 }} name="Margem %" />
                  <Line yAxisId="right" type="monotone" dataKey="resultadoHa" stroke="#F9A825" strokeWidth={2} dot={{ r: 3 }} name="R$/ha" />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>

          <Card>
            <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Comparativo por Safra</div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Safra','Área (ha)','Receita','Custo','Resultado','Margem','R$/ha','Variação Rec.','Variação R$/ha'].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {[...historico].reverse().map(h => (
                    <tr key={h.safra} className="hover:bg-gray-50/50">
                      <td className="px-3 py-2.5 font-bold text-gray-900">{h.safra}</td>
                      <td className="px-3 py-2.5">{h.totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha</td>
                      <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(h.totalReceita)}</td>
                      <td className="px-3 py-2.5 text-red-500">{fmtBRL(h.totalCusto)}</td>
                      <td className={`px-3 py-2.5 font-bold ${h.totalResultado >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(h.totalResultado)}</td>
                      <td className={`px-3 py-2.5 font-semibold ${h.margem >= 0.10 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtPct(h.margem)}</td>
                      <td className={`px-3 py-2.5 font-semibold ${h.resultadoHa >= 0 ? 'text-gray-900' : 'text-red-600'}`}>{fmtBRL(h.resultadoHa)}</td>
                      <td className="px-3 py-2.5"><VarBadge val={h.varReceita} /></td>
                      <td className="px-3 py-2.5"><VarBadge val={h.varResultadoHa} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
