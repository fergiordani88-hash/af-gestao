// Diagnóstico Empresarial — redireciona para o módulo PJ Completo
// Os dados agora são gerenciados no módulo completo (DRE, Indicadores, Contratos, Fluxo, etc.)
import { useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'

export function DiagnosticoPJ() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const clientId = searchParams.get('clientId')

  useEffect(() => {
    const dest = clientId ? `/pj-completo?clientId=${clientId}` : '/pj-completo'
    navigate(dest, { replace: true })
  }, [clientId, navigate])

  return null
}
