import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Settings2, Info } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { historicoApi, type DRERural } from '../../services/historicoApi'
import { agroApi } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtK = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : `${(v / 1000).toFixed(0)}k`

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Premissas {
  crescArea: number        // % ao ano
  crescProdut: number      // % produtividade por ha ao ano
  varPrecoSoja: number     // % ao ano
  varPrecoMilho: number    // % ao ano
  infCusto: number         // inflação de custos operacionais ao ano
  infAdmin: number         // inflação despesas admin ao ano
  invAnual: number         // novos investimentos R$/ano
}

interface AnoRow {
  safra: string
  area: number
  recBruta: number
  custoAtiv: number
  arrendamento: number
  lucBruto: number
  margBruta: number
  despAdmin: number
  ebitda: number
  margEbitda: number
  depreciacao: number
  ebit: number
  despFin: number
  lucLiq: number
  margLiq: number
  amort: number
  geracaoCaixa: number
}

const DEFAULT_PREMISSAS: Premissas = {
  crescArea: 2,
  crescProdut: 1,
  varPrecoSoja: 3,
  varPrecoMilho: 3,
  infCusto: 5,
  infAdmin: 5,
  invAnual: 0,
}

// ── Motor de projeção ─────────────────────────────────────────────────────────

function calcProjecao(
  base: DRERural,
  p: Premissas,
  cronoPorAno: Record<string, number>,
): AnoRow[] {
  const c = base.calculado
  if (!c) return []

  const baseSafraAno = parseInt(base.safra.split('/')[0]) // ex: "2026/27" → 2026
  const rows: AnoRow[] = []

  for (let i = 0; i <= 10; i++) {
    const yr = baseSafraAno + i
    const safra = i === 0 ? base.safra : `${yr}/${String(yr + 1).slice(-2)}`

    const gareaFactor    = Math.pow(1 + p.crescArea / 100, i)
    const gprodutFactor  = Math.pow(1 + p.crescProdut / 100, i)
    const gsojaPreco     = Math.pow(1 + p.varPrecoSoja / 100, i)
    const gmilhoPreco    = Math.pow(1 + p.varPrecoMilho / 100, i)
    const gcusto         = Math.pow(1 + p.infCusto / 100, i)
    const gadmin         = Math.pow(1 + p.infAdmin / 100, i)

    const area      = (base.totalAreaCusteada || 0) * gareaFactor
    const sojaVol   = (base.recSojaVolume  || 0) * gareaFactor * gprodutFactor
    const sojaPreco = (base.recSojaPreco   || 0) * gsojaPreco
    const milhoVol  = (base.recMilhoVolume || 0) * gareaFactor * gprodutFactor
    const milhoPreco = (base.recMilhoPreco || 0) * gmilhoPreco
    const feijaoVol  = (base.recFeijaoVolume || 0) * gareaFactor * gprodutFactor
    const feijaoPreco = (base.recFeijaoPreco || 0) * gsojaPreco
    const recOutras  = (base.recOutras || 0) * gadmin

    const recBruta = sojaVol * sojaPreco + milhoVol * milhoPreco + feijaoVol * feijaoPreco + recOutras

    // Custo da atividade cresce com área + inflação
    const custoAtiv = (c.custoAtiv || 0) * gareaFactor * gcusto
    // Arrendamento indexado ao preço da soja (geralmente pago em sacas)
    const arrendamento = (c.arrendamento || 0) * gareaFactor * gsojaPreco

    const lucBruto  = recBruta - custoAtiv - arrendamento
    const margBruta = recBruta > 0 ? lucBruto / recBruta : 0

    const despAdmin  = (c.despAdmin || 0) * gadmin
    const ebitda     = lucBruto - despAdmin
    const margEbitda = recBruta > 0 ? ebitda / recBruta : 0

    // Depreciação + depreciação incremental sobre novos investimentos (10%/ano)
    const deprBase = (c.depreciacao || 0) * gcusto
    const deprInv  = p.invAnual > 0 ? p.invAnual * i * 0.10 : 0
    const depreciacao = deprBase + deprInv

    const ebit = ebitda - depreciacao

    // Despesas financeiras do cronograma (se disponível) ou declínio natural
    const despFin = cronoPorAno[String(yr)] !== undefined
      ? cronoPorAno[String(yr)]
      : (c.despFin || 0) * Math.pow(0.85, i)

    const lucLiq  = ebit - despFin
    const margLiq = recBruta > 0 ? lucLiq / recBruta : 0

    const amort = (c.amort || 0) * Math.pow(0.85, i)
    const geracaoCaixa = lucLiq - amort

    rows.push({
      safra, area, recBruta, custoAtiv, arrendamento,
      lucBruto, margBruta, despAdmin, ebitda, margEbitda,
      depreciacao, ebit, despFin, lucLiq, margLiq, amort, geracaoCaixa,
    })
  }
  return rows
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TabProjecaoAnual({ clientId }: { clientId: string }) {
  const [loading, setLoading]   = useState(true)
  const [baseDRE, setBaseDRE]   = useState<DRERural | null>(null)
  const [baseSafra, setBaseSafra] = useState<string>('')
  const [safrasDisp, setSafrasDisp] = useState<string[]>([])
  const [premissas, setPremissas] = useState<Premissas>(DEFAULT_PREMISSAS)
  const [cronoPorAno, setCronoPorAno] = useState<Record<string, number>>({})
  const [projecao, setProjecao] = useState<AnoRow[]>([])
  const [showPremissas, setShowPremissas] = useState(true)

  // Carrega premissas do localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`projecao-premissas-${clientId}`)
      if (raw) setPremissas({ ...DEFAULT_PREMISSAS, ...JSON.parse(raw) })
    } catch { /* */ }
  }, [clientId])

  // Carrega dados base
  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      historicoApi.listarDRERural(clientId),
      agroApi.contratos.cronograma(clientId).catch(() => null),
    ]).then(([dres, crono]) => {
      if (dres.length > 0) {
        const sorted = [...dres].sort((a, b) => b.safra.localeCompare(a.safra))
        // Prioriza 26/27; senão pega a mais recente com dados calculados
        const preferred = sorted.find(d => d.safra === '2026/27') ?? sorted.find(d => d.calculado) ?? sorted[0]
        setBaseDRE(preferred)
        setBaseSafra(preferred.safra)
        setSafrasDisp(sorted.map(d => d.safra))
      }
      if (crono?.porAno) {
        const mapa: Record<string, number> = {}
        for (const [ano, v] of Object.entries(crono.porAno)) {
          const vv = v as any
          // Usa juros reais (SAC/CDI) quando disponível; fallback: 35% do total
          mapa[ano] = vv.juros > 0 ? vv.juros : vv.total * 0.35
        }
        setCronoPorAno(mapa)
      }
    }).finally(() => setLoading(false))
  }, [clientId])

  // Quando troca safra base, recarrega DRE
  const handleChangeSafra = useCallback(async (safra: string) => {
    setBaseSafra(safra)
    const dre = await historicoApi.getDRERural(clientId, safra)
    if (dre) setBaseDRE(dre)
  }, [clientId])

  // Recalcula projeção sempre que base ou premissas mudam
  useEffect(() => {
    if (!baseDRE) return
    setProjecao(calcProjecao(baseDRE, premissas, cronoPorAno))
  }, [baseDRE, premissas, cronoPorAno])

  const set = (k: keyof Premissas, v: number) => {
    setPremissas(prev => {
      const next = { ...prev, [k]: v }
      localStorage.setItem(`projecao-premissas-${clientId}`, JSON.stringify(next))
      return next
    })
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200'

  const chartData = projecao.map(r => ({
    safra: r.safra,
    recBruta:  r.recBruta,
    custos:    r.custoAtiv + r.arrendamento + r.despAdmin,
    lucLiq:    r.lucLiq,
    geracaoCaixa: r.geracaoCaixa,
    margLiq:   +(r.margLiq * 100).toFixed(1),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw size={24} className="animate-spin mr-3" />
        <span>Carregando dados de base...</span>
      </div>
    )
  }

  if (!baseDRE?.calculado) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-gray-400">
        <TrendingUp size={48} className="mb-4 opacity-30" />
        <p className="font-semibold">Nenhum DRE Rural salvo para este produtor</p>
        <p className="text-sm mt-1 text-center max-w-xs">
          Preencha e salve a DRE Rural (aba "DRE Rural") de pelo menos uma safra antes de gerar a projeção.
        </p>
      </div>
    )
  }

  const c = baseDRE.calculado!

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Projeção Anual — 10 Anos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Fluxo de caixa projetado com base na DRE Rural · receitas e custos importados automaticamente da produção
          </p>
        </div>
        <div className="flex items-center gap-2">
          {safrasDisp.length > 1 && (
            <div>
              <label className="text-xs text-gray-500 block mb-1">Safra base</label>
              <select
                value={baseSafra}
                onChange={e => handleChangeSafra(e.target.value)}
                className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white"
              >
                {safrasDisp.map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
          )}
          <div className="mt-4">
            <button
              onClick={() => setShowPremissas(p => !p)}
              className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
            >
              <Settings2 size={14} /> {showPremissas ? 'Ocultar' : 'Editar'} premissas
            </button>
          </div>
        </div>
      </div>

      {/* Ano base (DRE resumido) */}
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">
          Ano Base — Safra {baseDRE.safra}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3 text-sm">
          {[
            { l: 'Área (ha)', v: (baseDRE.totalAreaCusteada || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) },
            { l: 'Receita Bruta', v: fmtBRL(c.recBruta) },
            { l: 'Custo Total', v: fmtBRL(c.custoAtiv + c.arrendamento + c.despAdmin) },
            { l: 'EBITDA', v: fmtBRL(c.ebitda) },
            { l: 'Resultado Líquido', v: fmtBRL(c.lucLiq), neg: c.lucLiq < 0 },
            { l: 'Margem Líquida', v: fmtPct(c.margLiq), neg: c.margLiq < 0 },
          ].map(k => (
            <div key={k.l}>
              <p className="text-xs text-gray-500">{k.l}</p>
              <p className={`font-bold text-base ${(k as any).neg ? 'text-red-600' : 'text-green-800'}`}>{k.v}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
          <Info size={11} /> Receitas e custos carregados automaticamente da DRE Rural salva
        </p>
      </div>

      {/* Premissas */}
      {showPremissas && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings2 size={15} className="text-green-600" /> Premissas de Crescimento (% ao ano)
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { key: 'crescArea'     as keyof Premissas, label: 'Crescimento de Área (%/ano)', unit: '%' },
              { key: 'crescProdut'   as keyof Premissas, label: 'Ganho de Produtividade (%/ano)', unit: '%' },
              { key: 'varPrecoSoja'  as keyof Premissas, label: 'Variação Preço Soja (%/ano)', unit: '%' },
              { key: 'varPrecoMilho' as keyof Premissas, label: 'Variação Preço Milho (%/ano)', unit: '%' },
              { key: 'infCusto'      as keyof Premissas, label: 'Inflação Custos Operac. (%/ano)', unit: '%' },
              { key: 'infAdmin'      as keyof Premissas, label: 'Inflação Desp. Admin. (%/ano)', unit: '%' },
              { key: 'invAnual'      as keyof Premissas, label: 'Novos Investimentos (R$/ano)', unit: 'R$' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
                <div className="relative">
                  <input
                    type="number"
                    step={f.unit === '%' ? 0.5 : 1000}
                    value={premissas[f.key]}
                    onChange={e => set(f.key, +e.target.value)}
                    className={inp}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{f.unit}</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Premissas salvas automaticamente por produtor. Despesas financeiras são ajustadas pelo cronograma de contratos.
          </p>
        </Card>
      )}

      {/* Gráficos */}
      {projecao.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Receita, Custos e Resultado Líquido</h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="safra" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
                <Bar dataKey="recBruta" name="Receita Bruta" fill="#1B5E20" opacity={0.8} radius={[2,2,0,0]} />
                <Bar dataKey="custos"   name="Custos Totais" fill="#EF4444" opacity={0.7} radius={[2,2,0,0]} />
                <Line dataKey="lucLiq"  name="Resultado Líquido" stroke="#F9A825" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card className="p-5">
            <h4 className="font-semibold text-sm text-gray-900 mb-3">Geração de Caixa e Margem Líquida</h4>
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="safra" tick={{ fontSize: 9 }} />
                <YAxis yAxisId="left" tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 9 }} tickFormatter={v => `${v}%`} />
                <Tooltip formatter={(v: number, n: string) => n === 'Margem %' ? `${v.toFixed(1)}%` : fmtBRL(v)} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine yAxisId="left" y={0} stroke="#DC2626" strokeDasharray="3 3" />
                <Bar yAxisId="left" dataKey="geracaoCaixa" name="Geração de Caixa" fill="#1B5E20" opacity={0.85} radius={[2,2,0,0]} />
                <Line yAxisId="right" dataKey="margLiq" name="Margem %" stroke="#6366F1" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>
        </div>
      )}

      {/* Tabela de projeção */}
      {projecao.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b">
            <h4 className="font-semibold text-sm text-gray-900">Demonstrativo Anual Projetado</h4>
            <p className="text-xs text-gray-400">Valores em R$ · negativo em vermelho</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {[
                    'Safra', 'Área (ha)', 'Receita Bruta', 'Custo Ativ.',
                    'Arrendamento', 'Lucro Bruto', 'Marg. Bruta',
                    'Desp. Admin.', 'EBITDA', 'Depreciação',
                    'Result. Op. (EBIT)', 'Desp. Financ.', 'Resultado Líquido',
                    'Marg. Líq.', 'Amortizações', 'Geração de Caixa',
                  ].map(h => (
                    <th key={h} className="px-2.5 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projecao.map((r, idx) => {
                  const isPositive = (v: number) => v >= 0
                  return (
                    <tr
                      key={r.safra}
                      className={`hover:bg-gray-50/50 ${idx % 2 === 0 ? '' : 'bg-gray-50/30'}`}
                    >
                      <td className="px-2.5 py-2.5 font-bold text-gray-900 whitespace-nowrap">{r.safra}</td>
                      <td className="px-2.5 py-2.5 text-gray-700">{r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha</td>
                      <td className="px-2.5 py-2.5 font-semibold text-gray-900 whitespace-nowrap">{fmtBRL(r.recBruta)}</td>
                      <td className="px-2.5 py-2.5 text-red-500 whitespace-nowrap">{fmtBRL(r.custoAtiv)}</td>
                      <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{fmtBRL(r.arrendamento)}</td>
                      <td className={`px-2.5 py-2.5 font-bold whitespace-nowrap ${isPositive(r.lucBruto) ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(r.lucBruto)}</td>
                      <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${r.margBruta >= 0.10 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(r.margBruta)}</td>
                      <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{fmtBRL(r.despAdmin)}</td>
                      <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${isPositive(r.ebitda) ? 'text-gray-900' : 'text-red-600'}`}>{fmtBRL(r.ebitda)}</td>
                      <td className="px-2.5 py-2.5 text-gray-500 whitespace-nowrap">{fmtBRL(r.depreciacao)}</td>
                      <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${isPositive(r.ebit) ? 'text-gray-800' : 'text-red-600'}`}>{fmtBRL(r.ebit)}</td>
                      <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{fmtBRL(r.despFin)}</td>
                      <td className={`px-2.5 py-2.5 font-bold whitespace-nowrap text-base ${isPositive(r.lucLiq) ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(r.lucLiq)}</td>
                      <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${r.margLiq >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtPct(r.margLiq)}</td>
                      <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{fmtBRL(r.amort)}</td>
                      <td className={`px-2.5 py-2.5 font-bold whitespace-nowrap rounded-lg ${isPositive(r.geracaoCaixa) ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{fmtBRL(r.geracaoCaixa)}</td>
                    </tr>
                  )
                })}
              </tbody>

              {/* Totais / médias */}
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold">
                  <td className="px-2.5 py-2.5 text-gray-700">10 anos</td>
                  <td className="px-2.5 py-2.5 text-gray-500">—</td>
                  {(() => {
                    const sum = (k: keyof AnoRow) => projecao.reduce((s, r) => s + (r[k] as number), 0)
                    const avg = (k: keyof AnoRow) => sum(k) / projecao.length
                    const cols: Array<{ v: number; pct?: boolean; highlight?: boolean }> = [
                      { v: sum('recBruta') },
                      { v: sum('custoAtiv') },
                      { v: sum('arrendamento') },
                      { v: sum('lucBruto') },
                      { v: avg('margBruta'), pct: true },
                      { v: sum('despAdmin') },
                      { v: sum('ebitda') },
                      { v: sum('depreciacao') },
                      { v: sum('ebit') },
                      { v: sum('despFin') },
                      { v: sum('lucLiq') },
                      { v: avg('margLiq'), pct: true },
                      { v: sum('amort') },
                      { v: sum('geracaoCaixa'), highlight: true },
                    ]
                    return cols.map((col, i) => (
                      <td
                        key={i}
                        className={`px-2.5 py-2.5 whitespace-nowrap font-bold ${
                          col.highlight
                            ? col.v >= 0 ? 'text-emerald-800' : 'text-red-700'
                            : col.v < 0 ? 'text-red-600' : 'text-gray-800'
                        }`}
                      >
                        {col.pct ? fmtPct(col.v) : fmtBRL(col.v)}
                        {col.pct && <span className="ml-1 text-xs font-normal text-gray-400">média</span>}
                      </td>
                    ))
                  })()}
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Resumo executivo */}
      {projecao.length > 0 && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {(() => {
            const totalGeracaoCaixa  = projecao.reduce((s, r) => s + r.geracaoCaixa, 0)
            const totalLucLiq        = projecao.reduce((s, r) => s + r.lucLiq, 0)
            const margLiqMedia       = projecao.reduce((s, r) => s + r.margLiq, 0) / projecao.length
            const anosPositivos      = projecao.filter(r => r.geracaoCaixa > 0).length
            const recBrutaFinal      = projecao[projecao.length - 1].recBruta
            const recBrutaBase       = baseDRE.calculado?.recBruta ?? 1
            const crescReceita       = ((recBrutaFinal / recBrutaBase) - 1) * 100

            return [
              { l: 'Geração Total 10 Anos', v: fmtBRL(totalGeracaoCaixa), ok: totalGeracaoCaixa > 0, icon: totalGeracaoCaixa >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/> },
              { l: 'Lucro Líquido Total',   v: fmtBRL(totalLucLiq),        ok: totalLucLiq > 0,        icon: totalLucLiq >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/> },
              { l: 'Margem Líq. Média',     v: fmtPct(margLiqMedia),       ok: margLiqMedia > 0,       icon: <TrendingUp size={16}/> },
              { l: 'Anos com Caixa Positivo', v: `${anosPositivos} de 10`, ok: anosPositivos >= 7,     icon: null },
              { l: 'Crescimento Receita',   v: `+${crescReceita.toFixed(0)}%`, ok: crescReceita > 0,   icon: <TrendingUp size={16}/> },
              { l: 'Receita no Ano 10',     v: fmtBRL(recBrutaFinal),       ok: true,                  icon: null },
              { l: 'Área no Ano 10 (ha)',   v: projecao[9].area.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' ha', ok: true, icon: null },
              { l: 'EBITDA no Ano 10',      v: fmtBRL(projecao[9].ebitda), ok: projecao[9].ebitda > 0, icon: null },
            ].map(k => (
              <div key={k.l} className={`p-4 rounded-2xl border ${k.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                <div className={`flex items-center gap-1 mb-1 ${k.ok ? 'text-emerald-600' : 'text-red-500'}`}>
                  {k.icon}
                  <p className="text-xs font-medium">{k.l}</p>
                </div>
                <p className={`text-lg font-bold ${k.ok ? 'text-emerald-800' : 'text-red-700'}`}>{k.v}</p>
              </div>
            ))
          })()}
        </div>
      )}
    </div>
  )
}
