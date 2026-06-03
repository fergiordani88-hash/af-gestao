import { Menu, Bell, Search, ChevronDown, LogOut, User, Settings } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useStore } from '../../store/useStore'
import { useAuthStore } from '../../store/useAuthStore'

const roleLabel: Record<string, string> = {
  admin: 'Administrador',
  consultor: 'Consultor',
  cliente_empresa: 'Cliente',
  cliente_rural: 'Cliente Rural',
}

interface HeaderProps { title: string; subtitle?: string }

export function Header({ title, subtitle }: HeaderProps) {
  const { setSidebarOpen, sidebarOpen } = useStore()
  const { user, logout } = useAuthStore()
  const navigate = useNavigate()
  const [dropdownOpen, setDropdownOpen] = useState(false)
  const dropRef = useRef<HTMLDivElement>(null)

  // Fecha dropdown ao clicar fora
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropRef.current && !dropRef.current.contains(e.target as Node)) {
        setDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const initials = user?.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() ?? 'AF'

  return (
    <header className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 py-3 flex items-center gap-4">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Menu"
      >
        <Menu size={20} />
      </button>

      <div className="flex-1 min-w-0">
        <h1 className="text-lg font-bold text-gray-900 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      </div>

      {/* Search */}
      <div className="hidden md:flex items-center gap-2 bg-gray-100 rounded-lg px-3 py-2 w-56">
        <Search size={15} className="text-gray-400 shrink-0" />
        <input
          type="text"
          placeholder="Buscar..."
          className="bg-transparent text-sm text-gray-700 outline-none w-full placeholder:text-gray-400"
        />
      </div>

      {/* Notificações */}
      <button className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors">
        <Bell size={18} />
        <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
      </button>

      {/* User dropdown */}
      <div className="relative" ref={dropRef}>
        <button
          onClick={() => setDropdownOpen(!dropdownOpen)}
          className="flex items-center gap-2 hover:bg-gray-100 rounded-xl px-2 py-1.5 transition-colors"
        >
          <div className="w-8 h-8 rounded-full bg-af-green flex items-center justify-center shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>
          <div className="hidden sm:block text-left">
            <p className="text-sm font-medium text-gray-900 leading-tight">{user?.name}</p>
            <p className="text-xs text-gray-500 leading-tight">{roleLabel[user?.role ?? ''] ?? user?.role}</p>
          </div>
          <ChevronDown size={14} className={`text-gray-400 transition-transform ${dropdownOpen ? 'rotate-180' : ''}`} />
        </button>

        {dropdownOpen && (
          <div className="absolute right-0 top-full mt-2 w-52 bg-white border border-gray-100 rounded-2xl shadow-lg py-1.5 z-50">
            <div className="px-3 py-2 border-b border-gray-100 mb-1">
              <p className="text-sm font-semibold text-gray-900">{user?.name}</p>
              <p className="text-xs text-gray-400 truncate">{user?.email}</p>
              <span className="mt-1 inline-block text-xs font-medium bg-af-green-pale text-af-green px-2 py-0.5 rounded-full">
                {roleLabel[user?.role ?? ''] ?? user?.role}
              </span>
            </div>

            <button
              onClick={() => { setDropdownOpen(false); navigate('/configuracoes') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <Settings size={15} className="text-gray-400" /> Configurações
            </button>
            <button
              onClick={() => { setDropdownOpen(false); navigate('/perfil') }}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 transition-colors"
            >
              <User size={15} className="text-gray-400" /> Meu Perfil
            </button>

            <div className="border-t border-gray-100 mt-1 pt-1">
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-2.5 px-3 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors rounded-b-2xl"
              >
                <LogOut size={15} /> Sair da conta
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  )
}
