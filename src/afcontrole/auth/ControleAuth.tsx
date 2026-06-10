import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { Navigate } from 'react-router-dom'

const SESSION_KEY = 'af-ctrl-session'
const CREDS_KEY   = 'af-ctrl-credentials'

interface ControleSession { email: string; name: string; loggedAt: string }

interface AuthCtx {
  session: ControleSession | null
  login: (email: string, password: string) => boolean
  logout: () => void
}

const Ctx = createContext<AuthCtx>({ session: null, login: () => false, logout: () => {} })

function getStoredPassword(): string {
  try { return JSON.parse(localStorage.getItem(CREDS_KEY) ?? 'null')?.password ?? 'afcontrole' } catch { return 'afcontrole' }
}

export function ControleAuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<ControleSession | null>(() => {
    try { return JSON.parse(localStorage.getItem(SESSION_KEY) ?? 'null') } catch { return null }
  })

  const login = (email: string, password: string): boolean => {
    if (!email || password !== getStoredPassword()) return false
    const s: ControleSession = { email, name: email.split('@')[0], loggedAt: new Date().toISOString() }
    localStorage.setItem(SESSION_KEY, JSON.stringify(s))
    setSession(s)
    return true
  }

  const logout = () => {
    localStorage.removeItem(SESSION_KEY)
    setSession(null)
  }

  return <Ctx.Provider value={{ session, login, logout }}>{children}</Ctx.Provider>
}

export function useControleAuth() { return useContext(Ctx) }

export function ControleProtectedRoute({ children }: { children: ReactNode }) {
  const { session } = useControleAuth()
  return session ? <>{children}</> : <Navigate to="/afcontrole/login" replace />
}
