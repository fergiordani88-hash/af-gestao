import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, DollarSign } from 'lucide-react'
import { agroApi, type AgroCustoFixo } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const CATEGORIAS_PADRAO: Record<string, string[]> = {
  'Custos Recorrentes':        ['Arrendamento', 'CCIR/ITR', 'Energia elétrica', 'Água', 'Internet', 'Telefone', 'Impostos mensais'],
  'Folha de Pagamento':        ['Salários', 'Horas extras', 'Pró-labore', 'Encargos trabalhistas', 'Benefícios', 'Provisão 13°/férias'],
  'Contábil e Legal':          ['Honorários contábeis', 'Consultorias', 'Licenças obrigatórias'],
  'Sistema e Tecnologia':      ['Sistema de gestão', 'Softwares', 'Assinaturas', 'Hospedagem'],
  'Marketing':                 ['Redes sociais', 'Tráfego pago', 'Ferramentas de automação', 'Produção de conteúdo'],
  'Operacional Fixo':          ['Combustível (uso administrativo)', 'Manutenção de veículos', 'Seguro de veículos', 'Fretes fixos'],
  'Bancário e Seguros':        ['Manutenção de conta', 'Manutenção de cartão', 'Seguro patrimonial', 'Seguro de vida', 'Consórcio'],
  'Contratos Recorrentes':     ['Outros contratos recorrentes'],
}

const CATEGORIAS = Object.keys(CATEGORIAS_PADRAO)
const CAT_COLOR: Record<string, string> = {
  'Custos Recorrentes':   'bg-green-100 text-green-700',
  'Folha de Pagamento':   'bg-orange-100 text-orange-700',
  'Contábil e Legal':     'bg-blue-100 text-blue-700',
  'Sistema e Tecnologia': 'bg-purple-100 text-purple-700',
  'Marketing':            'bg-pink-100 text-pink-700',
  'Operacional Fixo':     'bg-amber-100 text-amber-700',
  'Bancário e Seguros':   'bg-teal-100 text-teal-700',
  'Contratos Recorrentes':'bg-gray-100 text-gray-700',
}

