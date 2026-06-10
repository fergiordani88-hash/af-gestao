export interface PayCompany {
  nomeFantasia: string
  razaoSocial: string
  documento: string
  tipoDoc: 'cnpj' | 'cpf'
  cep: string
  logradouro: string
  numero: string
  complemento?: string
  bairro: string
  cidade: string
  estado: string
  telefone: string
  email: string
  website?: string
  responsavel?: string
}

export interface PayEntry {
  id: string
  tipo: 'receita' | 'despesa'
  categoria: string
  descricao: string
  valor: number
  dataVenc: string
  dataPag?: string
  status: 'pago' | 'pendente' | 'atrasado' | 'previsto'
  recorrente: boolean
  periodicidade?: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
  contrato?: string
  obs?: string
  createdAt: string
}

export interface PayContract {
  id: string
  tipo: 'receita' | 'despesa'
  parte: string
  descricao: string
  valor: number
  dataInicio: string
  dataFim?: string
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'pontual'
  diaVencimento: number
  status: 'ativo' | 'encerrado' | 'suspenso'
  obs?: string
  createdAt: string
}

const KEY = {
  COMPANY:   'af-pay-company',
  ENTRIES:   'af-pay-entries',
  CONTRACTS: 'af-pay-contracts',
}

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function parse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export const payStorage = {
  // ── Company ─────────────────────────────────────────────────
  getCompany: (): PayCompany | null => parse(KEY.COMPANY, null),
  saveCompany: (d: PayCompany) => localStorage.setItem(KEY.COMPANY, JSON.stringify(d)),

  // ── Entries (contas a pagar e receber) ──────────────────────
  getEntries: (): PayEntry[] => parse(KEY.ENTRIES, []),
  addEntry(d: Omit<PayEntry, 'id' | 'createdAt'>): PayEntry {
    const e: PayEntry = { ...d, id: uid(), createdAt: new Date().toISOString() }
    this._saveEntries([e, ...this.getEntries()])
    return e
  },
  updateEntry(id: string, d: Partial<PayEntry>) {
    this._saveEntries(this.getEntries().map(e => e.id === id ? { ...e, ...d } : e))
  },
  deleteEntry(id: string) { this._saveEntries(this.getEntries().filter(e => e.id !== id)) },
  _saveEntries: (e: PayEntry[]) => localStorage.setItem(KEY.ENTRIES, JSON.stringify(e)),

  // ── Contracts ───────────────────────────────────────────────
  getContracts: (): PayContract[] => parse(KEY.CONTRACTS, []),
  addContract(d: Omit<PayContract, 'id' | 'createdAt'>): PayContract {
    const c: PayContract = { ...d, id: uid(), createdAt: new Date().toISOString() }
    this._saveContracts([c, ...this.getContracts()])
    return c
  },
  updateContract(id: string, d: Partial<PayContract>) {
    this._saveContracts(this.getContracts().map(c => c.id === id ? { ...c, ...d } : c))
  },
  deleteContract(id: string) { this._saveContracts(this.getContracts().filter(c => c.id !== id)) },
  _saveContracts: (c: PayContract[]) => localStorage.setItem(KEY.CONTRACTS, JSON.stringify(c)),

  // ── Helpers ─────────────────────────────────────────────────
  getSummary(year: number, month: number) {
    const entries = this.getEntries()
    const inMonth = entries.filter(e => {
      const d = new Date(e.dataVenc)
      return d.getFullYear() === year && d.getMonth() + 1 === month
    })
    const receita  = inMonth.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
    const despesa  = inMonth.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)
    const recPago  = inMonth.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
    const despPago = inMonth.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + e.valor, 0)
    return { receita, despesa, resultado: receita - despesa, recPago, despPago, resultadoCaixa: recPago - despPago }
  },

  getNextDue(days = 7) {
    const now  = new Date(); now.setHours(0, 0, 0, 0)
    const lim  = new Date(now); lim.setDate(lim.getDate() + days)
    return this.getEntries().filter(e => {
      const d = new Date(e.dataVenc); d.setHours(0, 0, 0, 0)
      return e.status !== 'pago' && d >= now && d <= lim
    }).sort((a, b) => new Date(a.dataVenc).getTime() - new Date(b.dataVenc).getTime())
  },

  getOverdue() {
    const now = new Date(); now.setHours(0, 0, 0, 0)
    return this.getEntries().filter(e => {
      const d = new Date(e.dataVenc); d.setHours(0, 0, 0, 0)
      return e.status !== 'pago' && d < now
    })
  },

  getLast6MonthsSummary() {
    const result = []
    for (let i = 5; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const y = d.getFullYear(), m = d.getMonth() + 1
      const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
      result.push({ mes: `${MESES[m-1]}/${String(y).slice(2)}`, ...this.getSummary(y, m) })
    }
    return result
  },
}
