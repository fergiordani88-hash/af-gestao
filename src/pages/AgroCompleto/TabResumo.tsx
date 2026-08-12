import { useState, useEffect } from 'react'
import {
  Sprout, CreditCard, Shield, TrendingUp, TrendingDown,
  MapPin, BarChart2, AlertTriangle, CheckCircle, Info, Activity, FileDown, Target, Clock
} from 'lucide-react'
import { agroApi, type AgroProducao, type AgroPatrimonio, type AgroParcela } from '../../services/agroApi'
import { usePDF } from '../../pdf/usePDF'
import { useStore } from '../../store/useStore'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtN   = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (v: number) => `${fmtN(v, 1)}%`

// ── Calendário de colheitas ────────────────────────────────────
interface HarvestDate { month: number; day: number }
const HARVEST_DEFAULTS: Record<string, HarvestDate> = {
  soja:   { month: 4,  day: 15 },
  milho:  { month: 8,  day: 15 },
  feijao: { month: 11, day: 15 },
}
const HARVEST_LABELS: Record<string, string> = {
  soja: 'Soja', milho: 'Milho', feijao: 'Feijão',
}

// ── Juros pró-rata por ano civil ────────────────────────────────
// "Juros bancários do ano" não pode ser só a soma das parcelas cujo vencimento
// cai no ano corrente — a maioria dos contratos rurais é anual com aniversários
// espalhados, então boa parte dos contratos nunca teria uma parcela "no ano" e
// ficaria de fora, subestimando muito o custo real de juros do período.
// Em vez disso, cada parcela tem seu juro repartido proporcionalmente aos dias
// do seu período de acúmulo (data da parcela anterior → vencimento desta) que
// caem dentro do ano civil pedido.
function periodoInicioParcela(p: AgroParcela): Date {
  // 1ª parcela restante: o período de acúmulo começa na contratação (cobre
  // corretamente tanto carência longa quanto contratos "Único"/bullet).
  if (p.parcelaNum === 1) return new Date(p.dataContratacao)
  const d = new Date(p.vencimento)
  if (p.periodicidade === 'Mensal')          d.setMonth(d.getMonth() - 1)
  else if (p.periodicidade === 'Semestral')  d.setMonth(d.getMonth() - 6)
  else if (p.periodicidade === 'Trimestral') d.setMonth(d.getMonth() - 3)
  else                                        d.setFullYear(d.getFullYear() - 1) // Anual
  return d
}

function jurosProrataPeriodo(p: AgroParcela, periodoInicio: Date, periodoFimExcl: Date): number {
  const fim = new Date(p.vencimento)
  const inicio = periodoInicioParcela(p)
  const totalMs = fim.getTime() - inicio.getTime()
  if (totalMs <= 0) return 0
  const overlapStart = inicio > periodoInicio ? inicio : periodoInicio
  const overlapEnd = fim < periodoFimExcl ? fim : periodoFimExcl
  const overlapMs = overlapEnd.getTime() - overlapStart.getTime()
  if (overlapMs <= 0) return 0
  return (p.juros ?? 0) * (overlapMs / totalMs)
}

// periodoInicio/periodoFimExcl: janela de referência (normalmente a safra selecionada,
// 01/jul a 30/jun — não o ano civil, que não corresponde ao ciclo produtivo/financeiro).
function jurosPeriodoProrata(todasParcelas: AgroParcela[], periodoInicio: Date, periodoFimExcl: Date): number {
  return todasParcelas.reduce((s, p) => s + jurosProrataPeriodo(p, periodoInicio, periodoFimExcl), 0)
}

function culturaKey(cultura: string): string | null {
  const s = cultura.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
  if (s.includes('soja'))  return 'soja'
  if (s.includes('milho')) return 'milho'
  if (s.includes('feij'))  return 'feijao'
  return null
}

function getColheitaDate(p: AgroProducao, datas: Record<string, HarvestDate>): Date {
  if (p.dataColheita) return new Date(p.dataColheita)
  const key = culturaKey(p.cultura)
  const hdRaw = key ? datas[key] : undefined
  const hd: HarvestDate = (hdRaw && typeof hdRaw === 'object') ? hdRaw : { month: 4, day: 15 }
  const parts = p.safra.split('/')
  const ano2  = parts[1].length === 2 ? 2000 + parseInt(parts[1]) : parseInt(parts[1])
  return new Date(ano2, hd.month - 1, hd.day)
}

const LS_KEY = 'af-colheita-datas'

function loadColheitaDatas(): Record<string, HarvestDate> {
  try {
    const raw = localStorage.getItem(LS_KEY)
    return raw ? { ...HARVEST_DEFAULTS, ...JSON.parse(raw) } : { ...HARVEST_DEFAULTS }
  } catch { return { ...HARVEST_DEFAULTS } }
}

function calcRow(p: AgroProducao) {
  const custoPorHaReais  = p.custoPorHa * p.cotacao
  const prodTotal        = p.area * p.produtividade
  const recBruta         = prodTotal * p.cotacao
  const custoTotal       = p.area * custoPorHaReais
  const custoArrendTotal = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
  const recLiq           = recBruta - custoTotal - custoArrendTotal
  const custoTotalHa     = custoPorHaReais + (p.area > 0 ? custoArrendTotal / p.area : 0)
  const peHa             = p.cotacao > 0 ? custoTotalHa / p.cotacao : 0
  return { prodTotal, recBruta, custoTotal, custoArrendTotal, recLiq, peHa, custoTotalHa }
}

type Status = 'ok' | 'atencao' | 'risco'

