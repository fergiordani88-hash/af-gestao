// Reutiliza a mesma estrutura do Agro, mas com pjApi.custosFixos
import { useState, useEffect } from 'react'
import { Plus, Trash2, Save } from 'lucide-react'
import { pjApi, type PJCustoFixo } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const CATEGORIAS_PADRAO: Record<string, string[]> = {
  'Custos Recorrentes':  ['Aluguel', 'IPTU/condomínio', 'Energia elétrica', 'Água', 'Internet', 'Telefone', 'Impostos mensais'],
  'Folha de Pagamento':  ['Salários', 'Horas extras', 'Pró-labore', 'Encargos trabalhistas', 'Benefícios', 'Provisão 13°/férias'],
  'Contábil e Legal':    ['Honorários contábeis', 'Consultorias', 'Licenças'],
  'Sistema e Tecnologia':['Sistema de gestão (ERP)', 'Softwares', 'Assinaturas digitais'],
  'Marketing':           ['Redes sociais', 'Tráfego pago', 'Produção de conteúdo'],
  'Operacional Fixo':    ['Combustível administrativo', 'Manutenção de veículos', 'Seguros', 'Fretes fixos'],
  'Bancário e Seguros':  ['Manutenção de conta', 'Manutenção de cartão', 'Seguro patrimonial'],
  'Contratos Recorrentes':['Limpeza', 'Segurança', 'Terceirizações'],
}
const CATEGORIAS = Object.keys(CATEGORIAS_PADRAO)

