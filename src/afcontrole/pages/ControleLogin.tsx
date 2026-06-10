import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, LogIn, AlertCircle, Loader2 } from 'lucide-react'
import { useControleAuth } from '../auth/ControleAuth'

export function ControleLogin() {
  const navigate = useNavigate()
  const { session, login } = useControleAuth()
  const [email, setEmail]   = useState('')
  const [pass, setPass]     = useState('')
  const [show, setShow]     = useState(false)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => { if (session) navigate('/afcontrole', { replace: true }) }, [session, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(''); setLoading(true)
    await new Promise(r => setTimeout(r, 600))
    const ok = login(email, pass)
    setLoading(false)
    if (!ok) setError('E-mail ou senha inválidos. Senha padrão: afcontrole')
  }

  const inp = 'w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#C9A258]/40 focus:border-[#C9A258] transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, #0A0A0A 0%, #1a1a1a 50%, #111 100%)' }}>
      {/* Grid pattern */}
      <div className="absolute inset-0 opacity-5 pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #C9A258 1px, transparent 0)', backgroundSize: '32px 32px' }} />

      <div className="w-full max-w-md relative z-10">
        {/* Logo + título */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-5">
            <img src="/logo.png" alt="AF" className="w-20 h-20 rounded-2xl shadow-2xl" />
          </div>
          <h1 className="text-2xl font-bold text-white">AF Controle</h1>
          <p className="text-white/50 text-sm mt-1">Controle de Fluxo de Caixa</p>
          <div className="flex items-center justify-center gap-2 mt-3">
            <div className="h-px w-16 bg-[#C9A258]/40" />
            <span className="text-[#C9A258] text-xs font-medium">AF Gestão & Consultoria</span>
            <div className="h-px w-16 bg-[#C9A258]/40" />
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Acessar o sistema</h2>
          <p className="text-sm text-gray-500 mb-6">Use as credenciais fornecidas pela consultoria</p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">E-mail</label>
              <input type="email" className={inp} placeholder="seu@email.com" value={email}
                onChange={e => { setEmail(e.target.value); setError('') }} required />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Senha</label>
              <div className="relative">
                <input type={show ? 'text' : 'password'} className={inp + ' pr-10'} placeholder="••••••••"
                  value={pass} onChange={e => { setPass(e.target.value); setError('') }} required />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2.5">
                <AlertCircle size={15} className="shrink-0" />
                {error}
              </div>
            )}

            <button type="submit" disabled={loading || !email || !pass}
              className="w-full font-semibold rounded-xl py-3 flex items-center justify-center gap-2 transition-colors mt-2 disabled:opacity-60"
              style={{ background: '#C9A258', color: '#000' }}>
              {loading ? <><Loader2 size={16} className="animate-spin" /> Entrando...</> : <><LogIn size={16} /> Entrar</>}
            </button>
          </form>

          <p className="text-center text-xs text-gray-400 mt-5">
            Dúvidas? Entre em contato com a <strong>AF Gestão & Consultoria</strong>
          </p>
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          AF Controle © {new Date().getFullYear()} · Todos os direitos reservados
        </p>
      </div>
    </div>
  )
}
