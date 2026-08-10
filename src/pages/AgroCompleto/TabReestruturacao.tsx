import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Settings2, CheckCircle, AlertTriangle, RotateCcw, TrendingDown, Target, ChevronDown, ChevronUp } from 'lucide-react'
import { agroApi, type AgroContrato } from '../../services/agroApi'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`
const fmtN   = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

interface ContratoRow {
  id: string
  banco: string
  modalidade: string
  numeroContrato: string
  saldoDevedor: number       // saldo real do cronograma (soma amortizações futuras)
  servicoAnual: number       // parcelas vencendo nos próximos 12 meses
  proximaParcela: number     // valor da próxima parcela
  taxa: number               // a.a. efetiva
  parcelasRestantes: number
  vencimento: string
  selected: boolean
}

interface ParcelaSimulada {
  num: number
  data: Date
  valor: number
  amort: number
  juros: number
  saldo: number
}

function calcDatas(n: number, periodicidade: 'Mensal' | 'Semestral' | 'Anual', dataPrimeira: Date): Date[] {
  return Array.from({ length: n }, (_, i) => {
    const d = new Date(dataPrimeira)
    if (periodicidade === 'Mensal') d.setMonth(d.getMonth() + i)
    else if (periodicidade === 'Semestral') d.setMonth(d.getMonth() + i * 6)
    else d.setFullYear(d.getFullYear() + i)
    return d
  })
}

function gerarCronogramaSimulado(
  saldo: number,
  taxaAnual: number,
  n: number,
  periodicidade: 'Mensal' | 'Semestral' | 'Anual',
  sistema: 'SAC' | 'Price',
  dataPrimeira: Date
): ParcelaSimulada[] {
  if (n <= 0 || saldo <= 0) return []
  const ppa = periodicidade === 'Mensal' ? 12 : periodicidade === 'Semestral' ? 2 : 1
  const tp = Math.pow(1 + taxaAnual, 1 / ppa) - 1
  const amortConst = saldo / n
  const pmt = sistema === 'Price'
    ? (tp === 0 ? saldo / n : saldo * tp * Math.pow(1 + tp, n) / (Math.pow(1 + tp, n) - 1))
    : 0
  const datas = calcDatas(n, periodicidade, dataPrimeira)
  let s = saldo
  return datas.map((data, i) => {
    const juros = s * tp
    const amort = sistema === 'SAC' ? amortConst : Math.max(0, pmt - juros)
    const valor = sistema === 'SAC' ? amortConst + juros : pmt
    s = i === n - 1 ? 0 : Math.max(0, s - amort)
    return {
      num: i + 1, data,
      valor: Math.round(valor * 100) / 100,
      amort: Math.round(amort * 100) / 100,
      juros: Math.round(juros * 100) / 100,
      saldo: Math.round(s * 100) / 100,
    }
  })
}

// Cronograma com amortizações não-lineares definidas por percentuais (% do principal)
function gerarCronogramaCustom(
  saldo: number,
  taxaAnual: number,
  pcts: number[],   // percentuais de amortização por parcela (somam 100)
  periodicidade: 'Mensal' | 'Semestral' | 'Anual',
  dataPrimeira: Date
): ParcelaSimulada[] {
  if (pcts.length === 0 || saldo <= 0) return []
  const ppa = periodicidade === 'Mensal' ? 12 : periodicidade === 'Semestral' ? 2 : 1
  const tp = Math.pow(1 + taxaAnual, 1 / ppa) - 1
  const datas = calcDatas(pcts.length, periodicidade, dataPrimeira)
  let s = saldo
  return pcts.map((pct, i) => {
    const juros = Math.round(s * tp * 100) / 100
    const amort = i === pcts.length - 1 ? Math.round(s * 100) / 100 : Math.round(saldo * pct / 100 * 100) / 100
    const valor = amort + juros
    s = Math.max(0, s - amort)
    return {
      num: i + 1, data: datas[i],
      valor: Math.round(valor * 100) / 100,
      amort,
      juros,
      saldo: Math.round(s * 100) / 100,
    }
  })
}

// ── Proposta de Reestruturação Ideal ──────────────────────────────────────────
// Toma o passivo total e calcula, a uma taxa fixa de 1% a.a. sem correção
// monetária, em quantos anos ele seria quitado com parcela anual fixa,
// dado um teto de comprometimento anual (capacidade de pagamento).
const SAFRA_CAPACIDADE = '2026/27'
const TAXA_IDEAL = 0.01
const PCT_MODERADO = 50
const PCT_SAUDAVEL = 30

interface PropostaIdeal {
  inviavel: false
  nAnos: number
  parcelaFixa: number
  totalJuros: number
  capacidadeAnual: number
}
interface PropostaInviavel { inviavel: true; capacidadeAnual: number }

function calcRestruturacaoIdeal(passivo: number, capacidadeAnual: number, taxa: number): PropostaIdeal | PropostaInviavel | null {
  if (passivo <= 0 || capacidadeAnual <= 0) return null
  if (capacidadeAnual <= passivo * taxa) return { inviavel: true, capacidadeAnual }
  const nContinuo   = Math.log(capacidadeAnual / (capacidadeAnual - passivo * taxa)) / Math.log(1 + taxa)
  const nAnos       = Math.max(1, Math.ceil(nContinuo))
  const parcelaFixa = passivo * taxa / (1 - Math.pow(1 + taxa, -nAnos))
  const totalJuros  = parcelaFixa * nAnos - passivo
  return { inviavel: false, nAnos, parcelaFixa, totalJuros, capacidadeAnual }
}

function PropostaCard({ titulo, capacidade, proposta, cronograma, show, onToggle }: {
  titulo: string
  capacidade: number
  proposta: PropostaIdeal | PropostaInviavel | null
  cronograma: ParcelaSimulada[]
  show: boolean
  onToggle: () => void
}) {
  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <p className="text-xs font-bold text-gray-700 uppercase">{titulo}</p>
        <p className="text-xs text-gray-400 mt-0.5">Capacidade anual: {fmtBRL(capacidade)}</p>
      </div>
      <div className="p-4">
        {!proposta && (
          <p className="text-xs text-gray-400">Sem dados suficientes (resultado líquido ou passivo indisponível).</p>
        )}
        {proposta && proposta.inviavel && (
          <div className="flex items-start gap-2 text-red-600">
            <AlertTriangle size={14} className="mt-0.5 flex-shrink-0" />
            <p className="text-xs font-semibold">
              Capacidade insuficiente até para cobrir os juros de 1% a.a. sobre o saldo — nesse ritmo a dívida nunca seria quitada.
            </p>
          </div>
        )}
        {proposta && !proposta.inviavel && (
          <>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <p className="text-xs text-gray-500">Parcela Anual Fixa</p>
                <p className="text-lg font-bold text-emerald-700">{fmtBRL(proposta.parcelaFixa)}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Prazo para Quitar</p>
                <p className="text-lg font-bold text-gray-900">{proposta.nAnos} {proposta.nAnos === 1 ? 'ano' : 'anos'}</p>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Total de juros no período: <span className="font-semibold text-red-500">{fmtBRL(proposta.totalJuros)}</span>
            </p>
            <button
              onClick={onToggle}
              className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 rounded-lg text-xs font-semibold text-gray-700"
            >
              <span>Cronograma — {cronograma.length} parcelas</span>
              {show ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
            </button>
            {show && (
              <div className="mt-2 max-h-72 overflow-y-auto border border-gray-100 rounded-lg">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-gray-100">
                    <tr>
                      {['Nº', 'Vencimento', 'Parcela', 'Amortização', 'Juros', 'Saldo'].map(h => (
                        <th key={h} className="px-2 py-1.5 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {cronograma.map(p => (
                      <tr key={p.num}>
                        <td className="px-2 py-1.5 text-gray-400">{p.num}</td>
                        <td className="px-2 py-1.5 text-gray-700 whitespace-nowrap">{p.data.toLocaleDateString('pt-BR')}</td>
                        <td className="px-2 py-1.5 font-semibold text-gray-900">{fmtBRL(p.valor)}</td>
                        <td className="px-2 py-1.5 text-blue-700">{fmtBRL(p.amort)}</td>
                        <td className="px-2 py-1.5 text-red-500">{fmtBRL(p.juros)}</td>
                        <td className="px-2 py-1.5 text-gray-600">{fmtBRL(p.saldo)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function TabReestruturacao({ clientId }: { clientId: string }) {
  const [loading, setLoading]   = useState(true)
  const [contratos, setContratos] = useState<ContratoRow[]>([])
  const [receitaAnual, setReceitaAnual] = useState(0)
  const [resultadoLiquidoCapacidade, setResultadoLiquidoCapacidade] = useState(0)
  const [showCronIdeal, setShowCronIdeal] = useState<{ moderado: boolean; saudavel: boolean }>({ moderado: false, saudavel: false })

  // Simulação unificada para os contratos selecionados
  const [simTaxa,               setSimTaxa]               = useState('')
  const [simTipoTaxa,           setSimTipoTaxa]           = useState<'aa' | 'am'>('aa')
  const [simParcelas,           setSimParcelas]           = useState('')
  const [simPeriodicidade,      setSimPeriodicidade]      = useState<'Mensal' | 'Semestral' | 'Anual'>('Mensal')
  const [simIndexador,          setSimIndexador]          = useState<'Pré-fixado' | 'CDI' | 'TR' | 'IPCA'>('Pré-fixado')
  const [simSistema,            setSimSistema]            = useState<'SAC' | 'Price'>('SAC')
  const [simDataPrimeira,       setSimDataPrimeira]       = useState(() => {
    const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + 1)
    return d.toISOString().slice(0, 10)
  })
  const [mostrarCronograma,     setMostrarCronograma]     = useState(false)
  const [customPcts,            setCustomPcts]            = useState<number[] | null>(null)

  const TAXAS_REF: Record<string, number> = { CDI: 0.1425, TR: 0.0088, IPCA: 0.0548 }

  const limiteMaxTaxa = simTipoTaxa === 'am' ? 10 : 100

  // Converte inputs para taxa anual efetiva (decimal)
  const taxaAnualEfetiva = useMemo(() => {
    const t = parseFloat(simTaxa) / 100
    if (isNaN(t) || t <= 0 || t > limiteMaxTaxa / 100) return null
    const taxaNominal = simTipoTaxa === 'am' ? Math.pow(1 + t, 12) - 1 : t
    const taxaBase = simIndexador !== 'Pré-fixado' ? TAXAS_REF[simIndexador] ?? 0 : 0
    return taxaNominal + taxaBase
  }, [simTaxa, simTipoTaxa, simIndexador, limiteMaxTaxa])

  const nParcelas = useMemo(() => {
    const n = parseInt(simParcelas); return isNaN(n) || n <= 0 ? null : n
  }, [simParcelas])

  // Limpa percentuais customizados quando nº de parcelas muda
  useEffect(() => { setCustomPcts(null) }, [simParcelas, simSistema])

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.contratos.list(clientId),
      agroApi.contratos.cronograma(clientId),
      agroApi.producao.list(clientId),
    ]).then(([conts, crono, prods]) => {
      const hoje = new Date()
      const em12 = new Date(hoje.getTime() + 365 * 24 * 60 * 60 * 1000)

      // Agrupa parcelas por contratoId
      const porContrato: Record<string, { amort: number; servico12: number; proxima: number; count: number }> = {}
      for (const p of crono.parcelas as any[]) {
        if (!porContrato[p.contratoId]) porContrato[p.contratoId] = { amort: 0, servico12: 0, proxima: 0, count: 0 }
        porContrato[p.contratoId].amort += p.amortizacao ?? 0
        porContrato[p.contratoId].count++
        const venc = new Date(p.vencimento)
        if (venc >= hoje && venc <= em12) porContrato[p.contratoId].servico12 += p.valorParcela
        if (porContrato[p.contratoId].proxima === 0 && venc >= hoje) {
          porContrato[p.contratoId].proxima = p.valorParcela
        }
      }

      const rows: ContratoRow[] = (conts as AgroContrato[]).map(c => {
        const g = porContrato[c.id ?? ''] ?? { amort: 0, servico12: 0, proxima: 0, count: 0 }
        const taxa = c.taxa < 1 ? c.taxa : c.taxa / 100
        const restantes = Math.max(1, c.totalParcelas - c.parcelaAtual + 1)
        return {
          id:                c.id ?? Math.random().toString(),
          banco:             c.banco,
          modalidade:        c.modalidade,
          numeroContrato:    c.numeroContrato ?? '—',
          saldoDevedor:      g.amort > 0 ? g.amort : c.valorParcela * restantes,
          servicoAnual:      g.servico12,
          proximaParcela:    g.proxima || c.valorParcela,
          taxa,
          parcelasRestantes: restantes,
          vencimento:        c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—',
          selected:          false,
        }
      })
      setContratos(rows)

      // Receita anual
      const anos: Record<number, number> = {}
      for (const p of prods) {
        if (p.area <= 0) continue
        const ano = parseInt(p.safra.split('/')[0]) + 1
        anos[ano] = (anos[ano] ?? 0) + p.area * p.produtividade * p.cotacao
      }
      const top = Object.keys(anos).map(Number).sort((a, b) => b - a)
      setReceitaAnual(anos[top[0]] ?? 0)

      // Resultado líquido da safra usada como base de capacidade de pagamento
      const prodCapacidade = prods.filter(p => p.safra === SAFRA_CAPACIDADE && p.area > 0)
      const recBrutaCap = prodCapacidade.reduce((s, p) => s + p.area * p.produtividade * p.cotacao, 0)
      const custoCap    = prodCapacidade.reduce((s, p) =>
        s + p.area * p.custoPorHa * p.cotacao + p.areaArrendada * p.custoArrendHa * (p.cotacao || 1), 0)
      setResultadoLiquidoCapacidade(recBrutaCap - custoCap)
    }).finally(() => setLoading(false))
  }, [clientId])

  const toggleSelect = (id: string) =>
    setContratos(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c))
  const toggleAll = () => {
    const allSel = contratos.every(c => c.selected)
    setContratos(prev => prev.map(c => ({ ...c, selected: !allSel })))
  }

  const selecionados = contratos.filter(c => c.selected)

  const sim = useMemo(() => {
    if (selecionados.length === 0) return null
    const totalSaldo   = selecionados.reduce((s, c) => s + c.saldoDevedor, 0)
    const servicoAtual = selecionados.reduce((s, c) => s + c.servicoAnual, 0)

    if (!taxaAnualEfetiva || !nParcelas) return { totalSaldo, servicoAtual, cronograma: [] as ParcelaSimulada[], novoServicoAnual: null }

    const dataPrimeira = new Date(simDataPrimeira + 'T12:00:00')
    const cronograma = customPcts && customPcts.length === nParcelas
      ? gerarCronogramaCustom(totalSaldo, taxaAnualEfetiva, customPcts, simPeriodicidade, dataPrimeira)
      : gerarCronogramaSimulado(totalSaldo, taxaAnualEfetiva, nParcelas, simPeriodicidade, simSistema, dataPrimeira)

    const em12 = new Date(dataPrimeira); em12.setFullYear(em12.getFullYear() + 1)
    const novoServicoAnual = cronograma.filter(p => p.data <= em12).reduce((s, p) => s + p.valor, 0)

    const economia = servicoAtual - novoServicoAnual
    const pctRecAtual    = receitaAnual > 0 ? servicoAtual / receitaAnual * 100 : 0
    const pctRecNovo     = receitaAnual > 0 ? novoServicoAnual / receitaAnual * 100 : 0
    const totalSaldoGeral  = contratos.reduce((s, c) => s + c.saldoDevedor, 0)
    const servicoGeral     = contratos.reduce((s, c) => s + c.servicoAnual, 0)
    const novoServiceGeral = servicoGeral - servicoAtual + novoServicoAnual
    const pctRecNovGeral   = receitaAnual > 0 ? novoServiceGeral / receitaAnual * 100 : 0

    return {
      totalSaldo, servicoAtual, cronograma, novoServicoAnual,
      economia, pctRecAtual, pctRecNovo, taxaSim: taxaAnualEfetiva,
      totalSaldoGeral, servicoGeral, novoServiceGeral, pctRecNovGeral,
    }
  }, [selecionados, taxaAnualEfetiva, nParcelas, simPeriodicidade, simSistema, simDataPrimeira, contratos, receitaAnual, customPcts])

  // Proposta de Reestruturação Ideal — todo o passivo, parcela fixa a 1% a.a.
  const totalPassivoGeral = useMemo(() => contratos.reduce((s, c) => s + c.saldoDevedor, 0), [contratos])
  const capacidadeModerada = resultadoLiquidoCapacidade * (PCT_MODERADO / 100)
  const capacidadeSaudavel = resultadoLiquidoCapacidade * (PCT_SAUDAVEL / 100)
  const dataPrimeiraIdeal = useMemo(() => {
    const d = new Date(); d.setDate(1); d.setFullYear(d.getFullYear() + 1)
    return d
  }, [])

  const propostaModerada = useMemo(() => calcRestruturacaoIdeal(totalPassivoGeral, capacidadeModerada, TAXA_IDEAL), [totalPassivoGeral, capacidadeModerada])
  const propostaSaudavel = useMemo(() => calcRestruturacaoIdeal(totalPassivoGeral, capacidadeSaudavel, TAXA_IDEAL), [totalPassivoGeral, capacidadeSaudavel])

  const cronModerada = useMemo(() => propostaModerada && !propostaModerada.inviavel
    ? gerarCronogramaSimulado(totalPassivoGeral, TAXA_IDEAL, propostaModerada.nAnos, 'Anual', 'Price', dataPrimeiraIdeal) : [],
    [propostaModerada, totalPassivoGeral, dataPrimeiraIdeal])
  const cronSaudavel = useMemo(() => propostaSaudavel && !propostaSaudavel.inviavel
    ? gerarCronogramaSimulado(totalPassivoGeral, TAXA_IDEAL, propostaSaudavel.nAnos, 'Anual', 'Price', dataPrimeiraIdeal) : [],
    [propostaSaudavel, totalPassivoGeral, dataPrimeiraIdeal])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-3" />
      <span>Carregando contratos...</span>
    </div>
  )

  if (contratos.length === 0) return (
    <div className="text-center py-24 text-gray-400">
      <Settings2 size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhum contrato cadastrado</p>
      <p className="text-sm mt-1">Cadastre contratos na aba <strong>Contratos</strong> para usar o simulador.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Simulador de Reestruturação de Passivo</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Selecione os contratos que deseja reestruturar → defina nova taxa e prazo → veja o impacto consolidado
        </p>
      </div>

      {/* Proposta de Reestruturação Ideal — todo o passivo, parcela fixa a 1% a.a. */}
      <div className="bg-white rounded-2xl border border-emerald-200 shadow-sm overflow-hidden">
        <div className="px-5 py-3 border-b border-emerald-100 bg-emerald-50 flex items-center gap-2">
          <Target size={15} className="text-emerald-700" />
          <h4 className="font-bold text-sm text-emerald-800">
            Proposta de Reestruturação Ideal — Parcela Fixa a 1% a.a. (sem correção)
          </h4>
        </div>
        <div className="p-5 space-y-4">
          <p className="text-xs text-gray-500">
            Considera <strong>todo o passivo contratado</strong> ({fmtBRL(totalPassivoGeral)}) reestruturado em parcelas
            anuais fixas, a uma taxa de 1% a.a. sem indexador, quitado dentro da capacidade de pagamento da
            safra {SAFRA_CAPACIDADE} (Resultado Líquido: {fmtBRL(resultadoLiquidoCapacidade)}).
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <PropostaCard
              titulo={`Comprometendo até ${PCT_MODERADO}% do Resultado (agressivo)`}
              capacidade={capacidadeModerada}
              proposta={propostaModerada}
              cronograma={cronModerada}
              show={showCronIdeal.moderado}
              onToggle={() => setShowCronIdeal(v => ({ ...v, moderado: !v.moderado }))}
            />
            <PropostaCard
              titulo={`Comprometendo até ${PCT_SAUDAVEL}% do Resultado (saudável)`}
              capacidade={capacidadeSaudavel}
              proposta={propostaSaudavel}
              cronograma={cronSaudavel}
              show={showCronIdeal.saudavel}
              onToggle={() => setShowCronIdeal(v => ({ ...v, saudavel: !v.saudavel }))}
            />
          </div>
        </div>
      </div>

      {/* Tabela de contratos — seleção */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700">
            Contratos — selecione os que entrarão na reestruturação
          </h4>
          {selecionados.length > 0 && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {selecionados.length} selecionado(s)
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2">
                  <input type="checkbox" checked={contratos.length > 0 && contratos.every(c => c.selected)}
                    onChange={toggleAll} className="rounded" />
                </th>
                {['Banco', 'Modalidade', 'Nº Contrato', 'Saldo Devedor', 'Serviço 12 meses', 'Taxa a.a.', 'Parc. Restantes', 'Vencimento'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratos.map(c => (
                <tr
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`cursor-pointer transition-colors ${c.selected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={c.selected} onChange={() => toggleSelect(c.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{c.banco}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{c.modalidade}</td>
                  <td className="px-3 py-2.5 text-gray-400">{c.numeroContrato}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(c.saldoDevedor)}</td>
                  <td className="px-3 py-2.5 text-red-500 font-semibold">{c.servicoAnual > 0 ? fmtBRL(c.servicoAnual) : '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{fmtPct(c.taxa)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.parcelasRestantes}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.vencimento}</td>
                </tr>
              ))}
            </tbody>
            {/* Totais */}
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
              <tr>
                <td colSpan={4} className="px-3 py-2.5 text-gray-700">
                  Total geral ({contratos.length} contratos)
                </td>
                <td className="px-3 py-2.5 text-gray-900">{fmtBRL(contratos.reduce((s, c) => s + c.saldoDevedor, 0))}</td>
                <td className="px-3 py-2.5 text-red-600">{fmtBRL(contratos.reduce((s, c) => s + c.servicoAnual, 0))}</td>
                <td colSpan={3} />
              </tr>
              {selecionados.length > 0 && (
                <tr className="bg-blue-50">
                  <td colSpan={4} className="px-3 py-2 text-blue-700">
                    Selecionados para reestruturação ({selecionados.length} contratos)
                  </td>
                  <td className="px-3 py-2 text-blue-900">{fmtBRL(selecionados.reduce((s, c) => s + c.saldoDevedor, 0))}</td>
                  <td className="px-3 py-2 text-blue-700">{fmtBRL(selecionados.reduce((s, c) => s + c.servicoAnual, 0))}</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Painel de simulação */}
      {selecionados.length > 0 ? (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
            <TrendingDown size={15} className="text-blue-600" />
            <h4 className="font-bold text-sm text-blue-800">
              Simulação — {selecionados.length} contrato(s) selecionado(s) · Saldo: {fmtBRL(sim?.totalSaldo ?? 0)}
            </h4>
          </div>

          <div className="p-5 space-y-5">
            {/* Inputs — linha 1 */}
            <div className="grid grid-cols-2 gap-4">
              {/* Taxa */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nova Taxa (spread/nominal)</label>
                <div className="flex gap-1">
                  <input
                    type="number" min={0.1} step={0.1} max={limiteMaxTaxa} value={simTaxa}
                    onChange={e => setSimTaxa(e.target.value)}
                    placeholder="ex: 8.5"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                  />
                  {/* Toggle a.a. / a.m. */}
                  <div className="flex rounded-xl border border-gray-200 overflow-hidden text-xs font-semibold">
                    <button
                      onClick={() => setSimTipoTaxa('aa')}
                      className={`px-2.5 py-2 transition-colors ${simTipoTaxa === 'aa' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >a.a.</button>
                    <button
                      onClick={() => setSimTipoTaxa('am')}
                      className={`px-2.5 py-2 transition-colors ${simTipoTaxa === 'am' ? 'bg-blue-600 text-white' : 'bg-white text-gray-500 hover:bg-gray-50'}`}
                    >a.m.</button>
                  </div>
                </div>
              </div>
              {/* Indexador */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Indexador</label>
                <select
                  value={simIndexador} onChange={e => setSimIndexador(e.target.value as typeof simIndexador)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="Pré-fixado">Pré-fixado</option>
                  <option value="CDI">CDI (14,25% a.a.)</option>
                  <option value="TR">TR (0,88% a.a.)</option>
                  <option value="IPCA">IPCA (5,48% a.a.)</option>
                </select>
                {simTaxa && parseFloat(simTaxa) > limiteMaxTaxa && (
                  <p className="text-xs text-red-500 mt-1 font-semibold">Taxa inválida — máximo {limiteMaxTaxa}% {simTipoTaxa === 'am' ? 'a.m.' : 'a.a.'}</p>
                )}
                {simIndexador !== 'Pré-fixado' && simTaxa && taxaAnualEfetiva != null && (
                  <p className="text-xs text-blue-600 mt-1">
                    Taxa total efetiva: {(taxaAnualEfetiva * 100).toFixed(2).replace('.', ',') + '% a.a.'}
                  </p>
                )}
              </div>
            </div>

            {/* Inputs — linha 2 */}
            <div className="grid grid-cols-4 gap-4">
              {/* Nº de parcelas */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nº de Parcelas</label>
                <input
                  type="number" min={1} step={1} value={simParcelas}
                  onChange={e => setSimParcelas(e.target.value)}
                  placeholder="ex: 60"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              {/* Periodicidade */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Periodicidade</label>
                <select
                  value={simPeriodicidade} onChange={e => setSimPeriodicidade(e.target.value as typeof simPeriodicidade)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="Mensal">Mensal</option>
                  <option value="Semestral">Semestral</option>
                  <option value="Anual">Anual</option>
                </select>
              </div>
              {/* Data da 1ª parcela */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Data da 1ª Parcela</label>
                <input
                  type="date" value={simDataPrimeira}
                  onChange={e => setSimDataPrimeira(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              {/* Sistema amortização */}
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema de Amortização</label>
                <select
                  value={simSistema} onChange={e => setSimSistema(e.target.value as 'SAC' | 'Price')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="SAC">SAC</option>
                  <option value="Price">Price (parcela fixa)</option>
                </select>
              </div>
            </div>

            {/* Resultado */}
            {sim?.cronograma && sim.cronograma.length > 0 && sim.novoServicoAnual != null && (
              <div className="space-y-4">
                {/* Comparativo dos selecionados */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-600 uppercase mb-2">Situação Atual (selecionados)</p>
                    <p className="text-xl font-bold text-red-700">{fmtBRL(sim.servicoAtual)}<span className="text-sm font-normal">/ano</span></p>
                    {receitaAnual > 0 && <p className="text-xs text-gray-500 mt-2">{fmtN(sim.pctRecAtual, 1)}% da receita anual</p>}
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Após Reestruturação (1º ano)</p>
                    <p className="text-xl font-bold text-emerald-700">{fmtBRL(sim.novoServicoAnual)}<span className="text-sm font-normal">/ano</span></p>
                    {receitaAnual > 0 && <p className="text-xs text-gray-500 mt-2">{fmtN(sim.pctRecNovo, 1)}% da receita anual</p>}
                  </div>
                </div>

                {/* Economia */}
                <div className={`rounded-xl p-4 flex items-center justify-between ${sim.economia >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div>
                    <p className={`text-sm font-bold ${sim.economia >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      {sim.economia >= 0 ? 'Redução no serviço anual' : 'Aumento no serviço anual'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {simParcelas} parcelas {simPeriodicidade.toLowerCase()}s · {fmtN((sim.taxaSim ?? 0) * 100, 2)}% a.a.{simIndexador !== 'Pré-fixado' ? ` (${simIndexador} + ${simTaxa}%)` : ''} · {simSistema}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      1ª parcela: {fmtBRL(sim.cronograma[0].valor)} · Última: {fmtBRL(sim.cronograma[sim.cronograma.length - 1].valor)}
                    </p>
                  </div>
                  <span className={`text-2xl font-bold ml-4 ${sim.economia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {sim.economia >= 0 ? '-' : '+'}{fmtBRL(Math.abs(sim.economia))}/ano
                  </span>
                </div>

                {/* Impacto na carteira */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-3">Impacto na carteira total ({contratos.length} contratos)</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Serviço atual (todos)</p>
                      <p className="text-base font-bold text-red-600">{fmtBRL(sim.servicoGeral)}/ano</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Após reestruturação (todos)</p>
                      <p className="text-base font-bold text-emerald-600">{fmtBRL(sim.novoServiceGeral)}/ano</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Comprometimento da receita</p>
                      <p className={`text-base font-bold ${sim.pctRecNovGeral > 35 ? 'text-red-600' : sim.pctRecNovGeral > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {receitaAnual > 0 ? fmtN(sim.pctRecNovGeral, 1) + '%' : '—'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Cronograma completo */}
                <div className="border border-gray-200 rounded-xl overflow-hidden">
                  <button
                    onClick={() => setMostrarCronograma(v => !v)}
                    className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                      Cronograma completo — {sim.cronograma.length} parcelas
                      {customPcts && <span className="ml-2 text-violet-600 normal-case font-normal">(amortização personalizada)</span>}
                    </span>
                    <span className="text-xs text-blue-600 font-semibold">{mostrarCronograma ? 'Ocultar ▲' : 'Exibir ▼'}</span>
                  </button>
                  {mostrarCronograma && (() => {
                    // Percentuais ativos (custom ou uniformes)
                    const n = sim.cronograma.length
                    const pcts: number[] = customPcts && customPcts.length === n
                      ? customPcts
                      : sim.cronograma.map(p => Math.round(p.amort / (sim.totalSaldo || 1) * 10000) / 100)
                    const somaCustom = pcts.reduce((s, v) => s + v, 0)
                    const somaOk = Math.abs(somaCustom - 100) < 0.1

                    const updPct = (idx: number, val: number) => {
                      const arr = [...pcts]
                      arr[idx] = isNaN(val) ? 0 : val
                      setCustomPcts(arr)
                    }

                    return (
                      <div>
                        {/* Barra de controle dos percentuais */}
                        <div className="px-4 py-2 bg-violet-50 border-b border-violet-100 flex items-center justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-violet-700 font-semibold">
                              Σ amortização: <span className={somaOk ? 'text-green-600' : 'text-red-600'}>{fmtN(somaCustom, 2)}%</span>
                              {!somaOk && <span className="text-red-500 ml-1">(deve somar 100%)</span>}
                            </span>
                          </div>
                          <div className="flex gap-2">
                            <button
                              onClick={() => setCustomPcts(null)}
                              className="text-xs px-2.5 py-1 rounded-lg border border-violet-200 text-violet-700 hover:bg-violet-100 transition"
                            >
                              Resetar para {simSistema}
                            </button>
                            {!somaOk && customPcts && (
                              <button
                                onClick={() => {
                                  const diff = 100 - somaCustom
                                  const arr = [...pcts]
                                  arr[arr.length - 1] = Math.round((arr[arr.length - 1] + diff) * 100) / 100
                                  setCustomPcts(arr)
                                }}
                                className="text-xs px-2.5 py-1 rounded-lg bg-violet-600 text-white hover:bg-violet-700 transition"
                              >
                                Ajustar última parcela
                              </button>
                            )}
                          </div>
                        </div>
                        <div className="overflow-x-auto max-h-96 overflow-y-auto">
                          <table className="w-full text-xs">
                            <thead className="sticky top-0 bg-gray-100 z-10">
                              <tr>
                                {['Nº', 'Vencimento', '% Amort.', 'Parcela', 'Amortização', 'Juros', 'Saldo Devedor'].map(h => (
                                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                                ))}
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-50">
                              {sim.cronograma.map((p, idx) => {
                                const pctVal = pcts[idx] ?? 0
                                const isCustom = customPcts !== null
                                return (
                                  <tr key={p.num} className={idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                                    <td className="px-3 py-2 text-gray-400 font-medium">{p.num}</td>
                                    <td className="px-3 py-2 text-gray-700 whitespace-nowrap font-medium">
                                      {p.data.toLocaleDateString('pt-BR')}
                                    </td>
                                    <td className="px-2 py-1.5">
                                      <div className="flex items-center gap-1">
                                        <input
                                          type="number"
                                          min={0} max={100} step={0.01}
                                          value={pctVal}
                                          onChange={e => updPct(idx, parseFloat(e.target.value))}
                                          className={`w-16 text-right border rounded-lg px-1.5 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-violet-400 ${isCustom ? 'border-violet-300 bg-violet-50' : 'border-gray-200 bg-white'}`}
                                        />
                                        <span className="text-gray-400">%</span>
                                      </div>
                                    </td>
                                    <td className="px-3 py-2 font-bold text-gray-900">{fmtBRL(p.valor)}</td>
                                    <td className="px-3 py-2 text-blue-700">{fmtBRL(p.amort)}</td>
                                    <td className="px-3 py-2 text-red-500">{fmtBRL(p.juros)}</td>
                                    <td className="px-3 py-2 text-gray-600">{fmtBRL(p.saldo)}</td>
                                  </tr>
                                )
                              })}
                            </tbody>
                            <tfoot className="bg-gray-100 border-t-2 border-gray-200 font-bold sticky bottom-0">
                              <tr>
                                <td colSpan={2} className="px-3 py-2 text-gray-700">Total</td>
                                <td className={`px-3 py-2 ${somaOk ? 'text-green-600' : 'text-red-600'}`}>{fmtN(somaCustom, 2)}%</td>
                                <td className="px-3 py-2 text-gray-900">{fmtBRL(sim.cronograma.reduce((s, p) => s + p.valor, 0))}</td>
                                <td className="px-3 py-2 text-blue-700">{fmtBRL(sim.cronograma.reduce((s, p) => s + p.amort, 0))}</td>
                                <td className="px-3 py-2 text-red-500">{fmtBRL(sim.cronograma.reduce((s, p) => s + p.juros, 0))}</td>
                                <td className="px-3 py-2 text-gray-400">—</td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    )
                  })()}
                </div>
              </div>
            )}

            {(!simTaxa || !simParcelas) && (
              <p className="text-xs text-gray-400 text-center py-2">Informe a taxa e o número de parcelas para ver a simulação</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Selecione os contratos que deseja reestruturar</p>
          <p className="text-xs mt-1">Marque um ou mais contratos na tabela acima para iniciar a simulação</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { setSimTaxa(''); setSimParcelas(''); setSimSistema('SAC'); setSimPeriodicidade('Mensal'); setSimIndexador('Pré-fixado'); setSimTipoTaxa('aa'); setMostrarCronograma(false); setCustomPcts(null) }}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={12} /> Resetar simulação
        </button>
      </div>
    </div>
  )
}
