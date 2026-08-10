import { useState, useEffect, useMemo } from 'react'
import {
  TrendingUp, TrendingDown, Settings2, RefreshCw, AlertTriangle,
  CheckCircle, XCircle, Info, ChevronDown, ChevronUp,
} from 'lucide-react'
import {
  ComposedChart, Bar, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts'
import { agroApi, type AgroProducao } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

// ── Formatadores ──────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtK = (v: number) =>
  Math.abs(v) >= 1_000_000 ? `${(v / 1_000_000).toFixed(1)}M` : `${(v / 1000).toFixed(0)}k`

// ── Motor de projeção (reutilizado do TabProjecaoAnual) ───────────────────────
function anoFromSafra(safra: string): number {
  const parts = safra.split('/')
  if (parts.length === 2) {
    const firstYear = parseInt(parts[0])
    const suffix    = parseInt(parts[1])
    return suffix < 100 ? Math.floor(firstYear / 100) * 100 + suffix : suffix
  }
  return parseInt(safra)
}

function agruparPorAno(producoes: AgroProducao[]): Record<number, AgroProducao[]> {
  const mapa: Record<number, AgroProducao[]> = {}
  for (const p of producoes) {
    const ano = anoFromSafra(p.safra)
    if (!mapa[ano]) mapa[ano] = []
    mapa[ano].push(p)
  }
  return mapa
}

interface AnoRow {
  ano: number
  recBruta: number
  custoAtiv: number
  arrendamento: number
  lucBruto: number
  margBruta: number
  despesasRecorrentes: number
  despesasNaoBancarias: number
  dividasBancarias: number
  servicoComprometido: number
  resultadoLiquido: number
  margLiquida: number
  isReal: boolean
}

interface Premissas {
  crescArea: number; crescProdut: number; varPreco: number
  infCusto: number; infDespesas: number
}

const ANO_INICIO = 2026
const ANO_FIM    = 2035

// Custeio/CPR é autoliquidável pela própria safra — só o que excede o custo real
// de produção do ano compromete a capacidade de pagamento (mesmo critério da aba Resumo).
function isCusteio(modalidade: string): boolean {
  return ['custeio', 'cpr'].some(k => modalidade.toLowerCase().includes(k))
}

function calcProjecao(
  producaoPorAno: Record<number, AgroProducao[]>,
  premissas: Premissas,
  dividasPorAno: Record<string, number>,
  dividasCusteioPorAno: Record<string, number>,
  custosFixosAnuais: number,
  despesasNaoBancariasBase: number,
  despesasNaoBancariasReais: Record<number, number>,
  ajuste: { preco: number; produt: number; area: number; custo: number },
  taxaMediaContratos: number,
): AnoRow[] {
  const anosReais = Object.keys(producaoPorAno).map(Number).sort((a, b) => a - b)
  const ultimoAnoReal = anosReais.length > 0 ? Math.max(...anosReais) : ANO_INICIO
  const baseProducoes = producaoPorAno[ultimoAnoReal] ?? []

  const rows: AnoRow[] = []

  for (let ano = ANO_INICIO; ano <= ANO_FIM; ano++) {
    const isReal = !!producaoPorAno[ano]
    let recBruta = 0, custoAtiv = 0, arrendamento = 0

    const fPreco  = 1 + ajuste.preco  / 100
    const fProdut = 1 + ajuste.produt / 100
    const fArea   = 1 + ajuste.area   / 100
    const fCusto  = 1 + ajuste.custo  / 100

    if (isReal) {
      for (const prod of producaoPorAno[ano]) {
        const cotacao = prod.cotacao * fPreco
        const produt  = prod.produtividade * fProdut
        const area    = prod.area * fArea
        const cpha    = prod.custoPorHa * fCusto
        const arrha   = prod.custoArrendHa * fCusto
        recBruta     += area * produt * cotacao
        custoAtiv    += area * cpha  * cotacao
        arrendamento += prod.areaArrendada * fArea * arrha * cotacao
      }
    } else {
      const i     = ano - ultimoAnoReal
      const garea = Math.pow(1 + premissas.crescArea   / 100, i) * fArea
      const gprod = Math.pow(1 + premissas.crescProdut / 100, i) * fProdut
      const gprec = Math.pow(1 + premissas.varPreco    / 100, i) * fPreco
      const gcust = Math.pow(1 + premissas.infCusto    / 100, i) * fCusto
      for (const prod of baseProducoes) {
        const area = prod.area * garea
        recBruta     += area * prod.produtividade * gprod * prod.cotacao * gprec
        custoAtiv    += area * prod.custoPorHa * gcust * prod.cotacao * gprec
        arrendamento += prod.areaArrendada * garea * prod.custoArrendHa * gcust * prod.cotacao * gprec
      }
    }

    const lucBruto  = recBruta - custoAtiv - arrendamento
    const margBruta = recBruta > 0 ? lucBruto / recBruta : 0

    const i = Math.max(0, ano - ultimoAnoReal)
    const gdesp = Math.pow(1 + premissas.infDespesas / 100, i)
    const despesasRecorrentes  = custosFixosAnuais * (isReal ? 1 : gdesp)
    const despesasNaoBancarias = despesasNaoBancariasReais[ano]
      ?? (despesasNaoBancariasBase > 0 ? despesasNaoBancariasBase * (isReal ? 1 : gdesp) : 0)
    const dividasBancarias = dividasPorAno[String(ano)] ?? 0

    // Custeio excedente: só a parte do custeio do ano que ultrapassa o custo real
    // de produção (+ arrendamento) do próprio ano compromete o resultado.
    const custeioAno       = dividasCusteioPorAno[String(ano)] ?? 0
    const custeioExcedente = Math.max(0, custeioAno - (custoAtiv + arrendamento))
    const servicoComprometido = (dividasBancarias - custeioAno) + custeioExcedente

    const receitaLiquida = lucBruto - despesasRecorrentes - despesasNaoBancarias - servicoComprometido
    const saldoAnterior  = rows.length > 0 ? rows[rows.length - 1].resultadoLiquido : 0
    const prejAnoAnterior = saldoAnterior < 0 ? Math.abs(saldoAnterior) : 0
    const prejAcum        = prejAnoAnterior * (1 + taxaMediaContratos)
    const resultadoLiquido = receitaLiquida - prejAcum
    const margLiquida    = recBruta > 0 ? resultadoLiquido / recBruta : 0

    rows.push({
      ano, recBruta, custoAtiv, arrendamento, lucBruto, margBruta,
      despesasRecorrentes, despesasNaoBancarias, dividasBancarias, servicoComprometido,
      resultadoLiquido, margLiquida, isReal,
    })
  }

  return rows
}

// ── Tipos do simulador ────────────────────────────────────────────────────────
interface CenarioConfig {
  nome: string
  varPreco: number
  varProdut: number
  varArea: number
  varCusto: number
}

const CENARIOS_DEFAULT: CenarioConfig[] = [
  { nome: 'Pessimista', varPreco: -15, varProdut: -10, varArea: 0,  varCusto: 10 },
  { nome: 'Base',       varPreco: 0,   varProdut: 0,   varArea: 0,  varCusto: 0  },
  { nome: 'Otimista',   varPreco: 10,  varProdut: 8,   varArea: 10, varCusto: 0  },
]

const PREMISSAS_DEFAULT: Premissas = {
  crescArea: 2, crescProdut: 1, varPreco: 3, infCusto: 5, infDespesas: 5,
}

// ── Matriz de Sensibilidade Cambial × Preço da Commodity ───────────────────────
// Sem infraestrutura nova: reaproveita o mesmo motor de projeção (calcProjecao),
// só recalculando com dois eixos de choque em vez de 3 cenários fixos.
const CAMB_VALUES = [-10, -5, 0, 5, 10]
const COMM_VALUES = [-10, -5, 0, 5, 10]
// % do custo da atividade considerado sensível ao câmbio (insumo importado — fertilizante, defensivo)
const CUSTO_SENSIBILIDADE_CAMBIAL = 0.35

const COR: Record<string, { bg: string; border: string; text: string; badge: string; bar: string; line: string }> = {
  'Pessimista': { bg: 'bg-red-50',     border: 'border-red-200',    text: 'text-red-700',    badge: 'bg-red-100 text-red-700',    bar: '#EF4444', line: '#B91C1C' },
  'Base':       { bg: 'bg-blue-50',    border: 'border-blue-200',   text: 'text-blue-700',   badge: 'bg-blue-100 text-blue-700',  bar: '#3B82F6', line: '#1D4ED8' },
  'Otimista':   { bg: 'bg-emerald-50', border: 'border-emerald-200',text: 'text-emerald-700',badge: 'bg-emerald-100 text-emerald-700', bar: '#10B981', line: '#047857' },
}

function veredicto(rows: AnoRow[]): { icon: React.ReactNode; label: string; cor: string } {
  const tot = rows.reduce((s, r) => s + r.resultadoLiquido, 0)
  const anosPos = rows.filter(r => r.resultadoLiquido > 0).length
  const margMedia = rows.reduce((s, r) => s + r.margLiquida, 0) / rows.length
  if (tot < 0 || anosPos < 4) return { icon: <XCircle size={16} />, label: 'Inviável — revisar estrutura', cor: 'text-red-600' }
  if (anosPos < 7 || margMedia < 0.05) return { icon: <AlertTriangle size={16} />, label: 'Atenção — risco elevado', cor: 'text-amber-600' }
  if (margMedia >= 0.15) return { icon: <CheckCircle size={16} />, label: 'Saudável — expandir', cor: 'text-emerald-600' }
  return { icon: <CheckCircle size={16} />, label: 'Viável — manter', cor: 'text-emerald-600' }
}

// ── Componente principal ──────────────────────────────────────────────────────
export function TabCenarios({ clientId }: { clientId: string }) {
  const [loading, setLoading]     = useState(true)
  const [cenarios, setCenarios]   = useState<CenarioConfig[]>(CENARIOS_DEFAULT)
  const [premissas]               = useState<Premissas>(PREMISSAS_DEFAULT)
  const [producaoPorAno, setProducaoPorAno] = useState<Record<number, AgroProducao[]>>({})
  const [dividasPorAno,  setDividasPorAno]  = useState<Record<string, number>>({})
  const [dividasCusteioPorAno, setDividasCusteioPorAno] = useState<Record<string, number>>({})
  const [custosFixosAnuais, setCustosFixosAnuais] = useState(0)
  const [despesasNaoBancariasBase, setDespesasNaoBancariasBase] = useState(0)
  const [despesasNaoBancariasReais, setDespesasNaoBancariasReais] = useState<Record<number, number>>({})
  const [taxaMediaContratos, setTaxaMediaContratos] = useState(0)
  const [showConfig, setShowConfig] = useState(true)
  const [detalheAnos, setDetalheAnos] = useState(false)

  // Carrega dados do cliente
  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.producao.list(clientId),
      agroApi.contratos.cronograma(clientId).catch(() => null),
      agroApi.custosFixos.list(clientId).catch(() => []),
      agroApi.contratos.list(clientId).catch(() => []),
      agroApi.despesas.list(clientId).catch(() => []),
    ]).then(([producoes, crono, custosFixos, contratos, despesas]) => {
      setProducaoPorAno(agruparPorAno(producoes))

      // Só parcelas a partir de hoje — o que já venceu é passado, não capacidade futura
      const agora = new Date()
      const mapaTotal: Record<string, number> = {}
      const mapaCusteio: Record<string, number> = {}
      for (const p of (crono?.parcelas ?? []) as any[]) {
        if (new Date(p.vencimento) < agora) continue
        const ano = String(new Date(p.vencimento).getFullYear())
        mapaTotal[ano] = (mapaTotal[ano] ?? 0) + p.valorParcela
        if (isCusteio(p.modalidade)) mapaCusteio[ano] = (mapaCusteio[ano] ?? 0) + p.valorParcela
      }
      setDividasPorAno(mapaTotal)
      setDividasCusteioPorAno(mapaCusteio)

      setCustosFixosAnuais(custosFixos.reduce((s, cf) => s + cf.valorMensal, 0) * 12)

      const totalTomado = contratos.reduce((s: number, c: any) => s + (c.valorTomado || 0), 0)
      setTaxaMediaContratos(totalTomado > 0
        ? contratos.reduce((s: number, c: any) => s + (c.taxa || 0) * (c.valorTomado || 0), 0) / totalTomado
        : 0)

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

  // Persiste cenários no localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`cenarios-v1-${clientId}`)
      if (raw) setCenarios(JSON.parse(raw))
    } catch { /* */ }
  }, [clientId])

  const saveCenarios = (next: CenarioConfig[]) => {
    setCenarios(next)
    localStorage.setItem(`cenarios-v1-${clientId}`, JSON.stringify(next))
  }

  // Calcula projeção para cada cenário
  const projecoes = useMemo(() =>
    cenarios.map(c => ({
      ...c,
      rows: calcProjecao(
        producaoPorAno, premissas, dividasPorAno, dividasCusteioPorAno,
        custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais,
        { preco: c.varPreco, produt: c.varProdut, area: c.varArea, custo: c.varCusto },
        taxaMediaContratos,
      ),
    })),
    [cenarios, producaoPorAno, premissas, dividasPorAno, dividasCusteioPorAno, custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais, taxaMediaContratos],
  )

  // Matriz de sensibilidade câmbio × preço da commodity — dólar sobe → receita (grão dolarizado)
  // sobe integralmente e custo sobe parcialmente (parte do insumo é importado); preço da
  // commodity (CBOT) é um choque independente, só na receita.
  const matrizSensibilidade = useMemo(() => {
    return CAMB_VALUES.map(camb => ({
      camb,
      cols: COMM_VALUES.map(comm => {
        const precoShock = ((1 + camb / 100) * (1 + comm / 100) - 1) * 100
        const custoShock = camb * CUSTO_SENSIBILIDADE_CAMBIAL
        const rows = calcProjecao(
          producaoPorAno, premissas, dividasPorAno, dividasCusteioPorAno,
          custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais,
          { preco: precoShock, produt: 0, area: 0, custo: custoShock },
          taxaMediaContratos,
        )
        return { comm, total10: rows.reduce((s, r) => s + r.resultadoLiquido, 0) }
      }),
    }))
  }, [producaoPorAno, premissas, dividasPorAno, dividasCusteioPorAno, custosFixosAnuais, despesasNaoBancariasBase, despesasNaoBancariasReais, taxaMediaContratos])

  const sensMaxAbs = Math.max(1, ...matrizSensibilidade.flatMap(r => r.cols.map(c => Math.abs(c.total10))))
  const cellBg = (v: number) => {
    const frac = Math.min(1, Math.abs(v) / sensMaxAbs)
    const alpha = 0.10 + frac * 0.55
    return v >= 0 ? `rgba(16,185,129,${alpha})` : `rgba(239,68,68,${alpha})`
  }

  // Dados do gráfico comparativo
  const chartData = useMemo(() => {
    const anos = Array.from({ length: ANO_FIM - ANO_INICIO + 1 }, (_, i) => ANO_INICIO + i)
    return anos.map(ano => {
      const entry: Record<string, any> = { ano: String(ano) }
      for (const p of projecoes) {
        const row = p.rows.find(r => r.ano === ano)
        if (row) {
          entry[`${p.nome}_rec`]  = Math.max(0, row.recBruta)
          entry[`${p.nome}_liq`]  = row.resultadoLiquido
        }
      }
      return entry
    })
  }, [projecoes])

  const inp = 'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-2 focus:ring-green-100'

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-3" />
      <span>Carregando dados...</span>
    </div>
  )

  const semProducao = Object.keys(producaoPorAno).length === 0

  return (
    <div className="space-y-5">
      {/* Cabeçalho */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Simulador de Cenários</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Compare Pessimista, Base e Otimista — ajuste as variáveis e veja o impacto no resultado dos próximos 10 anos
          </p>
        </div>
        <button
          onClick={() => setShowConfig(v => !v)}
          className="flex items-center gap-1.5 border border-gray-200 bg-white hover:bg-gray-50 rounded-xl px-3 py-2 text-sm font-medium text-gray-700"
        >
          <Settings2 size={14} /> {showConfig ? 'Ocultar' : 'Editar'} premissas
        </button>
      </div>

      {semProducao && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-5 py-4 text-sm text-amber-800">
          <p className="font-semibold">Nenhuma produção cadastrada</p>
          <p className="text-xs mt-1 text-amber-600">Cadastre as safras na aba <strong>Produção</strong> para usar o simulador.</p>
        </div>
      )}

      {/* Configuração de Cenários */}
      {showConfig && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-1 flex items-center gap-2">
            <Settings2 size={15} className="text-blue-600" /> Premissas por Cenário
          </h3>
          <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
            <Info size={11} />
            Variações aplicadas sobre os dados reais cadastrados na aba Produção.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 pr-4 text-xs font-semibold text-gray-500 uppercase">Variável</th>
                  {cenarios.map(c => (
                    <th key={c.nome} className={`text-center py-2 px-4 text-xs font-semibold uppercase ${COR[c.nome].text}`}>
                      {c.nome}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {[
                  { field: 'varPreco'  as keyof CenarioConfig, label: 'Variação de preço (%)', hint: 'Ex: -15 = queda de 15% na cotação' },
                  { field: 'varProdut' as keyof CenarioConfig, label: 'Variação de produtividade (%)', hint: 'Ex: -10 = queda de 10% em sc/ha' },
                  { field: 'varArea'   as keyof CenarioConfig, label: 'Variação de área (%)', hint: 'Ex: 10 = expansão de 10% da área' },
                  { field: 'varCusto'  as keyof CenarioConfig, label: 'Variação de custo (%)', hint: 'Ex: 10 = custo 10% maior que o base' },
                ].map(row => (
                  <tr key={row.field} className="border-b border-gray-50">
                    <td className="py-2 pr-4">
                      <p className="text-xs font-medium text-gray-700">{row.label}</p>
                      <p className="text-xs text-gray-400">{row.hint}</p>
                    </td>
                    {cenarios.map((c, ci) => (
                      <td key={c.nome} className="py-2 px-4">
                        <div className="relative">
                          <input
                            type="number" step={1}
                            value={c[row.field] as number}
                            onChange={e => {
                              const next = cenarios.map((x, xi) =>
                                xi === ci ? { ...x, [row.field]: +e.target.value } : x
                              )
                              saveCenarios(next)
                            }}
                            className={inp}
                          />
                          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">%</span>
                        </div>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            onClick={() => saveCenarios(CENARIOS_DEFAULT)}
            className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
          >
            Restaurar padrões
          </button>
        </Card>
      )}

      {/* Cards de Resumo por Cenário */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projecoes.map(p => {
          const cor       = COR[p.nome]
          const tot10     = p.rows.reduce((s, r) => s + r.resultadoLiquido, 0)
          const anosPos   = p.rows.filter(r => r.resultadoLiquido > 0).length
          const margMedia = p.rows.reduce((s, r) => s + r.margLiquida, 0) / p.rows.length
          const recTotal  = p.rows.reduce((s, r) => s + r.recBruta, 0)
          const v         = veredicto(p.rows)
          const melhorAno = [...p.rows].sort((a, b) => b.resultadoLiquido - a.resultadoLiquido)[0]
          const piorAno   = [...p.rows].sort((a, b) => a.resultadoLiquido - b.resultadoLiquido)[0]

          return (
            <div key={p.nome} className={`rounded-2xl border-2 p-5 ${cor.bg} ${cor.border}`}>
              <div className="flex items-center justify-between mb-3">
                <span className={`text-sm font-bold px-2.5 py-1 rounded-full ${cor.badge}`}>{p.nome}</span>
                <div className={`flex items-center gap-1 text-xs font-semibold ${v.cor}`}>
                  {v.icon} {v.label}
                </div>
              </div>

              <div className="space-y-3">
                <div>
                  <p className="text-xs text-gray-500">Resultado Líquido 10 Anos</p>
                  <p className={`text-2xl font-bold ${tot10 >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                    {fmtBRL(tot10)}
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2 border-t border-current/10">
                  <div>
                    <p className="text-xs text-gray-500">Receita Total</p>
                    <p className="text-sm font-bold text-gray-800">{fmtBRL(recTotal)}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Marg. Líquida Média</p>
                    <p className={`text-sm font-bold ${margMedia >= 0.1 ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmtPct(margMedia)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Anos com resultado +</p>
                    <p className={`text-sm font-bold ${anosPos >= 7 ? 'text-emerald-700' : anosPos >= 5 ? 'text-amber-600' : 'text-red-600'}`}>
                      {anosPos} de {p.rows.length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500">Melhor/Pior ano</p>
                    <p className="text-xs font-medium text-gray-700">
                      {melhorAno?.ano}: <span className="text-emerald-600">{fmtK(melhorAno?.resultadoLiquido ?? 0)}</span>
                    </p>
                    <p className="text-xs font-medium text-gray-700">
                      {piorAno?.ano}: <span className="text-red-500">{fmtK(piorAno?.resultadoLiquido ?? 0)}</span>
                    </p>
                  </div>
                </div>

                {/* Impactos das premissas */}
                <div className="pt-2 border-t border-current/10 space-y-1">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Premissas aplicadas</p>
                  {[
                    { l: 'Preço', v: p.varPreco },
                    { l: 'Produtividade', v: p.varProdut },
                    { l: 'Área', v: p.varArea },
                    { l: 'Custo', v: p.varCusto },
                  ].filter(x => x.v !== 0).map(x => (
                    <div key={x.l} className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">{x.l}</span>
                      <span className={`text-xs font-semibold ${x.v > 0 && x.l !== 'Custo' ? 'text-emerald-600' : x.v < 0 && x.l !== 'Custo' ? 'text-red-500' : x.v > 0 ? 'text-red-500' : 'text-emerald-600'}`}>
                        {x.v > 0 ? '+' : ''}{x.v}%
                      </span>
                    </div>
                  ))}
                  {[p.varPreco, p.varProdut, p.varArea, p.varCusto].every(v => v === 0) && (
                    <p className="text-xs text-gray-400 italic">Dados reais (sem ajuste)</p>
                  )}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Gráfico comparativo */}
      <Card className="p-5">
        <h4 className="font-semibold text-sm text-gray-900 mb-4">Resultado Líquido por Cenário — {ANO_INICIO} a {ANO_FIM}</h4>
        <ResponsiveContainer width="100%" height={260}>
          <ComposedChart data={chartData} margin={{ top: 4, right: 8, left: 8, bottom: 4 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="ano" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
            <Tooltip formatter={(v: number, name: string) => [fmtBRL(v), name.split('_')[0]]} />
            <Legend wrapperStyle={{ fontSize: 11 }} formatter={(val: string) => val.split('_')[0]} />
            {projecoes.map(p => (
              <Line
                key={p.nome}
                dataKey={`${p.nome}_liq`}
                name={`${p.nome}_liq`}
                stroke={COR[p.nome].line}
                strokeWidth={2.5}
                dot={{ r: 3 }}
                type="monotone"
              />
            ))}
          </ComposedChart>
        </ResponsiveContainer>
      </Card>

      {/* Tabela ano a ano comparativa */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-900">Comparativo Anual — Resultado Líquido</h4>
          <button
            onClick={() => setDetalheAnos(v => !v)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
          >
            {detalheAnos ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            {detalheAnos ? 'Menos detalhes' : 'Ver receita bruta'}
          </button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                <th className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">Ano</th>
                {projecoes.flatMap(p => {
                  const cols = [{ key: `liq-${p.nome}`, label: `${p.nome} — Resultado` }]
                  if (detalheAnos) cols.push({ key: `rec-${p.nome}`, label: `${p.nome} — Receita` })
                  return cols
                }).map(col => (
                  <th key={col.key} className={`px-3 py-2 text-right font-semibold uppercase whitespace-nowrap ${COR[col.key.split('-')[1]]?.text ?? 'text-gray-500'}`}>
                    {col.label}
                  </th>
                ))}
                <th className="px-3 py-2 text-right font-semibold text-gray-500 uppercase whitespace-nowrap">
                  Δ Otimista–Pessimista
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {Array.from({ length: ANO_FIM - ANO_INICIO + 1 }, (_, i) => ANO_INICIO + i).map(ano => {
                const cols = projecoes.map(p => ({ ...p, row: p.rows.find(r => r.ano === ano)! }))
                const otim = cols.find(c => c.nome === 'Otimista')?.row?.resultadoLiquido ?? 0
                const pess = cols.find(c => c.nome === 'Pessimista')?.row?.resultadoLiquido ?? 0
                const delta = otim - pess

                return (
                  <tr key={ano} className="hover:bg-gray-50/50">
                    <td className="px-3 py-2.5 font-bold text-gray-900">{ano}</td>
                    {projecoes.flatMap(p => {
                      const row = p.rows.find(r => r.ano === ano)!
                      const cells = [(
                        <td key={`liq-${p.nome}-${ano}`} className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${row.resultadoLiquido >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {fmtBRL(row.resultadoLiquido)}
                        </td>
                      )]
                      if (detalheAnos) cells.push(
                        <td key={`rec-${p.nome}-${ano}`} className="px-3 py-2.5 text-right text-gray-600 whitespace-nowrap">
                          {fmtBRL(row.recBruta)}
                        </td>
                      )
                      return cells
                    })}
                    <td className={`px-3 py-2.5 text-right font-semibold whitespace-nowrap ${delta >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
                      {delta >= 0 ? '+' : ''}{fmtBRL(delta)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot>
              <tr className="bg-gray-100 border-t-2 border-gray-300 font-bold text-xs">
                <td className="px-3 py-2.5 text-gray-700">Total 10 Anos</td>
                {projecoes.flatMap(p => {
                  const tot = p.rows.reduce((s, r) => s + r.resultadoLiquido, 0)
                  const cells = [(
                    <td key={`tot-liq-${p.nome}`} className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${tot >= 0 ? 'text-emerald-800' : 'text-red-700'}`}>
                      {fmtBRL(tot)}
                    </td>
                  )]
                  if (detalheAnos) {
                    const rec = p.rows.reduce((s, r) => s + r.recBruta, 0)
                    cells.push(<td key={`tot-rec-${p.nome}`} className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{fmtBRL(rec)}</td>)
                  }
                  return cells
                })}
                {(() => {
                  const otim = projecoes.find(p => p.nome === 'Otimista')?.rows.reduce((s, r) => s + r.resultadoLiquido, 0) ?? 0
                  const pess = projecoes.find(p => p.nome === 'Pessimista')?.rows.reduce((s, r) => s + r.resultadoLiquido, 0) ?? 0
                  const d = otim - pess
                  return (
                    <td className={`px-3 py-2.5 text-right font-bold whitespace-nowrap ${d >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                      {d >= 0 ? '+' : ''}{fmtBRL(d)}
                    </td>
                  )
                })()}
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Matriz de Sensibilidade Cambial × Preço da Commodity */}
      <Card className="p-5">
        <h4 className="font-semibold text-sm text-gray-900 mb-1">Matriz de Sensibilidade — Câmbio × Preço da Commodity</h4>
        <p className="text-xs text-gray-400 mb-4 flex items-center gap-1">
          <Info size={11} />
          Resultado Líquido 10 Anos (Base) sob variação simultânea do dólar e do preço da commodity (CBOT). Linhas = câmbio, colunas = preço da commodity.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-separate" style={{ borderSpacing: 2 }}>
            <thead>
              <tr>
                <th className="px-2 py-1.5 text-xs font-semibold text-gray-500 uppercase text-right">Câmbio ↓ / Commodity →</th>
                {COMM_VALUES.map(comm => (
                  <th key={comm} className={`px-2 py-1.5 text-center text-xs font-bold ${comm === 0 ? 'text-blue-700' : 'text-gray-600'}`}>
                    {comm > 0 ? '+' : ''}{comm}%
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {matrizSensibilidade.map(row => (
                <tr key={row.camb}>
                  <td className={`px-2 py-1.5 text-right text-xs font-bold whitespace-nowrap ${row.camb === 0 ? 'text-blue-700' : 'text-gray-600'}`}>
                    {row.camb > 0 ? '+' : ''}{row.camb}%
                  </td>
                  {row.cols.map(cell => (
                    <td
                      key={cell.comm}
                      className={`px-2 py-2 text-center font-semibold rounded-md whitespace-nowrap ${cell.total10 >= 0 ? 'text-emerald-800' : 'text-red-800'} ${row.camb === 0 && cell.comm === 0 ? 'ring-2 ring-blue-400' : ''}`}
                      style={{ backgroundColor: cellBg(cell.total10) }}
                    >
                      {fmtK(cell.total10)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-gray-400 mt-3">
          Célula destacada = cenário Base (sem choque). Premissa: alta do dólar repassa 100% ao preço do grão em reais e {fmtPct(CUSTO_SENSIBILIDADE_CAMBIAL)} ao custo da atividade (parcela de insumo importado). Variação de preço da commodity considerada independente do câmbio, incidindo só sobre a receita.
        </p>
      </Card>

      {/* Painel de Decisão */}
      <Card className="p-5">
        <h4 className="font-semibold text-sm text-gray-900 mb-3 flex items-center gap-2">
          <Info size={14} className="text-blue-500" />
          Painel de Decisão — Recomendação do Sistema
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {projecoes.map(p => {
            const cor = COR[p.nome]
            const v = veredicto(p.rows)
            const tot  = p.rows.reduce((s, r) => s + r.resultadoLiquido, 0)
            const pct  = p.rows.filter(r => r.resultadoLiquido > 0).length / p.rows.length * 100
            const marg = p.rows.reduce((s, r) => s + r.margLiquida, 0) / p.rows.length

            return (
              <div key={p.nome} className={`rounded-xl border p-4 ${cor.bg} ${cor.border}`}>
                <p className={`text-xs font-bold uppercase mb-2 ${cor.text}`}>{p.nome}</p>
                <div className={`flex items-center gap-2 font-semibold text-sm ${v.cor} mb-3`}>
                  {v.icon} {v.label}
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Resultado total</span>
                    <span className={`font-semibold ${tot >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>{fmtBRL(tot)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Anos positivos</span>
                    <span className={`font-semibold ${pct >= 70 ? 'text-emerald-700' : pct >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{pct.toFixed(0)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Margem líquida média</span>
                    <span className={`font-semibold ${marg >= 0.1 ? 'text-emerald-700' : marg >= 0 ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(marg)}</span>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="text-xs text-gray-400 mt-4">
          Critérios: Saudável = margem líquida ≥ 15% e ≥ 7 anos positivos · Viável = positivo na média · Atenção = margem &lt; 5% ou &lt; 7 anos positivos · Inviável = resultado total negativo ou &lt; 4 anos positivos
        </p>
      </Card>
    </div>
  )
}
