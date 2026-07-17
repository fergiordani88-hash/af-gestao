import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingDown, Repeat2, Edit2, X, Save } from 'lucide-react'
import { agroApi, type AgroDespesa } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const TIPOS = ['Custo da atividade', 'Salários', 'Investimento', 'Cartão de crédito', 'Contas comércio', 'Previsões', 'Financeiro', 'Outros']

const TIPO_COLOR: Record<string, string> = {
  'Custo da atividade': 'bg-red-100 text-red-700',
  'Salários':           'bg-orange-100 text-orange-700',
  'Investimento':       'bg-blue-100 text-blue-700',
  'Cartão de crédito':  'bg-purple-100 text-purple-700',
  'Contas comércio':    'bg-amber-100 text-amber-700',
  'Previsões':          'bg-gray-100 text-gray-700',
  'Financeiro':         'bg-pink-100 text-pink-700',
  'Outros':             'bg-slate-100 text-slate-700',
}

function addMonths(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T12:00:00')
  d.setMonth(d.getMonth() + n)
  return d.toISOString().slice(0, 10)
}

const EMPTY = (clientId: string): Omit<AgroDespesa, 'id'> => ({
  clientId, data: '', tipo: 'Custo da atividade', origem: '', descricao: '', valor: 0,
})

export function TabDespesas({ clientId }: { clientId: string }) {
  const [despesas, setDespesas] = useState<AgroDespesa[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<AgroDespesa, 'id'>>(EMPTY(clientId))
  const [editId, setEditId] = useState<string | null>(null)
  const [repetir, setRepetir] = useState(false)
  const [mesesRepetir, setMesesRepetir] = useState(3)
  const [periodicidade, setPeriodicidade] = useState<'mensal' | 'anual'>('mensal')
  const [saving, setSaving] = useState(false)
  const [filtroTipo, setFiltroTipo] = useState('todos')

  const load = async () => {
    setLoading(true)
    try { setDespesas(await agroApi.despesas.list(clientId)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const openNew = () => {
    setEditId(null)
    setForm(EMPTY(clientId))
    setRepetir(false)
    setPeriodicidade('mensal')
    setShowForm(true)
  }

  const openEdit = (d: AgroDespesa) => {
    setEditId(d.id ?? null)
    setForm({ clientId, data: d.data.toString().slice(0, 10), tipo: d.tipo, origem: d.origem, descricao: d.descricao, valor: d.valor })
    setRepetir(false)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleSave = async () => {
    if (!form.data || !form.descricao || !form.valor) return
    setSaving(true)
    try {
      if (editId) {
        await agroApi.despesas.update(editId, { ...form, clientId })
      } else {
        const total = repetir ? mesesRepetir : 1
        for (let i = 0; i < total; i++) {
          const salto = periodicidade === 'anual' ? i * 12 : i
          await agroApi.despesas.create({ ...form, clientId, data: i === 0 ? form.data : addMonths(form.data, salto) })
        }
      }
      setForm(EMPTY(clientId))
      setShowForm(false)
      setEditId(null)
      setRepetir(false)
      setMesesRepetir(3)
      setPeriodicidade('mensal')
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta despesa?')) return
    await agroApi.despesas.delete(id)
    load()
  }

  const filtered = filtroTipo === 'todos' ? despesas : despesas.filter(d => d.tipo === filtroTipo)
  const total = filtered.reduce((s, d) => s + d.valor, 0)
  const porTipo = TIPOS.map(t => ({ tipo: t, total: despesas.filter(d => d.tipo === t).reduce((s, d) => s + d.valor, 0) })).filter(t => t.total > 0)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200 focus:border-red-400'

  const datasPreview = repetir && form.data
    ? Array.from({ length: mesesRepetir }, (_, i) => {
        const salto = periodicidade === 'anual' ? i * 12 : i
        return i === 0 ? form.data : addMonths(form.data, salto)
      })
    : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Despesas — Não Bancárias</h2>
          <p className="text-xs text-gray-500 mt-0.5">Salários, custos de atividade, investimentos, cartões, etc.</p>
        </div>
        <button onClick={openNew} className="flex items-center gap-2 bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-700">
          <Plus size={15} /> Nova Despesa
        </button>
      </div>

      {/* Resumo por tipo */}
      {porTipo.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {porTipo.map(t => (
            <button key={t.tipo} onClick={() => setFiltroTipo(f => f === t.tipo ? 'todos' : t.tipo)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${filtroTipo === t.tipo ? 'border-red-400 bg-red-50' : 'border-gray-100 bg-white hover:border-gray-200'}`}>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${TIPO_COLOR[t.tipo] ?? 'bg-gray-100 text-gray-600'}`}>{t.tipo}</span>
              <p className="text-base font-bold text-gray-900 mt-2">{fmtBRL(t.total)}</p>
            </button>
          ))}
        </div>
      )}

      {/* Formulário (novo ou edição) */}
      {showForm && (
        <Card className={`p-4 border-2 ${editId ? 'border-blue-100' : 'border-red-100'}`}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-sm text-gray-700">
              {editId ? '✏️ Editar Despesa' : 'Nova Despesa'}
            </h3>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="text-gray-400 hover:text-gray-600"><X size={15} /></button>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Data *</label>
              <input type="date" className={inp} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Tipo *</label>
              <select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Origem</label>
              <input className={inp} value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} placeholder="Ex: Posto, Fornecedor" />
            </div>
            <div className="md:col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Descrição *</label>
              <input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: Salários março" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor (R$) *</label>
              <input type="number" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} />
            </div>
          </div>

          {/* Repetição — só para novo lançamento */}
          {!editId && (
            <div className="mt-4 border border-dashed border-red-200 rounded-xl p-3 bg-red-50/40">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={repetir} onChange={e => setRepetir(e.target.checked)} className="w-4 h-4 accent-red-600" />
                <Repeat2 size={14} className="text-red-500" />
                <span className="text-sm font-semibold text-red-700">Repetir por vários meses</span>
              </label>
              {repetir && (
                <div className="mt-3 flex items-center gap-4 flex-wrap">
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600">Periodicidade:</label>
                    <select
                      value={periodicidade}
                      onChange={e => setPeriodicidade(e.target.value as 'mensal' | 'anual')}
                      className="border border-red-300 rounded-lg px-2 py-1 text-sm"
                    >
                      <option value="mensal">Mensal</option>
                      <option value="anual">Anual</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <label className="text-xs font-semibold text-gray-600">
                      Quantidade ({periodicidade === 'anual' ? 'anos' : 'meses'}):
                    </label>
                    <input
                      type="number" min={2} max={periodicidade === 'anual' ? 20 : 60} value={mesesRepetir}
                      onChange={e => setMesesRepetir(Math.max(2, Math.min(periodicidade === 'anual' ? 20 : 60, Number(e.target.value))))}
                      className="w-20 border border-red-300 rounded-lg px-2 py-1 text-sm text-center"
                    />
                  </div>
                  {datasPreview.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-gray-500 mr-1">Datas:</span>
                      {datasPreview.map((d, i) => (
                        <span key={i} className="text-xs bg-white border border-red-200 text-red-700 rounded px-1.5 py-0.5">
                          {new Date(d + 'T12:00:00').toLocaleDateString('pt-BR', periodicidade === 'anual' ? { year: 'numeric' } : { month: 'short', year: '2-digit' })}
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-xs text-red-600 font-semibold w-full">
                    {mesesRepetir} lançamentos — {fmtBRL(form.valor * mesesRepetir)} no total
                  </p>
                </div>
              )}
            </div>
          )}

          <div className="flex gap-2 mt-3">
            <button
              onClick={handleSave}
              disabled={saving || !form.data || !form.descricao || !form.valor}
              className={`flex items-center gap-2 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50 ${editId ? 'bg-blue-600 hover:bg-blue-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {saving ? 'Salvando...' : editId ? <><Save size={14} /> Salvar alterações</> : repetir ? `Criar ${mesesRepetir} lançamentos (${periodicidade})` : 'Adicionar'}
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null) }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-sm text-gray-700">
              {filtroTipo === 'todos' ? 'Todas as Despesas' : filtroTipo}
            </span>
            {filtroTipo !== 'todos' && (
              <button onClick={() => setFiltroTipo('todos')} className="text-xs text-gray-400 hover:text-gray-600">× limpar filtro</button>
            )}
          </div>
          <span className="font-bold text-red-600 text-sm">{fmtBRL(total)}</span>
        </div>

        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Data', 'Tipo', 'Origem', 'Descrição', 'Valor', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(d => (
                  <tr key={d.id} className={`hover:bg-gray-50/50 group ${editId === d.id ? 'bg-blue-50/40' : ''}`}>
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{fmtDate(d.data)}</td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${TIPO_COLOR[d.tipo] ?? 'bg-gray-100 text-gray-600'}`}>{d.tipo}</span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{d.origem}</td>
                    <td className="px-3 py-2.5 text-gray-700">{d.descricao}</td>
                    <td className="px-3 py-2.5 font-bold text-red-600">{fmtBRL(d.valor)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => openEdit(d)} className="p-1.5 hover:bg-blue-50 text-blue-400 rounded" title="Editar">
                          <Edit2 size={12} />
                        </button>
                        <button onClick={() => d.id && handleDelete(d.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded" title="Excluir">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center">
                <TrendingDown size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-gray-400 text-sm">Nenhuma despesa registrada</p>
              </div>
            )}
          </div>
        )}
        {filtered.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between text-sm font-bold">
            <span>{filtered.length} registros</span>
            <span className="text-red-600">{fmtBRL(total)}</span>
          </div>
        )}
      </Card>
    </div>
  )
}
