import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, AlertTriangle, Bell, CheckCircle, Info, Calendar, TrendingDown, Layers, Clock } from 'lucide-react'
import { agroApi, type AgroContrato, type AgroProducao } from '../../services/agroApi'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

const HOJE = new Date()

type Severidade = 'critico' | 'atencao' | 'info'

interface Alerta {
  id: string
  severidade: Severidade
  icone: 'calendar' | 'concentracao' | 'alavancagem' | 'producao' | 'contrato'
  titulo: string
  descricao: string
  valor?: string
  prazo?: string
}

const ICONES = {
  calendar:    Calendar,
  concentracao: Layers,
  alavancagem: TrendingDown,
  producao:    Bell,
  contrato:    Clock,
}

const CORES: Record<Severidade, { bg: string; border: string; titulo: string; badge: string }> = {
  critico: {
    bg: 'bg-red-50', border: 'border-red-200',
    titulo: 'text-red-800', badge: 'bg-red-100 text-red-700 border border-red-200',
  },
  atencao: {
    bg: 'bg-amber-50', border: 'border-amber-200',
    titulo: 'text-amber-800', badge: 'bg-amber-100 text-amber-700 border border-amber-200',
  },
  info: {
    bg: 'bg-blue-50', border: 'border-blue-200',
    titulo: 'text-blue-800', badge: 'bg-blue-100 text-blue-700 border border-blue-200',
  },
}

function addDias(date: Date, dias: number): Date {
  const d = new Date(date)
  d.setDate(d.getDate() + dias)
  return d
}