export function TabCustosFixos({ clientId }: { clientId: string }) {
  const [custos, setCustos] = useState<AgroCustoFixo[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState(0)
  const [categoriaAberta, setCategoriaAberta] = useState<string>(CATEGORIAS[0])
  const [novoItem, setNovoItem] = useState({ categoria: CATEGORIAS[0], item: '', valorMensal: 0 })
  const [showNew, setShowNew] = useState(false)

  const load = async () => {
    setLoading(true)
    try { setCustos(await agroApi.custosFixos.list(clientId)) }
    finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleSaveEdit = async (id: string) => {
    await agroApi.custosFixos.update(id, { valorMensal: editVal })
    setEditId(null)
    load()
  }

  const handleDelete = async (id: string) => {
    await agroApi.custosFixos.delete(id)
    load()
  }

  const handleAdd = async () => {
    if (!novoItem.item) return
    await agroApi.custosFixos.create({ ...novoItem, clientId })
    setNovoItem(n => ({ ...n, item: '', valorMensal: 0 }))
    setShowNew(false)
    load()
  }

  const handleAddPadrao = async (cat: string) => {
    const itens = CATEGORIAS_PADRAO[cat]
    for (const item of itens) {
      if (!custos.find(c => c.categoria === cat && c.item === item)) {
        await agroApi.custosFixos.create({ clientId, categoria: cat, item, valorMensal: 0 })
      }
    }
    load()
  }

  const totalMensal = custos.reduce((s, c) => s + c.valorMensal, 0)
  const totalAnual = totalMensal * 12

  const custoPorCategoria = CATEGORIAS.map(cat => ({
    cat,
    items: custos.filter(c => c.categoria === cat),
    total: custos.filter(c => c.categoria === cat).reduce((s, c) => s + c.valorMensal, 0),
  }))

  const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200 focus:border-amber-400'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Custos Fixos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Todos os custos recorrentes por categoria — mensal e anual</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50">
            <Plus size={14} /> Item personalizado
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
          <p className="text-xs text-amber-600">Total Mensal</p>
          <p className="text-xl font-bold text-amber-800">{fmtBRL(totalMensal)}</p>
        </div>
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
          <p className="text-xs text-orange-600">Total Anual</p>
          <p className="text-xl font-bold text-orange-800">{fmtBRL(totalAnual)}</p>
        </div>
        <div className="bg-white border border-gray-100 rounded-xl p-4">
          <p className="text-xs text-gray-500">Itens Cadastrados</p>
          <p className="text-xl font-bold text-gray-900">{custos.length}</p>
        </div>
      </div>

      {/* Novo item personalizado */}
      {showNew && (
        <Card className="p-4 border-2 border-amber-100">
          <div className="grid grid-cols-4 gap-3">
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Categoria</label>
              <select className={inp + ' w-full'} value={novoItem.categoria} onChange={e => setNovoItem(n => ({ ...n, categoria: e.target.value }))}>
                {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
            <div className="col-span-2">
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Item</label>
              <input className={inp + ' w-full'} value={novoItem.item} onChange={e => setNovoItem(n => ({ ...n, item: e.target.value }))} placeholder="Descrição do custo" />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Valor Mensal (R$)</label>
              <input type="number" className={inp + ' w-full'} value={novoItem.valorMensal || ''} onChange={e => setNovoItem(n => ({ ...n, valorMensal: Number(e.target.value) }))} />
            </div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={handleAdd} className="bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-amber-600">Adicionar</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Categorias */}
      {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
        <div className="space-y-3">
          {custoPorCategoria.map(({ cat, items, total: catTotal }) => (
            <Card key={cat}>
              <button
                onClick={() => setCategoriaAberta(c => c === cat ? '' : cat)}
                className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50"
              >
                <div className="flex items-center gap-3">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${CAT_COLOR[cat] ?? 'bg-gray-100 text-gray-600'}`}>{cat}</span>
                  <span className="text-xs text-gray-500">{items.length} itens</span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-xs text-gray-500">Anual: <strong>{fmtBRL(catTotal * 12)}</strong></span>
                  <span className="text-sm font-bold text-gray-900">{fmtBRL(catTotal)}/mês</span>
                </div>
              </button>

              {categoriaAberta === cat && (
                <div className="border-t border-gray-100">
                  {items.length === 0 ? (
                    <div className="px-4 py-3 text-xs text-gray-400 flex items-center justify-between">
                      <span>Nenhum item nesta categoria</span>
                      <button onClick={() => handleAddPadrao(cat)} className="text-xs text-amber-600 font-semibold hover:underline">
                        + Adicionar itens padrão
                      </button>
                    </div>
                  ) : (
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-gray-50 border-b">
                          <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Item</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Mensal (R$)</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Anual (R$)</th>
                          <th className="px-4 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => (
                          <tr key={item.id} className="hover:bg-gray-50/50 group">
                            <td className="px-4 py-2.5 text-gray-700">{item.item}</td>
                            <td className="px-4 py-2.5 text-right">
                              {editId === item.id ? (
                                <input
                                  autoFocus
                                  type="number"
                                  value={editVal}
                                  onChange={e => setEditVal(Number(e.target.value))}
                                  onBlur={() => item.id && handleSaveEdit(item.id)}
                                  onKeyDown={e => e.key === 'Enter' && item.id && handleSaveEdit(item.id)}
                                  className="w-28 text-right border border-amber-300 rounded-lg px-2 py-1 text-sm"
                                />
                              ) : (
                                <button
                                  onClick={() => { setEditId(item.id ?? null); setEditVal(item.valorMensal) }}
                                  className="font-semibold text-gray-900 hover:text-amber-600 hover:underline"
                                >
                                  {fmtBRL(item.valorMensal)}
                                </button>
                              )}
                            </td>
                            <td className="px-4 py-2.5 text-right text-gray-600">{fmtBRL(item.valorMensal * 12)}</td>
                            <td className="px-4 py-2.5">
                              <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
                                {editId === item.id && (
                                  <button onClick={() => item.id && handleSaveEdit(item.id)} className="p-1.5 text-af-green hover:bg-af-green-pale rounded"><Save size={12} /></button>
                                )}
                                <button onClick={() => item.id && handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t font-bold">
                          <td className="px-4 py-2">Total {cat}</td>
                          <td className="px-4 py-2 text-right">{fmtBRL(catTotal)}</td>
                          <td className="px-4 py-2 text-right">{fmtBRL(catTotal * 12)}</td>
                          <td></td>
                        </tr>
                      </tfoot>
                    </table>
                  )}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Total geral */}
      {custos.length > 0 && (
        <div className="bg-amber-50 border-2 border-amber-200 rounded-2xl p-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <DollarSign size={24} className="text-amber-600" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Total de Custos Fixos</p>
              <p className="text-xs text-amber-600">Soma de todas as categorias</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-xs text-amber-600">Mensal</p>
            <p className="text-2xl font-bold text-amber-800">{fmtBRL(totalMensal)}</p>
            <p className="text-xs text-amber-600 mt-1">Anual: <strong>{fmtBRL(totalAnual)}</strong></p>
          </div>
        </div>
      )}
    </div>
  )
}
