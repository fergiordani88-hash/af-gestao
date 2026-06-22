import { useState, useEffect } from 'react'
import emailjs from '@emailjs/browser'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts'
import {
  Heart, AlertTriangle, TrendingUp, TrendingDown,
  Wallet, Clock, Bell, BellOff, Smartphone, Target, Info, Mail,
  CheckCircle2, Settings, X, Eye, EyeOff
} from 'lucide-react'
import { controleStorage } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

interface EmailConfig {
  serviceId: string
  templateId: string
  publicKey: string
  destinatario: string
}
const EMAIL_KEY = 'af-ctrl-emailjs'
function loadEmailConfig(): EmailConfig {
  try { return JSON.parse(localStorage.getItem(EMAIL_KEY) ?? 'null') ?? { serviceId: '', templateId: '', publicKey: '', destinatario: '' } }
  catch { return { serviceId: '', templateId: '', publicKey: '', destinatario: '' } }
}

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')

type Nivel = 'verde' | 'amarelo' | 'vermelho'

interface Indicador {
  label: string
  valor: string
  nivel: Nivel
  emoji: string
  detalhe: string
}

// ── Cores ───────────────────────────────────────────────────────
const COR_BG: Record<Nivel, string>     = { verde: 'bg-emerald-50 border-emerald-300', amarelo: 'bg-amber-50 border-amber-300', vermelho: 'bg-red-50 border-red-300' }
const COR_TEXT: Record<Nivel, string>   = { verde: 'text-emerald-700', amarelo: 'text-amber-700', vermelho: 'text-red-700' }
const COR_BADGE: Record<Nivel, string>  = { verde: 'bg-emerald-500', amarelo: 'bg-amber-400', vermelho: 'bg-red-500' }
const LABEL_NIVEL: Record<Nivel, string>= { verde: '✅ Boa', amarelo: '⚠️ Atenção', vermelho: '🚨 Crítico' }
const EMOJI_NIVEL: Record<Nivel, string>= { verde: '🟢', amarelo: '🟡', vermelho: '🔴' }

function pior(a: Nivel, b: Nivel): Nivel {
  const rank = { verde: 0, amarelo: 1, vermelho: 2 }
  return rank[a] >= rank[b] ? a : b
}

// ── Cálculo do saldo atual real ──────────────────────────────────
function calcSaldoAtual(): number {
  const si = controleStorage.getSaldoInicial()
  if (!si) return 0
  const today = new Date().toISOString().slice(0, 10)
  const entries = controleStorage.getEntries()
  let saldo = si.valor
  entries.forEach(e => {
    if (e.status === 'pago') {
      const dt = e.dataPag ?? e.dataVenc
      if (dt >= si.data && dt <= today) {
        const v = e.valorPago ?? e.valor
        saldo += e.tipo === 'receita' ? v : -v
      }
    }
  })
  return saldo
}

// ── Projeção 90 dias ─────────────────────────────────────────────
function calcProjecao90(saldoAtual: number) {
  const today = new Date(); today.setHours(0, 0, 0, 0)
  const todayStr = today.toISOString().slice(0, 10)
  const entries = controleStorage.getEntries().filter(e => e.status !== 'cancelado' && e.status !== 'pago')

  // Mapeia lançamentos por data (atrasados → hoje)
  const byDate: Record<string, { entradas: number; saidas: number }> = {}
  entries.forEach(e => {
    const date = e.dataVenc < todayStr ? todayStr : e.dataVenc
    if (!byDate[date]) byDate[date] = { entradas: 0, saidas: 0 }
    if (e.tipo === 'receita') byDate[date].entradas += e.valor
    else byDate[date].saidas += e.valor
  })

  const days: { label: string; saldo: number; saldoPos: number; saldoNeg: number; entradas: number; saidas: number; date: string }[] = []
  let saldo = saldoAtual

  for (let i = 0; i <= 90; i++) {
    const d = new Date(today); d.setDate(d.getDate() + i)
    const dateStr = d.toISOString().slice(0, 10)
    const mov = byDate[dateStr] ?? { entradas: 0, saidas: 0 }
    saldo = Math.round((saldo + mov.entradas - mov.saidas) * 100) / 100

    const showLabel = i === 0 || i === 30 || i === 60 || i === 90 || i % 7 === 0
    const label = i === 0 ? 'Hoje'
      : showLabel ? `${d.getDate()}/${d.getMonth() + 1}` : ''

    days.push({
      date: dateStr, label, saldo,
      saldoPos: saldo >= 0 ? saldo : 0,
      saldoNeg: saldo < 0 ? saldo : 0,
      entradas: mov.entradas, saidas: mov.saidas,
    })
  }

  const minSaldo30 = Math.min(...days.slice(0, 30).map(d => d.saldo))
  const minSaldo90 = Math.min(...days.map(d => d.saldo))
  const diasNeg    = days.filter(d => d.saldo < 0).length

  return { days, minSaldo30, minSaldo90, diasNeg }
}

