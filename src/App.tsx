import { Routes, Route, Navigate } from 'react-router-dom'
import { Dashboard }         from './pages/Dashboard'
import { CRM }               from './pages/CRM'
import { DiagnosticoPJ }     from './pages/DiagnosticoPJ'
import { DiagnosticoAgro }   from './pages/DiagnosticoAgro'
import { AgroCompleto }      from './pages/AgroCompleto'
import { PJCompleto }        from './pages/PJCompleto'
import { CreditoEmpresarial }from './pages/CreditoEmpresarial'
import { CreditoAgro }       from './pages/CreditoAgro'
import { Financeiro }        from './pages/Financeiro'
import { Documentos }        from './pages/Documentos'
import { AreaCliente }       from './pages/AreaCliente'
import { Login }             from './pages/Login'
import { SemAcesso }         from './pages/SemAcesso'
import { Usuarios }          from './pages/Usuarios'
import { ModuleSelector }    from './pages/ModuleSelector'
import { PayPage }           from './pages/PayModule/PayPage'
import { ProtectedRoute }    from './components/Auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login"    element={<Login />} />
      <Route path="/sem-acesso" element={<SemAcesso />} />

      {/* Seletor de módulos */}
      <Route path="/modules" element={
        <ProtectedRoute>
          <ModuleSelector />
        </ProtectedRoute>
      } />

      {/* Dashboard / home */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <Dashboard />
        </ProtectedRoute>
      } />

      {/* Módulo Consultoria */}
      <Route path="/usuarios" element={
        <ProtectedRoute allowedRoles={['admin']}>
          <Usuarios />
        </ProtectedRoute>
      } />
      <Route path="/crm" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <CRM />
        </ProtectedRoute>
      } />

      {/* Diagnósticos */}
      <Route path="/diagnostico-pj" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <DiagnosticoPJ />
        </ProtectedRoute>
      } />
      <Route path="/diagnostico-agro" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <DiagnosticoAgro />
        </ProtectedRoute>
      } />

      {/* Módulos completos */}
      <Route path="/agro-completo" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <AgroCompleto />
        </ProtectedRoute>
      } />
      <Route path="/pj-completo" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <PJCompleto />
        </ProtectedRoute>
      } />

      {/* Financeiro / Documentos / Área Cliente */}
      <Route path="/financeiro" element={
        <ProtectedRoute>
          <Financeiro />
        </ProtectedRoute>
      } />
      <Route path="/documentos" element={
        <ProtectedRoute>
          <Documentos />
        </ProtectedRoute>
      } />
      <Route path="/area-cliente" element={
        <ProtectedRoute>
          <AreaCliente />
        </ProtectedRoute>
      } />

      {/* Crédito */}
      <Route path="/credito-empresarial" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <CreditoEmpresarial />
        </ProtectedRoute>
      } />
      <Route path="/credito-agro" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <CreditoAgro />
        </ProtectedRoute>
      } />

      {/* ── Módulo Pay ─────────────────────────────────────── */}
      <Route path="/pay"              element={<ProtectedRoute><PayPage tab="dashboard" /></ProtectedRoute>} />
      <Route path="/pay/empresa"      element={<ProtectedRoute><PayPage tab="empresa" /></ProtectedRoute>} />
      <Route path="/pay/lancamentos"  element={<ProtectedRoute><PayPage tab="lancamentos" /></ProtectedRoute>} />
      <Route path="/pay/contratos"    element={<ProtectedRoute><PayPage tab="contratos" /></ProtectedRoute>} />
      <Route path="/pay/despesas"     element={<ProtectedRoute><PayPage tab="despesas" /></ProtectedRoute>} />
      <Route path="/pay/receitas"     element={<ProtectedRoute><PayPage tab="receitas" /></ProtectedRoute>} />
      <Route path="/pay/diario"       element={<ProtectedRoute><PayPage tab="diario" /></ProtectedRoute>} />
      <Route path="/pay/mensal"       element={<ProtectedRoute><PayPage tab="mensal" /></ProtectedRoute>} />
      <Route path="/pay/anual"        element={<ProtectedRoute><PayPage tab="anual" /></ProtectedRoute>} />

      {/* Catch-all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
