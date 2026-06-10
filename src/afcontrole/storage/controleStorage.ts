// AF Controle — armazenamento isolado (chaves separadas do módulo Pay)
export interface ControleCompany {
  nomeFantasia: string; razaoSocial: string; documento: string; tipoDoc: 'cnpj' | 'cpf'
  cep: string; logradouro: string; numero: string; complemento?: string
  bairro: string; cidade: string; estado: string; telefone: string; email: string
  website?: string; responsavel?: string
}

export interface ControleEntry {
  id: string; tipo: 'receita' | 'despesa'; categoria: string; descricao: string
  valor: number; dataVenc: string; dataPag?: string
  status: 'pago' | 'pendente' | 'atrasado' | 'previsto'
  recorrente: boolean; periodicidade?: 'semanal' | 'quinzenal' | 'mensal' | 'bimestral' | 'trimestral' | 'semestral' | 'anual'
  contrato?: string; obs?: string; createdAt: string
}

export interface ControleContract {
  id: string; tipo: 'receita' | 'despesa'; parte: string; descricao: string
  valor: number; dataInicio: string; dataFim?: string
  periodicidade: 'mensal' | 'trimestral' | 'semestral' | 'anual' | 'pontual'
  diaVencimento: number; status: 'ativo' | 'encerrado' | 'suspenso'
  obs?: string; createdAt: string
}

const KEY = { COMPANY: 'af-ctrl-company', ENTRIES: 'af-ctrl-entries', CONTRACTS: 'af-ctrl-contracts' }

function uid() { return Math.random().toString(36).slice(2) + Date.now().toString(36) }
function parse<T>(key: string, fallback: T): T {
  try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback } catch { return fallback }
}

export const controleStorage = {
  getCompany: (): ControleCompany | null => parse(KEY.COMPANY, null),
  saveCompany: (d: ControleCompany) => localStorage.setItem(KEY.COMPANY, JSON.stringify(d)),

  getEntries: (): ControleEntry[] => parse(KEY.ENTRIES, []),
  addEntry(d: Omit<ControleEntry, 'id' | 'createdAt'>): ControleEntry {
    const e: ControleEntry = { ...d, id: uid(), createdAt: new Date().toISOString() }
    this._saveEntries([e, ...this.getEntries()]); return e
  },
  updateEntry(id: string, d: Partial<ControleEntry>) {
    this._saveEntries(this.getEntries().map(e => e.id === id ? { ...e, ...d } : e))
  },
  deleteEntry(id: string) { this._saveEntries(this.getEntries().filter(e => e.id !== id)) },
  _saveEntries: (e: ControleEntry[]) => localStorage.setItem(KEY.ENTRIES, JSON.stringify(e)),

  getContracts: (): ControleContract[] => parse(KEY.CONTRACTS, []),
  addContract(d: Omit<ControleContract, 'id' | 'createdAt'>): ControleContract {
    const c: ControleContract = { ...d, id: uid(), createdAt: new Date().toISOString() }
    this._saveContracts([c, ...this.getContracts()]); return c
  },
  updateContract(id: string, d: Partial<ControleContract>) {
    this._saveContracts(this.getContracts().map(c => c.id === id ? { ...c, ...d } : c))
  },
  deleteContract(id: string) { this._saveContracts(this.getContracts().filter(c => c.id !== id)) },
  _saveContracts: (c: ControleContract[]) => localStorage.setItem(KEY.CONTRACTS, JSON.stringify(c)),

  getSummary(year: number, month: number) {
    const inMonth = this.getEntries().filter(e => {
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
    const now = new Date(); now.setHours(0,0,0,0)
    const lim = new Date(now); lim.setDate(lim.getDate() + days)
    return this.getEntries().filter(e => {
      const d = new Date(e.dataVenc); d.setHours(0,0,0,0)
      return e.status !== 'pago' && d >= now && d <= lim
    }).sort((a, b) => new Date(a.dataVenc).getTime() - new Date(b.dataVenc).getTime())
  },

  getOverdue() {
    const now = new Date(); now.setHours(0,0,0,0)
    return this.getEntries().filter(e => {
      const d = new Date(e.dataVenc); d.setHours(0,0,0,0)
      return e.status !== 'pago' && d < now
    })
  },

  getLast12MonthsSummary() {
    const result = []
    const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    for (let i = 11; i >= 0; i--) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() - i)
      const y = d.getFullYear(), m = d.getMonth() + 1
      result.push({ mes: `${MESES[m-1]}/${String(y).slice(2)}`, ano: y, mes_num: m, ...this.getSummary(y, m) })
    }
    return result
  },

  // Projeção baseada na média móvel dos últimos 3 meses
  getProjection(months = 3) {
    const history = this.getLast12MonthsSummary()
    const last3   = history.slice(-3)
    const avgRec  = last3.reduce((s, m) => s + m.receita, 0) / 3
    const avgDesp = last3.reduce((s, m) => s + m.despesa, 0) / 3
    const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
    const projections = []
    for (let i = 1; i <= months; i++) {
      const d = new Date(); d.setDate(1); d.setMonth(d.getMonth() + i)
      projections.push({
        mes: `${MESES[d.getMonth()]}/${String(d.getFullYear()).slice(2)}`,
        receita: avgRec, despesa: avgDesp, resultado: avgRec - avgDesp, projetado: true
      })
    }
    return projections
  },
}
