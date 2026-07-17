import { useState, useEffect } from 'react'
import { Edit2, X, Save, FileDown } from 'lucide-react'
import { agroApi, type FluxoItem } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'
import { exportarFluxoDiarioPDF } from './FluxoPDF'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')
const toInput = (d: string | Date) => new Date(d).toISOString().slice(0, 10)

interface EditState { id: string; data: string; valor: number }

export function TabFluxoDiario({ clientId }: { clientId: string }) {
  const [fluxo, setFluxo] = useState<FluxoItem[]>([])
  const [saldoInicial, setSaldoInicial] = useState(0)
  const [saldoInputStr, setSaldoInputStr] = useState('0')
  const [loading, setLoading] = useState(true)
  const [filtroTipo, setFiltroTipo] = useState('todos')
  const [filtroAno, setFiltroAno] = useState('todos')
  const [editing, setEditing] = useState<EditState | null>(null)
  const [saving, setSaving] = useState(false)
  const [exportando, setExportando] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const { fluxo: f } = await agroApi.fluxoDiario(clientId, saldoInicial)
      setFluxo(f)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId, saldoInicial])

  const anos = [...new Set(fluxo.map(f => new Date(f.data).getFullYear().toString()))].sort()
  const tipos = [...new Set(fluxo.map(f => f.tipo))].sort()

  const filtered = fluxo.filter(f => {
    const matchTipo = filtroTipo === 'todos' || f.tipo === filtroTipo
    const matchAno  = filtroAno === 'todos' || new Date(f.data).getFullYear().toString() === filtroAno
    return matchTipo && matchAno
  })

  const saldoNegativo = filtered.filter(f => f.saldoFinal < 0).length
  const minimoSaldo = Math.min(...filtered.map(f => f.saldoFinal))

  const startEdit = (f: FluxoItem) => {
    if (!f.id) return
    setEditing({ id: f.id, data: toInput(f.data), valor: f.valor })
  }

  const saveEdit = async () => {
    if (!editing) return
    setSaving(true)
    try {
      await agroApi.despesas.update(editing.id, { data: editing.data, valor: editing.valor })
      setEditing(null)
      load()
    } finally { setSaving(false) }
  }

  const inp = 'border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Fluxo de Caixa Diário</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerado automaticamente a partir de contratos, despesas e receitas</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">Saldo inicial (R$):</label>
          <input
            type="text"
            value={saldoInputStr}
            onChange={e => setSaldoInputStr(e.target.value)}
            onBlur={() => setSaldoInicial(Number(saldoInputStr.replace(/\D/g, '')) || 0)}
            className="w-32 border border-gray-200 rounded-xl px-3 py-1.5 text-sm text-right"
          />
          <button
            onClick={async () => {
              setExportando(true)
              try { await exportarFluxoDiarioPDF(filtered, saldoInicial) }
              finally { setExportando(false) }
            }}
            disabled={exportando || filtered.length === 0}
            className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-3 py-1.5"
          >
            <FileDown size={14} />
            {exportando ? 'Gerando...' : 'Exportar PDF'}
          </button>
        </div>
      </div>

      {saldoNegativo > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-3">
          <span className="text-red-500 text-lg">⚠️</span>
          <div>
            <p className="text-sm font-semibold text-red-800">{saldoNegativo} dias com saldo negativo</p>
            <p className="text-xs text-red-600">Saldo mínimo projetado: {fmtBRL(minimoSaldo)}</p>
          </div>
        </div>
      )}

      {/* Filtros */}
      <div className="flex gap-2 flex-wrap">
        <select value={filtroAno} onChange={e => setFiltroAno(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white">
          <option value="todos">Todos os anos</option>
          {anos.map(a => <option key={a} value={a}>{a}</option>)}
        </select>
        <select value={filtroTipo} onChange={e => setFiltroTipo(e.target.value)} className="border border-gray-200 rounded-xl px-3 py-1.5 text-sm bg-white">
          <option value="todos">Todos os tipos</option>
          {tipos.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      <Card>
        <div className="px-4 py-3 border-b border-gray-100 flex justify-between text-sm">
          <span className="font-semibold text-gray-700">{filtered.length} movimentos</span>
          {filtered.length > 0 && (
            <span className={`font-bold ${filtered[filtered.length - 1]?.saldoFinal >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
              Saldo final: {fmtBRL(filtered[filtered.length - 1]?.saldoFinal ?? 0)}
            </span>
          )}
        </div>

        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Calculando fluxo...</div> : (
          <div className="overflow-x-auto max-h-[60vh]">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white border-b border-gray-100">
                <tr>
                  {['Data', 'Mov.', 'Tipo', 'Origem', 'Descrição', 'Valor', 'Saldo Final', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((f, i) => {
                  const isEditing = editing && f.id && editing.id === f.id
                  const canEdit = !!f.id
                  return (
                    <tr key={i} className={`hover:bg-gray-50/50 ${f.saldoFinal < 0 ? 'bg-red-50/30' : ''} ${isEditing ? 'bg-blue-50/50' : ''}`}>
                      <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">
                        {isEditing
                          ? <input type="date" className={inp} value={editing.data} onChange={e => setEditing(s => s && ({ ...s, data: e.target.value }))} />
                          : fmtDate(f.data)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-1.5 py-0.5 rounded text-xs font-bold ${f.mov === 'ENTRADA' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                          {f.mov === 'ENTRADA' ? '▲' : '▼'} {f.mov}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-gray-600">{f.tipo}</td>
                      <td className="px-3 py-2 text-gray-500">{f.origem}</td>
                      <td className="px-3 py-2 text-gray-700 max-w-xs truncate">{f.descricao}</td>
                      <td className={`px-3 py-2 font-semibold ${f.mov === 'ENTRADA' ? 'text-emerald-700' : 'text-red-600'}`}>
                        {isEditing
                          ? <input type="number" className={inp + ' w-28 text-right'} value={editing.valor} onChange={e => setEditing(s => s && ({ ...s, valor: Number(e.target.value) }))} />
                          : <>{f.mov === 'ENTRADA' ? '+' : '-'}{fmtBRL(f.valor)}</>}
                      </td>
                      <td className={`px-3 py-2 font-bold ${f.saldoFinal >= 0 ? 'text-gray-900' : 'text-red-600'}`}>
                        {fmtBRL(f.saldoFinal)}
                      </td>
                      <td className="px-3 py-2">
                        {isEditing ? (
                          <div className="flex gap-1">
                            <button onClick={saveEdit} disabled={saving} className="p-1.5 bg-blue-100 text-blue-700 rounded hover:bg-blue-200" title="Salvar">
                              <Save size={11} />
                            </button>
                            <button onClick={() => setEditing(null)} className="p-1.5 bg-gray-100 text-gray-600 rounded hover:bg-gray-200" title="Cancelar">
                              <X size={11} />
                            </button>
                          </div>
                        ) : canEdit ? (
                          <button onClick={() => startEdit(f)} className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-blue-50 text-blue-400 rounded" title="Editar data/valor">
                            <Edit2 size={11} />
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            {filtered.length === 0 && (
              <div className="py-12 text-center text-gray-400 text-sm">
                Nenhum movimento — cadastre contratos, despesas ou receitas
              </div>
            )}
          </div>
        )}
      </Card>

      <p className="text-xs text-gray-400 text-center">
        ✏️ Clique no ícone de lápis em qualquer despesa para editar data de pagamento e valor
      </p>
    </div>
  )
}
