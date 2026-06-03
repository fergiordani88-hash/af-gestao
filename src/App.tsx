import { Routes, Route } from 'react-router-dom'
import { Dashboard } from './pages/Dashboard'
import { CRM } from './pages/CRM'
import { DiagnosticoPJ } from './pages/DiagnosticoPJ'
import { DiagnosticoAgro } from './pages/DiagnosticoAgro'
import { AgroCompleto } from './pages/AgroCompleto'
import { PJCompleto } from './pages/PJCompleto'
import { Financeiro } from './pages/Financeiro'
import { Credito } from './pages/Credito'
import { Documentos } from './pages/Documentos'
import { AreaCliente } from './pages/AreaCliente'
import { Login } from './pages/Login'
import { SemAcesso } from './pages/SemAcesso'
import { Usuarios } from './pages/Usuarios'
import { ProtectedRoute } from './components/Auth/ProtectedRoute'

export default function App() {
  return (
    <Routes>
      {/* Pública */}
      <Route path="/login" element={<Login />} />
      <Route path="/sem-acesso" element={<SemAcesso />} />

      {/* Admin + Consultor */}
      <Route path="/" element={
        <ProtectedRoute allowedRoles={['admin', 'consultor']}>
          <Dashboard />
        </ProtectedRoute>
      } />
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

      {/* Todos os perfis autenticados */}
      <Route path="/financeiro" element={
        <ProtectedRoute>
          <Financeiro />
        </ProtectedRoute>
      } />
      <Route path="/credito" element={
        <ProtectedRoute>
          <Credito />
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
    </Routes>
  )
}
