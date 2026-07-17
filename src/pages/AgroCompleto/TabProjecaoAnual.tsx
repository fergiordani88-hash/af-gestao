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
  crescArea: number
  crescProdut: number
  varPrecoSoja: number
  varPrecoMilho: number
  infCusto: number
  infDespesas: number
}

interface AnoRow {
  safra: string
  area: number
  recBruta: number
  custoAtiv: number
  arrendamento: number
  lucBruto: number
  margBruta: number
  despesasRecorrentes: number
  dividasBancarias: number
  despesasNaoBancarias: number
  receitaLiquida: number
  margLiquida: number
}

const DEFAULT_PREMISSAS: Premissas = {
  crescArea: 2,
  crescProdut: 1,
  varPrecoSoja: 3,
  varPrecoMilho: 3,
  infCusto: 5,
  infDespesas: 5,
}

// ── Motor de projeção ─────────────────────────────────────────────────────────

function calcProjecao(
  base: DRERural,
  p: Premissas,
  dividasPorAno: Record<string, number>,
  custosFixosAnuais: number,
  despesasNaoBancariasBase: number,
): AnoRow[] {
  const c = base.calculado
  if (!c) return []

  const baseSafraAno = parseInt(base.safra.split('/')[0])
  const rows: AnoRow[] = []

  for (let i = 0; i <= 10; i++) {
    const yr = baseSafraAno + i
    const safra = i === 0 ? base.safra : `${yr}/${String(yr + 1).slice(-2)}`

    const gareaFactor   = Math.pow(1 + p.crescArea / 100, i)
    const gprodutFactor = Math.pow(1 + p.crescProdut / 100, i)
    const gsojaPreco    = Math.pow(1 + p.varPrecoSoja / 100, i)
    const gmilhoPreco   = Math.pow(1 + p.varPrecoMilho / 100, i)
    const gcusto        = Math.pow(1 + p.infCusto / 100, i)
    const gdesp         = Math.pow(1 + p.infDespesas / 100, i)

    const area       = (base.totalAreaCusteada || 0) * gareaFactor
    const sojaVol    = (base.recSojaVolume  || 0) * gareaFactor * gprodutFactor
    const sojaPreco  = (base.recSojaPreco   || 0) * gsojaPreco
    const milhoVol   = (base.recMilhoVolume || 0) * gareaFactor * gprodutFactor
    const milhoPreco = (base.recMilhoPreco  || 0) * gmilhoPreco
    const feijaoVol  = (base.recFeijaoVolume || 0) * gareaFactor * gprodutFactor
    const feijaoPreco = (base.recFeijaoPreco || 0) * gsojaPreco
    const recOutras  = (base.recOutras || 0) * gdesp

    const recBruta     = sojaVol * sojaPreco + milhoVol * milhoPreco + feijaoVol * feijaoPreco + recOutras
    const custoAtiv    = (c.custoAtiv || 0) * gareaFactor * gcusto
    const arrendamento = (c.arrendamento || 0) * gareaFactor * gsojaPreco

    const lucBruto  = recBruta - custoAtiv - arrendamento
    const margBruta = recBruta > 0 ? lucBruto / recBruta : 0

    const despesasRecorrentes    = custosFixosAnuais * gdesp
    const dividasBancarias       = dividasPorAno[String(yr)] ?? (i === 0 ? (c.despFin || 0) + (c.amort || 0) : 0)
    const despesasNaoBancarias   = despesasNaoBancariasBase * gdesp

    const receitaLiquida = lucBruto - despesasRecorrentes - dividasBancarias - despesasNaoBancarias
    const margLiquida    = recBruta > 0 ? receitaLiquida / recBruta : 0

    rows.push({
      safra, area, recBruta, custoAtiv, arrendamento,
      lucBruto, margBruta,
      despesasRecorrentes, dividasBancarias, despesasNaoBancarias,
      receitaLiquida, margLiquida,
    })
  }
  return rows
}

// ── Componente ────────────────────────────────────────────────────────────────

