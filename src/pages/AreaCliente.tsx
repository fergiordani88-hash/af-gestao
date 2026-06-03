import { FileText, TrendingUp, DollarSign, CheckCircle, Lock } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'

const clientData = {
  name: 'Fazenda São Pedro',
  consultant: 'Ana Paula',
  plan: 'Consultoria Agro 360°',
  since: 'Janeiro 2024',
}

const indicators = [
  { month: 'Mar', resultado: 380000 },
  { month: 'Abr', resultado: 420000 },
  { month: 'Mai', resultado: 395000 },
  { month: 'Jun', resultado: 465000 },
]

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const recentDocs = [
  { name: 'Diagnóstico Agro 360° — Safra 2024', date: '01/06/2024', type: 'PDF' },
  { name: 'Plano de Ação — Junho 2024', date: '28/05/2024', type: 'PDF' },
  { name: 'Relatório Mensal — Maio 2024', date: '31/05/2024', type: 'PDF' },
]

const actionPlan = [
  { action: 'Renegociar custeio no Sicoob', priority: 'imediata', status: 'em_andamento', deadline: '15/06' },
  { action: 'Implantar controle de fluxo de caixa semanal', priority: 'alta', status: 'nao_iniciado', deadline: '30/06' },
  { action: 'Contratar seguro agrícola soja 24/25', priority: 'alta', status: 'concluido', deadline: '01/06' },
  { action: 'Revisar precificação de CPR para milho', priority: 'media', status: 'pendente', deadline: '15/07' },
]

export function AreaCliente() {
  return (
    <AppLayout title="Área do Cliente" subtitle="Portal exclusivo — acesso individualizado">
      {/* Client header */}
      <Card className="p-5 mb-6 bg-gradient-to-r from-af-green to-af-green-light text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-white/20 flex items-center justify-center">
              <span className="text-white font-black text-xl">FS</span>
            </div>
            <div>
              <h2 className="text-xl font-bold">{clientData.name}</h2>
              <p className="text-white/70 text-sm">{clientData.plan} · desde {clientData.since}</p>
              <p className="text-white/70 text-sm">Consultor: {clientData.consultant}</p>
            </div>
          </div>
          <div className="text-right">
            <span className="px-3 py-1 bg-white/20 rounded-full text-sm font-medium">Cliente Ativo</span>
            <p className="text-white/60 text-xs mt-1 flex items-center justify-end gap-1"><Lock size={10} /> Acesso seguro</p>
          </div>
        </div>
      </Card>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Resultado Safra" value="R$ 1,66M" sub="projeção 2024" icon={<TrendingUp size={18} />} color="green" trend={{ value: '+8% vs meta', up: true }} />
        <StatCard label="Margem da Lavoura" value="18,4%" icon={<TrendingUp size={18} />} color="gold" />
        <StatCard label="Dívida Total" value="R$ 2,1M" sub="cobertura 47%" icon={<DollarSign size={18} />} color="blue" />
        <StatCard label="Ações Concluídas" value="3 / 8" sub="plano de ação" icon={<CheckCircle size={18} />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Resultado chart */}
        <Card className="lg:col-span-2 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Evolução do Resultado Operacional</h3>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={indicators}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => fmtBRL(v)} />
              <Bar dataKey="resultado" fill="#1B5E20" radius={[4, 4, 0, 0]} name="Resultado" />
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* Documents */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Meus Documentos</h3>
          <div className="space-y-2">
            {recentDocs.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 hover:bg-gray-50 rounded-xl cursor-pointer transition-colors">
                <span className="p-1.5 bg-gray-100 rounded-lg text-gray-500"><FileText size={14} /></span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-800 truncate">{d.name}</p>
                  <p className="text-xs text-gray-400">{d.date}</p>
                </div>
                <span className="text-xs font-medium text-red-600 bg-red-50 px-1.5 py-0.5 rounded">{d.type}</span>
              </div>
            ))}
          </div>
          <button className="w-full mt-3 py-2 text-xs text-af-green font-medium hover:bg-af-green-pale rounded-lg transition-colors">Ver todos</button>
        </Card>

        {/* Action plan */}
        <Card className="lg:col-span-3 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Meu Plano de Ação</h3>
          <div className="space-y-2">
            {actionPlan.map((item, i) => (
              <div key={i} className="flex items-center gap-4 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors">
                <Badge variant={item.status as any} />
                <p className="text-sm text-gray-700 flex-1">{item.action}</p>
                <Badge variant={item.priority as any} />
                <span className="text-xs text-gray-400 shrink-0">Prazo: {item.deadline}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