// ── Break-even ───────────────────────────────────────────────────
function calcBreakEven() {
  const now   = new Date()
  const year  = now.getFullYear()
  const month = now.getMonth() + 1
  const history = controleStorage.getLast12MonthsSummary()
  const ultimos3 = history.slice(-4, -1) // 3 meses completos anteriores
  const avgDesp   = ultimos3.length > 0 ? ultimos3.reduce((s, m) => s + m.despesa, 0) / ultimos3.length : 0
  const curRec    = controleStorage.getSummary(year, month).receita
  const pct       = avgDesp > 0 ? (curRec / avgDesp) * 100 : 100
  const faltam    = Math.max(0, avgDesp - curRec)
  return { avgDesp, curRec, pct, faltam }
}

// ── Composição dos indicadores de saúde ─────────────────────────
function calcIndicadores(saldoAtual: number, minSaldo30: number): Indicador[] {
  const now = new Date(); now.setHours(0, 0, 0, 0)
  const entries = controleStorage.getEntries()

  // 1. Cobertura de caixa (dias)
  const history = controleStorage.getLast12MonthsSummary()
  const avgDesp = history.slice(-3).reduce((s, m) => s + m.despesa, 0) / 3
  const avgDiario = avgDesp / 30
  const diasCobertura = avgDiario > 0 ? Math.floor(saldoAtual / avgDiario) : 999
  const nivelCaixa: Nivel = diasCobertura >= 30 ? 'verde' : diasCobertura >= 15 ? 'amarelo' : 'vermelho'

  // 2. Inadimplência / atrasos — inclui pendentes com vencimento vencido (mesmo critério do dashboard)
  const atrasados   = controleStorage.getOverdue()
  const totalAtraso = atrasados.reduce((s, e) => s + e.valor, 0)
  const totalOpen   = entries.filter(e => ['pendente','atrasado','previsto'].includes(e.status)).reduce((s, e) => s + e.valor, 0)
  const pctAtraso   = totalOpen > 0 ? (totalAtraso / totalOpen) * 100 : 0
  const nivelAtraso: Nivel = totalAtraso === 0 ? 'verde' : pctAtraso <= 15 ? 'amarelo' : 'vermelho'

  // 3. Projeção 30 dias
  const nivelProj: Nivel = minSaldo30 > 0 ? 'verde' : minSaldo30 > -1000 ? 'amarelo' : 'vermelho'

  // 4. Resultado do mês atual
  const mes = controleStorage.getSummary(now.getFullYear(), now.getMonth() + 1)
  const nivelMes: Nivel = mes.resultado >= 0 ? 'verde' : mes.resultado > -mes.despesa * 0.1 ? 'amarelo' : 'vermelho'

  return [
    {
      label:   'Reserva de caixa',
      emoji:   '💰',
      valor:   diasCobertura >= 999 ? '—' : `${diasCobertura} dias`,
      nivel:   nivelCaixa,
      detalhe: diasCobertura >= 999
        ? 'Configure o saldo inicial para ver este indicador'
        : diasCobertura >= 30
          ? `Seu caixa cobre ${diasCobertura} dias de despesas — situação confortável`
          : diasCobertura >= 15
            ? `Atenção: caixa cobre apenas ${diasCobertura} dias — reforce a entrada de receitas`
            : `Risco alto: menos de ${diasCobertura} dias de reserva — aja agora`,
    },
    {
      label:   'Contas em atraso',
      emoji:   '⏰',
      valor:   fmtBRL(totalAtraso),
      nivel:   nivelAtraso,
      detalhe: totalAtraso === 0
        ? 'Nenhuma conta em atraso — ótimo controle!'
        : `${atrasados.length} conta(s) em atraso totalizando ${fmtBRL(totalAtraso)} — regularize o quanto antes`,
    },
    {
      label:   'Caixa em 30 dias',
      emoji:   '🔮',
      valor:   fmtBRL(minSaldo30),
      nivel:   nivelProj,
      detalhe: nivelProj === 'verde'
        ? 'Seu caixa permanece positivo nos próximos 30 dias — boa projeção!'
        : nivelProj === 'amarelo'
          ? 'O caixa ficará muito baixo em algum ponto nos próximos 30 dias — monitore'
          : 'Projeção indica caixa negativo nos próximos 30 dias — tome providências urgentes',
    },
    {
      label:   'Resultado do mês',
      emoji:   '📊',
      valor:   fmtBRL(mes.resultado),
      nivel:   nivelMes,
      detalhe: mes.resultado >= 0
        ? `Resultado positivo: você está lucrando ${fmtBRL(mes.resultado)} neste mês`
        : `Resultado negativo: suas despesas superam as receitas em ${fmtBRL(Math.abs(mes.resultado))} neste mês`,
    },
  ]
}

// ── Componente de indicador ──────────────────────────────────────
function IndicCard({ ind }: { ind: Indicador }) {
  const [open, setOpen] = useState(false)
  return (
    <div className={`rounded-2xl border-2 p-4 transition-all cursor-pointer ${COR_BG[ind.nivel]}`} onClick={() => setOpen(o => !o)}>
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-xs font-semibold text-gray-500 mb-1">{ind.emoji} {ind.label}</p>
          <p className={`text-xl font-bold ${COR_TEXT[ind.nivel]}`}>{ind.valor}</p>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <span className={`w-3 h-3 rounded-full ${COR_BADGE[ind.nivel]}`} />
          <Info size={13} className="text-gray-400 mt-1" />
        </div>
      </div>
      {open && <p className="mt-2 text-xs text-gray-600 leading-relaxed border-t border-current/20 pt-2">{ind.detalhe}</p>}
    </div>
  )
}

