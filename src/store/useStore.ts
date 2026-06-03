import { create } from 'zustand'
import type { Client, Contract } from '../types'
import { clientsApi, contractsApi } from '../services/api'

interface AppStore {
  clients: Client[]
  contracts: Contract[]
  sidebarOpen: boolean
  isDataLoaded: boolean

  setSidebarOpen: (v: boolean) => void
  loadData: () => Promise<void>
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
}

// Normaliza dados vindos da API para o formato esperado pelos componentes
function normalizeClient(c: Record<string, unknown>): Client {
  return {
    id:          String(c.id ?? ''),
    name:        String(c.name ?? ''),
    document:    String(c.document ?? ''),
    phone:       String(c.phone ?? ''),
    email:       String(c.email ?? ''),
    city:        String(c.city ?? ''),
    state:       String(c.state ?? 'MT'),
    segment:     String(c.segment ?? 'comercio') as Client['segment'],
    size:        String(c.size ?? 'media') as Client['size'],
    revenue:     Number(c.revenue ?? 0),
    status:      String(c.status ?? 'lead') as Client['status'],
    notes:       c.notes ? String(c.notes) : undefined,
    // responsible pode vir como objeto {id, name} ou string
    responsible: typeof c.responsible === 'object' && c.responsible !== null
      ? String((c.responsible as Record<string, unknown>).name ?? '')
      : String(c.responsible ?? ''),
    createdAt:   String(c.createdAt ?? new Date().toISOString()),
  }
}

function normalizeContract(c: Record<string, unknown>): Contract {
  return {
    id:           String(c.id ?? ''),
    clientId:     String(c.clientId ?? ''),
    plan:         String(c.plan ?? ''),
    monthlyValue: Number(c.monthlyValue ?? 0),
    startDate:    String(c.startDate ?? ''),
    renewalDate:  String(c.renewalDate ?? ''),
    status:       String(c.status ?? 'ativo').toLowerCase() as Contract['status'],
  }
}

export const useStore = create<AppStore>((set, get) => ({
  clients:      [],
  contracts:    [],
  sidebarOpen:  true,
  isDataLoaded: false,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  loadData: async () => {
    if (get().isDataLoaded) return
    try {
      const [rawClients, rawContracts] = await Promise.all([
        clientsApi.list() as Promise<Record<string, unknown>[]>,
        contractsApi.list() as Promise<Record<string, unknown>[]>,
      ])
      const clients   = rawClients.map(normalizeClient)
      const contracts = rawContracts.map(normalizeContract)
      set({ clients, contracts, isDataLoaded: true })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
      // Não deixa o app travar — mantém arrays vazios
      set({ isDataLoaded: true })
    }
  },

  addClient: async (data) => {
    try {
      const raw = await clientsApi.create(data) as Record<string, unknown>
      const newClient = normalizeClient(raw)
      set((s) => ({ clients: [newClient, ...s.clients] }))
    } catch (err) {
      console.error('Erro ao criar cliente:', err)
      throw err
    }
  },

  updateClient: async (id, data) => {
    try {
      const raw = await clientsApi.update(id, data) as Record<string, unknown>
      const updated = normalizeClient(raw)
      set((s) => ({
        clients: s.clients.map((c) => (c.id === id ? { ...c, ...updated } : c))
      }))
    } catch (err) {
      console.error('Erro ao atualizar cliente:', err)
      throw err
    }
  },
}))
