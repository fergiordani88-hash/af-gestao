import { useState, useEffect, useCallback } from 'react'
import { TrendingUp, TrendingDown, RefreshCw, Settings2, Info, Sprout } from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, ReferenceLine,
} from 'recharts'
import { agroApi, type AgroProducao } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtK = (v: number) =>
  Math.abs(v) >= 1_000_000
    ? `${(v / 1_000_000).toFixed(1)}M`
    : `${(v / 1000).toFixed(0)}k`

// ── Helpers ───────────────────────────────────────────────────────────────────

function anoFromSafra(safra: string): number {
  return parseInt(safra.split('/')[0])
}

function calcProducaoRow(p: AgroProducao) {
  const recBruta     = p.area * p.produtividade * p.cotacao
  const custoAtiv    = p.area * p.custoPorHa * p.cotacao
  const arrendamento = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
  return { recBruta, custoAtiv, arrendamento, area: p.area, cultura: p.cultura }
}

// Agrupa producoes por ano corrente
function agruparPorAno(producoes: AgroProducao[]): Record<number, AgroProducao[]> {
  const mapa: Record<number, AgroProducao[]> = {}
  for (const p of producoes) {
    const ano = anoFromSafra(p.safra)
    if (!mapa[ano]) mapa[ano] = []
    mapa[ano].push(p)
  }
  return mapa
}

// ── Tipos ──────────────────────────────────────────────────────────────────────

interface Premissas {
  crescArea: number
  crescProdut: number
  varPreco: number
  infCusto: number
  infDespesas: number
}

interface AnoRow {
  ano: number
  culturas: string[]           // culturas ativas neste ano
  isReal: boolean              // dados reais (true) ou projetados (false)
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
  varPreco: 3,
  infCusto: 5,
  infDespesas: 5,
}

const ANO_INICIO = 2026
const ANO_FIM    = 2035

// ── Motor de projeção ─────────────────────────────────────────────────────────

