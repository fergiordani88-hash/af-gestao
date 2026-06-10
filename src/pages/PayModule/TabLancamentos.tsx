import { useState, useEffect, useCallback } from 'react'
import { Plus, Trash2, Edit2, CheckCircle, X, Filter, Download } from 'lucide-react'
import { payStorage, type PayEntry } from '../../services/payStorage'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s).toLocaleDateString('pt-BR')

const CATS_REC  = ['Vendas de Produtos','Prestação de Serviços','Aluguéis','Comissões','Royalties','Outros']
const CATS_DESP = ['Aluguel','Folha de Pagamento','Pró-labore','Fornecedores','Impostos','Energia','Telefone/Internet','Manutenção','Marketing','Transporte','Financeiro/Juros','Outros']

const STATUS_COR: Record<string, string> = {
  pago:     'bg-emerald-100 text-emerald-700',
  pendente: 'bg-amber-100 text-amber-700',
  atrasado: 'bg-red-100 text-red-700',
  previsto: 'bg-gray-100 text-gray-600',
}
const STATUS_LABELS: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', previsto: 'Previsto'
}

const EMPTY_FORM: Omit<PayEntry, 'id' | 'createdAt'> = {
  tipo: 'despesa', categoria: 'Outros', descricao: '', valor: 0,
  dataVenc: '', status: 'pendente', recorrente: false,
}

