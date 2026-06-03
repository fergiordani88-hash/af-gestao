export type UserRole = 'admin' | 'consultor' | 'cliente_empresa' | 'cliente_rural'
export type ClientStatus = 'lead' | 'proposta' | 'negociacao' | 'ativo' | 'inativo'
export type ClientSegment = 'agro' | 'comercio' | 'servicos' | 'industria'
export type Priority = 'imediata' | 'alta' | 'media' | 'baixa'
export type ActionStatus = 'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente' | 'reavaliar'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
}

export interface Client {
  id: string
  name: string
  document: string
  phone: string
  email: string
  segment: ClientSegment
  size: 'micro' | 'pequena' | 'media' | 'grande'
  revenue: number
  responsible: string
  status: ClientStatus
  createdAt: string
  city: string
  state: string
  notes?: string
}

export interface Contract {
  id: string
  clientId: string
  plan: string
  monthlyValue: number
  startDate: string
  renewalDate: string
  status: 'ativo' | 'pendente' | 'cancelado' | 'suspenso'
}

export interface ActionPlan {
  id: string
  clientId: string
  area: string
  action: string
  objective: string
  priority: Priority
  deadline: string
  responsible: string
  expectedResult: string
  status: ActionStatus
}

export interface CreditOperation {
  id: string
  clientId: string
  bank: string
  creditLine: string
  value: number
  rate: number
  term: number
  guarantees: string
  status: 'analise' | 'aprovado' | 'contratado' | 'negado'
}

export interface DRE {
  grossRevenue: number
  deductions: number
  netRevenue: number
  cmv: number
  grossProfit: number
  fixedExpenses: number
  variableExpenses: number
  financialExpenses: number
  proLabore: number
  ebitda: number
  operatingProfit: number
  netProfit: number
}

export interface CashFlow {
  month: string
  inflow: number
  outflow: number
  balance: number
}

export interface AgroProduction {
  culture: string
  area: number
  productivity: number
  totalProduction: number
  avgPrice: number
  grossRevenue: number
  costPerHectare: number
  totalCost: number
  leaseCost: number
  operatingResult: number
}
