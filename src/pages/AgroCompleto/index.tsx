import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import {
  Sprout, CreditCard, TrendingDown, TrendingUp, DollarSign,
  BarChart2, Calendar, Shield, ChevronDown, ChevronUp, ClipboardList, Upload
} from 'lucide-react'
import { AppLayout } from '../../components/Layout/AppLayout'
import { useStore } from '../../store/useStore'
import { TabProducao } from './TabProducao'
import { TabContratos } from './TabContratos'
import { TabDespesas } from './TabDespesas'
import { TabReceitas } from './TabReceitas'
import { TabCustosFixos } from './TabCustosFixos'
import { TabFluxoDiario } from './TabFluxoDiario'
import { TabFluxoMensal } from './TabFluxoMensal'
import { TabPatrimonio } from './TabPatrimonio'
import { TabDRERural } from './TabDRERural'
import { TabQuestionarioAgro } from './TabQuestionarioAgro'
import { TabProjecaoAnual } from './TabProjecaoAnual'
import { TabImportacao } from './TabImportacao'
import { clsx } from 'clsx'

type TabId = 'producao' | 'dre-rural' | 'contratos' | 'despesas' | 'receitas' | 'custos' | 'fluxo-diario' | 'fluxo-mensal' | 'patrimonio' | 'questionario' | 'projecao-anual' | 'importacao'

const TABS: { id: TabId; label: string; icon: React.ElementType; color: string }[] = [
  { id: 'importacao',     label: 'Importar Cadastro',      icon: Upload,       color: 'text-af-green' },
  { id: 'producao',       label: 'Produção',               icon: Sprout,       color: 'text-green-600' },
  { id: 'dre-rural',      label: 'DRE Rural',              icon: BarChart2,    color: 'text-emerald-700' },
  { id: 'projecao-anual', label: 'Projeção 10 Anos',       icon: TrendingUp,   color: 'text-violet-600' },
  { id: 'contratos',      label: 'Contratos & Cronograma', icon: CreditCard,   color: 'text-blue-600' },
  { id: 'despesas',       label: 'Despesas',               icon: TrendingDown, color: 'text-red-600' },
  { id: 'receitas',       label: 'Receitas',               icon: TrendingUp,   color: 'text-emerald-600' },
  { id: 'custos',         label: 'Custos Fixos',           icon: DollarSign,   color: 'text-amber-600' },
  { id: 'fluxo-diario',   label: 'Fluxo Diário',           icon: Calendar,     color: 'text-purple-600' },
  { id: 'fluxo-mensal',   label: 'Fluxo Mensal',           icon: BarChart2,    color: 'text-indigo-600' },
  { id: 'patrimonio',     label: 'Patrimônio',             icon: Shield,       color: 'text-orange-600' },
  { id: 'questionario',   label: 'Questionário',           icon: ClipboardList,color: 'text-gray-600' },
]

export function AgroCompleto() {
  const { clients } = useStore()
  const [searchParams] = useSearchParams()
  const [clientId, setClientId] = useState(searchParams.get('clientId') ?? '')
  const [activeTab, setActiveTab] = useState<TabId>('producao')
  const [menuOpen, setMenuOpen] = useState(false)

  const client = clients.find(c => c.id === clientId)

  const activeTabInfo = TABS.find(t => t.id === activeTab)!

  const renderTab = () => {
    if (!clientId) return null
    switch (activeTab) {
      case 'importacao':   return <TabImportacao clientId={clientId} />
      case 'producao':     return <TabProducao clientId={clientId} />
      case 'dre-rural':    return <TabDRERural clientId={clientId} />
      case 'questionario':   return <TabQuestionarioAgro clientId={clientId} nomeCliente={client?.name} />
      case 'projecao-anual': return <TabProjecaoAnual clientId={clientId} />
      case 'contratos':    return <TabContratos clientId={clientId} />
      case 'despesas':     return <TabDespesas clientId={clientId} />
      case 'receitas':     return <TabReceitas clientId={clientId} />
      case 'custos':       return <TabCustosFixos clientId={clientId} />
      case 'fluxo-diario': return <TabFluxoDiario clientId={clientId} />
      case 'fluxo-mensal': return <TabFluxoMensal clientId={clientId} />
      case 'patrimonio':   return <TabPatrimonio clientId={clientId} clienteNome={client?.name} />
    }
  }

  return (
    <AppLayout title="Diagnóstico Agro Completo" subtitle="Produção · Contratos · Fluxo de Caixa · Patrimônio">
      {/* Seleção de cliente */}
      <div className="mb-5 flex items-center gap-3">
        <div className="flex-1 max-w-sm">
          <label className="text-xs font-semibold text-gray-600 mb-1 block">Produtor Rural</label>
          <select
            value={clientId}
            onChange={e => setClientId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-af-green/30"
          >
            <option value="">Selecione o produtor...</option>
            {clients.filter(c => c.segment === 'agro').map(c => (
              <option key={c.id} value={c.id}>{c.name} — {c.city}/{c.state}</option>
            ))}
          </select>
        </div>
        {client && (
          <div className="bg-af-green-pale border border-af-green/20 rounded-xl px-4 py-2">
            <p className="text-xs text-gray-500">Produtor selecionado</p>
            <p className="text-sm font-bold text-af-green">{client.name}</p>
          </div>
        )}
      </div>

      {!clientId ? (
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <Sprout size={48} className="mb-4 opacity-30" />
          <p className="text-base font-medium">Selecione um produtor para começar</p>
          <p className="text-sm mt-1">O módulo completo aparecerá após a seleção</p>
        </div>
      ) : (
        <>
          {/* Tabs — desktop: horizontal scroll | mobile: dropdown */}
          <div className="mb-5">
            {/* Desktop */}
            <div className="hidden md:flex gap-1 bg-gray-100 p-1 rounded-2xl overflow-x-auto">
              {TABS.map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={clsx(
                    'flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold whitespace-nowrap transition-all',
                    activeTab === tab.id
                      ? 'bg-white shadow text-gray-900'
                      : 'text-gray-500 hover:text-gray-700'
                  )}
                >
                  <tab.icon size={14} className={activeTab === tab.id ? tab.color : ''} />
                  {tab.label}
                </button>
              ))}
            </div>

            {/* Mobile dropdown */}
            <div className="md:hidden">
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="w-full flex items-center justify-between bg-white border border-gray-200 rounded-xl px-4 py-3"
              >
                <div className="flex items-center gap-2">
                  <activeTabInfo.icon size={16} className={activeTabInfo.color} />
                  <span className="text-sm font-semibold text-gray-900">{activeTabInfo.label}</span>
                </div>
                {menuOpen ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </button>
              {menuOpen && (
                <div className="mt-1 bg-white border border-gray-200 rounded-xl overflow-hidden shadow-lg">
                  {TABS.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => { setActiveTab(tab.id); setMenuOpen(false) }}
                      className={clsx(
                        'w-full flex items-center gap-2 px-4 py-3 text-sm text-left border-b border-gray-50 last:border-0',
                        activeTab === tab.id ? 'bg-af-green-pale text-af-green font-semibold' : 'text-gray-700 hover:bg-gray-50'
                      )}
                    >
                      <tab.icon size={15} className={activeTab === tab.id ? 'text-af-green' : tab.color} />
                      {tab.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Conteúdo da aba */}
          <div>{renderTab()}</div>
        </>
      )}
    </AppLayout>
  )
}
