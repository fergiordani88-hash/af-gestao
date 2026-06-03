import { NavLink } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Users, ClipboardList, Sprout, TrendingUp,
  CreditCard, FileText, Building2, X, ChevronRight, Settings, Bell, UserCog
} from 'lucide-react'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'
import type { UserRole } from '../../types'

interface NavItem {
  label: string
  icon: React.ElementType
  path: string
  roles: UserRole[]
}

const navItems: NavItem[] = [
  { label: 'Dashboard',              icon: LayoutDashboard, path: '/',                  roles: ['admin', 'consultor'] },
  { label: 'Usuários',               icon: UserCog,         path: '/usuarios',           roles: ['admin'] },
  { label: 'CRM Clientes',           icon: Users,           path: '/crm',               roles: ['admin', 'consultor'] },
  { label: 'Diagnóstico Empresarial',icon: ClipboardList,   path: '/diagnostico-pj',    roles: ['admin', 'consultor'] },
  { label: 'Diagnóstico Agro',       icon: Sprout,          path: '/diagnostico-agro',  roles: ['admin', 'consultor'] },
  { label: 'Planejamento Financeiro',icon: TrendingUp,       path: '/financeiro',        roles: ['admin', 'consultor', 'cliente_empresa', 'cliente_rural'] },
  { label: 'Crédito',                icon: CreditCard,      path: '/credito',           roles: ['admin', 'consultor', 'cliente_empresa', 'cliente_rural'] },
  { label: 'Documentos',             icon: FileText,        path: '/documentos',        roles: ['admin', 'consultor', 'cliente_empresa', 'cliente_rural'] },
  { label: 'Área do Cliente',        icon: Building2,       path: '/area-cliente',      roles: ['admin', 'consultor', 'cliente_empresa', 'cliente_rural'] },
]

export function Sidebar() {
  const { sidebarOpen, setSidebarOpen } = useStore()
  const { user } = useAuthStore()

  const visibleItems = navItems.filter(
    (item) => user && item.roles.includes(user.role)
  )

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/40 z-20 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside className={clsx(
        'fixed top-0 left-0 h-full z-30 flex flex-col bg-af-dark text-white transition-all duration-300 shrink-0',
        sidebarOpen ? 'w-64' : 'w-0 overflow-hidden lg:w-64'
      )}>
        {/* Logo */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-af-gold flex items-center justify-center shrink-0">
              <span className="text-af-dark font-black text-sm">AF</span>
            </div>
            <div>
              <p className="font-bold text-sm leading-tight">AF Gestão</p>
              <p className="text-xs text-white/50 leading-tight">& Consultoria</p>
            </div>
          </div>
          <button
            onClick={() => setSidebarOpen(false)}
            className="lg:hidden p-1 rounded-lg hover:bg-white/10"
            aria-label="Fechar menu"
          >
            <X size={16} />
          </button>
        </div>

        {/* Perfil rápido */}
        {user && (
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-af-green-light flex items-center justify-center shrink-0">
                <span className="text-white text-xs font-bold">
                  {user.name.split(' ').map((n) => n[0]).slice(0, 2).join('')}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-medium text-white truncate">{user.name}</p>
                <p className="text-xs text-white/40 capitalize">{user.role.replace('_', ' ')}</p>
              </div>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto scrollbar-thin">
          {visibleItems.map((item) => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/'}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
                isActive
                  ? 'bg-af-green text-white'
                  : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={isActive ? 'text-white' : 'text-white/50 group-hover:text-white/80'} />
                  <span className="flex-1 truncate">{item.label}</span>
                  {isActive && <ChevronRight size={14} className="shrink-0 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 pb-4 space-y-0.5 border-t border-white/10 pt-3">
          <NavLink
            to="/configuracoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Settings size={17} /> Configurações
          </NavLink>
          <NavLink
            to="/notificacoes"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors"
          >
            <Bell size={17} /> Notificações
          </NavLink>
        </div>
      </aside>
    </>
  )
}