export function TabCustosFixos({ clientId }: { clientId: string }) {
  const [custos, setCustos] = useState<PJCustoFixo[]>([])
  const [loading, setLoading] = useState(true)
  const [editId, setEditId] = useState<string | null>(null)
  const [editVal, setEditVal] = useState(0)
  const [catAberta, setCatAberta] = useState(CATEGORIAS[0])
  const [novo, setNovo] = useState({ cat: CATEGORIAS[0], item: '', val: 0 })
  const [showNew, setShowNew] = useState(false)
  const load = async () => { setLoading(true); try { setCustos(await pjApi.custosFixos.list(clientId)) } finally { setLoading(false) } }
  useEffect(() => { load() }, [clientId])
  const totalMensal = custos.reduce((s, c) => s + c.valorMensal, 0)
  const inp = 'border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'
  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-gray-900">Custos Fixos</h2><p className="text-xs text-gray-500 mt-0.5">Todos os gastos recorrentes por categoria — mensal e anual</p></div>
        <button onClick={() => setShowNew(!showNew)} className="flex items-center gap-2 border border-gray-200 text-gray-700 rounded-xl px-3 py-2 text-sm font-semibold hover:bg-gray-50"><Plus size={14} /> Item personalizado</button>
      </div>
      <div className="grid grid-cols-3 gap-3">
        {[['Total Mensal', fmtBRL(totalMensal), 'bg-amber-50 border-amber-200'], ['Total Anual', fmtBRL(totalMensal * 12), 'bg-orange-50 border-orange-200'], ['Itens', custos.length, 'bg-white border-gray-100']].map(([l, v, bg]) => (
          <div key={String(l)} className={`rounded-xl border p-4 ${bg}`}><p className="text-xs text-gray-500">{l}</p><p className="text-xl font-bold text-gray-900">{v}</p></div>
        ))}
      </div>
      {showNew && (
        <Card className="p-4 border-2 border-amber-100">
          <div className="grid grid-cols-4 gap-3">
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Categoria</label><select className={inp + ' w-full'} value={novo.cat} onChange={e => setNovo(n => ({ ...n, cat: e.target.value }))}>{CATEGORIAS.map(c => <option key={c}>{c}</option>)}</select></div>
            <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Item</label><input className={inp + ' w-full'} value={novo.item} onChange={e => setNovo(n => ({ ...n, item: e.target.value }))} /></div>
            <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Valor Mensal</label><input type="number" className={inp + ' w-full'} value={novo.val || ''} onChange={e => setNovo(n => ({ ...n, val: +e.target.value }))} /></div>
          </div>
          <div className="flex gap-2 mt-3">
            <button onClick={async () => { if (!novo.item) return; await pjApi.custosFixos.create({ clientId, categoria: novo.cat, item: novo.item, valorMensal: novo.val }); setNovo(n => ({ ...n, item: '', val: 0 })); setShowNew(false); load() }} className="bg-amber-500 text-white rounded-xl px-4 py-2 text-sm font-semibold">Adicionar</button>
            <button onClick={() => setShowNew(false)} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}
      {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
        <div className="space-y-3">
          {CATEGORIAS.map(cat => {
            const items = custos.filter(c => c.categoria === cat)
            const total = items.reduce((s, c) => s + c.valorMensal, 0)
            const missing = CATEGORIAS_PADRAO[cat].filter(i => !items.find(c => c.item === i))
            return (
              <Card key={cat}>
                <button onClick={() => setCatAberta(c => c === cat ? '' : cat)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50">
                  <div className="flex items-center gap-3"><span className="text-xs font-semibold bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full">{cat}</span><span className="text-xs text-gray-500">{items.length} itens</span></div>
                  <div className="flex items-center gap-3"><span className="text-xs text-gray-500">Anual: <strong>{fmtBRL(total * 12)}</strong></span><span className="text-sm font-bold">{fmtBRL(total)}/mês</span></div>
                </button>
                {catAberta === cat && (
                  <div className="border-t">
                    {items.length === 0 ? (
                      <div className="px-4 py-3 text-xs text-gray-400 flex items-center justify-between">
                        <span>Nenhum item</span>
                        <button onClick={async () => { for (const i of CATEGORIAS_PADRAO[cat]) { if (!custos.find(c => c.categoria === cat && c.item === i)) await pjApi.custosFixos.create({ clientId, categoria: cat, item: i, valorMensal: 0 }) } load() }} className="text-xs text-amber-600 font-semibold hover:underline">+ Adicionar padrão</button>
                      </div>
                    ) : (
                      <table className="w-full text-xs">
                        <thead><tr className="bg-gray-50 border-b"><th className="px-4 py-2 text-left text-gray-500 uppercase font-semibold">Item</th><th className="px-4 py-2 text-right text-gray-500 uppercase font-semibold">Mensal</th><th className="px-4 py-2 text-right text-gray-500 uppercase font-semibold">Anual</th><th className="px-4 py-2 w-16"></th></tr></thead>
                        <tbody className="divide-y divide-gray-50">
                          {items.map(item => (
                            <tr key={item.id} className="hover:bg-gray-50/50 group">
                              <td className="px-4 py-2.5 text-gray-700">{item.item}</td>
                              <td className="px-4 py-2.5 text-right">
                                {editId === item.id ? (
                                  <input autoFocus type="number" value={editVal} onChange={e => setEditVal(+e.target.value)} onBlur={async () => { if (item.id) { await pjApi.custosFixos.update(item.id, { valorMensal: editVal }); setEditId(null); load() } }} onKeyDown={async e => { if (e.key === 'Enter' && item.id) { await pjApi.custosFixos.update(item.id, { valorMensal: editVal }); setEditId(null); load() } }} className="w-28 text-right border border-amber-300 rounded-lg px-2 py-1" />
                                ) : (
                                  <button onClick={() => { setEditId(item.id ?? null); setEditVal(item.valorMensal) }} className="font-semibold text-gray-900 hover:text-amber-600 hover:underline">{fmtBRL(item.valorMensal)}</button>
                                )}
                              </td>
                              <td className="px-4 py-2.5 text-right text-gray-600">{fmtBRL(item.valorMensal * 12)}</td>
                              <td className="px-4 py-2.5"><button onClick={() => item.id && pjApi.custosFixos.delete(item.id).then(load)} className="opacity-0 group-hover:opacity-100 p-1.5 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button></td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot><tr className="bg-gray-50 border-t font-bold"><td className="px-4 py-2">Total {cat}</td><td className="px-4 py-2 text-right">{fmtBRL(total)}</td><td className="px-4 py-2 text-right">{fmtBRL(total * 12)}</td><td></td></tr></tfoot>
                      </table>
                    )}
                    {missing.length > 0 && items.length > 0 && (
                      <div className="px-4 py-2 border-t flex flex-wrap gap-1.5">
                        {missing.slice(0, 4).map(i => (
                          <button key={i} onClick={async () => { await pjApi.custosFixos.create({ clientId, categoria: cat, item: i, valorMensal: 0 }); load() }} className="text-xs border border-gray-200 text-gray-500 hover:bg-gray-50 px-2 py-0.5 rounded-lg flex items-center gap-1"><Plus size={10} />{i}</button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
