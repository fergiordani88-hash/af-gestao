import { useNavigate } from 'react-router-dom'
import { Sprout, Building2, DollarSign, Users, ChevronRight, LogOut } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'
import { useStore } from '../store/useStore'
import type { AppModule } from '../store/useStore'

const MODULES: {
  id: AppModule
  title: string
  subtitle: string
  icon: React.ElementType
  gradient: string
  border: string
  iconBg: string
  items: string[]
  roles: string[]
}[] = [
  {
    id: 'agro',
    title: 'Agro',
    subtitle: 'Diagnóstico e gestão para produtores rurais',
    icon: Sprout,
    gradient: 'from-emerald-950 via-emerald-900 to-emerald-800',
    border: 'border-emerald-700 hover:border-emerald-400',
    iconBg: 'bg-emerald-800 text-emerald-300',
    items: ['Dashboard', 'Agro Completo', 'Planejamento Financeiro', 'Crédito Rural', 'Documentos', 'Área do Cliente'],
    roles: ['admin', 'consultor', 'cliente_rural'],
  },
  {
    id: 'empresarial',
    title: 'Empresarial',
    subtitle: 'Diagnóstico financeiro e gestão empresarial',
    icon: Building2,
    gradient: 'from-blue-950 via-blue-900 to-blue-800',
    border: 'border-blue-700 hover:border-blue-400',
    iconBg: 'bg-blue-800 text-blue-300',
    items: ['Dashboard', 'Empresarial Completo', 'Planejamento Financeiro', 'Crédito Empresarial', 'Documentos', 'Área do Cliente'],
    roles: ['admin', 'consultor', 'cliente_empresa'],
  },
  {
    id: 'pay',
    title: 'Pay',
    subtitle: 'Gestor financeiro diário — contas, fluxo e projeções',
    icon: DollarSign,
    gradient: 'from-amber-950 via-amber-900 to-amber-800',
    border: 'border-amber-700 hover:border-amber-400',
    iconBg: 'bg-amber-800 text-amber-300',
    items: ['Dashboard', 'Minha Empresa', 'Contas a Pagar/Receber', 'Contratos', 'Despesas', 'Receitas', 'Fluxo Diário/Mensal/Anual'],
    roles: ['admin', 'consultor', 'cliente_empresa', 'cliente_rural'],
  },
  {
    id: 'consultoria',
    title: 'Consultoria',
    subtitle: 'CRM, usuários e gestão da consultoria AF',
    icon: Users,
    gradient: 'from-purple-950 via-purple-900 to-purple-800',
    border: 'border-purple-700 hover:border-purple-400',
    iconBg: 'bg-purple-800 text-purple-300',
    items: ['Dashboard', 'CRM Clientes', 'Usuários', 'Diagnóstico Empresarial', 'Diagnóstico Agro', 'Módulos Completos'],
    roles: ['admin', 'consultor'],
  },
]

const MODULE_PATHS: Record<AppModule, string> = {
  agro: '/',
  empresarial: '/',
  pay: '/pay',
  consultoria: '/',
}

export function ModuleSelector() {
  const navigate     = useNavigate()
  const { user }     = useAuthStore()
  const { setCurrentModule } = useStore()

  const visible = MODULES.filter(m => user && m.roles.includes(user.role))

  const handleSelect = (mod: AppModule) => {
    setCurrentModule(mod)
    navigate(MODULE_PATHS[mod])
  }

  return (
    <div className="min-h-screen bg-[#080C0A] flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 md:px-10 py-5 border-b border-white/8">
        <div className="flex items-center gap-3">
          <img src="/logo.svg" alt="AF" className="w-11 h-11 rounded-xl shadow-lg" />
          <div>
            <p className="font-bold text-white text-sm leading-tight">AF Gestão & Consultoria</p>
            <p className="text-white/35 text-xs">Sistema Integrado de Gestão</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {user && (
            <div className="text-right hidden sm:block">
              <p className="text-white/80 text-sm font-medium">{user.name}</p>
              <p className="text-white/35 text-xs capitalize">{user.role.replace('_', ' ')}</p>
            </div>
          )}
          <button
            onClick={() => useAuthStore.getState().logout()}
            className="flex items-center gap-1.5 text-white/40 hover:text-white/80 text-xs transition-colors"
          >
            <LogOut size={14} /> Sair
          </button>
        </div>
      </header>

      {/* Main */}
      <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
        <div className="text-center mb-10">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
            Olá, {user?.name?.split(' ')[0]} 👋
          </h1>
          <p className="text-white/40 text-base">Selecione o módulo que deseja acessar</p>
        </div>

        <div className={`grid gap-5 w-full max-w-5xl ${visible.length === 4 ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-4' : visible.length === 3 ? 'grid-cols-1 sm:grid-cols-3' : visible.length === 2 ? 'grid-cols-1 sm:grid-cols-2' : 'grid-cols-1 max-w-sm'}`}>
          {visible.map(mod => (
            <button
              key={mod.id}
              onClick={() => handleSelect(mod.id)}
              className={`group relative bg-gradient-to-br ${mod.gradient} border ${mod.border} rounded-2xl p-6 text-left transition-all duration-200 hover:scale-[1.03] hover:shadow-2xl focus:outline-none`}
            >
              {/* Icon */}
              <div className={`w-12 h-12 rounded-xl ${mod.iconBg} flex items-center justify-center mb-5 transition-transform group-hover:scale-110`}>
                <mod.icon size={24} />
              </div>

              {/* Title */}
              <h2 className="text-xl font-bold text-white mb-1">{mod.title}</h2>
              <p className="text-white/50 text-xs mb-5 leading-relaxed">{mod.subtitle}</p>

              {/* Items list */}
              <ul className="space-y-1.5">
                {mod.items.map(item => (
                  <li key={item} className="flex items-center gap-2 text-white/35 text-xs">
                    <span className="w-1 h-1 rounded-full bg-white/25 shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>

              {/* Arrow */}
              <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-opacity">
                <ChevronRight size={18} className="text-white/60" />
              </div>
            </button>
          ))}
        </div>
      </div>

      <footer className="text-center py-4 text-white/15 text-xs">
        AF Gestão & Consultoria © {new Date().getFullYear()} · Todos os direitos reservados
      </footer>
    </div>
  )
}
