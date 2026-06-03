import { useState, useEffect } from 'react'
import { Plus, Trash2, TrendingUp } from 'lucide-react'
import { agroApi, type AgroReceita } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const TIPOS = ['Recebimento', 'Antecipação', 'CPR', 'Barter', 'Outros']

export function TabReceitas({ clientId }: { clientId: string }) {
  const [receitas, setReceitas] = useState<AgroReceita[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<AgroReceita, 'id'>>({
    clientId, data: '', origem: '', tipo: 'Recebimento', descricao: '', valor: 0,
  })
  const [saving, setSaving] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setReceitas(await agroApi.receitas.list(clientId)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleAdd = async () => {
    if (!form.data || !form.descricao || !form.valor) return
    setSaving(true)
    try {
      await agroApi.receitas.create({ ...form, clientId })
      setForm(f => ({ ...f, data: '', origem: '', descricao: '', valor: 0 }))
      setShowForm(false)
      load()
    } finally { setSaving(false) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta receita?')) return
    await agroApi.receitas.delete(id)
    load()
  }

  const total = receitas.reduce((s, r) => s + r.valor, 0)
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200 focus:border-emerald-400'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Receitas</h2>
          <p className="text-xs text-gray-500 mt-0.5">Vendas de safra, recebimentos, CPRs, anteciapações</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700">
          <Plus size={15} /> Nova Receita
        </button>
      </div>

      {/* Totais por tipo */}
      {receitas.length > 0 && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
          {TIPOS.map(t => {
            const tot = receitas.filter(r => r.tipo === t).reduce((s, r) => s + r.valor, 0)
            if (!tot) return null
            return (
              <div key={t} className="bg-white border border-gray-100 rounded-xl p-3">
                <p className="text-xs text-gray-500">{t}</p>
                <p className="text-base font-bold text-emerald-700">{fmtBRL(tot)}</p>
              </div>
            )
          })}
        </div>
      )}

      {/* Formulário */}
      {showForm && (
        <Card className="p-4 border-2 border-emerald-100">
          <h3 className="font-semibold text-sm text-gray-700 mb-3">Nova Receita</h3>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Data *</label><input type="date" className={inp} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Origem</label><input className={inp} value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} placeholder="Ex: Cargill, Bunge" /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Tipo</label>
              <select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>
                {TIPOS.map(t => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div className="md:col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Descrição *</label><input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Ex: 50.000 sacas de soja" /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Valor (R$) *</label><input type="number" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: Number(e.target.value) }))} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} disabled={saving || !form.data || !form.descricao || !form.valor}
              className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold disabled:opacity-50">
              {saving ? 'Salvando...' : 'Adicionar'}
            </button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Lista */}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="font-semibold text-sm text-gray-700">Todas as Receitas</span>
          <span className="font-bold text-emerald-700 text-sm">{fmtBRL(total)}</span>
        </div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Data', 'Origem', 'Tipo', 'Descrição', 'Valor', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {receitas.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 group">
                    <td className="px-3 py-2.5 font-medium text-gray-900">{fmtDate(r.data)}</td>
                    <td className="px-3 py-2.5 text-gray-700">{r.origem}</td>
                    <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">{r.tipo}</span></td>
                    <td className="px-3 py-2.5 text-gray-700">{r.descricao}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">{fmtBRL(r.valor)}</td>
                    <td className="px-3 py-2.5">
                      <button onClick={() => r.id && handleDelete(r.id)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={12} /></button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {receitas.length === 0 && (
              <div className="py-12 text-center">
                <TrendingUp size={32} className="mx-auto mb-2 text-gray-200" />
                <p className="text-gray-400 text-sm">Nenhuma receita registrada</p>
              </div>
            )}
          </div>
        )}
        {receitas.length > 0 && (
          <div className="px-4 py-3 border-t bg-gray-50 flex justify-between text-sm font-bold">
            <span>{receitas.length} registros</span>
            <span className="text-emerald-700">{fmtBRL(total)}</span>
          </div>
        )}
      </Card>
    </div>
  )
}
