import { create } from 'zustand'
import type { Client, Contract, ActionPlan, CreditOperation } from '../types'
import { clientsApi, contractsApi } from '../services/api'

interface AppStore {
  clients: Client[]
  contracts: Contract[]
  actionPlans: ActionPlan[]
  creditOps: CreditOperation[]
  sidebarOpen: boolean
  isDataLoaded: boolean

  setSidebarOpen: (v: boolean) => void
  loadData: () => Promise<void>
  addClient: (c: Omit<Client, 'id' | 'createdAt'>) => Promise<void>
  updateClient: (id: string, data: Partial<Client>) => Promise<void>
}

export const useStore = create<AppStore>((set, get) => ({
  clients: [],
  contracts: [],
  actionPlans: [],
  creditOps: [],
  sidebarOpen: true,
  isDataLoaded: false,

  setSidebarOpen: (v) => set({ sidebarOpen: v }),

  loadData: async () => {
    if (get().isDataLoaded) return
    try {
      const [clients, contracts] = await Promise.all([
        clientsApi.list() as Promise<Client[]>,
        contractsApi.list() as Promise<Contract[]>,
      ])
      set({ clients, contracts, isDataLoaded: true })
    } catch (err) {
      console.error('Erro ao carregar dados:', err)
    }
  },

  addClient: async (data) => {
    const newClient = await clientsApi.create(data) as Client
    set((s) => ({ clients: [newClient, ...s.clients] }))
  },

  updateClient: async (id, data) => {
    const updated = await clientsApi.update(id, data) as Client
    set((s) => ({
      clients: s.clients.map((c) => (c.id === id ? { ...c, ...updated } : c))
    }))
  },
}))
