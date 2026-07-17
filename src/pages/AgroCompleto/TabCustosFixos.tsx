import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, DollarSign, Sprout, Edit2, X } from 'lucide-react'
import { agroApi, type AgroCustoFixo, type AgroProducao } from '../../services/agroApi'
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

type EditState = { id: string; item: string; categoria: string; valorMensal: number; diaVencimento: number }

// Itens de folha que geram provisão de 13º e férias
const ITENS_BASE_FOLHA = ['Salários', 'Horas extras', 'Pró-labore']

// Alíquotas de provisão (mensal sobre salário base)
const ALIQ_13 = 1 / 12          // 8,33%
const ALIQ_FERIAS = (1 / 12) * (4 / 3) // 11,11% (férias + 1/3)
const ALIQ_TOTAL = ALIQ_13 + ALIQ_FERIAS // 19,44%

// Linha da tabela em modo edição
function EditRow({ es, onSave, onCancel, onChange }: {
  es: EditState
  onSave: () => void
  onCancel: () => void
  onChange: (patch: Partial<EditState>) => void
}) {
  return (
    <>
      <td className="px-4 py-2" colSpan={2}>
        <div className="flex gap-2 items-center">
          <select
            className="border border-amber-300 rounded-lg px-2 py-1 text-xs"
            value={es.categoria}
            onChange={e => onChange({ categoria: e.target.value })}
          >
            {CATEGORIAS.map(c => <option key={c}>{c}</option>)}
          </select>
          <input
            autoFocus
            className="flex-1 border border-amber-300 rounded-lg px-2 py-1 text-xs"
            value={es.item}
            onChange={e => onChange({ item: e.target.value })}
            placeholder="Nome do item"
            onKeyDown={e => e.key === 'Enter' && onSave()}
          />
          <input
            type="number"
            className="w-28 text-right border border-amber-300 rounded-lg px-2 py-1 text-xs"
            value={es.valorMensal || ''}
            onChange={e => onChange({ valorMensal: Number(e.target.value) })}
            onKeyDown={e => e.key === 'Enter' && onSave()}
          />
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-400">Dia</span>
            <input
              type="number"
              min={1} max={28}
              className="w-14 text-right border border-amber-300 rounded-lg px-2 py-1 text-xs"
              value={es.diaVencimento}
              onChange={e => onChange({ diaVencimento: Math.min(28, Math.max(1, Number(e.target.value))) })}
              onKeyDown={e => e.key === 'Enter' && onSave()}
            />
          </div>
        </div>
      </td>
      <td className="px-4 py-2 text-right text-gray-400 text-xs">
        {fmtBRL((es.valorMensal || 0) * 12)}/ano
      </td>
      <td className="px-4 py-2">
        <div className="flex gap-1 justify-end">
          <button onClick={onSave} className="p-1.5 text-green-600 hover:bg-green-50 rounded" title="Salvar"><Save size={12} /></button>
          <button onClick={onCancel} className="p-1.5 text-gray-400 hover:bg-gray-100 rounded" title="Cancelar"><X size={12} /></button>
        </div>
      </td>
    </>
  )
}