// ── Tooltip customizado ──────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null
  const saldo = payload[0]?.payload?.saldo ?? 0
  return (
    <div className="bg-white border border-gray-200 rounded-xl shadow-lg px-3 py-2 text-xs">
      <p className="font-semibold text-gray-700 mb-1">{payload[0]?.payload?.date ? fmtDate(payload[0].payload.date) : label}</p>
      <p className={`font-bold text-sm ${saldo >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(saldo)}</p>
      {payload[0]?.payload?.entradas > 0 && <p className="text-emerald-600">+{fmtBRL(payload[0].payload.entradas)}</p>}
      {payload[0]?.payload?.saidas   > 0 && <p className="text-red-500">-{fmtBRL(payload[0].payload.saidas)}</p>}
    </div>
  )
}

// ── Componente principal ─────────────────────────────────────────
export function ControleSaude() {
  const [saldoAtual,   setSaldoAtual]   = useState(0)
  const [projecao,     setProjecao]     = useState<ReturnType<typeof calcProjecao90> | null>(null)
  const [breakEven,    setBreakEven]    = useState<ReturnType<typeof calcBreakEven> | null>(null)
  const [indicadores,  setIndicadores]  = useState<Indicador[]>([])
  const [saudeGeral,   setSaudeGeral]   = useState<Nivel>('verde')
  const [notifStatus,  setNotifStatus]  = useState<'default'|'granted'|'denied'>('default')
  const [whatsApp,     setWhatsApp]     = useState(localStorage.getItem('af-ctrl-whatsapp') ?? '')
  const [whatsAppEdit, setWhatsAppEdit] = useState(false)
  const [alertasEnv,   setAlertasEnv]   = useState(false)
  const [semSaldoInicial, setSemSaldo]  = useState(false)
  // E-mail
  const [emailCfg,     setEmailCfg]     = useState<EmailConfig>(loadEmailConfig)
  const [emailSetup,   setEmailSetup]   = useState(false)
  const [emailDraft,   setEmailDraft]   = useState<EmailConfig>(loadEmailConfig)
  const [emailStatus,  setEmailStatus]  = useState<'idle'|'sending'|'ok'|'erro'>('idle')
  const [showKey,      setShowKey]      = useState(false)

  useEffect(() => {
    const si = controleStorage.getSaldoInicial()
    setSemSaldo(!si)
    const sa = calcSaldoAtual()
    setSaldoAtual(sa)
    const proj = calcProjecao90(sa)
    setProjecao(proj)
    const be = calcBreakEven()
    setBreakEven(be)
    const inds = calcIndicadores(sa, proj.minSaldo30)
    setIndicadores(inds)
    const geral = inds.reduce<Nivel>((acc, i) => pior(acc, i.nivel), 'verde')
    setSaudeGeral(geral)

    // Notificações
    if ('Notification' in window) {
      setNotifStatus(Notification.permission as any)
    }

    // Auto-notificação se já tiver permissão e houver alertas críticos
    if (Notification.permission === 'granted') {
      const overdue = controleStorage.getOverdue()
      const nextDue = controleStorage.getNextDue(1)
      if (overdue.length > 0) {
        new Notification('⚠️ AF Controle — Contas em atraso', {
          body: `Você tem ${overdue.length} conta(s) em atraso. Acesse o sistema para regularizar.`,
          icon: '/logo.png',
        })
      } else if (nextDue.length > 0) {
        new Notification('📅 AF Controle — Vence amanhã', {
          body: `Há ${nextDue.length} conta(s) vencendo amanhã.`,
          icon: '/logo.png',
        })
      }
    }
  }, [])

  // Habilitar notificações do navegador
  const handleRequestNotif = async () => {
    if (!('Notification' in window)) return
    const perm = await Notification.requestPermission()
    setNotifStatus(perm as any)
    if (perm === 'granted') {
      new Notification('✅ AF Controle — Alertas ativados!', {
        body: 'Você receberá avisos sobre contas vencendo e caixa baixo enquanto o sistema estiver aberto.',
        icon: '/logo.png',
      })
    }
  }

  // Gera mensagem WhatsApp
  const gerarMsgWhatsApp = () => {
    const be = breakEven
    const geral = saudeGeral
    const now = new Date().toLocaleDateString('pt-BR')
    const overdue = controleStorage.getOverdue()
    const nextDue = controleStorage.getNextDue(7)
    const totalAtraso = overdue.reduce((s, e) => s + e.valor, 0)
    const totalVenc7  = nextDue.reduce((s, e) => s + e.valor, 0)

    const linhas = [
      `${EMOJI_NIVEL[geral]} *Relatório Financeiro — AF Controle*`,
      `📅 ${now}`,
      ``,
      `💰 *Saldo em caixa:* ${fmtBRL(saldoAtual)}`,
      `📊 *Saúde financeira:* ${LABEL_NIVEL[geral]}`,
      ``,
      be ? `📈 Receitas do mês: ${fmtBRL(be.curRec)}` : '',
      be ? `📉 Custo médio mensal: ${fmtBRL(be.avgDesp)}` : '',
      be ? `🎯 Break-even: ${be.pct.toFixed(0)}% atingido${be.pct >= 100 ? ' ✅' : ' ⚠️'}` : '',
      ``,
      totalAtraso > 0 ? `❌ *Em atraso:* ${fmtBRL(totalAtraso)} (${overdue.length} conta(s))` : `✅ Nenhuma conta em atraso`,
      totalVenc7  > 0 ? `⏰ *Vence em 7 dias:* ${fmtBRL(totalVenc7)}` : ``,
      projecao?.minSaldo30 !== undefined && projecao.minSaldo30 < 0
        ? `🚨 *Atenção:* caixa pode ficar negativo nos próximos 30 dias!`
        : '',
      ``,
      `_Enviado pelo AF Controle_`,
    ].filter(l => l !== '').join('\n')

    return encodeURIComponent(linhas)
  }

  const handleEnviarWhatsApp = () => {
    const msg  = gerarMsgWhatsApp()
    const num  = whatsApp.replace(/\D/g, '')
    const url  = num ? `https://wa.me/55${num}?text=${msg}` : `https://wa.me/?text=${msg}`
    window.open(url, '_blank')
    setAlertasEnv(true)
    setTimeout(() => setAlertasEnv(false), 3000)
  }

  const handleSalvarWhatsApp = () => {
    localStorage.setItem('af-ctrl-whatsapp', whatsApp)
    setWhatsAppEdit(false)
  }

  // ── E-mail ──────────────────────────────────────────────────────
  const handleSalvarEmailCfg = () => {
    localStorage.setItem(EMAIL_KEY, JSON.stringify(emailDraft))
    setEmailCfg(emailDraft)
    setEmailSetup(false)
  }

  const gerarCorpoEmail = () => {
    const be      = breakEven
    const geral   = saudeGeral
    const now     = new Date().toLocaleDateString('pt-BR')
    const overdue = controleStorage.getOverdue()
    const nextDue = controleStorage.getNextDue(7)
    const totalAtraso = overdue.reduce((s, e) => s + e.valor, 0)
    const totalVenc7  = nextDue.reduce((s, e) => s + e.valor, 0)
    const empresa = controleStorage.getCompany()

    const linhas = [
      `RELATÓRIO FINANCEIRO — AF CONTROLE`,
      `Data: ${now}`,
      `Empresa: ${empresa?.nomeFantasia ?? '—'}`,
      ``,
      `──────────────────────────────────`,
      `SAÚDE FINANCEIRA GERAL: ${LABEL_NIVEL[geral]}`,
      `Saldo atual em caixa: ${fmtBRL(saldoAtual)}`,
      `──────────────────────────────────`,
      ``,
      be ? `RESULTADO DO MÊS` : '',
      be ? `Receitas: ${fmtBRL(be.curRec)}` : '',
      be ? `Custo médio mensal: ${fmtBRL(be.avgDesp)}` : '',
      be ? `Break-even: ${be.pct.toFixed(0)}% atingido${be.pct >= 100 ? ' ✅' : ' ⚠️'}` : '',
      be ? (be.pct >= 100 ? 'Situação: acima do ponto de equilíbrio' : `Faltam: ${fmtBRL(be.faltam)} para cobrir os custos`) : '',
      ``,
      `CONTAS`,
      totalAtraso > 0 ? `❌ Em atraso: ${fmtBRL(totalAtraso)} (${overdue.length} conta(s))` : '✅ Nenhuma conta em atraso',
      totalVenc7  > 0 ? `⏰ Vence em 7 dias: ${fmtBRL(totalVenc7)} (${nextDue.length} conta(s))` : '✅ Nenhuma conta vencendo nos próximos 7 dias',
      ``,
      projecao?.minSaldo30 !== undefined && projecao.minSaldo30 < 0
        ? `🚨 ATENÇÃO: caixa pode ficar negativo nos próximos 30 dias (mínimo projetado: ${fmtBRL(projecao.minSaldo30)})`
        : `✅ Projeção 30 dias: caixa positivo (mínimo: ${fmtBRL(projecao?.minSaldo30 ?? 0)})`,
      ``,
      `──────────────────────────────────`,
      `Relatório gerado automaticamente pelo AF Controle`,
    ].filter(l => l !== '').join('\n')

    return linhas
  }

  const handleEnviarEmail = async () => {
    const cfg = emailCfg
    if (!cfg.serviceId || !cfg.templateId || !cfg.publicKey || !cfg.destinatario) {
      setEmailSetup(true)
      return
    }
    setEmailStatus('sending')
    try {
      await emailjs.send(
        cfg.serviceId,
        cfg.templateId,
        {
          to_email:   cfg.destinatario,
          to_name:    controleStorage.getCompany()?.nomeFantasia ?? 'Gestor',
          subject:    `Relatório Financeiro — AF Controle — ${new Date().toLocaleDateString('pt-BR')}`,
          message:    gerarCorpoEmail(),
          from_name:  'AF Controle',
        },
        cfg.publicKey,
      )
      setEmailStatus('ok')
      setTimeout(() => setEmailStatus('idle'), 4000)
    } catch {
      setEmailStatus('erro')
      setTimeout(() => setEmailStatus('idle'), 5000)
    }
  }

  const emailConfigurado = !!(emailCfg.serviceId && emailCfg.templateId && emailCfg.publicKey && emailCfg.destinatario)

  const projecaoMax  = projecao ? Math.max(...projecao.days.map(d => d.saldo), 0) : 0
  const projecaoMin  = projecao ? Math.min(...projecao.days.map(d => d.saldo), 0) : 0
  const rangeTotal   = projecaoMax - projecaoMin || 1
  const zeroPct      = projecaoMin < 0 ? `${((projecaoMax / rangeTotal) * 100).toFixed(1)}%` : '100%'

  return (
    <ControleLayout title="Saúde Financeira" subtitle="Visão geral, projeção de caixa e alertas inteligentes">
      <div className="space-y-6">

        {/* Banner: saldo inicial não configurado */}
        {semSaldoInicial && (
          <div className="flex items-center gap-3 bg-amber-50 border-2 border-amber-300 rounded-2xl p-4">
            <AlertTriangle size={20} className="text-amber-500 shrink-0" />
            <div className="flex-1">
              <p className="font-bold text-amber-800 text-sm">Configure o saldo inicial para análise completa</p>
              <p className="text-xs text-amber-600 mt-0.5">Vá em Fluxo de Caixa → botão "Definir saldo inicial" para informar o valor atual do seu caixa.</p>
            </div>
          </div>
        )}

        {/* ── SEMÁFORO GERAL ───────────────────────────────── */}
        <div className={`rounded-2xl border-2 p-6 ${COR_BG[saudeGeral]}`}>
          <div className="flex flex-wrap items-center gap-6">
            {/* Semáforo visual */}
            <div className="flex flex-col items-center gap-1.5 shrink-0">
              <div className={`w-6 h-6 rounded-full ${saudeGeral === 'vermelho' ? 'bg-red-500 shadow-lg shadow-red-200' : 'bg-red-200'}`} />
              <div className={`w-6 h-6 rounded-full ${saudeGeral === 'amarelo' ? 'bg-amber-400 shadow-lg shadow-amber-200' : 'bg-amber-200'}`} />
              <div className={`w-6 h-6 rounded-full ${saudeGeral === 'verde'   ? 'bg-emerald-500 shadow-lg shadow-emerald-200' : 'bg-emerald-200'}`} />
            </div>

            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <Heart size={18} className={COR_TEXT[saudeGeral]} />
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Saúde Financeira Geral</p>
              </div>
              <p className={`text-3xl font-black ${COR_TEXT[saudeGeral]}`}>{LABEL_NIVEL[saudeGeral]}</p>
              <p className="text-xs text-gray-500 mt-1">
                {saudeGeral === 'verde'    && 'Sua situação financeira está sob controle. Continue assim!'}
                {saudeGeral === 'amarelo'  && 'Alguns indicadores precisam de atenção. Revise os detalhes abaixo.'}
                {saudeGeral === 'vermelho' && 'Situação requer ação imediata. Leia os alertas e tome providências.'}
              </p>
            </div>

            <div className="shrink-0 text-right">
              <p className="text-xs text-gray-400">Saldo atual</p>
              <p className={`text-2xl font-bold ${saldoAtual >= 0 ? 'text-gray-900' : 'text-red-700'}`}>{fmtBRL(saldoAtual)}</p>
              <p className="text-xs text-gray-400 mt-0.5">em caixa agora</p>
            </div>
          </div>
        </div>

        {/* ── 4 INDICADORES ────────────────────────────────── */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {indicadores.map(ind => <IndicCard key={ind.label} ind={ind} />)}
        </div>
        <p className="text-[11px] text-gray-400 -mt-2 flex items-center gap-1">
          <Info size={10} /> Clique em cada indicador para ver a explicação detalhada.
        </p>

        {/* ── PROJEÇÃO 90 DIAS ──────────────────────────────── */}
        <Card className="p-5">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
            <div>
              <h2 className="font-bold text-gray-900 flex items-center gap-2">
                🔮 Projeção de Caixa — próximos 90 dias
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Baseada nos contratos ativos e lançamentos pendentes cadastrados no sistema
              </p>
            </div>
            {projecao && (
              <div className="flex gap-3 text-xs">
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-emerald-500 inline-block" />
                  Saldo positivo
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-red-500 inline-block" />
                  Saldo negativo
                </span>
              </div>
            )}
          </div>

          {!projecao && <p className="text-center text-gray-400 py-8">Calculando...</p>}

          {projecao && (
            <>
              {/* KPIs da projeção */}
              <div className="grid grid-cols-3 gap-3 mb-4">
                <div className={`rounded-xl p-3 text-center border ${projecao.minSaldo30 >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] text-gray-500 font-medium">Pior saldo em 30 dias</p>
                  <p className={`text-base font-bold mt-0.5 ${projecao.minSaldo30 >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(projecao.minSaldo30)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${projecao.minSaldo90 >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                  <p className="text-[10px] text-gray-500 font-medium">Pior saldo em 90 dias</p>
                  <p className={`text-base font-bold mt-0.5 ${projecao.minSaldo90 >= 0 ? 'text-emerald-700' : 'text-amber-700'}`}>{fmtBRL(projecao.minSaldo90)}</p>
                </div>
                <div className={`rounded-xl p-3 text-center border ${projecao.diasNeg === 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-[10px] text-gray-500 font-medium">Dias com caixa negativo</p>
                  <p className={`text-base font-bold mt-0.5 ${projecao.diasNeg === 0 ? 'text-emerald-700' : 'text-red-700'}`}>{projecao.diasNeg} dias</p>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={240}>
                <AreaChart data={projecao.days} margin={{ top: 5, right: 10, left: 10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradPos" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#10b981" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0.05} />
                    </linearGradient>
                    <linearGradient id="gradNeg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#ef4444" stopOpacity={0.05} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0.35} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} interval={0} />
                  <YAxis tick={{ fontSize: 9 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" strokeWidth={2} label={{ value: 'R$ 0', position: 'insideRight', fontSize: 9, fill: '#ef4444' }} />
                  <Area type="monotone" dataKey="saldoPos" stroke="#10b981" strokeWidth={2} fill="url(#gradPos)" dot={false} />
                  <Area type="monotone" dataKey="saldoNeg" stroke="#ef4444" strokeWidth={2} fill="url(#gradNeg)" dot={false} />
                </AreaChart>
              </ResponsiveContainer>

              {projecao.diasNeg > 0 && (
                <div className="flex items-start gap-2 mt-3 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">
                    <strong>Atenção:</strong> a projeção indica {projecao.diasNeg} dia(s) com caixa negativo nos próximos 90 dias.
                    Revise seus lançamentos pendentes ou antecipe receitas para cobrir o período crítico.
                  </p>
                </div>
              )}
            </>
          )}
        </Card>

        {/* ── PONTO DE EQUILÍBRIO ───────────────────────────── */}
        {breakEven && (
          <Card className="p-5">
            <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
              🎯 Ponto de Equilíbrio Mensal
            </h2>
            <p className="text-xs text-gray-500 mb-4">
              Quanto você precisa faturar por mês para cobrir todos os seus custos e não ter prejuízo
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-5">
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown size={14} className="text-red-600" />
                  <p className="text-xs text-gray-500 font-medium">Custo médio mensal</p>
                </div>
                <p className="text-xl font-bold text-red-700">{fmtBRL(breakEven.avgDesp)}</p>
                <p className="text-[10px] text-gray-400 mt-1">média dos últimos 3 meses</p>
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <p className="text-xs text-gray-500 font-medium">Receita do mês atual</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">{fmtBRL(breakEven.curRec)}</p>
                <p className="text-[10px] text-gray-400 mt-1">lançado até agora</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${breakEven.pct >= 100 ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Target size={14} className={breakEven.pct >= 100 ? 'text-emerald-600' : 'text-amber-600'} />
                  <p className="text-xs text-gray-500 font-medium">Break-even atingido</p>
                </div>
                <p className={`text-xl font-bold ${breakEven.pct >= 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {Math.min(breakEven.pct, 999).toFixed(0)}%
                </p>
                <p className="text-[10px] text-gray-400 mt-1">
                  {breakEven.pct >= 100 ? 'meta superada ✅' : `faltam ${fmtBRL(breakEven.faltam)}`}
                </p>
              </div>
            </div>

            {/* Barra de progresso */}
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-gray-500">
                <span>R$ 0</span>
                <span className="font-semibold">Meta: {fmtBRL(breakEven.avgDesp)}</span>
              </div>
              <div className="h-6 bg-gray-100 rounded-full overflow-hidden relative">
                <div
                  className={`h-full rounded-full flex items-center justify-end pr-2 transition-all duration-700 ${breakEven.pct >= 100 ? 'bg-emerald-500' : breakEven.pct >= 70 ? 'bg-amber-400' : 'bg-red-500'}`}
                  style={{ width: `${Math.min(breakEven.pct, 100)}%` }}
                >
                  {breakEven.pct >= 20 && (
                    <span className="text-white text-[10px] font-bold">{breakEven.pct.toFixed(0)}%</span>
                  )}
                </div>
                {/* Marcador da meta */}
                <div className="absolute right-0 top-0 h-full flex items-center">
                  <div className="w-0.5 h-full bg-gray-400" />
                </div>
              </div>
              <p className="text-xs text-gray-500 text-center">
                {breakEven.pct >= 100
                  ? `✅ Você já passou do ponto de equilíbrio! Cada real que entrar agora é lucro.`
                  : `⚠️ Você ainda precisa faturar mais ${fmtBRL(breakEven.faltam)} para cobrir os custos do mês.`}
              </p>
            </div>

            {/* Explicação simples */}
            <div className="mt-4 bg-blue-50 border border-blue-100 rounded-xl p-3">
              <p className="text-xs text-blue-700 leading-relaxed">
                <strong>Como funciona?</strong> O ponto de equilíbrio é calculado com base na média das despesas dos últimos 3 meses.
                Quando a barra chega a 100%, significa que suas receitas deste mês já cobrem todos os custos — e o que vier além disso é lucro para o seu negócio.
              </p>
            </div>
          </Card>
        )}

        {/* ── ALERTAS / WHATSAPP / E-MAIL / NOTIFICAÇÕES ────── */}
        <Card className="p-5">
          <h2 className="font-bold text-gray-900 flex items-center gap-2 mb-1">
            🔔 Alertas e Avisos
          </h2>
          <p className="text-xs text-gray-500 mb-5">
            Receba relatórios e lembretes pelo WhatsApp, e-mail ou pelo navegador
          </p>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* WhatsApp */}
            <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-4">
              <div className="flex items-center gap-2 mb-3">
                <Smartphone size={18} className="text-emerald-700" />
                <h3 className="font-bold text-emerald-900 text-sm">Enviar pelo WhatsApp</h3>
              </div>
              <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                Gera um relatório financeiro completo e abre o WhatsApp para você enviar para si mesmo ou para seu contador — com um clique.
              </p>

              {/* Número */}
              {whatsAppEdit ? (
                <div className="flex gap-2 mb-3">
                  <input
                    type="tel"
                    className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-300"
                    placeholder="Ex: 65 99999-9999"
                    value={whatsApp}
                    onChange={e => setWhatsApp(e.target.value)}
                  />
                  <button onClick={handleSalvarWhatsApp}
                    className="bg-emerald-600 text-white rounded-xl px-3 py-2 text-xs font-bold hover:bg-emerald-700">
                    Salvar
                  </button>
                </div>
              ) : (
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 bg-white border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 truncate">
                    {whatsApp || <span className="text-gray-400">Número não configurado (opcional)</span>}
                  </div>
                  <button onClick={() => setWhatsAppEdit(true)}
                    className="text-xs text-emerald-700 font-semibold hover:underline shrink-0">
                    {whatsApp ? 'Alterar' : 'Configurar'}
                  </button>
                </div>
              )}

              <button onClick={handleEnviarWhatsApp}
                className={`w-full py-3 rounded-xl font-bold text-sm transition-all flex items-center justify-center gap-2 ${alertasEnv ? 'bg-emerald-100 text-emerald-700' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}`}>
                <Smartphone size={16} />
                {alertasEnv ? '✓ WhatsApp aberto!' : 'Enviar relatório pelo WhatsApp'}
              </button>

              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Abre o WhatsApp com a mensagem pronta — você decide para quem enviar
              </p>
            </div>

            {/* E-mail via EmailJS */}
            <div className="bg-blue-50 border border-blue-200 rounded-2xl p-4 flex flex-col">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Mail size={18} className="text-blue-700" />
                  <h3 className="font-bold text-blue-900 text-sm">Enviar por E-mail</h3>
                </div>
                <button onClick={() => { setEmailDraft(emailCfg); setEmailSetup(s => !s) }}
                  className="text-blue-500 hover:text-blue-700 transition-colors">
                  <Settings size={15} />
                </button>
              </div>

              {/* Painel de configuração */}
              {emailSetup && (
                <div className="bg-white border border-blue-100 rounded-xl p-3 mb-3 space-y-2">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-bold text-gray-700">Configurar EmailJS</p>
                    <button onClick={() => setEmailSetup(false)}><X size={13} className="text-gray-400" /></button>
                  </div>

                  {/* Mini-guia */}
                  <div className="bg-amber-50 border border-amber-100 rounded-lg p-2 text-[10px] text-amber-800 leading-relaxed">
                    <strong>Como configurar (gratuito, 200 e-mails/mês):</strong>
                    <ol className="list-decimal list-inside mt-1 space-y-0.5">
                      <li>Acesse <strong>emailjs.com</strong> e crie conta gratuita</li>
                      <li>Em <em>Email Services</em>, conecte seu Gmail ou Outlook</li>
                      <li>Em <em>Email Templates</em>, crie um template com os campos:<br/>
                        <code className="bg-amber-100 px-0.5 rounded">{'{{to_email}}, {{subject}}, {{message}}'}</code>
                      </li>
                      <li>Copie o <strong>Service ID</strong>, <strong>Template ID</strong> e <strong>Public Key</strong></li>
                    </ol>
                  </div>

                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Service ID</label>
                    <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Ex: service_abc123"
                      value={emailDraft.serviceId}
                      onChange={e => setEmailDraft(d => ({ ...d, serviceId: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Template ID</label>
                    <input className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="Ex: template_xyz789"
                      value={emailDraft.templateId}
                      onChange={e => setEmailDraft(d => ({ ...d, templateId: e.target.value }))} />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Public Key</label>
                    <div className="flex gap-1">
                      <input
                        type={showKey ? 'text' : 'password'}
                        className="flex-1 border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                        placeholder="Sua chave pública"
                        value={emailDraft.publicKey}
                        onChange={e => setEmailDraft(d => ({ ...d, publicKey: e.target.value }))} />
                      <button onClick={() => setShowKey(s => !s)} className="px-2 text-gray-400 hover:text-gray-600">
                        {showKey ? <EyeOff size={12} /> : <Eye size={12} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 block mb-0.5">Destinatário (e-mail)</label>
                    <input type="email"
                      className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300"
                      placeholder="voce@empresa.com.br"
                      value={emailDraft.destinatario}
                      onChange={e => setEmailDraft(d => ({ ...d, destinatario: e.target.value }))} />
                  </div>
                  <button onClick={handleSalvarEmailCfg}
                    className="w-full py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold">
                    Salvar configuração
                  </button>
                </div>
              )}

              {!emailSetup && (
                <>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed flex-1">
                    {emailConfigurado
                      ? `Envia o relatório completo para ${emailCfg.destinatario} com um clique.`
                      : 'Configure uma vez e envie relatórios financeiros completos diretamente para seu e-mail.'}
                  </p>
                  {emailConfigurado && (
                    <div className="bg-white border border-blue-100 rounded-xl px-3 py-2 mb-3 text-xs text-gray-500 truncate">
                      📧 {emailCfg.destinatario}
                    </div>
                  )}
                </>
              )}

              <button onClick={handleEnviarEmail} disabled={emailStatus === 'sending'}
                className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all mt-auto
                  ${emailStatus === 'ok'      ? 'bg-emerald-100 text-emerald-700'
                  : emailStatus === 'erro'    ? 'bg-red-100 text-red-700'
                  : emailStatus === 'sending' ? 'bg-blue-100 text-blue-500 cursor-wait'
                  : emailConfigurado          ? 'bg-blue-600 hover:bg-blue-700 text-white'
                                              : 'bg-blue-100 text-blue-700 hover:bg-blue-200'}`}>
                <Mail size={16} />
                {emailStatus === 'sending' ? 'Enviando...'
                  : emailStatus === 'ok'   ? '✓ E-mail enviado!'
                  : emailStatus === 'erro' ? '✗ Erro ao enviar — verifique a configuração'
                  : emailConfigurado       ? 'Enviar relatório por e-mail'
                                           : 'Configurar e-mail'}
              </button>
              <p className="text-[10px] text-gray-400 mt-2 text-center">
                Serviço: EmailJS — 200 e-mails/mês gratuitos
              </p>
            </div>

            {/* Notificações do navegador */}
            <div className={`border-2 rounded-2xl p-4 ${notifStatus === 'granted' ? 'bg-blue-50 border-blue-200' : notifStatus === 'denied' ? 'bg-gray-50 border-gray-200' : 'bg-amber-50 border-amber-200'}`}>
              <div className="flex items-center gap-2 mb-3">
                {notifStatus === 'granted' ? <Bell size={18} className="text-blue-700" /> : <BellOff size={18} className="text-gray-500" />}
                <h3 className={`font-bold text-sm ${notifStatus === 'granted' ? 'text-blue-900' : 'text-gray-700'}`}>
                  Alertas no Navegador
                </h3>
              </div>

              {notifStatus === 'granted' && (
                <>
                  <p className="text-xs text-blue-700 mb-3 leading-relaxed">
                    ✅ <strong>Ativado!</strong> Enquanto o sistema estiver aberto no seu navegador, você receberá avisos sobre contas vencendo e situação do caixa.
                  </p>
                  <div className="bg-white border border-blue-100 rounded-xl p-3 space-y-1.5">
                    <p className="text-xs font-semibold text-gray-700">Quando você receberá alertas:</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><Clock size={11} className="text-amber-500" /> Contas vencendo hoje ou amanhã</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><AlertTriangle size={11} className="text-red-500" /> Contas em atraso ao abrir o sistema</p>
                    <p className="text-xs text-gray-500 flex items-center gap-1.5"><Wallet size={11} className="text-orange-500" /> Saldo projetado negativo nos próximos 7 dias</p>
                  </div>
                </>
              )}

              {notifStatus === 'default' && (
                <>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    Ative para receber avisos no navegador quando houver contas vencendo ou o caixa estiver baixo — mesmo que o sistema esteja em segundo plano.
                  </p>
                  <button onClick={handleRequestNotif}
                    className="w-full py-3 rounded-xl font-bold text-sm bg-amber-500 hover:bg-amber-600 text-white flex items-center justify-center gap-2">
                    <Bell size={16} /> Ativar alertas no navegador
                  </button>
                </>
              )}

              {notifStatus === 'denied' && (
                <>
                  <p className="text-xs text-gray-600 mb-3 leading-relaxed">
                    As notificações foram bloqueadas pelo navegador. Para reativar, clique no ícone de cadeado na barra de endereços e permita notificações para este site.
                  </p>
                  <div className="bg-white border border-gray-200 rounded-xl p-3">
                    <p className="text-xs text-gray-500 font-semibold mb-1">Como reativar:</p>
                    <p className="text-xs text-gray-500">🔒 Clique no cadeado na barra de endereços → Notificações → Permitir → Recarregue a página</p>
                  </div>
                </>
              )}

              {notifStatus === 'granted' && (
                <div className="mt-3 bg-blue-100 rounded-xl p-2 text-center">
                  <p className="text-[10px] text-blue-700">📌 Mantenha esta aba aberta para receber os alertas</p>
                </div>
              )}
            </div>
          </div>

          {/* Nota informativa */}
          <div className="mt-4 bg-gray-50 border border-gray-200 rounded-xl p-3 flex items-start gap-2">
            <Info size={13} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-[11px] text-gray-500 leading-relaxed">
              <strong>Dica:</strong> use o e-mail para envios formais ao contador ou sócio, o WhatsApp para alertas rápidos do dia a dia, e as notificações do navegador para avisos instantâneos enquanto trabalha no sistema.
              O envio de e-mail utiliza o EmailJS diretamente do navegador — sem necessidade de servidor.
            </p>
          </div>
        </Card>

      </div>
    </ControleLayout>
  )
}
