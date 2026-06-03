import { useState, useEffect } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { pjApi, type PJReceita } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')
const TIPOS = ['Venda à vista', 'Venda a prazo', 'Recebimento de clientes', 'Antecipação', 'Outros']

export function TabReceitas({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<PJReceita[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<PJReceita, 'id'>>({ clientId, data: '', origem: '', tipo: 'Recebimento de clientes', descricao: '', valor: 0 })
  const load = async () => { setLoading(true); try { setItems(await pjApi.receitas.list(clientId)) } finally { setLoading(false) } }
  useEffect(() => { load() }, [clientId])
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-200'
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-gray-900">Receitas</h2><p className="text-xs text-gray-500 mt-0.5">Entradas de caixa — vendas, recebimentos e outros</p></div>
        <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-emerald-700"><Plus size={15} /> Nova Receita</button>
      </div>
      {showForm && (
        <Card className="p-4 border-2 border-emerald-100">
          <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Data *</label><input type="date" className={inp} value={form.data} onChange={e => setForm(f => ({ ...f, data: e.target.value }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Origem</label><input className={inp} value={form.origem} onChange={e => setForm(f => ({ ...f, origem: e.target.value }))} placeholder="Ex: Cliente XYZ" /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Tipo</label><select className={inp} value={form.tipo} onChange={e => setForm(f => ({ ...f, tipo: e.target.value }))}>{TIPOS.map(t => <option key={t}>{t}</option>)}</select></div>
            <div className="md:col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Descrição *</label><input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Valor (R$) *</label><input type="number" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={async () => { if (!form.data || !form.descricao || !form.valor) return; await pjApi.receitas.create({ ...form, clientId }); setForm(f => ({ ...f, data: '', origem: '', descricao: '', valor: 0 })); setShowForm(false); load() }} className="bg-emerald-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">Adicionar</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}
      <Card>
        <div className="flex items-center justify-between px-4 py-3 border-b"><span className="font-semibold text-sm text-gray-700">Todas as Receitas</span><span className="font-bold text-emerald-700 text-sm">{fmtBRL(items.reduce((s, r) => s + r.valor, 0))}</span></div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b">{['Data','Origem','Tipo','Descrição','Valor',''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {items.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 group">
                    <td className="px-3 py-2.5 font-medium whitespace-nowrap">{fmtDate(r.data)}</td>
                    <td className="px-3 py-2.5">{r.origem}</td>
                    <td className="px-3 py-2.5"><span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-700">{r.tipo}</span></td>
                    <td className="px-3 py-2.5">{r.descricao}</td>
                    <td className="px-3 py-2.5 font-bold text-emerald-700">{fmtBRL(r.valor)}</td>
                    <td className="px-3 py-2.5"><button onClick={() => r.id && confirm('Excluir?') && pjApi.receitas.delete(r.id).then(load)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={12} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {items.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">Nenhuma receita</div>}
          </div>
        )}
      </Card>
    </div>
  )
}
