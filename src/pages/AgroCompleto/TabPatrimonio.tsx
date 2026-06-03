import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Shield } from 'lucide-react'
import { agroApi, type AgroPatrimonio } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const CATEGORIAS = ['Máquinas', 'Equipamentos', 'Veículos', 'Imóveis rurais', 'Imóveis urbanos', 'Rebanho', 'Outros']
const CAT_ICON: Record<string, string> = {
  'Máquinas': '🚜', 'Equipamentos': '⚙️', 'Veículos': '🚛',
  'Imóveis rurais': '🌾', 'Imóveis urbanos': '🏠', 'Rebanho': '🐄', 'Outros': '📦',
}

const EMPTY: Omit<AgroPatrimonio, 'id'> = {
  clientId: '', categoria: 'Máquinas', descricao: '', identificacao: '',
  valorAvaliado: 0, possuiOnus: false, tipoOnus: '', credor: '', valorOnus: 0, obs: '',
}

function PatrimonioModal({ item, clientId, onClose, onSaved }: {
  item?: AgroPatrimonio; clientId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Omit<AgroPatrimonio, 'id'>>(item ? { ...item } : { ...EMPTY, clientId })
  const [saving, setSaving] = useState(false)

  const set = (k: keyof AgroPatrimonio, v: string | number | boolean) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.descricao || !form.valorAvaliado) return
    setSaving(true)
    try {
      if (item?.id) await agroApi.patrimonio.update(item.id, form)
      else await agroApi.patrimonio.create(form as AgroPatrimonio)
      onSaved()
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-200'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{item ? 'Editar Bem' : 'Novo Bem Patrimonial'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Categoria *</label>
              <select className={inp} value={form.categoria} onChange={e => set('categoria', e.target.value)}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Descrição *</label>
              <input className={inp} value={form.descricao} onChange={e => set('descricao', e.target.value)} placeholder="Ex: Trator John Deere 8R 410, Fazenda São Pedro" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Identificação / Localização</label>
              <input className={inp} value={form.identificacao ?? ''} onChange={e => set('identificacao', e.target.value)} placeholder="Placa, matrícula, número" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Avaliado (R$) *</label>
              <input type="number" className={inp} value={form.valorAvaliado || ''} onChange={e => set('valorAvaliado', Number(e.target.value))} />
            </div>
          </div>

          <div className="border-t pt-4">
            <label className="flex items-center gap-2 cursor-pointer mb-3">
              <input type="checkbox" checked={form.possuiOnus} onChange={e => set('possuiOnus', e.target.checked)} className="rounded" />
              <span className="text-sm font-semibold text-gray-700">Possui ônus (alienação, hipoteca, penhor)?</span>
            </label>

            {form.possuiOnus && (
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Tipo de Ônus</label>
                  <input className={inp} value={form.tipoOnus ?? ''} onChange={e => set('tipoOnus', e.target.value)} placeholder="Alienação, Hipoteca..." />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Credor</label>
                  <input className={inp} value={form.credor ?? ''} onChange={e => set('credor', e.target.value)} placeholder="Nome do banco / credor" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">Valor do Ônus (R$)</label>
                  <input type="number" className={inp} value={form.valorOnus || ''} onChange={e => set('valorOnus', Number(e.target.value))} />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</label>
            <input className={inp} value={form.obs ?? ''} onChange={e => set('obs', e.target.value)} placeholder="Informações adicionais" />
          </div>
        </div>

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handleSave} disabled={saving || !form.descricao || !form.valorAvaliado}
            className="flex-1 bg-orange-500 hover:bg-orange-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm">
            {saving ? 'Salvando...' : item ? 'Salvar' : 'Adicionar bem'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export function TabPatrimonio({ clientId }: { clientId: string }) {
  const [items, setItems] = useState<AgroPatrimonio[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AgroPatrimonio | 'new' | null>(null)

  const load = async () => {
    setLoading(true)
    try { setItems(await agroApi.patrimonio.list(clientId)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este bem?')) return
    await agroApi.patrimonio.delete(id)
    load()
  }

  const totalPatrimonio = items.reduce((s, i) => s + i.valorAvaliado, 0)
  const totalOnus = items.reduce((s, i) => s + (i.possuiOnus ? i.valorOnus : 0), 0)
  const totalLivre = totalPatrimonio - totalOnus
  const qtdOnus = items.filter(i => i.possuiOnus).length

  const porCategoria = CATEGORIAS.map(cat => ({
    cat,
    items: items.filter(i => i.categoria === cat),
    total: items.filter(i => i.categoria === cat).reduce((s, i) => s + i.valorAvaliado, 0),
  })).filter(c => c.items.length > 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Relação Patrimonial</h2>
          <p className="text-xs text-gray-500 mt-0.5">Máquinas, equipamentos, veículos, imóveis e rebanho — com ônus</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 bg-orange-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-orange-600">
          <Plus size={15} /> Novo Bem
        </button>
      </div>

      {/* Resumo patrimonial */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: 'Total Patrimonial', value: fmtBRL(totalPatrimonio), color: 'text-orange-700', bg: 'bg-orange-50 border-orange-200' },
          { label: 'Bens com Ônus', value: String(qtdOnus), color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Valor com Ônus', value: fmtBRL(totalOnus), color: 'text-red-700', bg: 'bg-red-50 border-red-200' },
          { label: 'Valor Livre', value: fmtBRL(totalLivre), color: 'text-emerald-700', bg: 'bg-emerald-50 border-emerald-200' },
        ].map(k => (
          <div key={k.label} className={`border rounded-xl p-4 ${k.bg}`}>
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className={`text-lg font-bold ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>

      {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
        <>
          {porCategoria.map(({ cat, items: catItems, total: catTotal }) => (
            <Card key={cat}>
              <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-lg">{CAT_ICON[cat] ?? '📦'}</span>
                  <span className="font-semibold text-gray-900">{cat}</span>
                  <span className="text-xs text-gray-400">{catItems.length} bens</span>
                </div>
                <span className="font-bold text-orange-700">{fmtBRL(catTotal)}</span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b">
                      {['Descrição', 'Identificação', 'Valor Avaliado', 'Ônus', 'Tipo Ônus', 'Credor', 'Valor Ônus', 'Valor Livre', ''].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {catItems.map(item => (
                      <tr key={item.id} className="hover:bg-gray-50/50 group">
                        <td className="px-3 py-2.5 font-medium text-gray-900">{item.descricao}</td>
                        <td className="px-3 py-2.5 text-gray-500">{item.identificacao || '—'}</td>
                        <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(item.valorAvaliado)}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${item.possuiOnus ? 'bg-red-100 text-red-700' : 'bg-emerald-100 text-emerald-700'}`}>
                            {item.possuiOnus ? 'Sim' : 'Não'}
                          </span>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{item.tipoOnus || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{item.credor || '—'}</td>
                        <td className="px-3 py-2.5 text-red-500">{item.possuiOnus ? fmtBRL(item.valorOnus) : '—'}</td>
                        <td className="px-3 py-2.5 font-semibold text-emerald-700">{fmtBRL(item.valorAvaliado - (item.possuiOnus ? item.valorOnus : 0))}</td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                            <button onClick={() => setModal(item)} className="p-1.5 hover:bg-blue-50 text-blue-400 rounded"><Edit2 size={12} /></button>
                            <button onClick={() => item.id && handleDelete(item.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={12} /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}

          {items.length === 0 && (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
              <Shield size={40} className="mx-auto mb-3 text-gray-200" />
              <p className="text-gray-400 text-sm">Nenhum bem cadastrado</p>
            </div>
          )}
        </>
      )}

      {modal && (
        <PatrimonioModal
          item={modal === 'new' ? undefined : modal}
          clientId={clientId}
          onClose={() => setModal(null)}
          onSaved={() => { load(); setModal(null) }}
        />
      )}
    </div>
  )
}
