import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { useAuthStore } from '../store/useAuthStore'

const DEMO_ACCOUNTS = [
  { label: 'Administrador', email: 'ana@afgestao.com.br', password: 'admin123', color: 'bg-af-green text-white' },
  { label: 'Consultor', email: 'carlos@afgestao.com.br', password: 'consultor123', color: 'bg-blue-600 text-white' },
  { label: 'Cliente Rural', email: 'joao@fazendaspecro.com.br', password: 'cliente123', color: 'bg-emerald-600 text-white' },
  { label: 'Cliente PJ', email: 'financeiro@comercioexpresso.com.br', password: 'cliente123', color: 'bg-amber-500 text-white' },
]

export function Login() {
  const navigate = useNavigate()
  const { login, isAuthenticated, isLoading, error, clearError } = useAuthStore()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/modules', { replace: true })
  }, [isAuthenticated, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
  }

  const fillDemo = (acc: typeof DEMO_ACCOUNTS[0]) => {
    clearError()
    setEmail(acc.email)
    setPassword(acc.password)
  }

  const inp = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-900 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-af-green/40 focus:border-af-green transition-colors'

  return (
    <div className="min-h-screen bg-gradient-to-br from-af-dark via-af-green to-af-green-light flex items-center justify-center p-4">
      {/* Background pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 2px 2px, white 1px, transparent 0)', backgroundSize: '40px 40px' }}
      />

      <div className="w-full max-w-md relative z-10">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <img src="/logo.png" alt="AF Gestão" className="w-20 h-20 rounded-2xl shadow-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">AF Gestão & Consultoria</h1>
          <p className="text-white/60 text-sm mt-1">Sistema de Gestão Integrado</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Entrar na plataforma</h2>
          <p className="text-sm text-gray-500 mb-6">Use suas credenciais de acesso</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">E-mail</label>
              <input
                type="email"
                className={inp}
                placeholder="seu@email.com.br"
                value={email}
                onChange={(e) => { setEmail(e.target.value); clearError() }}
                required
                autoComplete="email"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Senha</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  className={inp + ' pr-10'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); clearError() }}
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPass ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={isLoading || !email || !password}
              className="w-full bg-af-green hover:bg-af-green-light disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors mt-2"
            >
              {isLoading
                ? <><Loader2 size={16} className="animate-spin" /> Entrando...</>
                : <><LogIn size={16} /> Entrar</>
              }
            </button>
          </form>

          {/* Esqueci a senha */}
          <div className="text-center mt-4">
            <button className="text-xs text-gray-400 hover:text-af-green transition-colors">
              Esqueci minha senha
            </button>
          </div>

          {/* Divisor */}
          <div className="flex items-center gap-3 my-6">
            <div className="flex-1 h-px bg-gray-100" />
            <span className="text-xs text-gray-400 font-medium">Acesso rápido (demo)</span>
            <div className="flex-1 h-px bg-gray-100" />
          </div>

          {/* Demo accounts */}
          <div className="grid grid-cols-2 gap-2">
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.email}
                onClick={() => fillDemo(acc)}
                className={`${acc.color} text-xs font-semibold rounded-xl px-3 py-2.5 hover:opacity-90 transition-opacity text-center`}
              >
                {acc.label}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-3">
            Clique em um perfil para preencher as credenciais automaticamente
          </p>
        </div>

        <p className="text-center text-white/40 text-xs mt-6">
          AF Gestão & Consultoria © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
