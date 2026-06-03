import { ShieldOff, ArrowLeft } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

export function SemAcesso() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center max-w-sm">
        <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <ShieldOff size={28} className="text-red-500" />
        </div>
        <h1 className="text-xl font-bold text-gray-900 mb-2">Acesso não autorizado</h1>
        <p className="text-sm text-gray-500 mb-6">
          Você não tem permissão para acessar esta página. Contate seu consultor da AF Gestão.
        </p>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 bg-af-green text-white font-medium rounded-xl px-4 py-2.5 text-sm hover:bg-af-green-light transition-colors"
        >
          <ArrowLeft size={15} /> Voltar
        </button>
      </div>
    </div>
  )
}
