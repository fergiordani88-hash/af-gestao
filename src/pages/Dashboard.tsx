import { useState } from 'react'
import {
  Users, DollarSign, TrendingUp, FileText, Target, ArrowUpRight, Activity,
  Sprout, Building2, Clock, MapPin, User as UserIcon, Check, ListTodo,
  CreditCard, ArrowRight, X, CalendarClock,
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { useDashboard } from '../hooks/useDashboard'
import { remindersApi, eventsApi } from '../services/api'
import { NewEventModal, NewReminderModal } from './Agenda'

const revenueData = [
  { month: 'Jan', receita: 48500, meta: 50000 },
  { month: 'Fev', receita: 52300, meta: 50000 },
  { month: 'Mar', receita: 49800, meta: 55000 },
  { month: 'Abr', receita: 61200, meta: 55000 },
  { month: 'Mai', receita: 58700, meta: 60000 },
  { month: 'Jun', receita: 67400, meta: 60000 },
]

const segmentData = [
  { name: 'Agro', value: 45, color: '#1B5E20' },
  { name: 'Comércio', value: 25, color: '#F9A825' },
  { name: 'Serviços', value: 20, color: '#1565C0' },
  { name: 'Indústria', value: 10, color: '#6A1B9A' },
]

const ACTIVITY_ICON: Record<string, React.ElementType> = { attendance: Activity, document: FileText, contract: CreditCard }
const ACTIVITY_COLOR: Record<string, string> = {
  attendance: 'bg-blue-50 border-blue-200 text-blue-800',
  document:   'bg-purple-50 border-purple-200 text-purple-800',
  contract:   'bg-emerald-50 border-emerald-200 text-emerald-800',
}
const STATUS_LABEL: Record<string, string> = { lead: 'Lead', proposta: 'Proposta', negociacao: 'Negociação', ativo: 'Ativo', inativo: 'Inativo' }

export function Dashboard() {
  const { clients, contracts, updateClient } = useStore()
  const { user } = useAuthStore()
  const { data: dashData, refetch } = useDashboard()
  const navigate = useNavigate()

  const [ignoredSuggestions, setIgnoredSuggestions] = useState<Set<string>>(new Set())
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [showNewReminder, setShowNewReminder] = useState(false)

  const activeClients  = dashData?.kpis.activeClients  ?? clients.filter(c => c.status === 'ativo').length
  const monthlyRevenue = dashData?.kpis.monthlyRevenue ?? contracts.filter(c => c.status === 'ativo').reduce((s, c) => s + c.monthlyValue, 0)
  const leads          = dashData?.kpis.leadsCount     ?? clients.filter(c => c.status === 'lead').length
  const proposals       = dashData?.kpis.negotiatingCount ?? clients.filter(c => c.status === 'proposta' || c.status === 'negociacao').length
  const conversionRate = dashData?.kpis.conversionRate ?? 68

  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })
  const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
  const fmtRelative = (iso: string) => {
    const diffMs = Date.now() - new Date(iso).getTime()
    const h = Math.floor(diffMs / 3_600_000)
    if (h < 1) return 'Agora'
    if (h < 24) return `${h}h`
    return `${Math.floor(h / 24)}d`
  }

  const pipelineData = [
    { stage: 'Lead',        count: dashData?.byStatus.lead ?? leads },
    { stage: 'Proposta',    count: dashData?.byStatus.proposta ?? 0 },
    { stage: 'Negociação',  count: dashData?.byStatus.negociacao ?? 0 },
    { stage: 'Ativo',       count: dashData?.byStatus.ativo ?? activeClients },
  ]

  const todayEvents    = dashData?.today.events ?? []
  const todayReminders = dashData?.today.reminders ?? []
  const suggestions    = (dashData?.statusSuggestions ?? []).filter(s => !ignoredSuggestions.has(s.clientId))
  const recentActivity = dashData?.recentActivity ?? []

  const completeReminder = async (id: string) => { await remindersApi.complete(id); refetch() }
  const completeEvent    = async (id: string) => { await eventsApi.setStatus(id, 'CONCLUIDO'); refetch() }
  const acceptSuggestion = async (clientId: string, suggestedStatus?: string) => {
    if (!suggestedStatus) { setIgnoredSuggestions(s => new Set(s).add(clientId)); return }
    await updateClient(clientId, { status: suggestedStatus as any })
    refetch()
  }
  const ignoreSuggestion = (clientId: string) => setIgnoredSuggestions(s => new Set(s).add(clientId))

  return (
    <AppLayout title="Dashboard Executivo" subtitle="Visão geral da consultoria">
      {/* Greeting */}
      <div className="mb-6 flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Bom dia, {user?.name.split(' ')[0]} 👋</h2>
          <p className="text-gray-500 text-sm mt-0.5">Aqui está o resumo de hoje — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNewReminder(true)} className="flex items-center gap-1.5 text-xs font-medium bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-3 py-2">
            <ListTodo size={14} /> Lembrete
          </button>
          <button onClick={() => setShowNewEvent(true)} className="flex items-center gap-1.5 text-xs font-medium bg-af-green text-white hover:bg-af-green-light rounded-xl px-3 py-2">
            <CalendarClock size={14} /> Evento
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Clientes Ativos" value={String(activeClients)} sub="contratos vigentes" icon={<Users size={18} />} color="green" />
        <StatCard label="Receita Mensal" value={fmtBRL(monthlyRevenue)} sub="contratos de consultoria" icon={<DollarSign size={18} />} color="gold" />
        <StatCard label="Em Negociação" value={String(proposals)} sub="propostas abertas" icon={<Target size={18} />} color="blue" />
        <StatCard label="Taxa de Conversão" value={`${conversionRate}%`} sub="leads → clientes" icon={<TrendingUp size={18} />} color="purple" />
      </div>

      {/* Sugestões de status */}
      {suggestions.length > 0 && (
        <Card className="p-5 mb-6 border-af-gold/40">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <TrendingUp size={15} className="text-af-gold" /> Sugestões de status
          </h3>
          <div className="space-y-2">
            {suggestions.map(s => (
              <div key={s.clientId} className="flex items-center justify-between gap-3 p-3 rounded-xl bg-af-gold-pale/40 border border-af-gold/20 text-xs flex-wrap">
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900">{s.clientName}</p>
                  <p className="text-gray-500 mt-0.5 flex items-center gap-1.5 flex-wrap">
                    {s.suggestedStatus ? (
                      <>
                        <span>{STATUS_LABEL[s.currentStatus]}</span>
                        <ArrowRight size={11} />
                        <span className="font-medium text-af-green">{STATUS_LABEL[s.suggestedStatus]}</span>
                      </>
                    ) : null}
                    <span className="text-gray-400">— {s.reason}</span>
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {s.suggestedStatus && (
                    <button onClick={() => acceptSuggestion(s.clientId, s.suggestedStatus)} className="px-2.5 py-1 rounded-lg bg-af-green text-white font-medium hover:bg-af-green-light">Aceitar</button>
                  )}
                  <button onClick={() => ignoreSuggestion(s.clientId)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400"><X size={13} /></button>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Agenda de hoje + Lembretes */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><CalendarClock size={15} className="text-af-green" /> Agenda de hoje</h3>
            <button onClick={() => navigate('/agenda')} className="text-xs text-af-green font-medium hover:underline flex items-center gap-1">Ver agenda <ArrowUpRight size={12} /></button>
          </div>
          {todayEvents.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Nenhum evento agendado para hoje.</p>
          ) : (
            <div className="space-y-2">
              {todayEvents.map(ev => (
                <div key={ev.id} className={`p-2.5 rounded-xl border text-xs flex items-start justify-between gap-2 ${ev.status === 'concluido' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100'}`}>
                  <div className="min-w-0">
                    <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                    <div className="flex flex-wrap items-center gap-2 mt-1 text-gray-500">
                      {!ev.allDay && <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(ev.startAt)}</span>}
                      {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
                      {ev.assignedTo && <span className="flex items-center gap-1"><UserIcon size={11} />{ev.assignedTo.name.split(' ')[0]}</span>}
                    </div>
                    {ev.client && <p className="text-af-green mt-0.5 font-medium">{ev.client.name}</p>}
                  </div>
                  {ev.status !== 'concluido' && (
                    <button onClick={() => completeEvent(ev.id)} className="p-1.5 rounded-lg hover:bg-af-green-pale text-af-green shrink-0" title="Concluir"><Check size={14} /></button>
                  )}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card className="p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2"><ListTodo size={15} className="text-af-gold" /> Lembretes</h3>
            <button onClick={() => navigate('/agenda')} className="text-xs text-af-green font-medium hover:underline flex items-center gap-1">Ver todos <ArrowUpRight size={12} /></button>
          </div>
          {todayReminders.length === 0 ? (
            <p className="text-xs text-gray-400 py-4 text-center">Nenhum lembrete pendente ou atrasado.</p>
          ) : (
            <div className="space-y-1.5">
              {todayReminders.map(r => {
                const overdue = new Date(r.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                return (
                  <div key={r.id} className="flex items-start gap-2 p-2 rounded-xl hover:bg-gray-50 text-xs">
                    <button onClick={() => completeReminder(r.id)} className="mt-0.5 w-4 h-4 rounded border border-gray-300 hover:border-af-green hover:bg-af-green-pale shrink-0" title="Concluir" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-gray-900 truncate">{r.title}</p>
                      <div className="flex flex-wrap items-center gap-2 mt-0.5 text-gray-500">
                        <span className={overdue ? 'text-red-600 font-medium' : ''}>{new Date(r.dueDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}</span>
                        {r.client && <span className="text-af-green">{r.client.name}</span>}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-6">
        {/* Revenue chart */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="font-semibold text-gray-900">Receita Mensal</h3>
              <p className="text-xs text-gray-500">Realizado vs. Meta 2024</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={revenueData}>
              <defs>
                <linearGradient id="recv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1B5E20" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="#1B5E20" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => `R$${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Area type="monotone" dataKey="receita" stroke="#1B5E20" strokeWidth={2} fill="url(#recv)" name="Receita" />
              <Area type="monotone" dataKey="meta" stroke="#F9A825" strokeWidth={1.5} strokeDasharray="4 4" fill="none" name="Meta" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        {/* Segment pie */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Carteira por Segmento</h3>
          <p className="text-xs text-gray-500 mb-4">Distribuição de clientes ativos</p>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={segmentData} cx="50%" cy="50%" innerRadius={45} outerRadius={70} dataKey="value" paddingAngle={3}>
                {segmentData.map((entry) => <Cell key={entry.name} fill={entry.color} />)}
              </Pie>
              <Tooltip formatter={(v: number) => `${v}%`} />
            </PieChart>
          </ResponsiveContainer>
          <div className="grid grid-cols-2 gap-1.5 mt-2">
            {segmentData.map(s => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: s.color }} />
                <span className="text-gray-600">{s.name} <span className="font-semibold">{s.value}%</span></span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Bottom row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Pipeline */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-1">Pipeline Comercial</h3>
          <p className="text-xs text-gray-500 mb-4">Distribuição por estágio</p>
          <ResponsiveContainer width="100%" height={160}>
            <BarChart data={pipelineData} layout="vertical">
              <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" fill="#1B5E20" radius={[0, 4, 4, 0]} name="Clientes" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Recent activity */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Atividade recente</h3>
            <button onClick={() => navigate('/crm')} className="text-xs text-af-green font-medium hover:underline flex items-center gap-1">
              Ver CRM <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {recentActivity.length === 0 && <p className="text-xs text-gray-400 py-4 text-center">Nenhuma atividade recente.</p>}
            {recentActivity.map((a, i) => {
              const Icon = ACTIVITY_ICON[a.type] ?? Activity
              return (
                <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${ACTIVITY_COLOR[a.type] ?? 'bg-gray-50 border-gray-200 text-gray-700'}`}>
                  <Icon size={14} className="mt-0.5 shrink-0" />
                  <span className="flex-1">
                    {a.label}
                    {a.detail && <span className="opacity-70"> · {a.detail}</span>}
                  </span>
                  <span className="opacity-60 shrink-0">{fmtRelative(a.date)}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      {/* Quick access */}
      <div className="mt-6 grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Novo Cliente', icon: Users, color: 'bg-af-green-pale text-af-green', path: '/crm' },
          { label: 'Diagnóstico PJ', icon: Building2, color: 'bg-blue-50 text-blue-600', path: '/pj-completo' },
          { label: 'Diagnóstico Agro', icon: Sprout, color: 'bg-emerald-50 text-emerald-600', path: '/agro-completo' },
          { label: 'Relatório', icon: FileText, color: 'bg-purple-50 text-purple-600', path: '/documentos' },
        ].map((item) => (
          <Card key={item.label} onClick={() => navigate(item.path)} className={`p-4 flex items-center gap-3 cursor-pointer hover:shadow-md transition-shadow`}>
            <span className={`p-2 rounded-xl ${item.color}`}>
              <item.icon size={18} />
            </span>
            <span className="text-sm font-medium text-gray-700">{item.label}</span>
            <Activity size={14} className="ml-auto text-gray-300" />
          </Card>
        ))}
      </div>

      {showNewEvent && <NewEventModal onClose={() => setShowNewEvent(false)} onSaved={refetch} />}
      {showNewReminder && <NewReminderModal onClose={() => setShowNewReminder(false)} onSaved={refetch} />}
    </AppLayout>
  )
}