export function TabProjecaoAnual({ clientId }: { clientId: string }) {
  const [loading, setLoading]     = useState(true)
  const [baseDRE, setBaseDRE]     = useState<DRERural | null>(null)
  const [baseSafra, setBaseSafra] = useState<string>('')
  const [safrasDisp, setSafrasDisp] = useState<string[]>([])
  const [premissas, setPremissas] = useState<Premissas>(DEFAULT_PREMISSAS)
  const [dividasPorAno, setDividasPorAno] = useState<Record<string, number>>({})
  const [custosFixosAnuais, setCustosFixosAnuais] = useState(0)
  const [despesasNaoBancariasBase, setDespesasNaoBancariasBase] = useState(0)
  const [projecao, setProjecao]   = useState<AnoRow[]>([])
  const [showPremissas, setShowPremissas] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`projecao-premissas-${clientId}`)
      if (raw) setPremissas({ ...DEFAULT_PREMISSAS, ...JSON.parse(raw) })
    } catch { /* */ }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      historicoApi.listarDRERural(clientId),
      agroApi.contratos.cronograma(clientId).catch(() => null),
      agroApi.custosFixos.list(clientId).catch(() => []),
      agroApi.despesas.list(clientId).catch(() => []),
    ]).then(([dres, crono, custosFixos, despesas]) => {
      if (dres.length > 0) {
        const sorted = [...dres].sort((a, b) => b.safra.localeCompare(a.safra))
        const preferred = sorted.find(d => d.safra === '2026/27') ?? sorted.find(d => d.calculado) ?? sorted[0]
        setBaseDRE(preferred)
        setBaseSafra(preferred.safra)
        setSafrasDisp(sorted.map(d => d.safra))
      }

      // Dívidas bancárias por ano (total de parcelas do cronograma)
      if (crono?.porAno) {
        const mapa: Record<string, number> = {}
        for (const [ano, v] of Object.entries(crono.porAno)) {
          mapa[ano] = (v as any).total ?? 0
        }
        setDividasPorAno(mapa)
      }

      // Custos fixos anualizados (soma dos mensais × 12)
      const totalFixoMensal = custosFixos.reduce((s, cf) => s + cf.valorMensal, 0)
      setCustosFixosAnuais(totalFixoMensal * 12)

      // Despesas não bancárias: soma do ano mais recente com lançamentos
      if (despesas.length > 0) {
        const porAno: Record<number, number> = {}
        for (const d of despesas) {
          const ano = new Date(d.data).getFullYear()
          porAno[ano] = (porAno[ano] ?? 0) + d.valor
        }
        const anos = Object.keys(porAno).map(Number).sort((a, b) => b - a)
        setDespesasNaoBancariasBase(porAno[anos[0]] ?? 0)
      }
    }).finally(() => setLoading(false))
  }, [clientId])

  const handleChangeSafra = useCallback(async (safra: string) => {
    setBaseSafra(safra)
    const dre = await historicoApi.getDRERural(clientId, safra)
    if (dre) setBaseDRE(dre)
  }, [clientId])

  useEffect(() => {
    if (!baseDRE) return
    setProjecao(calcProjecao(baseDRE, premissas, dividasPorAno, custosFixosAnuais, despesasNaoBancariasBase))
  }, [baseDRE, premissas, dividasPorAno, custosFixosAnuais, despesasNaoBancariasBase])

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
    recBruta: r.recBruta,
    custos: r.custoAtiv + r.arrendamento + r.despesasRecorrentes + r.dividasBancarias + r.despesasNaoBancarias,
    lucBruto: r.lucBruto,
    receitaLiquida: r.receitaLiquida,
    margBruta: +(r.margBruta * 100).toFixed(1),
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
          Preencha e salve a DRE Rural de pelo menos uma safra antes de gerar a projeção.
        </p>
      </div>
    )
  }

  const c = baseDRE.calculado!

  // Tabela: colunas e formatação
  const cols = [
    { label: 'Safra',                    key: 'safra',                  fmt: (r: AnoRow) => r.safra, bold: true },
    { label: 'Área (ha)',                key: 'area',                   fmt: (r: AnoRow) => r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' ha' },
    { label: 'Receita Bruta',           key: 'recBruta',               fmt: (r: AnoRow) => fmtBRL(r.recBruta), color: () => 'text-emerald-700' },
    { label: 'Custo da Atividade',      key: 'custoAtiv',              fmt: (r: AnoRow) => fmtBRL(r.custoAtiv), color: () => 'text-red-500' },
    { label: 'Arrendamento',            key: 'arrendamento',           fmt: (r: AnoRow) => fmtBRL(r.arrendamento), color: () => 'text-red-400' },
    { label: 'Lucro Bruto',             key: 'lucBruto',               fmt: (r: AnoRow) => fmtBRL(r.lucBruto), bold: true, color: (r: AnoRow) => r.lucBruto >= 0 ? 'text-emerald-700' : 'text-red-600' },
    { label: 'Margem Bruta',            key: 'margBruta',              fmt: (r: AnoRow) => fmtPct(r.margBruta), color: (r: AnoRow) => r.margBruta >= 0.1 ? 'text-emerald-600' : 'text-amber-600' },
    { label: 'Desp. Recorrentes',       key: 'despesasRecorrentes',    fmt: (r: AnoRow) => fmtBRL(r.despesasRecorrentes), color: () => 'text-orange-500' },
    { label: 'Dívidas Bancárias',       key: 'dividasBancarias',       fmt: (r: AnoRow) => r.dividasBancarias > 0 ? fmtBRL(r.dividasBancarias) : '—', color: () => 'text-red-500' },
    { label: 'Desp. Não Bancárias',     key: 'despesasNaoBancarias',   fmt: (r: AnoRow) => fmtBRL(r.despesasNaoBancarias), color: () => 'text-red-400' },
    { label: 'Receita Líquida',         key: 'receitaLiquida',         fmt: (r: AnoRow) => fmtBRL(r.receitaLiquida), bold: true, color: (r: AnoRow) => r.receitaLiquida >= 0 ? 'text-emerald-800' : 'text-red-700', highlight: true },
    { label: 'Margem Líquida',          key: 'margLiquida',            fmt: (r: AnoRow) => fmtPct(r.margLiquida), color: (r: AnoRow) => r.margLiquida >= 0 ? 'text-emerald-600' : 'text-red-500' },
  ]

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Projeção Anual — 10 Anos</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Receitas e custos da DRE Rural · despesas recorrentes, dívidas bancárias e não bancárias dos lançamentos
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

      {/* Ano base */}
      <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
        <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-2">
          Ano Base — Safra {baseDRE.safra}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-sm">
          {[
            { l: 'Área (ha)',             v: (baseDRE.totalAreaCusteada || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 }) },
            { l: 'Receita Bruta',        v: fmtBRL(c.recBruta) },
            { l: 'Custo da Atividade',   v: fmtBRL(c.custoAtiv) },
            { l: 'Arrendamento',         v: fmtBRL(c.arrendamento) },
            { l: 'Lucro Bruto',          v: fmtBRL(c.lucBruto), neg: c.lucBruto < 0 },
            { l: 'Margem Bruta',         v: fmtPct(c.margBruta), neg: c.margBruta < 0 },
          ].map(k => (
            <div key={k.l}>
              <p className="text-xs text-gray-500">{k.l}</p>
              <p className={`font-bold text-base ${(k as any).neg ? 'text-red-600' : 'text-green-800'}`}>{k.v}</p>
            </div>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Info size={11} className="text-orange-500" />
            Desp. Recorrentes (custos fixos/ano): <strong className="text-gray-700 ml-1">{fmtBRL(custosFixosAnuais)}</strong>
          </span>
          <span className="flex items-center gap-1">
            <Info size={11} className="text-red-500" />
            Desp. Não Bancárias (ano base): <strong className="text-gray-700 ml-1">{fmtBRL(despesasNaoBancariasBase)}</strong>
          </span>
          {Object.keys(dividasPorAno).length > 0 && (
            <span className="flex items-center gap-1">
              <Info size={11} className="text-blue-500" />
              Dívidas bancárias: <strong className="text-gray-700 ml-1">cronograma de contratos</strong>
            </span>
          )}
        </div>
      </div>

      {/* Premissas */}
      {showPremissas && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Settings2 size={15} className="text-green-600" /> Premissas de Crescimento
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: 'crescArea'      as keyof Premissas, label: 'Crescimento de Área (%/ano)' },
              { key: 'crescProdut'    as keyof Premissas, label: 'Ganho de Produtividade (%/ano)' },
              { key: 'varPrecoSoja'   as keyof Premissas, label: 'Variação Preço Soja (%/ano)' },
              { key: 'varPrecoMilho'  as keyof Premissas, label: 'Variação Preço Milho (%/ano)' },
              { key: 'infCusto'       as keyof Premissas, label: 'Inflação Custos Operacionais (%/ano)' },
              { key: 'infDespesas'    as keyof Premissas, label: 'Inflação Despesas (%/ano)' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
                <div className="relative">
                  <input
                    type="number" step={0.5}
                    value={premissas[f.key]}
                    onChange={e => set(f.key, +e.target.value)}
                    className={inp}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                </div>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Premissas salvas por produtor. Dívidas bancárias usam o cronograma real de contratos cadastrados.
          </p>
        </Card>
      )}

      {/* Gráfico */}
      {projecao.length > 0 && (
        <Card className="p-5">
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Receita Bruta, Lucro Bruto e Receita Líquida</h4>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="safra" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="3 3" />
              <Bar dataKey="recBruta"        name="Receita Bruta"   fill="#1B5E20" opacity={0.75} radius={[2,2,0,0]} />
              <Bar dataKey="lucBruto"        name="Lucro Bruto"     fill="#4CAF50" opacity={0.75} radius={[2,2,0,0]} />
              <Line dataKey="receitaLiquida" name="Receita Líquida" stroke="#F9A825" strokeWidth={2.5} dot={{ r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Tabela de projeção */}
      {projecao.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b">
            <h4 className="font-semibold text-sm text-gray-900">Demonstrativo Anual Projetado — 10 Anos</h4>
            <p className="text-xs text-gray-400">Valores em R$ · ano base + 10 anos projetados</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {cols.map(col => (
                    <th key={col.key} className="px-2.5 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{col.label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projecao.map((r, idx) => (
                  <tr key={r.safra} className={`hover:bg-gray-50/50 ${idx === 0 ? 'bg-green-50/30' : idx % 2 === 0 ? '' : 'bg-gray-50/20'}`}>
                    {cols.map(col => {
                      const colorClass = col.color ? col.color(r) : 'text-gray-700'
                      const boldClass  = col.bold ? 'font-bold' : ''
                      const hlClass    = col.highlight ? (r.receitaLiquida >= 0 ? 'bg-emerald-50 rounded' : 'bg-red-50 rounded') : ''
                      return (
                        <td key={col.key} className={`px-2.5 py-2.5 whitespace-nowrap ${colorClass} ${boldClass} ${hlClass}`}>
                          {col.fmt(r)}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>

              {/* Totais */}
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-xs">
                  <td className="px-2.5 py-2.5 text-gray-700">10 anos</td>
                  <td className="px-2.5 py-2.5 text-gray-400">—</td>
                  {(['recBruta','custoAtiv','arrendamento','lucBruto'] as const).map(k => (
                    <td key={k} className={`px-2.5 py-2.5 whitespace-nowrap ${projecao.reduce((s,r)=>s+r[k],0) < 0 ? 'text-red-600' : 'text-gray-800'}`}>
                      {fmtBRL(projecao.reduce((s, r) => s + r[k], 0))}
                    </td>
                  ))}
                  <td className="px-2.5 py-2.5 text-gray-500">
                    {fmtPct(projecao.reduce((s,r)=>s+r.margBruta,0)/projecao.length)}
                    <span className="ml-1 text-xs font-normal text-gray-400">média</span>
                  </td>
                  {(['despesasRecorrentes','dividasBancarias','despesasNaoBancarias'] as const).map(k => (
                    <td key={k} className="px-2.5 py-2.5 text-red-600 whitespace-nowrap">
                      {fmtBRL(projecao.reduce((s, r) => s + r[k], 0))}
                    </td>
                  ))}
                  {(() => {
                    const total = projecao.reduce((s, r) => s + r.receitaLiquida, 0)
                    const margMedia = projecao.reduce((s, r) => s + r.margLiquida, 0) / projecao.length
                    return (
                      <>
                        <td className={`px-2.5 py-2.5 whitespace-nowrap font-bold rounded ${total >= 0 ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                          {fmtBRL(total)}
                        </td>
                        <td className={`px-2.5 py-2.5 whitespace-nowrap ${margMedia >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                          {fmtPct(margMedia)}
                          <span className="ml-1 text-xs font-normal text-gray-400">média</span>
                        </td>
                      </>
                    )
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
            const totalRecLiq     = projecao.reduce((s, r) => s + r.receitaLiquida, 0)
            const totalLucBruto   = projecao.reduce((s, r) => s + r.lucBruto, 0)
            const margBrutaMedia  = projecao.reduce((s, r) => s + r.margBruta, 0) / projecao.length
            const anosPositivos   = projecao.filter(r => r.receitaLiquida > 0).length
            const recFinal        = projecao[projecao.length - 1].recBruta
            const recBase         = baseDRE.calculado?.recBruta ?? 1
            const crescReceita    = ((recFinal / recBase) - 1) * 100
            return [
              { l: 'Receita Líquida 10 Anos', v: fmtBRL(totalRecLiq),    ok: totalRecLiq > 0,       icon: totalRecLiq >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/> },
              { l: 'Lucro Bruto Total',       v: fmtBRL(totalLucBruto),  ok: totalLucBruto > 0,     icon: totalLucBruto >= 0 ? <TrendingUp size={16}/> : <TrendingDown size={16}/> },
              { l: 'Margem Bruta Média',      v: fmtPct(margBrutaMedia), ok: margBrutaMedia >= 0.1,  icon: <TrendingUp size={16}/> },
              { l: 'Anos com Rec. Líq. +',    v: `${anosPositivos} de ${projecao.length}`, ok: anosPositivos >= Math.ceil(projecao.length * 0.7), icon: null },
              { l: 'Crescimento Receita',     v: `+${crescReceita.toFixed(0)}%`,           ok: crescReceita > 0, icon: <TrendingUp size={16}/> },
              { l: 'Receita Bruta no Ano 10', v: fmtBRL(recFinal),                         ok: true, icon: null },
              { l: 'Área no Ano 10 (ha)',     v: projecao[10].area.toLocaleString('pt-BR', { maximumFractionDigits: 0 }) + ' ha', ok: true, icon: null },
              { l: 'Receita Líq. no Ano 10',  v: fmtBRL(projecao[10].receitaLiquida), ok: projecao[10].receitaLiquida > 0, icon: null },
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
