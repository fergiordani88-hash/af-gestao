import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Sprout, TrendingUp, TrendingDown,
  CreditCard, FileText, Building2, X, ChevronRight, Settings, Bell, UserCog,
  DollarSign, Calendar, BarChart2, ArrowLeft, Activity, Shield, Layers
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import type { AppModule } from '../../store/useStore'
import type { UserRole } from '../../types'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  roles: UserRole[]
  end?: boolean
  header?: string
}

// ── Navegação por módulo ──────────────────────────────────────
const MODULE_NAV: Record<AppModule, NavItem[]> = {
  agro: [
    { label: 'Dashboard',            icon: LayoutDashboard, path: '/',               roles: ['admin','consultor','cliente_rural'], end: true },
    { label: 'Diagnóstico Agro',     icon: ClipboardList,   path: '/diagnostico-agro',roles: ['admin','consultor'] },
    { label: 'Agro Completo',        icon: Sprout,          path: '/agro-completo',   roles: ['admin','consultor'] },
    { label: 'Planejamento Financeiro',icon: TrendingUp,    path: '/financeiro',      roles: ['admin','consultor','cliente_rural'] },
    { label: 'Crédito Rural',        icon: CreditCard,      path: '/credito-agro',    roles: ['admin','consultor'] },
    { label: 'Documentos',           icon: FileText,        path: '/documentos',      roles: ['admin','consultor','cliente_rural'] },
    { label: 'Área do Cliente',      icon: Building2,       path: '/area-cliente',    roles: ['admin','consultor','cliente_rural'] },
  ],
  empresarial: [
    { label: 'Dashboard',               icon: LayoutDashboard, path: '/',                    roles: ['admin','consultor','cliente_empresa'], end: true },
    { label: 'Diagnóstico Empresarial', icon: ClipboardList,   path: '/diagnostico-pj',      roles: ['admin','consultor'] },
    { label: 'Empresarial Completo',    icon: Building2,       path: '/pj-completo',          roles: ['admin','consultor'] },
    { label: 'Visão Financeira',        icon: TrendingUp,      path: '/financeiro',           roles: ['admin','consultor','cliente_empresa'], header: 'Gestão Financeira' },
    { label: 'Lançamentos',             icon: Activity,        path: '/pay/lancamentos',      roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Contratos',               icon: FileText,        path: '/pay/contratos',        roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Despesas',                icon: TrendingDown,    path: '/pay/despesas',         roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Receitas',                icon: DollarSign,      path: '/pay/receitas',         roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Fluxo Diário',            icon: Calendar,        path: '/pay/diario',           roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Fluxo Mensal',            icon: BarChart2,       path: '/pay/mensal',           roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Fluxo Anual',             icon: Layers,          path: '/pay/anual',            roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Crédito Empresarial',     icon: CreditCard,      path: '/credito-empresarial',  roles: ['admin','consultor'], header: 'Outros' },
    { label: 'Documentos',              icon: FileText,        path: '/documentos',           roles: ['admin','consultor','cliente_empresa'] },
    { label: 'Área do Cliente',         icon: Building2,       path: '/area-cliente',         roles: ['admin','consultor','cliente_empresa'] },
  ],
  pay: [
    { label: 'Dashboard',            icon: LayoutDashboard, path: '/pay',            roles: ['admin','consultor','cliente_empresa','cliente_rural'], end: true },
    { label: 'Minha Empresa',        icon: Building2,       path: '/pay/empresa',    roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Contas a Pagar/Receber',icon: Activity,       path: '/pay/lancamentos',roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Contratos',            icon: CreditCard,      path: '/pay/contratos',  roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Despesas',             icon: TrendingDown,    path: '/pay/despesas',   roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Receitas',             icon: TrendingUp,      path: '/pay/receitas',   roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Fluxo Diário',         icon: Calendar,        path: '/pay/diario',     roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Fluxo Mensal',         icon: BarChart2,       path: '/pay/mensal',     roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
    { label: 'Fluxo Anual',          icon: Shield,          path: '/pay/anual',      roles: ['admin','consultor','cliente_empresa','cliente_rural'] },
  ],
  consultoria: [
    { label: 'Dashboard',            icon: LayoutDashboard, path: '/',               roles: ['admin','consultor'], end: true },
    { label: 'CRM Clientes',         icon: Users,           path: '/crm',            roles: ['admin','consultor'] },
    { label: 'Usuários',             icon: UserCog,         path: '/usuarios',       roles: ['admin'] },
    { label: 'Diagnóstico Empresarial',icon: ClipboardList, path: '/diagnostico-pj', roles: ['admin','consultor'] },
    { label: 'Diagnóstico Agro',     icon: Sprout,          path: '/diagnostico-agro',roles: ['admin','consultor'] },
    { label: 'Empresarial Completo', icon: Building2,       path: '/pj-completo',    roles: ['admin','consultor'] },
    { label: 'Agro Completo',        icon: Sprout,          path: '/agro-completo',  roles: ['admin','consultor'] },
    { label: 'Planejamento Financeiro',icon: TrendingUp,    path: '/financeiro',     roles: ['admin','consultor'] },
    { label: 'Documentos',           icon: FileText,        path: '/documentos',     roles: ['admin','consultor'] },
  ],
}

const MODULE_LABELS: Record<AppModule, { label: string; color: string }> = {
  agro:        { label: 'Módulo Agro',        color: 'text-emerald-400' },
  empresarial: { label: 'Módulo Empresarial', color: 'text-blue-400' },
  pay:         { label: 'Módulo Pay',         color: 'text-amber-400' },
  consultoria: { label: 'Módulo Consultoria', color: 'text-purple-400' },
}

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen, currentModule, setCurrentModule } = useStore()
  const { user } = useAuthStore()
  const navigate = useNavigate()

  const navItems = currentModule ? MODULE_NAV[currentModule] : []
  const visibleItems = navItems.filter(item => user && item.roles.includes(user.role))
  const modInfo = currentModule ? MODULE_LABELS[currentModule] : null

  const handleBackToModules = () => {
    setCurrentModule(null)
    navigate('/modules')
    if (window.innerWidth < 1024) setSidebarOpen(false)
  }

  return (
    <>
      {/* Overlay móvel */}
      {sidebarOpen && (
        <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      <aside className={clsx(
        'flex flex-col bg-af-dark text-white transition-all duration-300 shrink-0 z-30',
        'fixed inset-y-0 left-0 lg:static lg:inset-auto',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-4 py-4 border-b border-white/10 shrink-0">
          <div className="flex items-center gap-2.5">
            <img src="/logo.png" alt="AF" className="w-9 h-9 rounded-xl shrink-0" />
            <div>
              <p className="font-bold text-sm leading-tight whitespace-nowrap">AF Gestão</p>
              <p className="text-xs text-white/40 leading-tight whitespace-nowrap">& Consultoria</p>
            </div>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="lg:hidden p-1 rounded-lg hover:bg-white/10 shrink-0">
            <X size={16} />
          </button>
        </div>

        {/* Módulo atual + botão voltar */}
        {modInfo && (
          <div className="px-3 pt-3 pb-1 border-b border-white/8 shrink-0">
            <button
              onClick={handleBackToModules}
              className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs mb-2 transition-colors"
            >
              <ArrowLeft size={13} /> Trocar módulo
            </button>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded-lg bg-white/5">
              <Layers size={13} className={modInfo.color} />
              <span className={`text-xs font-semibold ${modInfo.color}`}>{modInfo.label}</span>
            </div>
          </div>
        )}

        {/* Perfil do usuário */}
        {user && (
          <div className="px-4 py-3 border-b border-white/10 shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-af-green-light flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {user.name.split(' ').map(n => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/40 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Navegação */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {/* Sem módulo selecionado */}
          {!currentModule && (
            <button
              onClick={() => navigate('/modules')}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
            >
              <Layers size={17} className="text-white/50" />
              <span>Selecionar Módulo</span>
            </button>
          )}

          {visibleItems.map(item => (
            <div key={item.path + item.label}>
              {item.header && (
                <p className="text-[9px] font-bold text-white/25 uppercase tracking-widest px-3 pt-3 pb-1.5">
                  {item.header}
                </p>
              )}
              <NavLink
                to={item.path}
                end={item.end}
                onClick={() => { if (window.innerWidth < 1024) setSidebarOpen(false) }}
                className={({ isActive }) => clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group whitespace-nowrap',
                  isActive
                    ? 'bg-af-green text-white'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                )}
              >
                {({ isActive }) => (
                  <>
                    <item.icon size={17} className={isActive ? 'text-white shrink-0' : 'text-white/50 group-hover:text-white/80 shrink-0'} />
                    <span className="flex-1 truncate">{item.label}</span>
                    {isActive && <ChevronRight size={14} className="shrink-0 opacity-60" />}
                  </>
                )}
              </NavLink>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-white/10 pt-3 shrink-0">
          <NavLink to="/configuracoes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap">
            <Settings size={17} className="shrink-0" /> Configurações
          </NavLink>
          <NavLink to="/notificacoes" className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors whitespace-nowrap">
            <Bell size={17} className="shrink-0" /> Notificações
          </NavLink>
        </div>
      </aside>
    </>
  )
}
