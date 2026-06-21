// Camada de serviço — conecta o frontend à API REST

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:3333/api'

function getToken(): string | null {
  try {
    const raw = localStorage.getItem('af-auth')
    if (!raw) return null
    const parsed = JSON.parse(raw)
    return parsed?.state?.token ?? null
  } catch {
    return null
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token && { Authorization: `Bearer ${token}` }),
      ...options.headers,
    },
  })

  if (res.status === 401) {
    localStorage.removeItem('af-token')
    window.location.href = '/login'
    throw new Error('Token inválido ou expirado. Faça login novamente.')
  }

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro desconhecido' }))
    throw new Error(err.error ?? `HTTP ${res.status}`)
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

// ── Auth ───────────────────────────────────────────────────────
export const authApi = {
  login:  (email: string, password: string) =>
    request<{ token: string; user: { id: string; name: string; email: string; role: string } }>(
      '/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }
    ),
  me:     () => request<{ id: string; name: string; email: string; role: string }>('/auth/me'),
  changePassword: (currentPassword: string, newPassword: string) =>
    request('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) }),
}

// ── Dashboard ─────────────────────────────────────────────────
export const dashboardApi = {
  get: () => request<{
    kpis: { totalClients: number; activeClients: number; leadsCount: number; negotiatingCount: number; monthlyRevenue: number; annualRevenue: number; conversionRate: number }
    bySegment: Record<string, number>
    byStatus:  Record<string, number>
    recentClients: unknown[]
    actionsByStatus: Record<string, number>
  }>('/dashboard'),
}

// ── Clientes ──────────────────────────────────────────────────
export const clientsApi = {
  list:   (params?: { status?: string; segment?: string; search?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<unknown[]>(`/clients${qs}`)
  },
  stats:  () => request<{ total: number; active: number; leads: number; inNegotiation: number; monthlyRevenue: number; conversionRate: number }>('/clients/stats'),
  get:    (id: string) => request<unknown>(`/clients/${id}`),
  create: (data: unknown) => request<unknown>('/clients', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/clients/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  delete: (id: string) => request<void>(`/clients/${id}`, { method: 'DELETE' }),
  addAttendance: (clientId: string, data: unknown) =>
    request<unknown>(`/clients/${clientId}/attendances`, { method: 'POST', body: JSON.stringify(data) }),
}

// ── Contratos ─────────────────────────────────────────────────
export const contractsApi = {
  list:   (params?: { clientId?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<unknown[]>(`/contracts${qs}`)
  },
  create: (data: unknown) => request<unknown>('/contracts', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/contracts/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Diagnósticos ──────────────────────────────────────────────
export const diagnosticosApi = {
  listPJ:    (clientId?: string) => request<unknown[]>(`/diagnosticos/pj${clientId ? `?clientId=${clientId}` : ''}`),
  getPJ:     (id: string) => request<unknown>(`/diagnosticos/pj/${id}`),
  createPJ:  (data: unknown) => request<unknown>('/diagnosticos/pj', { method: 'POST', body: JSON.stringify(data) }),
  listAgro:  (clientId?: string) => request<unknown[]>(`/diagnosticos/agro${clientId ? `?clientId=${clientId}` : ''}`),
  getAgro:   (id: string) => request<unknown>(`/diagnosticos/agro/${id}`),
  createAgro:(data: unknown) => request<unknown>('/diagnosticos/agro', { method: 'POST', body: JSON.stringify(data) }),
}

// ── Financeiro ────────────────────────────────────────────────
export const financeiroApi = {
  getCashFlow: (clientId: string, year?: number) =>
    request<{ monthly: unknown[]; totalInflow: number; totalOutflow: number; netBalance: number; criticalMonths: string[] }>(
      `/financeiro/cashflow/${clientId}${year ? `?year=${year}` : ''}`
    ),
  addCashFlow: (data: unknown) => request<unknown>('/financeiro/cashflow', { method: 'POST', body: JSON.stringify(data) }),
  getCredito:  (clientId: string) => request<unknown[]>(`/financeiro/credito/${clientId}`),
  addCredito:  (data: unknown) => request<unknown>('/financeiro/credito', { method: 'POST', body: JSON.stringify(data) }),
  updateCredito: (id: string, data: unknown) => request<unknown>(`/financeiro/credito/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Planos de ação ────────────────────────────────────────────
export const actionPlansApi = {
  list:   (params?: { clientId?: string; status?: string }) => {
    const qs = params ? '?' + new URLSearchParams(params as Record<string, string>).toString() : ''
    return request<unknown[]>(`/action-plans${qs}`)
  },
  create: (data: unknown) => request<unknown>('/action-plans', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: unknown) => request<unknown>(`/action-plans/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
}

// ── Usuários (admin) ──────────────────────────────────────────
export interface ApiUser {
  id: string
  name: string
  email: string
  role: string
  active: boolean
  createdAt: string
  _count?: { clients: number }
}

export const usersApi = {
  list:          () => request<ApiUser[]>('/users'),
  get:           (id: string) => request<ApiUser>(`/users/${id}`),
  create:        (data: { name: string; email: string; password: string; role: string }) =>
    request<ApiUser>('/users', { method: 'POST', body: JSON.stringify(data) }),
  update:        (id: string, data: Partial<{ name: string; email: string; role: string; active: boolean }>) =>
    request<ApiUser>(`/users/${id}`, { method: 'PATCH', body: JSON.stringify(data) }),
  resetPassword: (id: string, newPassword: string) =>
    request<{ message: string }>(`/users/${id}/reset-password`, { method: 'POST', body: JSON.stringify({ newPassword }) }),
  deactivate:    (id: string) =>
    request<void>(`/users/${id}`, { method: 'DELETE' }),
}
