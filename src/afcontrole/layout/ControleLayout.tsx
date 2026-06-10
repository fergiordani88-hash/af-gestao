import { ReactNode, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import { clsx } from 'clsx'
import {
  LayoutDashboard, Building2, Receipt, FileText, TrendingDown, TrendingUp,
  Calendar, BarChart2, Layers, LogOut, Menu, X, ChevronRight, FileBarChart2, HeartPulse
} from 'lucide-react'
import { useControleAuth } from '../auth/ControleAuth'

const NAV = [
  { label: 'Dashboard',        icon: LayoutDashboard, path: '/afcontrole' },
  { label: 'Minha Empresa',    icon: Building2,        path: '/afcontrole/empresa' },
  { label: 'Lançamentos',      icon: Receipt,          path: '/afcontrole/lancamentos' },
  { label: 'Contratos',        icon: FileText,         path: '/afcontrole/contratos' },
  { label: 'Despesas',         icon: TrendingDown,     path: '/afcontrole/despesas' },
  { label: 'Receitas',         icon: TrendingUp,       path: '/afcontrole/receitas' },
  { label: 'Fluxo Diário',     icon: Calendar,         path: '/afcontrole/diario' },
  { label: 'Fluxo Mensal',     icon: BarChart2,        path: '/afcontrole/mensal' },
  { label: 'Fluxo Anual',      icon: Layers,           path: '/afcontrole/anual' },
  { label: 'Relatórios',       icon: FileBarChart2,    path: '/afcontrole/relatorios' },
  { label: 'Saúde Financeira', icon: HeartPulse,       path: '/afcontrole/saude' },
]

export function ControleLayout({ children, title, subtitle }: { children: ReactNode; title: string; subtitle?: string }) {
  const { session, logout } = useControleAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(true)

  const handleLogout = () => { logout(); navigate('/afcontrole/login') }

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}
      <aside className={clsx(
        'flex flex-col shrink-0 z-30 transition-all duration-300',
        'fixed inset-y-0 left-0 lg:static lg:inset-auto',
        open ? 'w-60' : 'w-0 overflow-hidden lg:w-16'
      )} style={{ background: '#0A0A0A' }}>
        {/* Logo */}
        <div className="flex items-center gap-3 px-4 py-5 border-b border-white/10 shrink-0">
          <img src="/logo.png" alt="AF" className="w-8 h-8 rounded-lg shrink-0" />
          {open && (
            <div>
              <p className="text-white font-bold text-sm leading-tight">AF Controle</p>
              <p className="text-white/40 text-[10px]">Gestão de Fluxo de Caixa</p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-4 space-y-0.5 overflow-y-auto">
          {NAV.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.path === '/afcontrole'}
              onClick={() => { if (window.innerWidth < 1024) setOpen(false) }}
              className={({ isActive }) => clsx(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors group',
                isActive ? 'bg-[#C9A258] text-black' : 'text-white/60 hover:text-white hover:bg-white/8'
              )}
            >
              {({ isActive }) => (
                <>
                  <item.icon size={17} className={clsx('shrink-0', isActive ? 'text-black' : 'text-white/50 group-hover:text-white/80')} />
                  {open && <span className="flex-1 truncate">{item.label}</span>}
                  {open && isActive && <ChevronRight size={13} className="shrink-0 opacity-60" />}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* User + logout */}
        {session && (
          <div className="px-3 pb-4 border-t border-white/10 pt-3 shrink-0">
            {open && (
              <div className="px-2 py-2 mb-2">
                <p className="text-white text-xs font-medium truncate">{session.email}</p>
                <p className="text-white/40 text-[10px]">AF Controle</p>
              </div>
            )}
            <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-white/60 hover:text-white hover:bg-white/8 transition-colors">
              <LogOut size={17} className="shrink-0" />
              {open && <span>Sair</span>}
            </button>
          </div>
        )}
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-4 shrink-0">
          <button onClick={() => setOpen(!open)} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
            {open ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
            {subtitle && <p className="text-xs text-gray-500 truncate">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-gray-400 hidden sm:block">AF Controle</span>
            <div className="w-2 h-2 rounded-full bg-[#C9A258]" />
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
