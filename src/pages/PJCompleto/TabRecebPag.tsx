import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Activity } from 'lucide-react'
import { pjApi, type PJRecebimento, type PJPagamento } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const FORMAS_RECEB = ['Boleto / Duplicata', 'Cartão débito', 'Cartão crédito', 'PIX / transferência', 'Dinheiro à vista', 'Cheque', 'Crediário']
const FORMAS_PAG   = ['Boleto / prazo', 'Transferência programada', 'Cartão / antecipado', 'À vista / PIX / dinheiro']

interface FormTableProps<T extends PJRecebimento | PJPagamento> {
  title: string; formas: string[]; items: T[]; accentColor: string
  onSave: (item: T) => Promise<void>; onDelete: (id: string) => Promise<void>
  onCreate: (forma: string) => Promise<void>
}

function FormTable<T extends PJRecebimento | PJPagamento>({ title, formas, items, accentColor, onSave, onDelete, onCreate }: FormTableProps<T>) {
  const [local, setLocal] = useState<(T & { dirty?: boolean })[]>([])
  const [saving, setSaving] = useState<string | null>(null)

  useEffect(() => { setLocal(items.map(i => ({ ...i, dirty: false }))) }, [items])

  const set = (idx: number, k: string, v: number | string) => setLocal(l => l.map((r, i) => i === idx ? { ...r, [k]: v, dirty: true } : r))
  const total = local.reduce((s, r) => s + r.percentual, 0)
  const prazoMedio = local.reduce((s, r) => s + r.percentual * r.prazoMedio, 0)
  const missing = formas.filter(f => !local.find(r => r.forma === f))

  return (
    <Card className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-gray-900">{title}</h3>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span>Total: <strong className={total > 1.001 || total < 0.999 ? 'text-red-600' : 'text-emerald-700'}>{(total * 100).toFixed(0)}%</strong> {total > 0.999 && total < 1.001 ? '✓' : '← deve ser 100%'}</span>
          <span>Prazo médio ponderado: <strong>{prazoMedio.toFixed(1)} dias</strong></span>
        </div>
      </div>
      <table className="w-full text-xs">
        <thead>
          <tr className="border-b border-gray-100">
            {['Forma', '% das vendas/compras', 'Prazo médio (dias)', 'Parcelas médias', ''].map(h => (
              <th key={h} className="px-2 py-2 text-left font-semibold text-gray-500 uppercase">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-50">
          {local.map((row, idx) => (
            <tr key={row.id ?? idx} className="group">
              <td className="px-2 py-2 font-medium text-gray-700">{row.forma}</td>
              <td className="px-2 py-2">
                <div className="flex items-center gap-1">
                  <input type="number" step="0.01" min="0" max="1" value={row.percentual || ''} onChange={e => set(idx, 'percentual', +e.target.value)}
                    className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right text-sm" />
                  <span className="text-gray-400">= {(row.percentual * 100).toFixed(0)}%</span>
                </div>
              </td>
              <td className="px-2 py-2">
                <input type="number" value={row.prazoMedio || ''} onChange={e => set(idx, 'prazoMedio', +e.target.value)}
                  className="w-20 border border-gray-200 rounded-lg px-2 py-1 text-right text-sm" />
              </td>
              <td className="px-2 py-2">
                <input type="number" value={row.parcelas || ''} onChange={e => set(idx, 'parcelas', +e.target.value)}
                  className="w-16 border border-gray-200 rounded-lg px-2 py-1 text-right text-sm" />
              </td>
              <td className="px-2 py-2">
                <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                  {row.dirty && <button onClick={async () => { if (!row.id) return; setSaving(row.id); await onSave(row); setSaving(null) }}
                    className="p-1 text-blue-500 hover:bg-blue-50 rounded"><Save size={12} /></button>}
                  <button onClick={() => row.id && onDelete(row.id)} className="p-1 text-red-400 hover:bg-red-50 rounded"><Trash2 size={12} /></button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {missing.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2 pt-3 border-t border-gray-50">
          {missing.map(f => (
            <button key={f} onClick={() => onCreate(f)}
              className="flex items-center gap-1 text-xs border border-gray-200 text-gray-600 hover:bg-gray-50 px-2 py-1 rounded-lg">
              <Plus size={11} /> {f}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

export function TabRecebPag({ clientId }: { clientId: string }) {
  const [receb, setReceb] = useState<PJRecebimento[]>([])
  const [pag,   setPag]   = useState<PJPagamento[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    const [r, p] = await Promise.all([pjApi.recebimentos.list(clientId), pjApi.pagamentos.list(clientId)])
    setReceb(r); setPag(p); setLoading(false)
  }

  useEffect(() => { load() }, [clientId])

  const prazoReceb = receb.reduce((s, r) => s + r.percentual * r.prazoMedio, 0)
  const prazoPag   = pag.reduce((s, p) => s + p.percentual * p.prazoMedio, 0)
  const descasamento = prazoReceb - prazoPag

  if (loading) return <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Recebimentos & Pagamentos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Formas de recebimento e pagamento com prazo médio ponderado</p>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className={`p-4 rounded-xl border ${prazoReceb > 0 ? 'bg-blue-50 border-blue-200' : 'bg-gray-50 border-gray-100'}`}>
          <p className="text-xs text-gray-500">Prazo Médio de Recebimento</p>
          <p className="text-xl font-bold text-blue-800">{prazoReceb.toFixed(1)} dias</p>
          <p className="text-xs text-blue-600 mt-1">% ponderado por forma</p>
        </div>
        <div className={`p-4 rounded-xl border ${prazoPag > 0 ? 'bg-orange-50 border-orange-200' : 'bg-gray-50 border-gray-100'}`}>
          <p className="text-xs text-gray-500">Prazo Médio de Pagamento</p>
          <p className="text-xl font-bold text-orange-800">{prazoPag.toFixed(1)} dias</p>
          <p className="text-xs text-orange-600 mt-1">% ponderado por forma</p>
        </div>
        <div className={`p-4 rounded-xl border ${descasamento > 0 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
          <p className="text-xs text-gray-500">Descasamento</p>
          <p className={`text-xl font-bold ${descasamento > 0 ? 'text-red-800' : 'text-emerald-800'}`}>{descasamento.toFixed(1)} dias</p>
          <p className={`text-xs mt-1 ${descasamento > 0 ? 'text-red-600' : 'text-emerald-600'}`}>
            {descasamento > 0 ? 'Pagamos antes de receber — caixa pressionado' : 'Recebemos antes de pagar — favorável'}
          </p>
        </div>
      </div>

      <FormTable
        title="Formas de Recebimento"
        formas={FORMAS_RECEB}
        items={receb}
        accentColor="blue"
        onSave={async (item) => { if (item.id) await pjApi.recebimentos.update(item.id, item); load() }}
        onDelete={async (id) => { await pjApi.recebimentos.delete(id); load() }}
        onCreate={async (forma) => { await pjApi.recebimentos.create({ clientId, forma, percentual: 0, prazoMedio: 0, parcelas: 1 }); load() }}
      />

      <FormTable
        title="Formas de Pagamento a Fornecedores"
        formas={FORMAS_PAG}
        items={pag}
        accentColor="orange"
        onSave={async (item) => { if (item.id) await pjApi.pagamentos.update(item.id, item); load() }}
        onDelete={async (id) => { await pjApi.pagamentos.delete(id); load() }}
        onCreate={async (forma) => { await pjApi.pagamentos.create({ clientId, forma, percentual: 0, prazoMedio: 0, parcelas: 1 }); load() }}
      />
    </div>
  )
}
