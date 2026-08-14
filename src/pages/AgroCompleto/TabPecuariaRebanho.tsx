import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react'
import {
  pecStorage, fetchPecuaria, LoteRebanho, CategoriaAnimal,
  CATEGORIA_LABELS, CATEGORIA_GRUPO, UA_EQUIV, calcUA,
} from '../../services/pecuariaStorage'

const GRUPOS = ['Cria', 'Recria', 'Engorda', 'Reprodução']
const CATEGORIAS_GRUPOS: Record<string, CategoriaAnimal[]> = {
  'Cria':       ['bezerro_m', 'bezerro_f'],
  'Recria':     ['desmamado_m', 'desmamado_f', 'garrote', 'novilha_recria'],
  'Engorda':    ['boi_engorda', 'boi_gordo'],
  'Reprodução': ['vaca_prenha', 'vaca_seca', 'novilha_reposicao', 'vaca_descarte', 'touro'],
}

const fmt = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

interface Props { clientId: string }

const novoLote = (): Omit<LoteRebanho, 'id'> => ({
  categoria: 'vaca_prenha', quantidade: 0, idadeMediaMeses: 0, pesoMedioKg: 0, raca: '', obs: '',
})

export function TabPecuariaRebanho({ clientId }: Props) {
  const [lotes, setLotes] = useState<LoteRebanho[]>([])
  const [form, setForm] = useState(novoLote())
  const [editId, setEditId] = useState<string | null>(null)
  const [showForm, setShowForm] = useState(false)

  useEffect(() => { fetchPecuaria(clientId).then(d => setLotes(d.lotes)) }, [clientId])

  async function salvar() {
    if (editId) {
      const atualizado = await pecStorage.saveLote(clientId, { ...form, id: editId })
      setLotes(lotes.map(l => l.id === editId ? (atualizado as LoteRebanho) : l))
    } else {
      const criado = await pecStorage.saveLote(clientId, form)
      setLotes([...lotes, criado as LoteRebanho])
    }
    setForm(novoLote())
    setEditId(null)
    setShowForm(false)
  }

  async function remover(id: string) {
    await pecStorage.deleteLote(id)
    setLotes(lotes.filter(l => l.id !== id))
  }

  function editar(l: LoteRebanho) {
    setForm({ categoria: l.categoria, quantidade: l.quantidade, idadeMediaMeses: l.idadeMediaMeses, pesoMedioKg: l.pesoMedioKg, raca: l.raca ?? '', obs: l.obs ?? '' })
    setEditId(l.id)
    setShowForm(true)
  }

  const uaTotal = calcUA(lotes)
  const totalCab = lotes.reduce((s, l) => s + l.quantidade, 0)

  return (
    <div className="space-y-5">
      {/* Cards de resumo */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {GRUPOS.map(g => {
          const cats = CATEGORIAS_GRUPOS[g]
          const cab = lotes.filter(l => cats.includes(l.categoria)).reduce((s, l) => s + l.quantidade, 0)
          const ua  = lotes.filter(l => cats.includes(l.categoria)).reduce((s, l) => s + l.quantidade * UA_EQUIV[l.categoria], 0)
          return (
            <div key={g} className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <p className="text-xs text-gray-500 font-medium">{g}</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{cab.toLocaleString('pt-BR')}</p>
              <p className="text-xs text-gray-400">cab • {fmt(ua)} UA</p>
            </div>
          )
        })}
      </div>

      {/* Resumo geral */}
      <div className="bg-af-green-pale border border-af-green/20 rounded-2xl p-4 flex flex-wrap gap-6">
        <div>
          <p className="text-xs text-gray-500">Total do Rebanho</p>
          <p className="text-xl font-bold text-af-green">{totalCab.toLocaleString('pt-BR')} cab</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Total UA</p>
          <p className="text-xl font-bold text-af-green">{fmt(uaTotal)} UA</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Peso Médio Estimado do Plantel</p>
          <p className="text-xl font-bold text-af-green">
            {totalCab > 0 ? Math.round(uaTotal * 450 / totalCab) : 0} kg/cab
          </p>
        </div>
      </div>

      {/* Botão adicionar */}
      <div className="flex justify-end">
        <button
          onClick={() => { setShowForm(true); setEditId(null); setForm(novoLote()) }}
          className="flex items-center gap-2 bg-af-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-af-green/90 transition"
        >
          <Plus size={16} /> Adicionar Lote
        </button>
      </div>

      {/* Formulário */}
      {showForm && (
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-5">
          <h3 className="text-sm font-bold text-gray-900 mb-4">{editId ? 'Editar Lote' : 'Novo Lote de Animais'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <div className="md:col-span-2">
              <label className="text-xs text-gray-500 font-medium block mb-1">Categoria</label>
              <select
                value={form.categoria}
                onChange={e => setForm(f => ({ ...f, categoria: e.target.value as CategoriaAnimal }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              >
                {GRUPOS.map(g => (
                  <optgroup key={g} label={g}>
                    {CATEGORIAS_GRUPOS[g].map(c => (
                      <option key={c} value={c}>{CATEGORIA_LABELS[c]}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Quantidade (cab)</label>
              <input type="number" min={0} value={form.quantidade || ''}
                onChange={e => setForm(f => ({ ...f, quantidade: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Idade Média (meses)</label>
              <input type="number" min={0} value={form.idadeMediaMeses || ''}
                onChange={e => setForm(f => ({ ...f, idadeMediaMeses: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Peso Médio (kg)</label>
              <input type="number" min={0} value={form.pesoMedioKg || ''}
                onChange={e => setForm(f => ({ ...f, pesoMedioKg: Number(e.target.value) }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium block mb-1">Raça / Composição</label>
              <input type="text" value={form.raca}
                onChange={e => setForm(f => ({ ...f, raca: e.target.value }))}
                placeholder="Ex: Nelore, Canchim, Cruzado..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
            <div className="md:col-span-3">
              <label className="text-xs text-gray-500 font-medium block mb-1">Observações</label>
              <input type="text" value={form.obs}
                onChange={e => setForm(f => ({ ...f, obs: e.target.value }))}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={salvar} className="flex items-center gap-1.5 bg-af-green text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-af-green/90 transition">
              <Check size={15} /> Salvar
            </button>
            <button onClick={() => { setShowForm(false); setEditId(null); setForm(novoLote()) }}
              className="flex items-center gap-1.5 text-gray-500 border border-gray-200 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
              <X size={15} /> Cancelar
            </button>
          </div>
        </div>
      )}

      {/* Tabela por grupo */}
      {GRUPOS.map(g => {
        const lotesGrupo = lotes.filter(l => CATEGORIA_GRUPO[l.categoria] === g)
        if (lotesGrupo.length === 0) return null
        const totalCabG = lotesGrupo.reduce((s, l) => s + l.quantidade, 0)
        const totalUAG  = lotesGrupo.reduce((s, l) => s + l.quantidade * UA_EQUIV[l.categoria], 0)
        return (
          <div key={g} className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="bg-gray-50 px-4 py-2.5 border-b border-gray-100">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">{g}</p>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left px-4 py-2 font-medium">Categoria</th>
                  <th className="text-right px-4 py-2 font-medium">Qtd</th>
                  <th className="text-right px-4 py-2 font-medium">Idade</th>
                  <th className="text-right px-4 py-2 font-medium">Peso</th>
                  <th className="text-right px-4 py-2 font-medium">UA/cab</th>
                  <th className="text-right px-4 py-2 font-medium">UA Total</th>
                  <th className="text-left px-4 py-2 font-medium">Raça</th>
                  <th className="px-4 py-2"></th>
                </tr>
              </thead>
              <tbody>
                {lotesGrupo.map(l => (
                  <tr key={l.id} className="border-b border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-2.5 font-medium text-gray-800">{CATEGORIA_LABELS[l.categoria]}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{l.quantidade.toLocaleString('pt-BR')}</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{l.idadeMediaMeses}m</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{l.pesoMedioKg} kg</td>
                    <td className="px-4 py-2.5 text-right text-gray-500">{UA_EQUIV[l.categoria]}</td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmt(l.quantidade * UA_EQUIV[l.categoria])}</td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{l.raca}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex gap-1.5 justify-end">
                        <button onClick={() => editar(l)} className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"><Edit2 size={13} /></button>
                        <button onClick={() => remover(l.id)} className="p-1 rounded hover:bg-red-50 text-gray-400 hover:text-red-500"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-50 text-xs font-semibold text-gray-700">
                  <td className="px-4 py-2">Subtotal {g}</td>
                  <td className="px-4 py-2 text-right font-mono">{totalCabG.toLocaleString('pt-BR')}</td>
                  <td colSpan={3}></td>
                  <td className="px-4 py-2 text-right font-mono">{fmt(totalUAG)}</td>
                  <td colSpan={2}></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )
      })}

      {lotes.length === 0 && !showForm && (
        <div className="text-center py-16 text-gray-400">
          <p className="text-base font-medium">Nenhum animal cadastrado</p>
          <p className="text-sm mt-1">Clique em "Adicionar Lote" para iniciar o inventário do rebanho</p>
        </div>
      )}
    </div>
  )
}