function calcProjecao(
  producaoPorAno: Record<number, AgroProducao[]>,
  p: Premissas,
  dividasPorAno: Record<string, number>,
  custosFixosAnuais: number,
  despesasNaoBancariasBase: number,
  despesasNaoBancariasReais: Record<number, number>,
): AnoRow[] {
  // Determina o último ano com dados reais
  const anosReais = Object.keys(producaoPorAno).map(Number).sort((a, b) => a - b)
  const ultimoAnoReal = anosReais.length > 0 ? Math.max(...anosReais) : ANO_INICIO
  const baseProducoes  = producaoPorAno[ultimoAnoReal] ?? []

  const rows: AnoRow[] = []

  for (let ano = ANO_INICIO; ano <= ANO_FIM; ano++) {
    const isReal = !!producaoPorAno[ano]
    let recBruta = 0, custoAtiv = 0, arrendamento = 0
    let culturas: string[] = []

    if (isReal) {
      // Usa dados reais cadastrados na Produção
      for (const prod of producaoPorAno[ano]) {
        const calc = calcProducaoRow(prod)
        recBruta    += calc.recBruta
        custoAtiv   += calc.custoAtiv
        arrendamento += calc.arrendamento
        if (!culturas.includes(prod.cultura)) culturas.push(prod.cultura)
      }
    } else {
      // Projeta a partir do último ano real
      const i = ano - ultimoAnoReal
      const garea   = Math.pow(1 + p.crescArea / 100, i)
      const gprodut = Math.pow(1 + p.crescProdut / 100, i)
      const gpreco  = Math.pow(1 + p.varPreco / 100, i)
      const gcusto  = Math.pow(1 + p.infCusto / 100, i)

      for (const prod of baseProducoes) {
        const area     = prod.area * garea
        const produt   = prod.produtividade * gprodut
        const cotacao  = prod.cotacao * gpreco
        const cpha     = prod.custoPorHa * gcusto
        const arrha    = prod.custoArrendHa * gcusto
        recBruta     += area * produt * cotacao
        custoAtiv    += area * cpha * cotacao
        arrendamento += prod.areaArrendada * garea * arrha * cotacao
        if (!culturas.includes(prod.cultura)) culturas.push(prod.cultura)
      }
    }

    const lucBruto  = recBruta - custoAtiv - arrendamento
    const margBruta = recBruta > 0 ? lucBruto / recBruta : 0

    const i = Math.max(0, ano - ultimoAnoReal)
    const gdesp = Math.pow(1 + p.infDespesas / 100, i)

    const despesasRecorrentes  = custosFixosAnuais * (isReal ? 1 : gdesp)
    const dividasBancarias     = dividasPorAno[String(ano)] ?? 0
    const despesasNaoBancarias = despesasNaoBancariasReais[ano]
      ?? (despesasNaoBancariasBase > 0 ? despesasNaoBancariasBase * (isReal ? 1 : gdesp) : 0)

    const receitaLiquida = lucBruto - despesasRecorrentes - dividasBancarias - despesasNaoBancarias
    const margLiquida    = recBruta > 0 ? receitaLiquida / recBruta : 0

    rows.push({
      ano, culturas, isReal,
      recBruta, custoAtiv, arrendamento,
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
  const [premissas, setPremissas] = useState<Premissas>(DEFAULT_PREMISSAS)
  const [producaoPorAno, setProducaoPorAno] = useState<Record<number, AgroProducao[]>>({})
  const [dividasPorAno, setDividasPorAno]   = useState<Record<string, number>>({})
  const [custosFixosAnuais, setCustosFixosAnuais] = useState(0)
  const [despesasNaoBancariasBase, setDespesasNaoBancariasBase] = useState(0)
  const [despesasNaoBancariasReais, setDespesasNaoBancariasReais] = useState<Record<number, number>>({})
  const [projecao, setProjecao]   = useState<AnoRow[]>([])
  const [showPremissas, setShowPremissas] = useState(true)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(`projecao-premissas-v2-${clientId}`)
      if (raw) setPremissas({ ...DEFAULT_PREMISSAS, ...JSON.parse(raw) })
    } catch { /* */ }
  }, [clientId])

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.producao.list(clientId),
      agroApi.contratos.cronograma(clientId).catch(() => null),
      agroApi.custosFixos.list(clientId).catch(() => []),
      agroApi.despesas.list(clientId).catch(() => []),
    ]).then(([producoes, crono, custosFixos, despesas]) => {
      setProducaoPorAno(agruparPorAno(producoes))

      if (crono?.porAno) {
        const mapa: Record<string, number> = {}
        for (const [ano, v] of Object.entries(crono.porAno)) {
          mapa[ano] = (v as any).total ?? 0
        }
        setDividasPorAno(mapa)
      }

      const totalFixoMensal = custosFixos.reduce((s, cf) => s + cf.valorMensal, 0)
      setCustosFixosAnuais(totalFixoMensal * 12)

      if (despesas.length > 0) {
        const porAno: Record<number, number> = {}
        for (const d of despesas) {
          const ano = new Date(d.data).getFullYear()
          porAno[ano] = (porAno[ano] ?? 0) + d.valor
        }
        setDespesasNaoBancariasReais(porAno)
        const anosDesc = Object.keys(porAno).map(Number).sort((a, b) => b - a)
        setDespesasNaoBancariasBase(porAno[anosDesc[0]] ?? 0)
      }
    }).finally(() => setLoading(false))
  }, [clientId])

  useEffect(() => {
    setProjecao(calcProjecao(
      producaoPorAno, premissas, dividasPorAno,
      custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais,
    ))
  }, [producaoPorAno, premissas, dividasPorAno, custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais])

  const setPrem = (k: keyof Premissas, v: number) => {
    setPremissas(prev => {
      const next = { ...prev, [k]: v }
      localStorage.setItem(`projecao-premissas-v2-${clientId}`, JSON.stringify(next))
      return next
    })
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-200'

  const chartData = projecao.map(r => ({
    ano: String(r.ano),
    recBruta: r.recBruta,
    lucBruto: r.lucBruto,
    receitaLiquida: r.receitaLiquida,
    margBruta: +(r.margBruta * 100).toFixed(1),
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <RefreshCw size={24} className="animate-spin mr-3" />
        <span>Carregando dados de produção...</span>
      </div>
    )
  }

  const anosReais = Object.keys(producaoPorAno).map(Number).sort()

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Projeção Anual — {ANO_INICIO} a {ANO_FIM}</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Anos reais calculados da aba Produção · anos futuros projetados com premissas de crescimento
          </p>
        </div>
        <button
          onClick={() => setShowPremissas(p => !p)}
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
        >
          <Settings2 size={14} /> {showPremissas ? 'Ocultar' : 'Editar'} premissas
        </button>
      </div>

      {/* Anos com dados reais */}
      {anosReais.length > 0 && (
        <div className="bg-green-50 border border-green-200 rounded-2xl px-5 py-4">
          <p className="text-xs font-bold text-green-800 uppercase tracking-wide mb-3">
            Dados Reais Cadastrados na Produção
          </p>
          <div className="flex flex-wrap gap-4">
            {anosReais.map(ano => {
              const prods = producaoPorAno[ano]
              const totRecBruta = prods.reduce((s, p) => s + calcProducaoRow(p).recBruta, 0)
              const culturas = [...new Set(prods.map(p => p.cultura))]
              return (
                <div key={ano} className="bg-white border border-green-200 rounded-xl px-4 py-3 min-w-[160px]">
                  <p className="text-sm font-bold text-green-800">{ano}</p>
                  <div className="flex flex-wrap gap-1 mt-1 mb-2">
                    {culturas.map(c => (
                      <span key={c} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                        <Sprout size={9} /> {c}
                      </span>
                    ))}
                  </div>
                  <p className="text-sm font-bold text-gray-900">{fmtBRL(totRecBruta)}</p>
                  <p className="text-xs text-gray-400">receita bruta</p>
                </div>
              )
            })}
          </div>
          <div className="mt-3 flex flex-wrap gap-4 text-xs text-gray-500">
            <span className="flex items-center gap-1">
              <Info size={11} className="text-orange-500" />
              Desp. Recorrentes (custos fixos/ano): <strong className="text-gray-700 ml-1">{fmtBRL(custosFixosAnuais)}</strong>
            </span>
            {Object.keys(despesasNaoBancariasReais).length > 0 && (
              <span className="flex items-center gap-1">
                <Info size={11} className="text-red-400" />
                Desp. Não Bancárias: dados reais por ano
              </span>
            )}
            {Object.keys(dividasPorAno).length > 0 && (
              <span className="flex items-center gap-1">
                <Info size={11} className="text-blue-500" />
                Dívidas bancárias: cronograma de contratos
              </span>
            )}
          </div>
        </div>
      )}

      {anosReais.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold">Nenhuma produção cadastrada</p>
          <p className="text-xs mt-1 text-amber-600">Cadastre as safras na aba <strong>Produção</strong> para gerar a projeção com dados reais.</p>
        </div>
      )}

      {/* Premissas — aplicadas apenas aos anos sem dados reais */}
      {showPremissas && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Settings2 size={15} className="text-green-600" /> Premissas de Crescimento
          </h3>
          <p className="text-xs text-gray-400 mb-4">Aplicadas apenas aos anos sem dados reais cadastrados na Produção.</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {[
              { key: 'crescArea'   as keyof Premissas, label: 'Crescimento de Área (%/ano)' },
              { key: 'crescProdut' as keyof Premissas, label: 'Ganho de Produtividade (%/ano)' },
              { key: 'varPreco'    as keyof Premissas, label: 'Variação de Preços (%/ano)' },
              { key: 'infCusto'    as keyof Premissas, label: 'Inflação Custos Operacionais (%/ano)' },
              { key: 'infDespesas' as keyof Premissas, label: 'Inflação Despesas (%/ano)' },
            ].map(f => (
              <div key={f.key}>
                <label className="text-xs font-semibold text-gray-600 mb-1 block">{f.label}</label>
                <div className="relative">
                  <input
                    type="number" step={0.5}
                    value={premissas[f.key]}
                    onChange={e => setPrem(f.key, +e.target.value)}
                    className={inp}
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Gráfico */}
      {projecao.length > 0 && (
        <Card className="p-5">
          <h4 className="font-semibold text-sm text-gray-900 mb-3">Receita Bruta, Lucro Bruto e Receita Líquida</h4>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
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

      {/* Tabela */}
      {projecao.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b">
            <h4 className="font-semibold text-sm text-gray-900">Demonstrativo Anual — {ANO_INICIO} a {ANO_FIM}</h4>
            <p className="text-xs text-gray-400">
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-green-400 mr-1" />real &nbsp;
              <span className="inline-block w-2.5 h-2.5 rounded-full bg-gray-300 mr-1" />projetado
            </p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {[
                    'Ano', 'Culturas', 'Receita Bruta', 'Custo Atividade',
                    'Arrendamento', 'Lucro Bruto', 'Marg. Bruta',
                    'Desp. Recorrentes', 'Dívidas Bancárias', 'Desp. Não Bancárias',
                    'Receita Líquida', 'Marg. Líquida',
                  ].map(h => (
                    <th key={h} className="px-2.5 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {projecao.map(r => (
                  <tr key={r.ano} className={`hover:bg-gray-50/50 ${r.isReal ? 'bg-green-50/20' : ''}`}>
                    <td className="px-2.5 py-2.5 font-bold text-gray-900 whitespace-nowrap">
                      <span className="flex items-center gap-1.5">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${r.isReal ? 'bg-green-500' : 'bg-gray-300'}`} />
                        {r.ano}
                      </span>
                    </td>
                    <td className="px-2.5 py-2.5">
                      <div className="flex flex-wrap gap-0.5">
                        {r.culturas.length > 0
                          ? r.culturas.map(c => (
                              <span key={c} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded-full whitespace-nowrap">{c}</span>
                            ))
                          : <span className="text-gray-300 italic">—</span>
                        }
                      </div>
                    </td>
                    <td className="px-2.5 py-2.5 font-semibold text-emerald-700 whitespace-nowrap">{fmtBRL(r.recBruta)}</td>
                    <td className="px-2.5 py-2.5 text-red-500 whitespace-nowrap">{fmtBRL(r.custoAtiv)}</td>
                    <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{fmtBRL(r.arrendamento)}</td>
                    <td className={`px-2.5 py-2.5 font-bold whitespace-nowrap ${r.lucBruto >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(r.lucBruto)}</td>
                    <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${r.margBruta >= 0.1 ? 'text-emerald-600' : 'text-amber-600'}`}>{fmtPct(r.margBruta)}</td>
                    <td className="px-2.5 py-2.5 text-orange-500 whitespace-nowrap">{fmtBRL(r.despesasRecorrentes)}</td>
                    <td className="px-2.5 py-2.5 text-red-500 whitespace-nowrap">{r.dividasBancarias > 0 ? fmtBRL(r.dividasBancarias) : '—'}</td>
                    <td className="px-2.5 py-2.5 text-red-400 whitespace-nowrap">{r.despesasNaoBancarias > 0 ? fmtBRL(r.despesasNaoBancarias) : '—'}</td>
                    <td className={`px-2.5 py-2.5 font-bold whitespace-nowrap rounded ${r.receitaLiquida >= 0 ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>{fmtBRL(r.receitaLiquida)}</td>
                    <td className={`px-2.5 py-2.5 font-semibold whitespace-nowrap ${r.margLiquida >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>{fmtPct(r.margLiquida)}</td>
                  </tr>
                ))}
              </tbody>

              {/* Totais */}
              <tfoot>
                <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-xs">
                  <td className="px-2.5 py-2.5 text-gray-700">Total</td>
                  <td className="px-2.5 py-2.5 text-gray-400">—</td>
                  {(['recBruta','custoAtiv','arrendamento','lucBruto'] as const).map(k => {
                    const tot = projecao.reduce((s, r) => s + r[k], 0)
                    return <td key={k} className={`px-2.5 py-2.5 whitespace-nowrap ${tot < 0 ? 'text-red-600' : 'text-gray-800'}`}>{fmtBRL(tot)}</td>
                  })}
                  <td className="px-2.5 py-2.5 text-gray-500">
                    {fmtPct(projecao.reduce((s,r)=>s+r.margBruta,0)/projecao.length)}
                    <span className="ml-1 text-xs font-normal text-gray-400">média</span>
                  </td>
                  {(['despesasRecorrentes','dividasBancarias','despesasNaoBancarias'] as const).map(k => (
                    <td key={k} className="px-2.5 py-2.5 text-red-600 whitespace-nowrap">
                      {fmtBRL(projecao.reduce((s,r)=>s+r[k],0))}
                    </td>
                  ))}
                  {(() => {
                    const tot = projecao.reduce((s,r)=>s+r.receitaLiquida,0)
                    return (
                      <td className={`px-2.5 py-2.5 whitespace-nowrap font-bold rounded ${tot >= 0 ? 'text-emerald-800 bg-emerald-50' : 'text-red-700 bg-red-50'}`}>
                        {fmtBRL(tot)}
                      </td>
                    )
                  })()}
                  <td className={`px-2.5 py-2.5 whitespace-nowrap ${projecao.reduce((s,r)=>s+r.margLiquida,0)/projecao.length >= 0 ? 'text-emerald-600' : 'text-red-500'}`}>
                    {fmtPct(projecao.reduce((s,r)=>s+r.margLiquida,0)/projecao.length)}
                    <span className="ml-1 text-xs font-normal text-gray-400">média</span>
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

      {/* Resumo executivo */}
      {projecao.length > 0 && (() => {
        const totalRecLiq    = projecao.reduce((s,r)=>s+r.receitaLiquida,0)
        const totalLucBruto  = projecao.reduce((s,r)=>s+r.lucBruto,0)
        const margBrutaMedia = projecao.reduce((s,r)=>s+r.margBruta,0)/projecao.length
        const anosPos        = projecao.filter(r=>r.receitaLiquida>0).length
        const recFinal       = projecao[projecao.length-1].recBruta
        const recBase        = projecao[0].recBruta
        const crescReceita   = recBase > 0 ? ((recFinal/recBase)-1)*100 : 0
        return (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[
              { l: 'Receita Líquida 10 Anos', v: fmtBRL(totalRecLiq),    ok: totalRecLiq>0,       icon: totalRecLiq>=0?<TrendingUp size={16}/>:<TrendingDown size={16}/> },
              { l: 'Lucro Bruto Total',       v: fmtBRL(totalLucBruto),  ok: totalLucBruto>0,     icon: totalLucBruto>=0?<TrendingUp size={16}/>:<TrendingDown size={16}/> },
              { l: 'Margem Bruta Média',      v: fmtPct(margBrutaMedia), ok: margBrutaMedia>=0.1,  icon: <TrendingUp size={16}/> },
              { l: 'Anos com Rec. Líq. +',    v: `${anosPos} de ${projecao.length}`, ok: anosPos>=Math.ceil(projecao.length*0.7), icon: null },
              { l: 'Crescimento Receita',     v: `+${crescReceita.toFixed(0)}%`, ok: crescReceita>0, icon: <TrendingUp size={16}/> },
              { l: `Receita Bruta em ${ANO_FIM}`, v: fmtBRL(recFinal), ok: true, icon: null },
              { l: `Rec. Líq. em ${ANO_FIM}`, v: fmtBRL(projecao[projecao.length-1].receitaLiquida), ok: projecao[projecao.length-1].receitaLiquida>0, icon: null },
              { l: 'Anos com Dados Reais',    v: `${anosReais.length} anos`, ok: true, icon: null },
            ].map(k => (
              <div key={k.l} className={`p-4 rounded-2xl border ${k.ok?'bg-emerald-50 border-emerald-200':'bg-red-50 border-red-200'}`}>
                <div className={`flex items-center gap-1 mb-1 ${k.ok?'text-emerald-600':'text-red-500'}`}>
                  {k.icon}
                  <p className="text-xs font-medium">{k.l}</p>
                </div>
                <p className={`text-lg font-bold ${k.ok?'text-emerald-800':'text-red-700'}`}>{k.v}</p>
              </div>
            ))}
          </div>
        )
      })()}
    </div>
  )
}