export function TabCustosFixos({ clientId }: { clientId: string }) {
  const [custos, setCustos] = useState<AgroCustoFixo[]>([])
  const [loading, setLoading] = useState(true)
  const [editState, setEditState] = useState<EditState | null>(null)
  const [categoriaAberta, setCategoriaAberta] = useState<string>(CATEGORIAS[0])
  const [novoItem, setNovoItem] = useState({ categoria: CATEGORIAS[0], item: '', valorMensal: 0, diaVencimento: 5 })
  const [showNew, setShowNew] = useState(false)
  const [producoes, setProducoes] = useState<AgroProducao[]>([])
  const [savingProdId, setSavingProdId] = useState<string | null>(null)
  const [datasLocais, setDatasLocais] = useState<Record<string, string>>({})

  // Recalcula e sincroniza "Provisão 13°/férias" a partir da folha base
  const syncProvisao = async (custosAtuais: AgroCustoFixo[]) => {
    const folhaBase = custosAtuais
      .filter(c => c.categoria === 'Folha de Pagamento' && ITENS_BASE_FOLHA.includes(c.item))
      .reduce((s, c) => s + c.valorMensal, 0)

    const valorProvisao = Math.round(folhaBase * ALIQ_TOTAL * 100) / 100
    const existente = custosAtuais.find(c => c.categoria === 'Folha de Pagamento' && c.item === 'Provisão 13°/férias')

    if (existente?.id) {
      if (Math.abs(existente.valorMensal - valorProvisao) > 0.01) {
        await agroApi.custosFixos.update(existente.id, { valorMensal: valorProvisao })
      }
    } else if (valorProvisao > 0) {
      await agroApi.custosFixos.create({ clientId, categoria: 'Folha de Pagamento', item: 'Provisão 13°/férias', valorMensal: valorProvisao })
    }
  }

  const load = async () => {
    setLoading(true)
    try {
      const data = await agroApi.custosFixos.list(clientId)
      await syncProvisao(data)
      setCustos(await agroApi.custosFixos.list(clientId))
    } finally { setLoading(false) }
  }

  const loadProducoes = async () => {
    const data = await agroApi.producao.list(clientId)
    setProducoes(data)
    const map: Record<string, string> = {}
    data.forEach(p => { if (p.id && p.dataPagamento) map[p.id] = p.dataPagamento.slice(0, 10) })
    setDatasLocais(map)
  }

  useEffect(() => { load() }, [clientId])
  useEffect(() => { loadProducoes() }, [clientId])

  const handleSaveDataProd = async (id: string, dataPagamento: string) => {
    setSavingProdId(id)
    try {
      await agroApi.producao.update(id, { dataPagamento: dataPagamento || undefined })
    } finally { setSavingProdId(null) }
  }

  const handleSaveEdit = async () => {
    if (!editState) return
    await agroApi.custosFixos.update(editState.id, {
      item: editState.item,
      categoria: editState.categoria,
      valorMensal: editState.valorMensal,
      diaVencimento: editState.diaVencimento,
    })
    setEditState(null)
    const fresh = await agroApi.custosFixos.list(clientId)
    await syncProvisao(fresh)
    setCustos(fresh)
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este item?')) return
    await agroApi.custosFixos.delete(id)
    const fresh = await agroApi.custosFixos.list(clientId)
    await syncProvisao(fresh)
    setCustos(fresh)
  }

  const handleAdd = async () => {
    if (!novoItem.item) return
    await agroApi.custosFixos.create({ ...novoItem, clientId })
    setNovoItem(n => ({ ...n, item: '', valorMensal: 0 }))
    setShowNew(false)
    const fresh = await agroApi.custosFixos.list(clientId)
    await syncProvisao(fresh)
    setCustos(fresh)
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

  const custosDeProducao = producoes
    .filter(p => p.area > 0 || p.areaArrendada > 0)
    .map(p => {
      const custoPorHaReais = p.custoPorHa * (p.cotacao || 1)
      const custoTotal  = p.area * custoPorHaReais
      const arrendTotal = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
      return { id: p.id!, key: `${p.cultura}-${p.safra}`, cultura: p.cultura, safra: p.safra, custoTotal, arrendTotal, dataPagamento: p.dataPagamento ?? '' }
    })
    .filter(p => p.custoTotal > 0 || p.arrendTotal > 0)

  const totalCustoProducao = custosDeProducao.reduce((s, p) => s + p.custoTotal + p.arrendTotal, 0)
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
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50">
          <Plus size={14} /> Item personalizado
        </button>
      </div>

      {/* Custos de Produção derivados */}
      {custosDeProducao.length > 0 && (
        <Card className="border-2 border-green-100 bg-green-50/40">
          <div className="flex items-center gap-2 px-4 py-3 border-b border-green-100">
            <Sprout size={15} className="text-green-600" />
            <span className="font-semibold text-sm text-green-800">Custos Derivados da Produção</span>
            <span className="text-xs text-green-600 ml-1">— custo total por cultura/safra (COE + arrendamento)</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Cultura</th>
                  <th className="px-4 py-2 text-left font-semibold text-gray-500 uppercase">Safra</th>
                  <th className="px-4 py-2 text-center font-semibold text-gray-500 uppercase">Data Pagamento</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Custo Produção</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Arrendamento</th>
                  <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {custosDeProducao.map(p => (
                  <tr key={p.key} className="hover:bg-gray-50/50">
                    <td className="px-4 py-2.5 font-semibold text-gray-900">{p.cultura}</td>
                    <td className="px-4 py-2.5 text-gray-600">{p.safra}</td>
                    <td className="px-4 py-2.5 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <input
                          type="date"
                          className="border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-green-300 focus:border-green-400"
                          value={datasLocais[p.id] ?? ''}
                          onChange={e => setDatasLocais(prev => ({ ...prev, [p.id]: e.target.value }))}
                          onBlur={e => e.target.value && handleSaveDataProd(p.id, e.target.value)}
                        />
                        {savingProdId === p.id && <span className="text-gray-400 text-xs">salvando...</span>}
                        {!datasLocais[p.id] && <span className="text-amber-500 text-xs" title="Defina a data para aparecer no fluxo">⚠</span>}
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right text-red-600">{fmtBRL(p.custoTotal)}</td>
                    <td className="px-4 py-2.5 text-right text-orange-600">{fmtBRL(p.arrendTotal)}</td>
                    <td className="px-4 py-2.5 text-right font-bold text-gray-900">{fmtBRL(p.custoTotal + p.arrendTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-green-50 border-t font-bold">
                  <td className="px-4 py-2" colSpan={5}>Total Custos de Produção</td>
                  <td className="px-4 py-2 text-right text-green-800">{fmtBRL(totalCustoProducao)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </Card>
      )}

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
          <div className="grid grid-cols-5 gap-3">
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
            <div>
              <label className="text-xs font-semibold text-gray-500 mb-1 block">Dia Vencimento</label>
              <input type="number" min={1} max={28} className={inp + ' w-full'} value={novoItem.diaVencimento} onChange={e => setNovoItem(n => ({ ...n, diaVencimento: Math.min(28, Math.max(1, Number(e.target.value))) }))} />
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
                          <th className="px-4 py-2 text-center font-semibold text-gray-500 uppercase">Venc.</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Mensal (R$)</th>
                          <th className="px-4 py-2 text-right font-semibold text-gray-500 uppercase">Anual (R$)</th>
                          <th className="px-4 py-2 w-20"></th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-50">
                        {items.map(item => {
                          const isEditing = editState?.id === item.id
                          return (
                            <tr key={item.id} className="hover:bg-gray-50/50 group">
                              {isEditing && editState ? (
                                <EditRow
                                  es={editState}
                                  onSave={handleSaveEdit}
                                  onCancel={() => setEditState(null)}
                                  onChange={patch => setEditState(s => s ? { ...s, ...patch } : s)}
                                />
                              ) : (
                                <>
                                  <td className="px-4 py-2.5 text-gray-700">
                                    <span>{item.item}</span>
                                    {item.item === 'Provisão 13°/férias' && (
                                      <span className="ml-2 text-xs bg-orange-100 text-orange-600 px-1.5 py-0.5 rounded-full font-medium" title="13°: 8,33% + Férias+1/3: 11,11% sobre Salários, Horas extras e Pró-labore">
                                        auto 19,44%
                                      </span>
                                    )}
                                  </td>
                                  <td className="px-4 py-2.5 text-center text-gray-500 text-xs">
                                    dia {(item as any).diaVencimento ?? 5}
                                  </td>
                                  <td className="px-4 py-2.5 text-right font-semibold text-gray-900">{fmtBRL(item.valorMensal)}</td>
                                  <td className="px-4 py-2.5 text-right text-gray-600">{fmtBRL(item.valorMensal * 12)}</td>
                                  <td className="px-4 py-2.5">
                                    <div className="flex gap-1 justify-end opacity-0 group-hover:opacity-100">
                                      <button
                                        onClick={() => setEditState({ id: item.id!, item: item.item, categoria: item.categoria, valorMensal: item.valorMensal, diaVencimento: (item as any).diaVencimento ?? 5 })}
                                        className="p-1.5 text-blue-400 hover:bg-blue-50 rounded"
                                        title="Editar"
                                      >
                                        <Edit2 size={12} />
                                      </button>
                                      <button onClick={() => item.id && handleDelete(item.id)} className="p-1.5 text-red-400 hover:bg-red-50 rounded" title="Excluir">
                                        <Trash2 size={12} />
                                      </button>
                                    </div>
                                  </td>
                                </>
                              )}
                            </tr>
                          )
                        })}
                      </tbody>
                      <tfoot>
                        <tr className="bg-gray-50 border-t font-bold">
                          <td className="px-4 py-2" colSpan={2}>Total {cat}</td>
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
