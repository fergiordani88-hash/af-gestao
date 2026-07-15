import {
  Users, DollarSign, TrendingUp, FileText, AlertTriangle,
  Target, ArrowUpRight, Activity, Sprout, Building2
} from 'lucide-react'
import {
  AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { useNavigate } from 'react-router-dom'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { useDashboard } from '../hooks/useDashboard'

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

const pipelineData = [
  { stage: 'Lead', count: 12 },
  { stage: 'Proposta', count: 7 },
  { stage: 'Negociação', count: 4 },
  { stage: 'Ativo', count: 23 },
]

const alerts = [
  { type: 'warning', msg: 'Contrato de Transportes Ágil vence em 15 dias', time: 'Agora' },
  { type: 'alert', msg: 'Fluxo de caixa negativo: Comércio Expresso – Agosto', time: '2h' },
  { type: 'info', msg: 'Nova proposta enviada para Ind. Metálica Norte', time: '4h' },
  { type: 'success', msg: 'Diagnóstico Agro concluído: Fazenda São Pedro', time: '1d' },
]

const alertColors = { warning: 'bg-amber-50 border-amber-200 text-amber-800', alert: 'bg-red-50 border-red-200 text-red-800', info: 'bg-blue-50 border-blue-200 text-blue-800', success: 'bg-emerald-50 border-emerald-200 text-emerald-800' }

export function Dashboard() {
  const { clients, contracts } = useStore()
  const { user } = useAuthStore()
  const { data: dashData } = useDashboard()

  const activeClients  = dashData?.kpis.activeClients  ?? clients.filter(c => c.status === 'ativo').length
  const monthlyRevenue = dashData?.kpis.monthlyRevenue ?? contracts.filter(c => c.status === 'ativo').reduce((s, c) => s + c.monthlyValue, 0)
  const leads          = dashData?.kpis.leadsCount     ?? clients.filter(c => c.status === 'lead').length
  const proposals      = dashData?.kpis.negotiatingCount ?? clients.filter(c => c.status === 'proposta' || c.status === 'negociacao').length
  const conversionRate = dashData?.kpis.conversionRate ?? 68

  const navigate = useNavigate()
  const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0 })

  return (
    <AppLayout title="Dashboard Executivo" subtitle="Visão geral da consultoria">
      {/* Greeting */}
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Bom dia, {user?.name.split(' ')[0]} 👋</h2>
        <p className="text-gray-500 text-sm mt-0.5">Aqui está o resumo de hoje — {new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard label="Clientes Ativos" value={String(activeClients)} sub="contratos vigentes" icon={<Users size={18} />} color="green" trend={{ value: '+2 este mês', up: true }} />
        <StatCard label="Receita Mensal" value={fmtBRL(monthlyRevenue)} sub="contratos de consultoria" icon={<DollarSign size={18} />} color="gold" trend={{ value: '+12% vs. mês anterior', up: true }} />
        <StatCard label="Em Negociação" value={String(proposals)} sub="propostas abertas" icon={<Target size={18} />} color="blue" />
        <StatCard label="Taxa de Conversão" value={`${conversionRate}%`} sub="leads → clientes" icon={<TrendingUp size={18} />} color="purple" trend={{ value: '+5pp este trimestre', up: true }} />
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
            <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full">▲ 12% vs meta</span>
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
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="stage" tick={{ fontSize: 11 }} width={70} />
              <Tooltip />
              <Bar dataKey="count" fill="#1B5E20" radius={[0, 4, 4, 0]} name="Clientes" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Alerts */}
        <Card className="p-5 lg:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900">Alertas & Atividades</h3>
            <button className="text-xs text-af-green font-medium hover:underline flex items-center gap-1">
              Ver todos <ArrowUpRight size={12} />
            </button>
          </div>
          <div className="space-y-2">
            {alerts.map((a, i) => (
              <div key={i} className={`flex items-start gap-3 p-3 rounded-xl border text-xs ${alertColors[a.type as keyof typeof alertColors]}`}>
                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                <span className="flex-1">{a.msg}</span>
                <span className="opacity-60 shrink-0">{a.time}</span>
              </div>
            ))}
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
    </AppLayout>
  )
}
