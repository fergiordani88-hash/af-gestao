import { useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, FileText, CreditCard, TrendingDown, TrendingUp, DollarSign, BarChart2, Calendar, Activity, Zap, ChevronDown, ChevronUp } from 'lucide-react'
import { AppLayout } from '../../components/Layout/AppLayout'
import { useStore } from '../../store/useStore'
import { TabDRE } from './TabDRE'
import { TabRecebPag } from './TabRecebPag'
import { TabContratos } from './TabContratos'
import { TabDespesas } from './TabDespesas'
import { TabReceitas } from './TabReceitas'
import { TabCustosFixos } from './TabCustosFixos'
import { TabFluxoDiario } from './TabFluxoDiario'
import { TabFluxoMensal } from './TabFluxoMensal'
import { TabStressTest } from './TabStressTest'
import { TabHistorico } from './TabHistorico'
import { TabCicloInadimplencia } from './TabCicloInadimplencia'
import { TabQuestionario } from './TabQuestionario'
import { TabMetas } from './TabMetas'
import { TabDREProjetado } from './TabDREProjetado'
import { clsx } from 'clsx'

type TabId = 'dre' | 'receb-pag' | 'contratos' | 'despesas' | 'receitas' | 'custos' | 'fluxo-diario' | 'fluxo-mensal' | 'stress' | 'historico' | 'ciclo' | 'questionario' | 'metas' | 'projetado'

const TABS = [
  { id: 'dre'         as TabId, label: 'DRE & Indicadores',      icon: FileText,     color: 'text-blue-600' },
  { id: 'receb-pag'   as TabId, label: 'Recebimentos & Pagamentos', icon: Activity,   color: 'text-teal-600' },
  { id: 'contratos'   as TabId, label: 'Contratos & Cronograma', icon: CreditCard,    color: 'text-indigo-600' },
  { id: 'despesas'    as TabId, label: 'Despesas',                icon: TrendingDown, color: 'text-red-600' },
  { id: 'receitas'    as TabId, label: 'Receitas',                icon: TrendingUp,   color: 'text-emerald-600' },
  { id: 'custos'      as TabId, label: 'Custos Fixos',            icon: DollarSign,   color: 'text-amber-600' },
  { id: 'fluxo-diario'as TabId, label: 'Fluxo Diário',           icon: Calendar,     color: 'text-purple-600' },
  { id: 'fluxo-mensal'as TabId, label: 'Fluxo Mensal',           icon: BarChart2,    color: 'text-violet-600' },
  { id: 'stress'      as TabId, label: 'Stress Test',             icon: Zap,          color: 'text-orange-600' },
  { id: 'historico'   as TabId, label: 'Histórico',               icon: BarChart2,    color: 'text-gray-600' },
  { id: 'ciclo'       as TabId, label: 'Ciclo & Inadimplência',   icon: Activity,     color: 'text-red-600' },
  { id: 'questionario'as TabId, label: 'Questionário',            icon: FileText,     color: 'text-gray-600' },
  { id: 'metas'       as TabId, label: 'Metas',                   icon: Zap,          color: 'text-emerald-600' },
  { id: 'projetado'   as TabId, label: 'Projetado vs. Real',      icon: BarChart2,    color: 'text-cyan-600' },
]

export function PJCompleto() {
  const { clients } = useStore()
  const [searchParams] = useSearchParams()
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '')
  const [activeTab, setActiveTab] = useState<TabId>('dre')
  const [menuOpen, setMenuOpen] = useState(false)

  const client = clients.find(c => c.id === clientId)
  const activeInfo = TABS.find(t => t.id === activeTab)!

  const renderTab = () => {
    if (!clientId) return null
    switch (activeTab) {
      case 'dre':          return <TabDRE clientId={clientId} />
      case 'receb-pag':    return <TabRecebPag clientId={clientId} />
      case 'contratos':    return <TabContratos clientId={clientId} />
      case 'despesas':     return <TabDespesas clientId={clientId} />
      case 'receitas':     return <TabReceitas clientId={clientId} />
      case 'custos':       return <TabCustosFixos clientId={clientId} />
      case 'fluxo-diario': return <TabFluxoDiario clientId={clientId} />
      case 'fluxo-mensal': return <TabFluxoMensal clientId={clientId} />
      case 'stress':       return <TabStressTest clientId={clientId} />
      case 'historico':    return <TabHistorico clientId={clientId} />
      case 'ciclo':        return <TabCicloInadimplencia clientId={clientId} />
      case 'questionario': return <TabQuestionario clientId={clientId} />
      case 'metas':        return <TabMetas clientId={clientId} />
      case 'projetado':    return <TabDREProjetado clientId={clientId} />
    }
  }

  return (
    <AppLayout title="Diagnóstico Empresarial Completo" subtitle="DRE · Indicadores · Contratos · Fluxo · Stress Test">
      {/* Seleção de cliente */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Empresa</label>
          <select value={clientId} onChange={e => setClientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-300">
            <option value="">Selecione a empresa...</option>
            {clients.filter(c => c.segment !== 'agro').map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.city}/{c.state}</option>
            ))}
          </select>
        </div>
        {client && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-2">
            <p className="text-xs text-blue-500">Empresa selecionada</p>
            <p className="text-sm font-bold text-blue-800">{client.name}</p>
          </div>
        )}
      </div>

      {!clientId ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Building2 size={48} className="mb-4 opacity-30" />
          <p className="text-base font-medium">Selecione uma empresa para começar</p>
          <p className="text-sm mt-1">O módulo completo aparecerá após a seleção</p>
        </div>
      ) : (
        <>
          {/* Tabs desktop */}
          <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto mb-5">
            {TABS.map(tab => (
              <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                className={clsx('flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                  activeTab === tab.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'
                )}>
                <tab.icon size={13} className={activeTab === tab.id ? tab.color : ''} />
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tabs mobile */}
          <div className="md:hidden mb-5">
            <button onClick={() => setMenuOpen(!menuOpen)}
              className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3">
              <div className="flex items-center gap-2">
                <activeInfo.icon size={16} className={activeInfo.color} />
                <span className="text-sm font-semibold">{activeInfo.label}</span>
              </div>
              {menuOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
            </button>
            {menuOpen && (
              <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                {TABS.map(tab => (
                  <button key={tab.id} onClick={() => { setActiveTab(tab.id); setMenuOpen(false) }}
                    className={clsx('w-full flex items-center gap-2 px-4 py-3 text-sm text-left border-b border-gray-50 last:border-0',
                      activeTab === tab.id ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-gray-700 hover:bg-gray-50'
                    )}>
                    <tab.icon size={15} className={activeTab === tab.id ? 'text-blue-600' : tab.color} />
                    {tab.label}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>{renderTab()}</div>
        </>
      )}
    </AppLayout>
  )
}