function Badge({ status, label }: { status: Status; label: string }) {
  const cls: Record<Status, string> = {
    ok:      'bg-green-100 text-green-700 border-green-200',
    atencao: 'bg-amber-100 text-amber-700 border-amber-200',
    risco:   'bg-red-100   text-red-700   border-red-200',
  }
  const icon: Record<Status, React.ElementType> = {
    ok:      CheckCircle,
    atencao: AlertTriangle,
    risco:   AlertTriangle,
  }
  const Icon = icon[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cls[status]}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

function KpiCard({ title, value, sub, icon: Icon, color, right }: {
  title: string; value: string; sub?: string
  icon: React.ElementType; color: string; right?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
            <Icon size={15} className={color} />
          </div>
          <span className="text-xs font-semibold text-gray-500">{title}</span>
        </div>
        {right}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-50 ${color.replace('text-', 'bg-').replace('-600', '-50').replace('-700', '-50')}`}>
        <Icon size={16} className={color} />
        <h3 className={`text-sm font-bold ${color}`}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function IndiceRow({ label, value, status, tooltip }: { label: string; value: string; status: Status; tooltip: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="relative group cursor-default">
          <Info size={12} className="text-gray-400" />
          <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tooltip}
          </div>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        <Badge status={status} label={status === 'ok' ? 'Saudável' : status === 'atencao' ? 'Atenção' : 'Risco'} />
      </div>
    </div>
  )
}

// ── Contexto de Mercado (preenchido manualmente na hora de exportar) ──────────
interface ContextoMercado {
  cambio: string; precoRef: string; panorama: string; comentario: string
}
const EMPTY_CONTEXTO_MERCADO: ContextoMercado = { cambio: '', precoRef: '', panorama: '', comentario: '' }
const PANORAMAS_CLIMATICOS = ['La Niña (tendência seca)', 'El Niño (tendência chuvosa)', 'Neutro', 'Indefinido']

function loadContextoMercado(clientId: string): ContextoMercado {
  try {
    const raw = localStorage.getItem(`contexto-mercado-v1-${clientId}`)
    return raw ? { ...EMPTY_CONTEXTO_MERCADO, ...JSON.parse(raw) } : EMPTY_CONTEXTO_MERCADO
  } catch { return EMPTY_CONTEXTO_MERCADO }
}

const SAFRAS = ['2025/26', '2026/27']

export function TabResumo({ clientId, clienteNome, clienteCidade }: {
  clientId: string; clienteNome?: string; clienteCidade?: string
}) {
  const pdf = usePDF()
  const [producao,  setProducao]  = useState<AgroProducao[]>([])
  const [patrimonio, setPatrimonio] = useState<AgroPatrimonio[]>([])
  const [parcelas,  setParcelas]  = useState<AgroParcela[]>([])
  const [contratos, setContratos] = useState<any[]>([])
  const [totalEndividamento, setTotalEndividamento] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [safra, setSafra] = useState('2025/26')
  const [exportando, setExportando] = useState(false)
  const [limSaudavel, setLimSaudavel] = useState(30)
  const [limCritico,  setLimCritico]  = useState(50)
  const [colheitaDatas, setColheitaDatas] = useState<Record<string, HarvestDate>>(loadColheitaDatas)
  const [showCalendario, setShowCalendario] = useState(false)
  const [colheitaEdit, setColheitaEdit] = useState<Record<string, HarvestDate>>({})
  const [contextoMercado, setContextoMercado] = useState<ContextoMercado>(EMPTY_CONTEXTO_MERCADO)
  const [showContextoMercado, setShowContextoMercado] = useState(false)

  const saveColheitaDatas = (datas: Record<string, HarvestDate>) => {
    setColheitaDatas(datas)
    localStorage.setItem(LS_KEY, JSON.stringify(datas))
  }

  const saveContextoMercado = (next: ContextoMercado) => {
    setContextoMercado(next)
    localStorage.setItem(`contexto-mercado-v1-${clientId}`, JSON.stringify(next))
  }

  useEffect(() => {
    if (!clientId) return
    setContextoMercado(loadContextoMercado(clientId))
  }, [clientId])

  useEffect(() => {
    setLoading(true)
    Promise.all([
      agroApi.producao.list(clientId),
      agroApi.patrimonio.list(clientId),
      agroApi.contratos.cronograma(clientId),
      agroApi.fluxoDiario(clientId, 0),
      agroApi.contratos.list(clientId),
    ]).then(([prod, pat, crono, fluxo, contr]) => {
      setProducao(prod)
      setPatrimonio(pat)
      setParcelas(crono.parcelas)
      setTotalEndividamento(crono.totalEndividamento)
      setSaldoCaixa(fluxo.saldoFinal)
      setContratos(contr)
    }).catch(console.error).finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-af-green mr-3" />
        <span className="text-sm">Carregando diagnóstico...</span>
      </div>
    )
  }

  // ── Produção da safra selecionada ──────────────────────────────
  // Filtra entradas com área > 0 (exclui registros vazios/duplicados)
  const prodSafra = producao.filter(p => p.safra === safra && p.area > 0)

  // Soja + Milho 2ª + Feijão são cultivados na MESMA terra em rotação.
  // A área física é a da cultura principal (ordem = 'principal').
  // Se não houver principal, usa a de maior área. Não somar entre culturas.
  const principal = prodSafra.find(p => p.ordem === 'principal') ?? prodSafra.reduce<AgroProducao | undefined>(
    (m, p) => (!m || p.area > m.area) ? p : m, undefined
  )
  const areaTotal     = principal?.area ?? 0
  const areaArrendada = principal?.areaArrendada ?? 0
  const areaPropria   = areaTotal - areaArrendada
  const pctArrendada  = areaTotal > 0 ? (areaArrendada / areaTotal) * 100 : 0

  const culturas = [...new Set(prodSafra.map(p => p.cultura))]

  const receitaBruta  = prodSafra.reduce((s, p) => s + calcRow(p).recBruta,   0)
  const custoTotal    = prodSafra.reduce((s, p) => s + calcRow(p).custoTotal + calcRow(p).custoArrendTotal, 0)
  const resultadoLiq  = receitaBruta - custoTotal
  const margem        = receitaBruta > 0 ? (resultadoLiq / receitaBruta) * 100 : 0
  const custoMedioHa  = areaTotal > 0 ? custoTotal / areaTotal : 0

  // ── Patrimônio ─────────────────────────────────────────────────
  const patrimonioGruto  = patrimonio.reduce((s, p) => s + p.valorAvaliado, 0)
  const totalOnus        = patrimonio.reduce((s, p) => s + p.valorOnus, 0)
  const patrimonioLiqPat = patrimonioGruto - totalOnus

  // ── Endividamento ───────────────────────────────────────────────
  // "Ano corrente" aqui = a SAFRA selecionada (01/jul do 1º ano a 30/jun do 2º),
  // não o ano civil — o ciclo produtivo/financeiro do produtor roda nessa janela,
  // não em janeiro-dezembro.
  const anoAtual = new Date().getFullYear()
  const hoje = new Date()
  const [safraAnoIniStr] = safra.split('/')
  const safraAnoIni = parseInt(safraAnoIniStr, 10)
  const safraInicio = new Date(safraAnoIni, 6, 1)          // 01/jul
  const safraFimExcl = new Date(safraAnoIni + 1, 6, 1)     // 01/jul do ano seguinte (limite exclusivo)
  const safraFim = new Date(safraFimExcl.getTime() - 1)    // 30/jun 23:59:59
  // Janela auxiliar só para o card "Até 31/12" do demonstrativo CP × LP (não afeta
  // os demais indicadores, que seguem a safra).
  const fimAno31Dez = new Date(anoAtual, 11, 31)
  // Só o que ainda vai vencer a partir de hoje — parcelas já vencidas dentro da
  // safra corrente já são passado e não devem inflar a capacidade de pagamento.
  const parcelasAnoAtual = parcelas.filter(p => {
    const v = new Date(p.vencimento)
    return v >= safraInicio && v < safraFimExcl && v >= hoje
  })
  const servicoAnual = parcelasAnoAtual.reduce((s, p) => s + p.valorParcela, 0)

  // ── Índices ────────────────────────────────────────────────────
  const alavancagem   = patrimonioGruto > 0 ? (totalEndividamento / patrimonioGruto) * 100 : 0
  const solvencia     = totalEndividamento > 0 ? patrimonioLiqPat / totalEndividamento : Infinity
  const endivReceita  = receitaBruta > 0 ? totalEndividamento / receitaBruta : 0
  const capPagamento  = servicoAnual > 0 ? resultadoLiq / servicoAnual : Infinity

  // ── Capacidade de Pagamento (exceto custeio) ───────────────────
  const isCusteio = (modalidade: string) =>
    ['custeio', 'cpr'].some(k => modalidade.toLowerCase().includes(k))
  const contratosCusteioIds = new Set(
    contratos.filter((c: any) => isCusteio(c.modalidade)).map((c: any) => c.id)
  )
  const servicoCusteioAnual    = parcelasAnoAtual.filter(p => contratosCusteioIds.has(p.contratoId)).reduce((s, p) => s + p.valorParcela, 0)
  const servicoSemCusteioAnual = servicoAnual - servicoCusteioAnual
  const endivCusteio    = contratos.filter((c: any) => isCusteio(c.modalidade)).reduce((s: number, c: any) => s + c.valorTomado, 0)
  const endivSemCusteio = totalEndividamento - endivCusteio

  // ── Custeio excedente ─────────────────────────────────────────
  // Se endividamento de custeio > custo real de produção, o excesso não está
  // coberto pela atividade e deve impactar a capacidade de pagamento.
  const custeioLimite    = custoTotal  // custo real de produção da safra selecionada
  const custeioExcedente = Math.max(0, endivCusteio - custeioLimite)
  const propExcedente    = endivCusteio > 0 ? custeioExcedente / endivCusteio : 0
  // Parcela do serviço de custeio que excede a cobertura da atividade
  const servicoCusteioExcedenteAnual = servicoCusteioAnual * propExcedente
  // Serviço exceto custeio + custeio excedente = o que realmente compromete o resultado
  const servicoComprometeAnual = servicoSemCusteioAnual + servicoCusteioExcedenteAnual

  // Comprometimento da receita líquida com serviço exceto custeio (ajustado)
  const comprometimentoPct = resultadoLiq > 0 ? (servicoComprometeAnual / resultadoLiq) * 100 : 0
  const capMaxSaudavel = resultadoLiq * (limSaudavel / 100)
  const capMaxCritico  = resultadoLiq * (limCritico  / 100)
  const margemDisponivel = capMaxSaudavel - servicoComprometeAnual
  const statusCapEndiv: Status = comprometimentoPct <= limSaudavel ? 'ok' : comprometimentoPct <= limCritico ? 'atencao' : 'risco'

  // ── CP vs LP (360 dias) ────────────────────────────────────────
  const dataCorte360 = new Date(hoje.getTime() + 360 * 24 * 60 * 60 * 1000)

  // Classifica cada entrada de produção pela data de colheita da sua cultura
  const producaoCp = producao.filter(p => {
    const d = getColheitaDate(p, colheitaDatas)
    return d > hoje && d <= dataCorte360
  })
  const producaoLp = producao.filter(p => getColheitaDate(p, colheitaDatas) > dataCorte360)

  const receitaCp   = producaoCp.reduce((s, p) => s + calcRow(p).recBruta, 0)
  const custoCp     = producaoCp.reduce((s, p) => s + calcRow(p).custoTotal + calcRow(p).custoArrendTotal, 0)
  // LP: receita = safra selecionada (ciclo anual representativo do produtor)
  // Serviço LP = total LP ÷ anos de vigência → serviço anual médio (base DSCR)
  const receitaLp   = receitaBruta
  const custoLp     = custoTotal
  const resultadoCp = receitaCp - custoCp
  const resultadoLp = resultadoLiq

  const parcelasCp     = parcelas.filter(p => new Date(p.vencimento) <= dataCorte360)
  const parcelasLp     = parcelas.filter(p => new Date(p.vencimento) > dataCorte360)
  const servicoCp      = parcelasCp.reduce((s, p) => s + p.valorParcela, 0)
  const servicoLpTotal = parcelasLp.reduce((s, p) => s + p.valorParcela, 0)
  const anosLp         = Math.max(1, new Set(parcelasLp.map(p => new Date(p.vencimento).getFullYear())).size)
  const servicoLp      = servicoLpTotal / anosLp

  // Custeio excedente por horizonte (mesmo critério: excesso sobre custo do horizonte)
  const servicoCusteioCp      = parcelasCp.filter(p => contratosCusteioIds.has(p.contratoId)).reduce((s, p) => s + p.valorParcela, 0)
  const servicoCusteioLpTotal = parcelasLp.filter(p => contratosCusteioIds.has(p.contratoId)).reduce((s, p) => s + p.valorParcela, 0)
  const servicoCusteioLp      = servicoCusteioLpTotal / anosLp

  // Excedente proporcional de custeio em cada horizonte
  const excCpProp = endivCusteio > 0 ? Math.min(1, Math.max(0, custeioExcedente / endivCusteio)) : 0
  const servicoCusteioExcCp = servicoCusteioCp * excCpProp
  const servicoCusteioExcLp = servicoCusteioLp * excCpProp

  // O que efetivamente compromete a capacidade de pagamento em cada horizonte
  const servicoCompromCp = (servicoCp - servicoCusteioCp) + servicoCusteioExcCp
  const servicoCompromLp = (servicoLp - servicoCusteioLp) + servicoCusteioExcLp

  const saldoDispCp = resultadoCp - servicoCompromCp
  const saldoDispLp = resultadoLp - servicoCompromLp

  // PEs por horizonte
  const peSaudavelCp = resultadoCp * (limSaudavel / 100)
  const peCriticoCp  = resultadoCp * (limCritico  / 100)
  const peSaudavelLp = resultadoLp * (limSaudavel / 100)
  const peCriticoLp  = resultadoLp * (limCritico  / 100)

  const comprCp: Status = receitaCp === 0 ? 'ok' : resultadoCp <= 0 ? 'risco' : (servicoCompromCp / resultadoCp) * 100 <= limSaudavel ? 'ok' : (servicoCompromCp / resultadoCp) * 100 <= limCritico ? 'atencao' : 'risco'
  const comprLp: Status = receitaLp === 0 ? 'ok' : resultadoLp <= 0 ? 'risco' : (servicoCompromLp / resultadoLp) * 100 <= limSaudavel ? 'ok' : (servicoCompromLp / resultadoLp) * 100 <= limCritico ? 'atencao' : 'risco'

  // Dentro do Ano (até 31/12 do ano civil corrente)
  const fimDoAno = new Date(anoAtual, 11, 31)
  const producaoDentroAno = producao.filter(p => {
    const d = getColheitaDate(p, colheitaDatas)
    return d >= hoje && d <= fimDoAno
  })
  const receitaDentroAno   = producaoDentroAno.reduce((s, p) => s + calcRow(p).recBruta, 0)
  const custoDentroAno     = producaoDentroAno.reduce((s, p) => s + calcRow(p).custoTotal + calcRow(p).custoArrendTotal, 0)
  const resultadoDentroAno = receitaDentroAno - custoDentroAno

  // Parcelas com vencimento a partir de hoje até 31/12 — só para este card do
  // demonstrativo (independente de parcelasAnoAtual, que segue a safra e alimenta
  // os demais indicadores da tela).
  const parcelasAte31Dez = parcelas.filter(p => {
    const v = new Date(p.vencimento)
    return v >= hoje && v <= fimDoAno
  })
  const servicoDentroAno         = parcelasAte31Dez.reduce((s, p) => s + p.valorParcela, 0)
  const servicoCusteioDentroAno  = parcelasAte31Dez.filter(p => contratosCusteioIds.has(p.contratoId)).reduce((s, p) => s + p.valorParcela, 0)
  const servicoCusteioExcDentroAno = servicoCusteioDentroAno * excCpProp
  const servicoCompromDentroAno  = (servicoDentroAno - servicoCusteioDentroAno) + servicoCusteioExcDentroAno
  const saldoDispDentroAno       = resultadoDentroAno - servicoCompromDentroAno
  const peSaudavelAno = resultadoDentroAno * (limSaudavel / 100)
  const peCriticoAno  = resultadoDentroAno * (limCritico  / 100)
  const comprDentroAno: Status = receitaDentroAno === 0 ? 'ok' : resultadoDentroAno <= 0 ? 'risco' : (servicoCompromDentroAno / resultadoDentroAno) * 100 <= limSaudavel ? 'ok' : (servicoCompromDentroAno / resultadoDentroAno) * 100 <= limCritico ? 'atencao' : 'risco'

  // Aliases para a tabela (mantém nomes antigos onde a UI usa exceto-custeio puro)
  const servicoExcCusteioCp        = servicoCp - servicoCusteioCp
  const servicoExcCusteioLp        = servicoLp - servicoCusteioLp
  const servicoExcCusteioDentroAno = servicoDentroAno - servicoCusteioDentroAno

  const safrasCpNomes  = producaoCp.map(p => p.safra).filter((v, i, a) => a.indexOf(v) === i)
  const safrasLpNomes  = [safra] // LP usa safra selecionada como referência anual
  const safrasAnoNomes = producaoDentroAno.map(p => p.safra).filter((v, i, a) => a.indexOf(v) === i)

  // Culturas presentes nos dados (para mostrar no calendário)
  const culturasPresentes = [...new Set(producao.map(p => culturaKey(p.cultura)).filter(Boolean))] as string[]
  const todasCulturasCalendario = [...new Set([...Object.keys(HARVEST_DEFAULTS), ...culturasPresentes])]

  const statusAlavancagem: Status = alavancagem < 30 ? 'ok' : alavancagem < 50 ? 'atencao' : 'risco'
  const statusSolvencia:   Status = solvencia > 2   ? 'ok' : solvencia > 1   ? 'atencao' : 'risco'
  const statusEndivRec:    Status = endivReceita < 1 ? 'ok' : endivReceita < 2 ? 'atencao' : 'risco'
  const statusCapPag:      Status = capPagamento > 1.5 ? 'ok' : capPagamento > 1 ? 'atencao' : 'risco'
  const statusMargem:      Status = margem > 20 ? 'ok' : margem > 10 ? 'atencao' : 'risco'

  // Rating geral
  const scores = [statusAlavancagem, statusSolvencia, statusEndivRec, statusCapPag, statusMargem]
  const riscos  = scores.filter(s => s === 'risco').length
  const atencoes = scores.filter(s => s === 'atencao').length
  const ratingGeral: Status = riscos > 0 ? 'risco' : atencoes > 1 ? 'atencao' : 'ok'
  const ratingLabel = ratingGeral === 'ok' ? 'Situação Saudável' : ratingGeral === 'atencao' ? 'Requer Atenção' : 'Alto Risco'
  const ratingColor = ratingGeral === 'ok' ? '#1B5E20' : ratingGeral === 'atencao' ? '#E65100' : '#B71C1C'

  const hasProducao = prodSafra.length > 0

  // ── Exportar Relatório Completo PDF ────────────────────────────
  const handleExportarRelatorio = async () => {
    setExportando(true)
    try {
      // Busca dados adicionais para o relatório (projeção e cenários)
      const [custosFixos, despesas] = await Promise.all([
        agroApi.custosFixos.list(clientId).catch(() => [] as any[]),
        agroApi.despesas.list(clientId).catch(() => [] as any[]),
      ])
      const custosFixosAnuais = custosFixos.reduce((s: number, cf: any) => s + cf.valorMensal, 0) * 12
      const agora = new Date(); agora.setHours(0, 0, 0, 0)
      const dividasPorAno: Record<string, number> = {}
      for (const p of parcelas) {
        if (new Date(p.vencimento) < agora) continue   // só a partir de hoje
        const ano = String(new Date(p.vencimento).getFullYear())
        dividasPorAno[ano] = (dividasPorAno[ano] ?? 0) + p.valorParcela
      }

      // Projeção base simples (cenário base, sem ajustes)
      const prodPorAno: Record<number, AgroProducao[]> = {}
      for (const p of producao) {
        const ano = parseInt(p.safra.split('/')[0]) + 1
        if (!prodPorAno[ano]) prodPorAno[ano] = []
        prodPorAno[ano].push(p)
      }
      const ultimoAno = Math.max(...Object.keys(prodPorAno).map(Number), 2025)
      const baseProds = prodPorAno[ultimoAno] ?? prodSafra

      // Taxa média ponderada pelo valor tomado dos contratos vigentes — usada para
      // capitalizar o prejuízo do ano anterior (ele precisa ser coberto por crédito)
      const totalTomadoContratos = contratos.reduce((s: number, c: any) => s + (c.valorTomado || 0), 0)
      const taxaMediaContratos = totalTomadoContratos > 0
        ? contratos.reduce((s: number, c: any) => s + (c.taxa || 0) * (c.valorTomado || 0), 0) / totalTomadoContratos
        : 0

      const projecaoAnos: { ano: number; recBruta: number; custoAtividade: number; endividamento: number; prejuizoFinanciado: number; resultadoLiquido: number }[] = []
      for (let i = 0; i < 10; i++) {
        const ano = 2026 + i
        let recBruta = 0, custo = 0
        if (prodPorAno[ano]) {
          for (const p of prodPorAno[ano]) { recBruta += p.area * p.produtividade * p.cotacao; custo += p.area * p.custoPorHa * p.cotacao }
        } else {
          const g = Math.pow(1.02, i)
          for (const p of baseProds) { recBruta += p.area * p.produtividade * p.cotacao * g; custo += p.area * p.custoPorHa * p.cotacao * g }
        }
        const custoAtividade = custo + custosFixosAnuais
        const endividamento = dividasPorAno[String(ano)] ?? 0
        const prejuizoAnoAnterior = i > 0 && projecaoAnos[i - 1].resultadoLiquido < 0
          ? Math.abs(projecaoAnos[i - 1].resultadoLiquido) : 0
        const prejuizoFinanciado = prejuizoAnoAnterior * (1 + taxaMediaContratos)
        const resultadoLiquido = recBruta - custoAtividade - endividamento - prejuizoFinanciado
        projecaoAnos.push({ ano, recBruta, custoAtividade, endividamento, prejuizoFinanciado, resultadoLiquido })
      }

      // Cenários do localStorage
      let cenariosRaw: any[] = []
      try {
        const raw = localStorage.getItem(`cenarios-v1-${clientId}`)
        if (raw) cenariosRaw = JSON.parse(raw)
      } catch {}

      const cenarios = cenariosRaw.length > 0 ? cenariosRaw.map(c => {
        const fP = 1 + c.varPreco / 100, fPr = 1 + c.varProdut / 100, fA = 1 + c.varArea / 100, fC = 1 + c.varCusto / 100
        const rows: { resultadoLiquido: number }[] = []
        for (let i = 0; i < 10; i++) {
          const g = Math.pow(1.02, i)
          let rec = 0, cst = 0
          for (const p of baseProds) {
            rec += p.area * fA * p.produtividade * fPr * p.cotacao * fP * g
            cst += p.area * fA * p.custoPorHa * fC * p.cotacao * fP * g
          }
          const div = dividasPorAno[String(2026 + i)] ?? 0
          const prejAnterior = i > 0 && rows[i - 1].resultadoLiquido < 0 ? Math.abs(rows[i - 1].resultadoLiquido) : 0
          const prejFinanciado = prejAnterior * (1 + taxaMediaContratos)
          rows.push({ resultadoLiquido: rec - cst - custosFixosAnuais - div - prejFinanciado })
        }
        const tot = rows.reduce((s, r) => s + r.resultadoLiquido, 0)
        const pos = rows.filter(r => r.resultadoLiquido > 0).length
        const marg = rows.reduce((s, r) => s + r.resultadoLiquido, 0) / (rows.reduce((s, r) => s + r.resultadoLiquido + custosFixosAnuais, 0) || 1)
        return {
          nome: c.nome,
          resultadoTotal10Anos: tot,
          anosPositivos: pos,
          margLiquidaMedia: marg,
          veredicto: tot < 0 || pos < 4 ? 'Inviável — revisar estrutura' : pos < 7 ? 'Atenção — risco elevado' : marg >= 0.15 ? 'Saudável — expandir' : 'Viável — manter',
        }
      }) : []

      // Juros em sacas
      const jurosAnuaisExport = jurosPeriodoProrata(parcelas, safraInicio, safraFimExcl)
      const sojaRowExp = prodSafra.find(p => p.cultura.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('soja'))
      const cotacaoRefExp = sojaRowExp?.cotacao ?? prodSafra.find(p => p.ordem === 'principal')?.cotacao ?? 0
      const culturaRefExp = sojaRowExp?.cultura ?? prodSafra.find(p => p.ordem === 'principal')?.cultura ?? ''
      const jurosPorHaExp = areaTotal > 0 ? jurosAnuaisExport / areaTotal : 0
      const sacasTotalExp = cotacaoRefExp > 0 ? jurosAnuaisExport / cotacaoRefExp : 0
      const sacasPorHaExp = cotacaoRefExp > 0 ? jurosPorHaExp / cotacaoRefExp : 0
      const pctReceitaDividaExp = receitaBruta > 0 ? (servicoAnual / receitaBruta) * 100 : 0

      // CP comprometimento %
      const pctCp  = resultadoCp  > 0 ? (servicoCompromCp  / resultadoCp)  * 100 : 0
      const pctAno = resultadoDentroAno > 0 ? (servicoCompromDentroAno / resultadoDentroAno) * 100 : 0
      const pctLp  = resultadoLp  > 0 ? (servicoCompromLp  / resultadoLp)  * 100 : 0

      // Reestruturação de Passivo — proposta ideal (todo o passivo, 1% a.m., sem correção)
      const SAFRA_CAPACIDADE = '2026/27'
      const prodCapacidade = producao.filter(p => p.safra === SAFRA_CAPACIDADE && p.area > 0)
      const recBrutaCap = prodCapacidade.reduce((s, p) => s + p.area * p.produtividade * p.cotacao, 0)
      const custoCap    = prodCapacidade.reduce((s, p) =>
        s + p.area * p.custoPorHa * p.cotacao + p.areaArrendada * p.custoArrendHa * (p.cotacao || 1), 0)
      const resultadoLiquidoCapacidade = recBrutaCap - custoCap
      const TAXA_MENSAL_IDEAL = 0.01
      const TAXA_IDEAL = Math.pow(1 + TAXA_MENSAL_IDEAL, 12) - 1
      const calcCenarioReestruturacao = (label: string, capacidadeAnual: number) => {
        if (totalEndividamento <= 0 || capacidadeAnual <= totalEndividamento * TAXA_IDEAL) {
          return { label, capacidadeAnual, inviavel: true }
        }
        const nContinuo   = Math.log(capacidadeAnual / (capacidadeAnual - totalEndividamento * TAXA_IDEAL)) / Math.log(1 + TAXA_IDEAL)
        const nAnos       = Math.max(1, Math.ceil(nContinuo))
        const parcelaFixa = totalEndividamento * TAXA_IDEAL / (1 - Math.pow(1 + TAXA_IDEAL, -nAnos))
        const totalJuros  = parcelaFixa * nAnos - totalEndividamento
        return { label, capacidadeAnual, inviavel: false, nAnos, parcelaFixa, totalJuros }
      }
      const reestruturacaoIdeal = {
        totalPassivo: totalEndividamento,
        resultadoLiquidoCapacidade,
        safraCapacidade: SAFRA_CAPACIDADE,
        cenarios: [
          calcCenarioReestruturacao('50% do Resultado (agressivo)', resultadoLiquidoCapacidade * 0.50),
          calcCenarioReestruturacao('30% do Resultado (saudável)', resultadoLiquidoCapacidade * 0.30),
        ],
      }

      await pdf.exportRelatorioAgro({
        clientName:    clienteNome ?? 'Produtor',
        clientCity:    clienteCidade,
        consultorName: 'AF Gestão & Consultoria',
        safra,
        dataGeracao:   new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
        horaGeracao:   new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        culturas:      prodSafra.map(p => ({ ...p, custoItens: p.custoItens })),
        areaTotal,
        areaArrendada,
        contratos:     (() => {
          // Saldo devedor real por contrato = soma da amortização das parcelas
          // futuras (mesmo critério do totalEndividamento do backend) — não o
          // valorTomado original, que não reflete o que já foi amortizado.
          const saldoPorContrato: Record<string, number> = {}
          for (const p of parcelas as any[]) {
            saldoPorContrato[p.contratoId] = (saldoPorContrato[p.contratoId] ?? 0) + (p.amortizacao ?? 0)
          }
          return contratos.map((c: any) => ({
            banco: c.banco, modalidade: c.modalidade,
            saldoDevedor: saldoPorContrato[c.id] ?? 0,
            valorParcela: c.valorParcela, taxa: c.taxa, vencimento: c.vencimento,
            totalParcelas: c.totalParcelas, parcelaAtual: c.parcelaAtual,
            tomador: c.tomador || undefined,
          }))
        })(),
        totalEndividamento,
        servicoAnual,
        saldoDevedor: totalEndividamento,
        patrimonio:    patrimonio.map(p => ({
          categoria: p.categoria, descricao: p.descricao,
          valorAvaliado: p.valorAvaliado, possuiOnus: p.possuiOnus, valorOnus: p.valorOnus,
        })),
        patrimonioGruto,
        totalOnus,
        margem,
        alavancagem,
        solvencia,
        endivReceita,
        capPagamento,
        ratingLabel,
        ratingColor,
        cenarios,
        projecao10Anos: projecaoAnos.reduce((s, r) => s + r.resultadoLiquido, 0),
        projecaoAnos,
        reestruturacaoIdeal,
        contextoMercado: Object.values(contextoMercado).some(v => v.trim() !== '') ? contextoMercado : undefined,
        // Juros em sacas
        jurosAnuais:        jurosAnuaisExport > 0 ? jurosAnuaisExport : undefined,
        jurosHa:            jurosPorHaExp > 0 ? jurosPorHaExp : undefined,
        jurosAnuaisSacas:   sacasTotalExp > 0 ? sacasTotalExp : undefined,
        jurosSacasHa:       sacasPorHaExp > 0 ? sacasPorHaExp : undefined,
        jurosCultura:       culturaRefExp || undefined,
        comprometimentoReceita: pctReceitaDividaExp > 0 ? pctReceitaDividaExp : undefined,
        // CP / Ano / LP
        cpHorizonte: parcelasCp.length > 0 ? {
          servico: servicoCompromCp, parcelas: parcelasCp.length,
          peSaud: peSaudavelCp, peCrit: peCriticoCp,
          saldo: saldoDispCp, pct: pctCp, status: comprCp,
        } : undefined,
        anoHorizonte: parcelasAte31Dez.length > 0 ? {
          servico: servicoCompromDentroAno, parcelas: parcelasAte31Dez.length,
          peSaud: peSaudavelAno, peCrit: peCriticoAno,
          saldo: saldoDispDentroAno, pct: pctAno, status: comprDentroAno,
          anoRef: anoAtual,
        } : undefined,
        lpHorizonte: parcelasLp.length > 0 ? {
          servico: servicoCompromLp, parcelas: parcelasLp.length,
          peSaud: peSaudavelLp, peCrit: peCriticoLp,
          saldo: saldoDispLp, pct: pctLp, status: comprLp,
        } : undefined,
        // Vencimentos por ano
        vencimentosPorAno: Object.entries(dividasPorAno)
          .map(([ano, valor]) => ({ ano: parseInt(ano), valor }))
          .sort((a, b) => a.ano - b.ano),
      })
    } catch (err: any) {
      console.error('Erro ao gerar PDF:', err)
      alert(`Erro ao gerar PDF: ${err?.message ?? String(err)}`)
    } finally {
      setExportando(false)
    }
  }

  return (
    <div className="space-y-6">

      {/* Cabeçalho do produtor */}
      <div className="bg-gradient-to-r from-af-green to-emerald-600 rounded-2xl p-5 text-white flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sprout size={20} />
            <h2 className="text-lg font-bold">{clienteNome ?? 'Produtor'}</h2>
          </div>
          {clienteCidade && (
            <div className="flex items-center gap-1 text-sm text-green-100">
              <MapPin size={13} />
              {clienteCidade}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {culturas.length > 0 ? culturas.map(c => (
              <span key={c} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">{c}</span>
            )) : (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Sem produção lançada</span>
            )}
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border-2 ${
            ratingGeral === 'ok' ? 'bg-green-100 text-green-800 border-green-200' :
            ratingGeral === 'atencao' ? 'bg-amber-100 text-amber-800 border-amber-200' :
            'bg-red-100 text-red-800 border-red-200'
          }`}>
            {ratingGeral === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {ratingLabel}
          </div>
          <p className="text-xs text-green-200">Rating geral do produtor</p>
          <button
            onClick={handleExportarRelatorio}
            disabled={exportando}
            className="flex items-center gap-1.5 bg-white/15 hover:bg-white/25 disabled:opacity-50 text-white text-xs font-semibold rounded-lg px-3 py-1.5 border border-white/30 transition-colors"
          >
            <FileDown size={13} />
            {exportando ? 'Gerando PDF...' : 'Exportar Relatório Completo'}
          </button>
        </div>
      </div>

      {/* Contexto de Mercado — opcional, aparece no relatório */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowContextoMercado(v => !v)}
          className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition-colors"
        >
          <span className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Activity size={14} className="text-blue-500" />
            Contexto de Mercado
            <span className="text-xs font-normal text-gray-400">— opcional, aparece no relatório</span>
          </span>
          <span className="text-xs text-blue-600 font-semibold">{showContextoMercado ? 'Ocultar ▲' : 'Editar ▼'}</span>
        </button>
        {showContextoMercado && (
          <div className="px-5 pb-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Câmbio (R$/US$)</label>
                <input
                  type="text" value={contextoMercado.cambio}
                  onChange={e => saveContextoMercado({ ...contextoMercado, cambio: e.target.value })}
                  placeholder="ex: 5,42"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Preço de referência (CEPEA, R$/sc)</label>
                <input
                  type="text" value={contextoMercado.precoRef}
                  onChange={e => saveContextoMercado({ ...contextoMercado, precoRef: e.target.value })}
                  placeholder="ex: soja 128,50"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Panorama climático</label>
                <select
                  value={contextoMercado.panorama}
                  onChange={e => saveContextoMercado({ ...contextoMercado, panorama: e.target.value })}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white"
                >
                  <option value="">Selecione...</option>
                  {PANORAMAS_CLIMATICOS.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Comentário de mercado</label>
              <textarea
                value={contextoMercado.comentario}
                onChange={e => saveContextoMercado({ ...contextoMercado, comentario: e.target.value })}
                placeholder="Ex: safra recorde de soja nos EUA pressiona preço; dólar em alta favorece exportador; La Niña reduz risco de excesso hídrico na colheita..."
                rows={3}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 resize-none"
              />
            </div>
            <p className="text-xs text-gray-400">
              Preenchido manualmente pelo consultor no momento da análise — não é atualizado automaticamente.
            </p>
          </div>
        )}
      </div>

      {/* Seletor de safra */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-600">Safra:</label>
        <div className="flex gap-1">
          {SAFRAS.map(s => (
            <button
              key={s}
              onClick={() => setSafra(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                safra === s ? 'bg-af-green text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
        {!hasProducao && (
          <span className="text-xs text-amber-600 font-medium">⚠ Sem dados lançados para esta safra</span>
        )}
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Área Total Plantada"
          value={`${fmtN(areaTotal, 0)} ha`}
          sub={`${fmtN(areaPropria, 0)} ha própria · ${fmtN(areaArrendada, 0)} ha arrendada (${fmtPct(pctArrendada)})`}
          icon={Sprout}
          color="text-green-600"
        />
        <KpiCard
          title="Receita Bruta"
          value={fmtBRL(receitaBruta)}
          sub={`Safra ${safra}`}
          icon={TrendingUp}
          color="text-emerald-600"
        />
        <KpiCard
          title="Resultado Líquido"
          value={fmtBRL(resultadoLiq)}
          sub={`Margem ${fmtPct(margem)}`}
          icon={BarChart2}
          color={resultadoLiq >= 0 ? 'text-blue-600' : 'text-red-600'}
          right={<Badge status={statusMargem} label={statusMargem === 'ok' ? 'Boa margem' : statusMargem === 'atencao' ? 'Margem baixa' : 'Margem negativa'} />}
        />
        <KpiCard
          title="Endividamento Total"
          value={fmtBRL(totalEndividamento)}
          sub={`Serviço restante safra ${safra}: ${fmtBRL(servicoAnual)}`}
          icon={CreditCard}
          color="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Produção */}
        <Section title="Produção & Área" icon={Sprout} color="text-green-600">
          {!hasProducao ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem produção lançada para safra {safra}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Área própria</p>
                  <p className="text-lg font-bold text-green-700">{fmtN(areaPropria, 0)} ha</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Área arrendada</p>
                  <p className="text-lg font-bold text-amber-700">{fmtN(areaArrendada, 0)} ha</p>
                  <p className="text-xs text-amber-500">{fmtPct(pctArrendada)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-blue-700">{fmtN(areaTotal, 0)} ha</p>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left py-1">Cultura</th>
                    <th className="text-right py-1">Área</th>
                    <th className="text-right py-1">Produt.</th>
                    <th className="text-right py-1">P.E.</th>
                    <th className="text-right py-1">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {prodSafra.map(p => {
                    const c = calcRow(p)
                    const colheita = getColheitaDate(p, colheitaDatas)
                    const jaRealizada = colheita <= hoje
                    return (
                      <tr key={p.id ?? p.cultura} className={`border-b border-gray-50 ${jaRealizada ? 'opacity-50' : ''}`}>
                        <td className="py-1.5 font-medium text-gray-800 flex items-center gap-1.5">
                          {p.cultura}
                          {jaRealizada && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-normal">
                              realizada {colheita.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                            </span>
                          )}
                        </td>
                        <td className="text-right text-gray-600">{fmtN(p.area, 0)} ha</td>
                        <td className="text-right text-gray-600">{fmtN(p.produtividade, 1)} sc</td>
                        <td className="text-right text-amber-600 font-medium">{fmtN(c.peHa, 1)} sc</td>
                        <td className={`text-right font-bold ${c.recLiq >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtBRL(c.recLiq)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Patrimônio */}
        <Section title="Patrimônio" icon={Shield} color="text-orange-600">
          {patrimonio.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem patrimônio lançado</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Patrimônio bruto</p>
                  <p className="text-base font-bold text-orange-700">{fmtBRL(patrimonioGruto)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Gravames/ônus</p>
                  <p className="text-base font-bold text-red-700">{fmtBRL(totalOnus)}</p>
                </div>
                <div className={`rounded-xl p-3 ${patrimonioLiqPat >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500">Patrimônio líquido</p>
                  <p className={`text-base font-bold ${patrimonioLiqPat >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(patrimonioLiqPat)}</p>
                </div>
              </div>
              {/* Categorias */}
              {(() => {
                const byCat: Record<string, number> = {}
                patrimonio.forEach(p => { byCat[p.categoria] = (byCat[p.categoria] ?? 0) + p.valorAvaliado })
                return (
                  <div className="space-y-1.5">
                    {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                      const pct = patrimonioGruto > 0 ? (val / patrimonioGruto) * 100 : 0
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-28 truncate">{cat}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-24 text-right">{fmtBRL(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </Section>

        {/* Endividamento */}
        <Section title="Endividamento" icon={CreditCard} color="text-blue-600">
          <div className="space-y-3">
            {/* Custos da atividade */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Custos da Atividade</p>
              {!hasProducao ? (
                <p className="text-xs text-gray-400">Sem produção lançada</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Custo de produção</span>
                    <span className="font-semibold text-amber-800">{fmtBRL(custoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Custo por ha</span>
                    <span className="font-semibold text-amber-800">{fmtBRL(custoMedioHa)}/ha</span>
                  </div>
                </div>
              )}
            </div>

            {/* Endividamento bancário */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">Endividamento Bancário</p>
              {parcelas.length === 0 ? (
                <p className="text-xs text-gray-400">Sem contratos lançados</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Saldo devedor total</span>
                    <span className="font-semibold text-blue-800">{fmtBRL(totalEndividamento)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Parcelas restantes na safra {safra}</span>
                    <span className="font-semibold text-blue-800">{fmtBRL(servicoAnual)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{parcelasAnoAtual.length} vencimentos restantes no ano</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de vencimentos */}
            {parcelas.length > 0 && (() => {
              const meses: Record<number, number> = {}
              parcelasAnoAtual.forEach(p => {
                const m = new Date(p.vencimento).getMonth()
                meses[m] = (meses[m] ?? 0) + p.valorParcela
              })
              const maxVal = Math.max(...Object.values(meses), 1)
              const nomMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
              return (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Concentração de vencimentos restantes — Safra {safra}</p>
                  <div className="flex items-end gap-0.5 h-12">
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = meses[i] ?? 0
                      const h = maxVal > 0 ? (val / maxVal) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full bg-blue-200 rounded-t" style={{ height: `${h}%`, minHeight: val > 0 ? 2 : 0 }} title={`${nomMes[i]}: ${fmtBRL(val)}`} />
                          <span className="text-gray-400" style={{ fontSize: 8 }}>{nomMes[i].slice(0,1)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </Section>

        {/* Resultado econômico */}
        <Section title={`Resultado Econômico · Safra ${safra}`} icon={TrendingUp} color="text-emerald-600">
          {!hasProducao ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem produção lançada para safra {safra}</p>
          ) : (
            <div className="space-y-3">
              {/* DRE simplificada */}
              <div className="space-y-1">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">Receita bruta</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Produção total (sc) × Cotação (R$/sc) por cultura.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{fmtBRL(receitaBruta)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">(-) Custo de produção</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Custo/ha × Área + Custo de arrendamento. Inclui insumos, mão de obra e operações.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm text-red-500">({fmtBRL(custoTotal)})</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Resultado operacional</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Receita bruta − Custo de produção. Saudável: margem {'>'} 20%.
                      </div>
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(resultadoLiq)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">(-) Serviço da dívida (safra {safra})</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Total de parcelas bancárias com vencimento a partir de hoje até o fim da safra {safra} (30/06). Saudável: resultado operacional {'>'} 1,5× o serviço da dívida.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm text-red-500">{servicoAnual > 0 ? `(${fmtBRL(servicoAnual)})` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t-2 border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">Resultado após endividamento</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional − Serviço da dívida. Mostra o que sobra de caixa após pagar todas as obrigações. Saudável: valor positivo.
                      </div>
                    </span>
                  </div>
                  {(() => {
                    const resAfterDebt = resultadoLiq - servicoAnual
                    return <span className={`text-base font-bold ${resAfterDebt >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(resAfterDebt)}</span>
                  })()}
                </div>
              </div>

              {/* Indicadores */}
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Margem operacional</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Receita bruta. Saudável: {'>'} 20%. Atenção: 10–20%. Risco: {'<'} 10%.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusMargem === 'ok' ? 'text-emerald-600' : statusMargem === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(margem)}</p>
                  <Badge status={statusMargem} label={statusMargem === 'ok' ? 'Saudável' : statusMargem === 'atencao' ? 'Atenção' : 'Risco'} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Resultado/ha</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Área total. Indica a rentabilidade por hectare cultivado.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(areaTotal > 0 ? resultadoLiq / areaTotal : 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Capacidade de pagamento</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Serviço anual da dívida. Saudável: {'>'} 1,5×. Atenção: 1–1,5×. Risco: {'<'} 1×.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusCapPag === 'ok' ? 'text-emerald-600' : statusCapPag === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                    {capPagamento === Infinity || servicoAnual === 0 ? '—' : `${fmtN(capPagamento, 2)}×`}
                  </p>
                  {servicoAnual > 0 && <Badge status={statusCapPag} label={statusCapPag === 'ok' ? 'Saudável' : statusCapPag === 'atencao' ? 'Atenção' : 'Risco'} />}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Endiv. / Receita bruta</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Saldo devedor total ÷ Receita bruta anual. Saudável: {'<'} 1×. Atenção: 1–2×. Risco: {'>'} 2×.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusEndivRec === 'ok' ? 'text-emerald-600' : statusEndivRec === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                    {receitaBruta === 0 ? '—' : `${fmtN(endivReceita, 2)}×`}
                  </p>
                  {receitaBruta > 0 && <Badge status={statusEndivRec} label={statusEndivRec === 'ok' ? 'Saudável' : statusEndivRec === 'atencao' ? 'Atenção' : 'Risco'} />}
                </div>
              </div>

              {saldoCaixa !== null && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Activity size={13} />
                    Saldo projetado de caixa
                  </div>
                  <span className={`text-sm font-bold ${saldoCaixa >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtBRL(saldoCaixa)}</span>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* ── Capacidade de Pagamento & Ponto de Equilíbrio ─────────── */}
      {(parcelas.length > 0 || hasProducao) && (
        <Section title="Capacidade de Pagamento & Ponto de Equilíbrio do Endividamento" icon={Target} color="text-violet-600">
          <div className="space-y-5">

            {/* Contexto: por que separar custeio */}
            <div className="bg-violet-50 border border-violet-100 rounded-xl px-4 py-3 text-xs text-violet-700">
              <strong>Como funciona:</strong> O custeio (Custeio + CPR) financia a própria atividade e já está previsto nos custos de produção — ele não compromete o resultado líquido. O que realmente impacta a capacidade de pagamento é o <strong>endividamento exceto custeio</strong> (investimentos, repactuações, BNDES, Finame etc.), pois precisa ser pago com o resultado líquido da operação.
            </div>

            {/* Divisão custeio vs exceto custeio */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
                <p className="text-xs font-bold text-amber-700 uppercase tracking-wide mb-2">Custeio (Custeio + CPR)</p>
                <p className="text-xs text-amber-600 mb-3">Vinculado à atividade produtiva — não entra no cálculo de capacidade</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Saldo devedor</span>
                    <span className="font-bold text-amber-800">{fmtBRL(endivCusteio)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Parcelas restantes na safra {safra}</span>
                    <span className="font-semibold text-amber-700">{fmtBRL(servicoCusteioAnual)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Contratos</span>
                    <span className="text-gray-700">{contratos.filter((c: any) => isCusteio(c.modalidade)).length}</span>
                  </div>
                </div>
              </div>

              <div className={`rounded-xl border p-4 ${statusCapEndiv === 'ok' ? 'border-green-200 bg-green-50' : statusCapEndiv === 'atencao' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'}`}>
                <p className={`text-xs font-bold uppercase tracking-wide mb-2 ${statusCapEndiv === 'ok' ? 'text-green-700' : statusCapEndiv === 'atencao' ? 'text-amber-700' : 'text-red-700'}`}>
                  Exceto Custeio (Investimento, BNDES, Repactuação...)
                </p>
                <p className="text-xs text-gray-500 mb-3">Impacta diretamente a capacidade de pagamento</p>
                <div className="space-y-1.5">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Saldo devedor</span>
                    <span className="font-bold text-gray-900">{fmtBRL(endivSemCusteio)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Parcelas restantes na safra {safra}</span>
                    <span className="font-semibold text-gray-900">{fmtBRL(servicoSemCusteioAnual)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Contratos</span>
                    <span className="text-gray-700">{contratos.filter((c: any) => !isCusteio(c.modalidade)).length}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Ponto de equilíbrio visual */}
            {hasProducao && resultadoLiq > 0 && (
              <div className="space-y-3">
                <p className="text-xs font-bold text-gray-600 uppercase tracking-wide">Comprometimento da Receita Líquida com Serviço Exceto Custeio</p>

                {/* Barra de capacidade */}
                <div className="relative">
                  <div className="h-8 bg-gray-100 rounded-xl overflow-hidden flex">
                    {/* Porção comprometida */}
                    <div
                      className={`h-full transition-all ${comprometimentoPct > 50 ? 'bg-red-500' : comprometimentoPct > 30 ? 'bg-amber-400' : 'bg-emerald-500'}`}
                      style={{ width: `${Math.min(comprometimentoPct, 100)}%` }}
                    />
                  </div>
                  {/* Marcador saudável */}
                  <div className="absolute top-0 h-8 border-l-2 border-dashed border-emerald-600" style={{ left: `${limSaudavel}%` }}>
                    <span className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-emerald-600 whitespace-nowrap">{limSaudavel}%</span>
                  </div>
                  {/* Marcador crítico */}
                  <div className="absolute top-0 h-8 border-l-2 border-dashed border-red-500" style={{ left: `${limCritico}%` }}>
                    <span className="absolute -top-5 -translate-x-1/2 text-xs font-bold text-red-500 whitespace-nowrap">{limCritico}%</span>
                  </div>
                  {/* Valor atual */}
                  <div className="mt-1 flex justify-between text-xs text-gray-400">
                    <span>0%</span>
                    <span className={`font-bold text-sm ${statusCapEndiv === 'ok' ? 'text-emerald-600' : statusCapEndiv === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                      {fmtN(comprometimentoPct, 1)}% comprometido
                    </span>
                    <span>100%</span>
                  </div>
                </div>

                {/* Tabela ponto de equilíbrio */}
                <div className="border border-gray-100 rounded-xl overflow-hidden">
                  <table className="w-full text-xs">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="text-left px-4 py-2.5 font-semibold text-gray-500 uppercase">Nível</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Parcelas máx./ano</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Limite (%)</th>
                        <th className="text-right px-4 py-2.5 font-semibold text-gray-500 uppercase">Situação atual</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-50">
                      <tr className="bg-emerald-50/60">
                        <td className="px-4 py-2.5 font-semibold text-emerald-700">Saudável (ponto de equilíbrio)</td>
                        <td className="px-4 py-2.5 text-right font-bold text-emerald-700">{fmtBRL(capMaxSaudavel)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400">até</span>
                            <input
                              type="number" min={1} max={99}
                              value={limSaudavel}
                              onChange={e => setLimSaudavel(Math.min(Number(e.target.value), limCritico - 1))}
                              className="w-12 text-center border border-emerald-300 rounded-lg px-1 py-0.5 text-xs font-bold text-emerald-700 focus:outline-none focus:ring-1 focus:ring-emerald-400 bg-white"
                            />
                            <span className="text-emerald-600 font-bold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {servicoSemCusteioAnual <= capMaxSaudavel
                            ? <span className="text-emerald-600 font-semibold">✓ Dentro do limite</span>
                            : <span className="text-red-600 font-semibold">Excede em {fmtBRL(servicoSemCusteioAnual - capMaxSaudavel)}</span>
                          }
                        </td>
                      </tr>
                      <tr className="bg-red-50/40">
                        <td className="px-4 py-2.5 font-semibold text-red-700">Limite crítico</td>
                        <td className="px-4 py-2.5 text-right font-bold text-red-700">{fmtBRL(capMaxCritico)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <span className="text-gray-400">até</span>
                            <input
                              type="number" min={1} max={99}
                              value={limCritico}
                              onChange={e => setLimCritico(Math.max(Number(e.target.value), limSaudavel + 1))}
                              className="w-12 text-center border border-red-300 rounded-lg px-1 py-0.5 text-xs font-bold text-red-700 focus:outline-none focus:ring-1 focus:ring-red-400 bg-white"
                            />
                            <span className="text-red-600 font-bold">%</span>
                          </div>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          {servicoSemCusteioAnual <= capMaxCritico
                            ? <span className="text-amber-600 font-semibold">Dentro do limite crítico</span>
                            : <span className="text-red-700 font-bold">⚠ Excede em {fmtBRL(servicoSemCusteioAnual - capMaxCritico)}</span>
                          }
                        </td>
                      </tr>
                      <tr className="bg-blue-50/40 font-semibold">
                        <td className="px-4 py-2.5 text-blue-700">Situação atual (exceto custeio)</td>
                        <td className="px-4 py-2.5 text-right text-blue-800">{fmtBRL(servicoSemCusteioAnual)}</td>
                        <td className="px-4 py-2.5 text-right">
                          <span className={`font-bold ${statusCapEndiv === 'ok' ? 'text-emerald-600' : statusCapEndiv === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                            {fmtN(comprometimentoPct, 1)}%
                          </span>
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <Badge status={statusCapEndiv} label={statusCapEndiv === 'ok' ? 'Saudável' : statusCapEndiv === 'atencao' ? 'Atenção' : 'Risco'} />
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Folga ou déficit */}
                <div className={`rounded-xl p-4 flex items-center justify-between ${margemDisponivel >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div>
                    <p className={`text-xs font-bold uppercase tracking-wide ${margemDisponivel >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                      {margemDisponivel >= 0 ? 'Margem disponível para novos compromissos' : 'Endividamento excede o ponto de equilíbrio'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {margemDisponivel >= 0
                        ? `Ainda há espaço para assumir até ${fmtBRL(margemDisponivel)}/ano em novas parcelas (exceto custeio) sem sair da zona saudável`
                        : `Para atingir o ponto de equilíbrio, o serviço exceto custeio precisaria reduzir ${fmtBRL(Math.abs(margemDisponivel))}/ano — considere reestruturação`
                      }
                    </p>
                  </div>
                  <span className={`text-2xl font-bold ml-4 shrink-0 ${margemDisponivel >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {margemDisponivel >= 0 ? '+' : ''}{fmtBRL(margemDisponivel)}
                  </span>
                </div>

                {/* Receita líquida de referência */}
                <div className="text-xs text-gray-400 text-center">
                  Receita líquida de referência (safra {safra}): <strong className="text-gray-600">{fmtBRL(resultadoLiq)}</strong>
                </div>
              </div>
            )}

            {!hasProducao && (
              <p className="text-sm text-gray-400 text-center py-4">Lance os dados de produção da safra para calcular o ponto de equilíbrio</p>
            )}
            {hasProducao && resultadoLiq <= 0 && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-xs text-red-700">
                ⚠ Receita líquida negativa ou zero — não é possível calcular capacidade de pagamento. Revise os dados de produção e custos.
              </div>
            )}
          </div>
        </Section>
      )}

      {/* Análise de alavancagem e solvência */}
      {/* Análise por Hectare */}
      {hasProducao && areaTotal > 0 && (
        <Section title="Análise por Hectare" icon={Activity} color="text-teal-600">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase">Indicador</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Total</th>
                  <th className="text-right py-2 text-xs font-semibold text-gray-500 uppercase">Por Hectare</th>
                  <th className="text-left py-2 text-xs font-semibold text-gray-500 uppercase pl-4">Referência saudável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {(() => {
                  const resAfterDebt = resultadoLiq - servicoAnual
                  const pctReceitaDivida = receitaBruta > 0 ? (servicoAnual / receitaBruta) * 100 : 0
                  const jurosAnuais = jurosPeriodoProrata(parcelas, safraInicio, safraFimExcl)
                  const rows: { label: string; tooltip: string; total: number; cor: string; ref: string; isCurrency?: boolean; isPct?: boolean }[] = [
                    {
                      label: 'Receita bruta',
                      tooltip: 'Produção × cotação de cada cultura.',
                      total: receitaBruta, cor: 'text-green-600',
                      ref: 'Benchmark regional',
                    },
                    {
                      label: 'Custo de produção',
                      tooltip: 'Insumos, operações e arrendamento.',
                      total: custoTotal, cor: 'text-amber-600',
                      ref: '< 75% da receita bruta',
                    },
                    {
                      label: 'Resultado operacional',
                      tooltip: 'Receita bruta − Custo de produção.',
                      total: resultadoLiq, cor: resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-600',
                      ref: 'Margem > 20%',
                    },
                    {
                      label: `Serviço da dívida — restante safra ${safra}`,
                      tooltip: `Parcelas bancárias com vencimento a partir de hoje até o fim da safra ${safra} (30/06).`,
                      total: servicoAnual, cor: 'text-red-500',
                      ref: '< 30% do resultado operacional',
                    },
                    {
                      label: 'Resultado após endividamento',
                      tooltip: 'O que sobra por ha após pagar todas as obrigações.',
                      total: resAfterDebt, cor: resAfterDebt >= 0 ? 'text-emerald-700' : 'text-red-700',
                      ref: 'Valor positivo',
                    },
                    {
                      label: 'Saldo devedor bancário',
                      tooltip: 'Dívida total acumulada ÷ área. Quanto de dívida está "pendurado" em cada hectare.',
                      total: totalEndividamento, cor: 'text-purple-600',
                      ref: '< 1× receita bruta/ha',
                    },
                    {
                      label: `Juros bancários (safra ${safra})`,
                      tooltip: 'Componente de juros das parcelas do ano — exclui amortização de capital.',
                      total: jurosAnuais, cor: 'text-rose-600',
                      ref: '< 15% da receita bruta/ha',
                    },
                  ]
                  return rows.map(r => (
                    <tr key={r.label} className="hover:bg-gray-50/60">
                      <td className="py-2.5">
                        <div className="flex items-center gap-1.5">
                          <span className="text-gray-700">{r.label}</span>
                          <span className="relative group cursor-default">
                            <Info size={11} className="text-gray-400" />
                            <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                              {r.tooltip}
                            </div>
                          </span>
                        </div>
                      </td>
                      <td className={`py-2.5 text-right font-semibold ${r.cor}`}>
                        {fmtBRL(r.total)}
                      </td>
                      <td className={`py-2.5 text-right font-bold text-base ${r.cor}`}>
                        {fmtBRL(r.total / areaTotal)}<span className="text-xs font-normal text-gray-400">/ha</span>
                      </td>
                      <td className="py-2.5 pl-4 text-xs text-gray-400">{r.ref}</td>
                    </tr>
                  ))
                })()}
              </tbody>
            </table>
          </div>

          {/* Juros em sacas de soja */}
          {(() => {
            const jurosAnuais = jurosPeriodoProrata(parcelas, safraInicio, safraFimExcl)
            if (jurosAnuais <= 0 || areaTotal <= 0) return null
            const sojaRow = prodSafra.find(p => p.cultura.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').includes('soja'))
            const cotacaoRef = sojaRow?.cotacao ?? prodSafra.find(p => p.ordem === 'principal')?.cotacao ?? 0
            const culturaRef = sojaRow?.cultura ?? prodSafra.find(p => p.ordem === 'principal')?.cultura ?? 'principal'
            const jurosPorHa = jurosAnuais / areaTotal
            const sacasTotal = cotacaoRef > 0 ? jurosAnuais / cotacaoRef : 0
            const sacasPorHa = cotacaoRef > 0 ? jurosPorHa / cotacaoRef : 0
            return (
              <div className="mt-4 p-4 bg-rose-50 rounded-xl border border-rose-100">
                <p className="text-xs font-bold text-rose-700 uppercase tracking-wide mb-3">
                  Custo dos juros bancários em sacas — Safra {safra}
                  {cotacaoRef > 0 && <span className="ml-2 font-normal text-rose-400 normal-case">({culturaRef} a {fmtBRL(cotacaoRef)}/sc)</span>}
                </p>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-rose-500 mb-0.5">Total da propriedade</p>
                    <p className="text-lg font-bold text-rose-700">{fmtBRL(jurosAnuais)}</p>
                    {sacasTotal > 0 && <p className="text-sm text-rose-600 font-semibold mt-0.5">{fmtN(sacasTotal, 0)} sacas de {culturaRef.toLowerCase()}</p>}
                  </div>
                  <div>
                    <p className="text-xs text-rose-500 mb-0.5">Por hectare</p>
                    <p className="text-lg font-bold text-rose-700">{fmtBRL(jurosPorHa)}/ha</p>
                    {sacasPorHa > 0 && <p className="text-sm text-rose-600 font-semibold mt-0.5">{fmtN(sacasPorHa, 1)} sc/ha de {culturaRef.toLowerCase()}</p>}
                  </div>
                </div>
                {cotacaoRef <= 0 && (
                  <p className="text-xs text-rose-400 mt-2">Informe a cotação da soja na aba Produção para ver a conversão em sacas.</p>
                )}
              </div>
            )
          })()}

          {/* Comprometimento da receita */}
          {receitaBruta > 0 && servicoAnual > 0 && (() => {
            const pct = (servicoAnual / receitaBruta) * 100
            const status: Status = pct < 20 ? 'ok' : pct < 35 ? 'atencao' : 'risco'
            return (
              <div className="mt-4 p-3 bg-gray-50 rounded-xl flex items-center justify-between">
                <div>
                  <p className="text-xs font-semibold text-gray-700">Comprometimento da receita com banco</p>
                  <p className="text-xs text-gray-500 mt-0.5">Parcelas restantes da safra {safra} ÷ Receita bruta — Saudável: &lt; 20% · Atenção: 20–35% · Risco: &gt; 35%</p>
                </div>
                <div className="text-right ml-4">
                  <p className={`text-2xl font-bold ${status === 'ok' ? 'text-emerald-600' : status === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                    {fmtPct(pct)}
                  </p>
                  <Badge status={status} label={status === 'ok' ? 'Saudável' : status === 'atencao' ? 'Atenção' : 'Risco'} />
                </div>
              </div>
            )
          })()}
        </Section>
      )}

      {/* ── Análise CP × LP ─────────────────────────────────────────── */}
      <Section title="Análise Curto Prazo × Longo Prazo (visão bancária)" icon={Clock} color="text-sky-600">
        <div className="space-y-4">
          {/* Calendário de colheitas */}
          <div className="border border-sky-200 rounded-xl overflow-hidden">
            <button
              onClick={() => {
                if (!showCalendario) setColheitaEdit({ ...colheitaDatas })
                setShowCalendario(v => !v)
              }}
              className="w-full flex items-center justify-between px-4 py-3 bg-sky-50 text-xs font-semibold text-sky-700 hover:bg-sky-100 transition-colors"
            >
              <div className="flex items-center gap-2">
                <Clock size={13} />
                <span>Calendário de receitas/despesas por cultura</span>
                <span className="text-sky-400 font-normal">
                  (Soja: {String(colheitaDatas.soja?.day ?? 15).padStart(2,'0')}/{String(colheitaDatas.soja?.month ?? 4).padStart(2,'0')} · Milho: {String(colheitaDatas.milho?.day ?? 15).padStart(2,'0')}/{String(colheitaDatas.milho?.month ?? 8).padStart(2,'0')} · Feijão: {String(colheitaDatas.feijao?.day ?? 15).padStart(2,'0')}/{String(colheitaDatas.feijao?.month ?? 11).padStart(2,'0')})
                </span>
              </div>
              <span className="text-sky-500">{showCalendario ? '▲ Fechar' : '▼ Editar'}</span>
            </button>

            {showCalendario && (
              <div className="px-4 py-4 bg-white space-y-3">
                <p className="text-xs text-gray-500">
                  Data em que a receita e os custos de cada cultura são contabilizados. Ano calculado automaticamente pela safra.
                  Usado para classificar CP (≤ 360 dias) vs LP (&gt; 360 dias).
                </p>
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-gray-400 border-b border-gray-100">
                      <th className="text-left pb-2">Cultura</th>
                      <th className="text-center pb-2">Dia</th>
                      <th className="text-center pb-2">Mês</th>
                      <th className="text-left pb-2 pl-4 text-gray-300">Exemplo (safra 2026/27)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {todasCulturasCalendario.map(key => {
                      const current = colheitaEdit[key] ?? HARVEST_DEFAULTS[key] ?? { month: 4, day: 15 }
                      const exDate = new Date(2027, current.month - 1, current.day)
                      const exStr  = exDate.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
                      return (
                        <tr key={key}>
                          <td className="py-2 font-semibold text-gray-700">{HARVEST_LABELS[key] ?? key}</td>
                          <td className="py-2 text-center">
                            <input
                              type="number" min={1} max={31}
                              value={current.day}
                              onChange={e => setColheitaEdit(prev => ({ ...prev, [key]: { ...current, day: Math.min(31, Math.max(1, Number(e.target.value))) } }))}
                              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                          </td>
                          <td className="py-2 text-center">
                            <input
                              type="number" min={1} max={12}
                              value={current.month}
                              onChange={e => setColheitaEdit(prev => ({ ...prev, [key]: { ...current, month: Math.min(12, Math.max(1, Number(e.target.value))) } }))}
                              className="w-14 text-center border border-gray-200 rounded-lg px-2 py-1 font-bold text-gray-800 focus:outline-none focus:ring-1 focus:ring-sky-400"
                            />
                          </td>
                          <td className="py-2 pl-4 text-gray-400">{exStr}</td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={() => { saveColheitaDatas(colheitaEdit); setShowCalendario(false) }}
                    className="px-4 py-1.5 bg-sky-600 text-white text-xs font-semibold rounded-lg hover:bg-sky-700 transition-colors"
                  >
                    Salvar
                  </button>
                  <button
                    onClick={() => { setColheitaEdit({ ...HARVEST_DEFAULTS }); }}
                    className="px-4 py-1.5 bg-gray-100 text-gray-600 text-xs font-semibold rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Restaurar padrão
                  </button>
                  <button
                    onClick={() => setShowCalendario(false)}
                    className="px-4 py-1.5 text-gray-400 text-xs hover:text-gray-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Tabela CP × Dentro do Ano × LP */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="text-left px-4 py-3 text-xs font-bold text-gray-500 uppercase">Demonstrativo</th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-sky-600 uppercase">
                    CP — até 360 dias
                    {safrasCpNomes.length > 0 && <div className="text-gray-400 font-normal normal-case">Safra(s): {safrasCpNomes.join(', ')}</div>}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-emerald-600 uppercase">
                    Até 31/12/{anoAtual}
                    {safrasAnoNomes.length > 0 && <div className="text-gray-400 font-normal normal-case">Safra(s): {safrasAnoNomes.join(', ')}</div>}
                  </th>
                  <th className="text-right px-4 py-3 text-xs font-bold text-violet-600 uppercase">
                    LP — acima de 360 dias
                    <div className="text-gray-400 font-normal normal-case">Receita: safra {safra} · Serviço: média {anosLp} ano{anosLp > 1 ? 's' : ''}</div>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-green-700 font-semibold">Receita bruta prevista</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{receitaCp > 0 ? fmtBRL(receitaCp) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{receitaDentroAno > 0 ? fmtBRL(receitaDentroAno) : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right font-semibold text-green-600">{receitaLp > 0 ? fmtBRL(receitaLp) : <span className="text-gray-300">—</span>}</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-600 pl-6">(-) Custo de produção</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{custoCp > 0 ? `(${fmtBRL(custoCp)})` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{custoDentroAno > 0 ? `(${fmtBRL(custoDentroAno)})` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{custoLp > 0 ? `(${fmtBRL(custoLp)})` : <span className="text-gray-300">—</span>}</td>
                </tr>
                <tr className="bg-gray-50 font-semibold border-t border-gray-200">
                  <td className="px-4 py-2.5 text-gray-700">= Resultado operacional</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${receitaCp === 0 ? 'text-gray-300' : resultadoCp >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{receitaCp > 0 ? fmtBRL(resultadoCp) : '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${receitaDentroAno === 0 ? 'text-gray-300' : resultadoDentroAno >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{receitaDentroAno > 0 ? fmtBRL(resultadoDentroAno) : '—'}</td>
                  <td className={`px-4 py-2.5 text-right font-bold ${receitaLp === 0 ? 'text-gray-300' : resultadoLp >= 0 ? 'text-blue-700' : 'text-red-600'}`}>{receitaLp > 0 ? fmtBRL(resultadoLp) : '—'}</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-600 pl-6">(-) Serviço da dívida total</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{servicoCp > 0 ? `(${fmtBRL(servicoCp)})` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{servicoDentroAno > 0 ? `(${fmtBRL(servicoDentroAno)})` : <span className="text-gray-300">—</span>}</td>
                  <td className="px-4 py-2.5 text-right text-red-500">{servicoLp > 0 ? `(${fmtBRL(servicoLp)})` : <span className="text-gray-300">—</span>}</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-amber-600 pl-10 text-xs">do qual: custeio</td>
                  <td className="px-4 py-2.5 text-right text-xs text-amber-600">{servicoCusteioCp > 0 ? `(${fmtBRL(servicoCusteioCp)})` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-amber-600">{servicoCusteioDentroAno > 0 ? `(${fmtBRL(servicoCusteioDentroAno)})` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-amber-600">{servicoCusteioLp > 0 ? `(${fmtBRL(servicoCusteioLp)})` : '—'}</td>
                </tr>
                <tr className="hover:bg-gray-50/50">
                  <td className="px-4 py-2.5 text-gray-700 pl-10 text-xs">do qual: exceto custeio</td>
                  <td className="px-4 py-2.5 text-right text-xs text-red-600 font-semibold">{servicoExcCusteioCp > 0 ? `(${fmtBRL(servicoExcCusteioCp)})` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-red-600 font-semibold">{servicoExcCusteioDentroAno > 0 ? `(${fmtBRL(servicoExcCusteioDentroAno)})` : '—'}</td>
                  <td className="px-4 py-2.5 text-right text-xs text-red-600 font-semibold">{servicoExcCusteioLp > 0 ? `(${fmtBRL(servicoExcCusteioLp)})` : '—'}</td>
                </tr>
                <tr className="border-t-2 border-gray-300 font-bold">
                  <td className="px-4 py-3 text-gray-900">= Saldo disponível</td>
                  <td className={`px-4 py-3 text-right text-base ${receitaCp === 0 ? 'text-gray-300' : saldoDispCp >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{receitaCp > 0 ? fmtBRL(saldoDispCp) : '—'}</td>
                  <td className={`px-4 py-3 text-right text-base ${receitaDentroAno === 0 ? 'text-gray-300' : saldoDispDentroAno >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{receitaDentroAno > 0 ? fmtBRL(saldoDispDentroAno) : '—'}</td>
                  <td className={`px-4 py-3 text-right text-base ${receitaLp === 0 ? 'text-gray-300' : saldoDispLp >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{receitaLp > 0 ? fmtBRL(saldoDispLp) : '—'}</td>
                </tr>
                {/* Pontos de equilíbrio */}
                <tr className="bg-emerald-50/60 border-t border-emerald-100">
                  <td className="px-4 py-2 text-xs font-semibold text-emerald-700">
                    PE saudável — máx. serviço exceto custeio ({limSaudavel}%)
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-emerald-700">{receitaCp > 0 ? fmtBRL(peSaudavelCp) : '—'}</td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-emerald-700">{receitaDentroAno > 0 ? fmtBRL(peSaudavelAno) : '—'}</td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-emerald-700">{receitaLp > 0 ? fmtBRL(peSaudavelLp) : '—'}</td>
                </tr>
                <tr className="bg-red-50/40">
                  <td className="px-4 py-2 text-xs font-semibold text-red-700">
                    PE crítico — máx. serviço exceto custeio ({limCritico}%)
                  </td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-red-700">{receitaCp > 0 ? fmtBRL(peCriticoCp) : '—'}</td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-red-700">{receitaDentroAno > 0 ? fmtBRL(peCriticoAno) : '—'}</td>
                  <td className="px-4 py-2 text-right text-xs font-bold text-red-700">{receitaLp > 0 ? fmtBRL(peCriticoLp) : '—'}</td>
                </tr>
                <tr className="bg-blue-50/40">
                  <td className="px-4 py-2 text-xs font-semibold text-blue-700">Situação atual</td>
                  <td className="px-4 py-2 text-right text-xs">
                    {receitaCp > 0 && <Badge status={comprCp} label={resultadoCp > 0 ? fmtN((servicoCompromCp / resultadoCp) * 100, 1) + '%' : 'Risco'} />}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    {receitaDentroAno > 0 && <Badge status={comprDentroAno} label={resultadoDentroAno > 0 ? fmtN((servicoCompromDentroAno / resultadoDentroAno) * 100, 1) + '%' : 'Risco'} />}
                  </td>
                  <td className="px-4 py-2 text-right text-xs">
                    {receitaLp > 0 && <Badge status={comprLp} label={resultadoLp > 0 ? fmtN((servicoCompromLp / resultadoLp) * 100, 1) + '%' : 'Risco'} />}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Alerta: custeio excede custo de produção */}
          {custeioExcedente > 0 && (
            <div className="bg-amber-50 border border-amber-300 rounded-xl px-4 py-3 flex gap-3 text-xs text-amber-800">
              <AlertTriangle size={16} className="text-amber-500 mt-0.5 shrink-0" />
              <div>
                <p className="font-bold mb-0.5">Custeio excede o custo de produção registrado</p>
                <p>
                  O endividamento em custeio é <strong>{fmtBRL(endivCusteio)}</strong>, mas o custo de produção da safra {safra} é <strong>{fmtBRL(custeioLimite)}</strong>.
                  O excedente de <strong>{fmtBRL(custeioExcedente)}</strong> ({fmtN(propExcedente * 100, 1)}% do custeio) não está coberto pela atividade produtiva
                  e foi incluído no cálculo de comprometimento da capacidade de pagamento.
                  {custeioExcedente > 0 && ' Verifique se os dados de produção estão completos ou se há custeios de safras anteriores em aberto.'}
                </p>
              </div>
            </div>
          )}

          {/* KPIs — 3 cards */}
          <div className="grid grid-cols-3 gap-3">
            {/* helper inline */}
            {([
              { label: 'Curto Prazo (≤ 360 dias)', cor: 'sky', compr: comprCp, receita: receitaCp, resultado: resultadoCp, servico: servicoCp, nVenc: parcelasCp.length, servicoCompr: servicoCompromCp, peSaud: peSaudavelCp, peCrit: peCriticoCp },
              { label: `Até 31/12/${anoAtual}`, cor: 'emerald', compr: comprDentroAno, receita: receitaDentroAno, resultado: resultadoDentroAno, servico: servicoDentroAno, nVenc: parcelasAte31Dez.length, servicoCompr: servicoCompromDentroAno, peSaud: peSaudavelAno, peCrit: peCriticoAno },
              { label: `Longo Prazo (> 360 dias) · serviço médio ${anosLp}a`, cor: 'violet', compr: comprLp, receita: receitaLp, resultado: resultadoLp, servico: servicoLp, nVenc: parcelasLp.length, servicoCompr: servicoCompromLp, peSaud: peSaudavelLp, peCrit: peCriticoLp },
            ] as const).map(h => {
              const pctCompr = h.resultado > 0 ? (h.servicoCompr / h.resultado) * 100 : 0
              const folga = h.peSaud - h.servicoCompr
              const borderCls = h.compr === 'ok'
                ? `border-${h.cor}-200 bg-${h.cor}-50`
                : h.compr === 'atencao' ? 'border-amber-200 bg-amber-50' : 'border-red-200 bg-red-50'
              const titleCls = h.compr === 'ok' ? `text-${h.cor}-700` : h.compr === 'atencao' ? 'text-amber-700' : 'text-red-700'
              return (
                <div key={h.label} className={`rounded-xl border p-4 ${borderCls}`}>
                  <p className={`text-xs font-bold uppercase mb-3 ${titleCls}`}>{h.label}</p>
                  <div className="space-y-1.5">
                    <div className="flex justify-between text-xs"><span className="text-gray-600">Parcelas vencendo</span><span className="font-bold">{fmtBRL(h.servico)}</span></div>
                    <div className="flex justify-between text-xs"><span className="text-gray-600">Nº vencimentos</span><span className="font-semibold">{h.nVenc}</span></div>
                    {h.receita > 0 && h.resultado > 0 && (<>
                      <div className="pt-1 border-t border-gray-200 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">PE saudável ({limSaudavel}%)</span>
                          <span className="font-semibold text-emerald-700">{fmtBRL(h.peSaud)}</span>
                        </div>
                        <div className="flex justify-between text-xs">
                          <span className="text-gray-500">PE crítico ({limCritico}%)</span>
                          <span className="font-semibold text-red-700">{fmtBRL(h.peCrit)}</span>
                        </div>
                        <div className="flex justify-between text-xs font-semibold pt-0.5 border-t border-gray-100">
                          <span className="text-gray-600">Comprometimento atual</span>
                          <span className={h.compr === 'ok' ? 'text-emerald-600' : h.compr === 'atencao' ? 'text-amber-600' : 'text-red-600'}>
                            {fmtN(pctCompr, 1)}%
                          </span>
                        </div>
                        <div className={`flex justify-between text-xs font-bold rounded-lg px-2 py-1 ${folga >= 0 ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          <span>{folga >= 0 ? 'Folga disponível' : 'Déficit'}</span>
                          <span>{folga >= 0 ? '+' : ''}{fmtBRL(folga)}</span>
                        </div>
                      </div>
                    </>)}
                    {h.receita === 0 && <p className="text-xs text-gray-400">Sem safra lançada neste horizonte</p>}
                    <div className="pt-1">
                      {h.receita > 0 && <Badge status={h.compr} label={h.compr === 'ok' ? 'Saudável' : h.compr === 'atencao' ? 'Atenção' : 'Risco'} />}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>

          {/* Linha do tempo das dívidas */}
          {parcelas.length > 0 && (() => {
            const grupos: Record<string, { cp: number; lp: number }> = {}
            for (const p of parcelas) {
              const ano = String(new Date(p.vencimento).getFullYear())
              if (!grupos[ano]) grupos[ano] = { cp: 0, lp: 0 }
              if (new Date(p.vencimento) <= dataCorte360) grupos[ano].cp += p.valorParcela
              else grupos[ano].lp += p.valorParcela
            }
            const anos = Object.keys(grupos).sort().filter(a => parseInt(a) >= 2026)
            const maxVal = Math.max(...anos.flatMap(a => [grupos[a].cp + grupos[a].lp]), 1)
            return (
              <div>
                <p className="text-xs font-bold text-gray-500 uppercase mb-2">Concentração de vencimentos por ano</p>
                <div className="space-y-1.5">
                  {anos.map(ano => {
                    const total = grupos[ano].cp + grupos[ano].lp
                    const pct = (total / maxVal) * 100
                    const cpPct = total > 0 ? (grupos[ano].cp / total) * 100 : 0
                    return (
                      <div key={ano} className="flex items-center gap-3">
                        <span className="text-xs font-semibold text-gray-500 w-10 shrink-0">{ano}</span>
                        <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex" style={{ opacity: pct < 5 ? 0.4 : 1 }}>
                          <div className="h-full bg-sky-400" style={{ width: `${cpPct}%` }} title={`CP: ${fmtBRL(grupos[ano].cp)}`} />
                          <div className="h-full bg-violet-400" style={{ width: `${100 - cpPct}%` }} title={`LP: ${fmtBRL(grupos[ano].lp)}`} />
                        </div>
                        <span className="text-xs text-gray-600 font-semibold w-28 text-right shrink-0">{fmtBRL(total)}</span>
                      </div>
                    )
                  })}
                </div>
                <div className="flex gap-4 mt-2 text-xs text-gray-400">
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-sky-400" /> CP (azul)</span>
                  <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded bg-violet-400" /> LP (violeta)</span>
                </div>
              </div>
            )
          })()}
        </div>
      </Section>

      <Section title="Análise de Alavancagem & Solvência" icon={BarChart2} color="text-indigo-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <IndiceRow
              label="Índice de alavancagem"
              value={`${fmtPct(alavancagem)} do patrimônio bruto`}
              status={statusAlavancagem}
              tooltip="Dívida total ÷ Patrimônio bruto. Saudável: < 30%. Atenção: 30-50%. Risco: > 50%."
            />
            <IndiceRow
              label="Índice de solvência"
              value={solvencia === Infinity ? 'Sem dívida' : `${fmtN(solvencia, 2)}x`}
              status={statusSolvencia}
              tooltip="Patrimônio líquido ÷ Dívida total. Saudável: > 2x. Atenção: 1-2x. Risco: < 1x."
            />
          </div>
          <div>
            <IndiceRow
              label="Endividamento / Receita bruta"
              value={endivReceita === Infinity || receitaBruta === 0 ? '—' : `${fmtN(endivReceita, 2)}x`}
              status={statusEndivRec}
              tooltip="Dívida total ÷ Receita bruta anual. Saudável: < 1x. Atenção: 1-2x. Risco: > 2x."
            />
            <IndiceRow
              label="Capacidade de pagamento"
              value={capPagamento === Infinity || servicoAnual === 0 ? 'Sem parcelas' : `${fmtN(capPagamento, 2)}x`}
              status={statusCapPag}
              tooltip="Resultado líquido ÷ Serviço anual da dívida. Saudável: > 1,5x. Atenção: 1-1,5x. Risco: < 1x."
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
          <p className="text-xs text-indigo-700">
            <strong>Legenda:</strong> Saudável (verde) = dentro dos parâmetros de crédito rural.
            Atenção (amarelo) = monitorar evolução. Risco (vermelho) = comprometimento elevado — considerar
            renegociação ou reestruturação do passivo.
          </p>
        </div>
      </Section>

    </div>
  )
}