export function TabLancamentos() {
  const [entries,   setEntries]   = useState<PayEntry[]>([])
  const [showForm,  setShowForm]  = useState(false)
  const [editItem,  setEditItem]  = useState<PayEntry | null>(null)
  const [form,      setForm]      = useState<Omit<PayEntry, 'id' | 'createdAt'>>(EMPTY_FORM)
  const [filtroTipo,setFiltroTipo]= useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroSt,  setFiltroSt] = useState<string>('todos')
  const [filtromes, setFiltroMes] = useState('')

  const load = useCallback(() => {
    let all = payStorage.getEntries()
    // Auto-mark overdue
    const now = new Date(); now.setHours(0,0,0,0)
    all = all.map(e => {
      const d = new Date(e.dataVenc); d.setHours(0,0,0,0)
      if (e.status === 'pendente' && d < now) return { ...e, status: 'atrasado' as const }
      return e
    })
    setEntries(all)
  }, [])

  useEffect(() => { load() }, [load])

  const cats = form.tipo === 'receita' ? CATS_REC : CATS_DESP

  const handleSave = () => {
    if (!form.descricao || !form.valor || !form.dataVenc) return
    if (editItem?.id) { payStorage.updateEntry(editItem.id, form); setEditItem(null) }
    else payStorage.addEntry(form)
    setShowForm(false); setForm(EMPTY_FORM); load()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este lançamento?')) return
    payStorage.deleteEntry(id); load()
  }

  const handlePagar = (e: PayEntry) => {
    payStorage.updateEntry(e.id, { status: 'pago', dataPag: new Date().toISOString().slice(0, 10) })
    load()
  }

  const handleEdit = (e: PayEntry) => {
    setEditItem(e)
    setForm({ tipo: e.tipo, categoria: e.categoria, descricao: e.descricao, valor: e.valor, dataVenc: e.dataVenc, dataPag: e.dataPag, status: e.status, recorrente: e.recorrente, periodicidade: e.periodicidade, obs: e.obs })
    setShowForm(true)
  }

  // Filtros
  let visible = entries
  if (filtroTipo !== 'todos') visible = visible.filter(e => e.tipo === filtroTipo)
  if (filtroSt   !== 'todos') visible = visible.filter(e => e.status === filtroSt)
  if (filtromes) visible = visible.filter(e => e.dataVenc.startsWith(filtromes))

  // Totais
  const totalRec  = visible.filter(e => e.tipo === 'receita').reduce((s, e) => s + e.valor, 0)
  const totalDesp = visible.filter(e => e.tipo === 'despesa').reduce((s, e) => s + e.valor, 0)

  // CSV export
  const handleExport = () => {
    const header = 'Tipo,Categoria,Descrição,Valor,Vencimento,Pagamento,Status'
    const rows = visible.map(e => `${e.tipo},${e.categoria},"${e.descricao}",${e.valor},${e.dataVenc},${e.dataPag ?? ''},${e.status}`)
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'lancamentos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Contas a Pagar e Receber</h2>
          <p className="text-xs text-gray-500 mt-0.5">Registre todos os lançamentos financeiros e controle seus vencimentos</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
            <Download size={13} /> CSV
          </button>
          <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY_FORM) }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus size={14} /> Novo Lançamento
          </button>
        </div>
      </div>

      {/* Totais rápidos */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Total a Receber</p>
          <p className="text-lg font-bold text-emerald-700">{fmtBRL(totalRec)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Total a Pagar</p>
          <p className="text-lg font-bold text-red-700">{fmtBRL(totalDesp)}</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${totalRec - totalDesp >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500">Resultado</p>
          <p className={`text-lg font-bold ${totalRec - totalDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRec - totalDesp)}</p>
        </div>
      </div>

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap items-center">
        <Filter size={14} className="text-gray-400" />
        {(['todos','receita','despesa'] as const).map(t => (
          <button key={t} onClick={() => setFiltroTipo(t)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroTipo === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200 text-gray-600'}`}>
            {t === 'todos' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
          </button>
        ))}
        <span className="text-gray-300">|</span>
        {(['todos','pago','pendente','atrasado','previsto'] as const).map(s => (
          <button key={s} onClick={() => setFiltroSt(s)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroSt === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>
            {s === 'todos' ? 'Todos status' : STATUS_LABELS[s]}
          </button>
        ))}
        <input type="month" value={filtromes} onChange={e => setFiltroMes(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto" />
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="p-5 border-2 border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-gray-700">{editItem ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
            <button onClick={() => { setShowForm(false); setEditItem(null) }}><X size={16} className="text-gray-400" /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <div className="flex gap-2">
                {(['receita','despesa'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === 'receita' ? CATS_REC[0] : CATS_DESP[0] }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize ${form.tipo === t ? (t === 'receita' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white border-gray-200 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Categoria</label>
              <select className={inp} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                {cats.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className={lbl}>Descrição</label>
              <input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do lançamento" />
            </div>
            <div>
              <label className={lbl}>Valor (R$)</label>
              <input type="number" step="0.01" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Vencimento</label>
              <input type="date" className={inp} value={form.dataVenc} onChange={e => setForm(f => ({ ...f, dataVenc: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                {Object.entries(STATUS_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Data Pagamento</label>
              <input type="date" className={inp} value={form.dataPag ?? ''} onChange={e => setForm(f => ({ ...f, dataPag: e.target.value || undefined }))} />
            </div>
          </div>
          <div className="flex items-center gap-3 mt-3">
            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
              <input type="checkbox" checked={form.recorrente} onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))} className="rounded" />
              Recorrente
            </label>
            {form.recorrente && (
              <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs" value={form.periodicidade ?? 'mensal'}
                onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value as any }))}>
                {['semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual'].map(p => (
                  <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                ))}
              </select>
            )}
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">Salvar</button>
            <button onClick={() => { setShowForm(false); setEditItem(null) }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Tipo','Categoria','Descrição','Valor','Vencimento','Pagamento','Status',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visible.length === 0 ? (
                <tr><td colSpan={8} className="py-10 text-center text-gray-400">Nenhum lançamento encontrado</td></tr>
              ) : visible.map(e => (
                <tr key={e.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${e.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {e.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{e.categoria}</td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{e.descricao}</td>
                  <td className={`px-3 py-2.5 font-bold ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(e.valor)}</td>
                  <td className="px-3 py-2.5 text-gray-500">{fmtDate(e.dataVenc)}</td>
                  <td className="px-3 py-2.5 text-gray-400">{e.dataPag ? fmtDate(e.dataPag) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[e.status]}`}>{STATUS_LABELS[e.status]}</span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      {e.status !== 'pago' && (
                        <button onClick={() => handlePagar(e)} title="Marcar como pago" className="p-1 hover:bg-emerald-50 rounded text-emerald-600"><CheckCircle size={13} /></button>
                      )}
                      <button onClick={() => handleEdit(e)} className="p-1 hover:bg-blue-50 rounded text-blue-500"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
