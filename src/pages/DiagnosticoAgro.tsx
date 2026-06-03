// Diagnóstico Agro — redireciona para o módulo Agro Completo
// Os dados agora são gerenciados no módulo completo (Produção, DRE Rural, Contratos, Fluxo, etc.)
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function DiagnosticoAgro() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId')

  useEffect(() => {
    const dest = clientId ? `/agro-completo?clientId=${clientId}` : '/agro-completo'
    navigate(dest, { replace: true })
  }, [clientId, navigate])

  return null
}