function diffDias(a: Date, b: Date): number {
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

function fmtData(d: Date): string {
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function gerarAlertas(
  contratos: AgroContrato[],
  producoes: AgroProducao[],
  custosFixos: { valor: number }[],
): Alerta[] {
  const alertas: Alerta[] = []

  // ── 1. Contratos vencendo em 30/60 dias ─────────────────────────────────────
  for (const c of contratos) {
    const cronograma = c.cronograma ?? []
    for (const parc of cronograma) {
      const venc = new Date(parc.dataVencimento)
      const dias  = diffDias(HOJE, venc)
      if (dias < 0 || dias > 90) continue

      const sev: Severidade = dias <= 30 ? 'critico' : dias <= 60 ? 'atencao' : 'info'
      alertas.push({
        id:         `venc-${c.id}-${parc.dataVencimento}`,
        severidade:  sev,
        icone:      'contrato',
        titulo:     `Parcela vencendo em ${dias} dias — ${c.banco}`,
        descricao:  `${c.modalidade} · Parcela ${parc.numeroParcela}/${c.totalParcelas}`,
        valor:      fmtBRL(parc.valor),
        prazo:      fmtData(venc),
      })
    }
  }

  // ── 2. Concentração de pagamentos (meses com > 40% do serviço anual) ─────────
  const pagMes: Record<string, number> = {}
  let totalAnual = 0
  for (const c of contratos) {
    const cron = c.cronograma ?? []
    for (const p of cron) {
      const mes = p.dataVencimento.slice(0, 7)
      pagMes[mes] = (pagMes[mes] ?? 0) + p.valor
      totalAnual  += p.valor
    }
  }
  if (totalAnual > 0) {
    for (const [mes, val] of Object.entries(pagMes)) {
      const pct = val / totalAnual * 100
      if (pct >= 20) {
        const [ano, m] = mes.split('-')
        const nomeMes = new Date(+ano, +m - 1, 1).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        alertas.push({
          id:         `conc-${mes}`,
          severidade:  pct >= 35 ? 'critico' : 'atencao',
          icone:      'concentracao',
          titulo:     `Alta concentração de pagamentos em ${nomeMes}`,
          descricao:  `${pct.toFixed(0)}% do serviço anual vence neste mês — risco de squeeze de caixa`,
          valor:      fmtBRL(val),
        })
      }
    }
  }

  // ── 3. Índice de alavancagem (dívida total / receita bruta anual) > 3x ───────
  const safraMap: Record<string, number> = {}
  for (const p of producoes) {
    safraMap[p.safra] = (safraMap[p.safra] ?? 0) + p.area * p.produtividade * p.cotacao
  }
  const safrasOrdenadas = Object.keys(safraMap).sort((a, b) => b.localeCompare(a))
  const receitaUltimaSafra = safrasOrdenadas.length > 0 ? safraMap[safrasOrdenadas[0]] : 0

  const saldoTotal = contratos.reduce((s, c) => {
    const rest = Math.max(1, c.totalParcelas - c.parcelaAtual + 1)
    return s + c.valorParcela * rest
  }, 0)

  if (receitaUltimaSafra > 0) {
    const alav = saldoTotal / receitaUltimaSafra
    if (alav > 2) {
      alertas.push({
        id:         'alav-geral',
        severidade:  alav > 4 ? 'critico' : 'atencao',
        icone:      'alavancagem',
        titulo:     `Alavancagem elevada: ${alav.toFixed(1)}× a receita anual`,
        descricao:  `Saldo devedor estimado de ${fmtBRL(saldoTotal)} contra receita de ${fmtBRL(receitaUltimaSafra)}/ano. Limite saudável: até 2×.`,
        valor:      `${alav.toFixed(1)}×`,
      })
    }
  }

  // ── 4. Safra ativa sem produção cadastrada ────────────────────────────────────
  const anoAtual   = HOJE.getFullYear()
  const safraAtual = `${anoAtual - 1}/${String(anoAtual).slice(-2)}`
  const temSafraAtual = producoes.some(p => p.safra === safraAtual)
  if (!temSafraAtual) {
    alertas.push({
      id:         'sem-safra',
      severidade: 'info',
      icone:      'producao',
      titulo:     `Safra ${safraAtual} sem produção cadastrada`,
      descricao:  'Cadastre a produção atual para manter os indicadores e projeções atualizados.',
    })
  }

  // ── 5. Safra com produção mas sem contrato de custeio ─────────────────────────
  if (producoes.length > 0 && contratos.length === 0) {
    alertas.push({
      id:         'sem-contrato',
      severidade: 'info',
      icone:      'contrato',
      titulo:     'Nenhum contrato de crédito rural cadastrado',
      descricao:  'Cadastre contratos (custeio, investimento etc.) para habilitar o simulador de reestruturação e os alertas de vencimento.',
    })
  }

  // ── 6. Comprometimento da receita > 50% com dívidas ──────────────────────────
  if (receitaUltimaSafra > 0 && totalAnual > 0) {
    const pct = totalAnual / receitaUltimaSafra * 100
    if (pct > 50) {
      alertas.push({
        id:         'comprometimento',
        severidade:  pct > 80 ? 'critico' : 'atencao',
        icone:      'alavancagem',
        titulo:     `${pct.toFixed(0)}% da receita comprometida com serviço da dívida`,
        descricao:  `Serviço anual de ${fmtBRL(totalAnual)} contra receita de ${fmtBRL(receitaUltimaSafra)}. Nível crítico acima de 50%.`,
        valor:      `${pct.toFixed(0)}%`,
      })
    }
  }

  // Ordenar: crítico > atenção > info, depois por prazo
  const ordem: Record<Severidade, number> = { critico: 0, atencao: 1, info: 2 }
  return alertas.sort((a, b) => ordem[a.severidade] - ordem[b.severidade])
}

export function TabAlertas({ clientId }: { clientId: string }) {
  const [loading, setLoading]   = useState(true)
  const [contratos, setContratos] = useState<AgroContrato[]>([])
  const [producoes, setProducoes] = useState<AgroProducao[]>([])
  const [custosFixos, setCustosFixos] = useState<{ valor: number }[]>([])
  const [filtro, setFiltro]     = useState<Severidade | 'todos'>('todos')

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.contratos.list(clientId),
      agroApi.producao.list(clientId),
      agroApi.custosFixos.list(clientId),
    ]).then(([conts, prods, custos]) => {
      setContratos(conts as AgroContrato[])
      setProducoes(prods as AgroProducao[])
      setCustosFixos(custos as any[])
    }).finally(() => setLoading(false))
  }, [clientId])

  const alertas = useMemo(() => gerarAlertas(contratos, producoes, custosFixos), [contratos, producoes, custosFixos])
  const filtrados = filtro === 'todos' ? alertas : alertas.filter(a => a.severidade === filtro)

  const criticos = alertas.filter(a => a.severidade === 'critico').length
  const atencoes = alertas.filter(a => a.severidade === 'atencao').length
  const infos    = alertas.filter(a => a.severidade === 'info').length

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-3" />
      <span>Verificando alertas...</span>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Alertas Automáticos</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Monitoramento contínuo — gerado automaticamente a partir dos dados cadastrados
        </p>
      </div>

      {/* Resumo por severidade */}
      <div className="grid grid-cols-3 gap-3">
        <button onClick={() => setFiltro(filtro === 'critico' ? 'todos' : 'critico')}
          className={`rounded-2xl p-4 text-left transition-all ${filtro === 'critico' ? 'ring-2 ring-red-400' : ''} bg-red-50 border border-red-100`}>
          <div className="flex items-center gap-2 mb-1">
            <AlertTriangle size={16} className="text-red-600" />
            <span className="text-xs font-bold text-red-700 uppercase">Crítico</span>
          </div>
          <p className="text-3xl font-bold text-red-700">{criticos}</p>
          <p className="text-xs text-red-400 mt-0.5">alertas críticos</p>
        </button>

        <button onClick={() => setFiltro(filtro === 'atencao' ? 'todos' : 'atencao')}
          className={`rounded-2xl p-4 text-left transition-all ${filtro === 'atencao' ? 'ring-2 ring-amber-400' : ''} bg-amber-50 border border-amber-100`}>
          <div className="flex items-center gap-2 mb-1">
            <Bell size={16} className="text-amber-600" />
            <span className="text-xs font-bold text-amber-700 uppercase">Atenção</span>
          </div>
          <p className="text-3xl font-bold text-amber-700">{atencoes}</p>
          <p className="text-xs text-amber-400 mt-0.5">avisos</p>
        </button>

        <button onClick={() => setFiltro(filtro === 'info' ? 'todos' : 'info')}
          className={`rounded-2xl p-4 text-left transition-all ${filtro === 'info' ? 'ring-2 ring-blue-400' : ''} bg-blue-50 border border-blue-100`}>
          <div className="flex items-center gap-2 mb-1">
            <Info size={16} className="text-blue-600" />
            <span className="text-xs font-bold text-blue-700 uppercase">Informativo</span>
          </div>
          <p className="text-3xl font-bold text-blue-700">{infos}</p>
          <p className="text-xs text-blue-400 mt-0.5">recomendações</p>
        </button>
      </div>

      {alertas.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <CheckCircle size={40} className="mx-auto mb-3 text-emerald-400" />
          <p className="font-medium text-emerald-700">Nenhum alerta identificado</p>
          <p className="text-sm mt-1">Todos os indicadores estão dentro dos limites saudáveis.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {filtro !== 'todos' && (
            <button onClick={() => setFiltro('todos')} className="text-xs text-gray-400 underline">
              Mostrar todos os alertas
            </button>
          )}
          {filtrados.map(a => {
            const cores = CORES[a.severidade]
            const Icone = ICONES[a.icone]
            return (
              <div key={a.id} className={`${cores.bg} ${cores.border} border rounded-2xl px-5 py-4 flex items-start gap-4`}>
                <div className={`mt-0.5 p-2 rounded-xl ${a.severidade === 'critico' ? 'bg-red-100' : a.severidade === 'atencao' ? 'bg-amber-100' : 'bg-blue-100'}`}>
                  <Icone size={16} className={a.severidade === 'critico' ? 'text-red-600' : a.severidade === 'atencao' ? 'text-amber-600' : 'text-blue-600'} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-3">
                    <p className={`text-sm font-bold ${cores.titulo}`}>{a.titulo}</p>
                    {a.valor && (
                      <span className={`text-xs font-bold px-2 py-0.5 rounded-full shrink-0 ${cores.badge}`}>
                        {a.valor}
                      </span>
                    )}
                  </div>
                  <p className={`text-xs mt-0.5 ${a.severidade === 'critico' ? 'text-red-600' : a.severidade === 'atencao' ? 'text-amber-600' : 'text-blue-600'}`}>
                    {a.descricao}
                  </p>
                  {a.prazo && (
                    <p className="text-xs text-gray-400 mt-1 flex items-center gap-1">
                      <Calendar size={10} /> Vence em {a.prazo}
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
