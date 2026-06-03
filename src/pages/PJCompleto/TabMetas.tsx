import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, Target, CheckCircle, AlertTriangle, Clock } from 'lucide-react'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer } from 'recharts'
import { questionarioApi, type Meta } from '../../services/questionarioApi'
import { pjApi } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string) => new Date(d).toLocaleDateString('pt-BR')

const INDICADORES_PJ = [
  { key: 'margLiq',    label: 'Margem Líquida',         unidade: '%',  min: 0,  max: 30  },
  { key: 'margEbitda', label: 'Margem EBITDA',           unidade: '%',  min: 0,  max: 40  },
  { key: 'margBruta',  label: 'Margem Bruta',            unidade: '%',  min: 0,  max: 60  },
  { key: 'liquidezC',  label: 'Liquidez Corrente',       unidade: 'x',  min: 0,  max: 4   },
  { key: 'cobDivida',  label: 'Cobertura da Dívida',     unidade: 'x',  min: 0,  max: 8   },
  { key: 'sobraCaixa', label: 'Sobra de Caixa',          unidade: 'R$', min: 0,  max: null},
  { key: 'ebitda',     label: 'EBITDA',                  unidade: 'R$', min: 0,  max: null},
  { key: 'receitaBruta',label:'Receita Bruta',           unidade: 'R$', min: 0,  max: null},
  { key: 'peBS',       label: 'Ponto de Equilíbrio',     unidade: 'R$', min: 0,  max: null},
]

const STATUS_INFO: Record<string, { label: string; icon: React.ElementType; cor: string }> = {
  em_andamento: { label: 'Em andamento', icon: Clock,         cor: 'text-blue-600 bg-blue-50 border-blue-200' },
  atingida:     { label: 'Atingida ✅',   icon: CheckCircle,   cor: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  nao_atingida: { label: 'Não atingida',  icon: AlertTriangle, cor: 'text-red-600 bg-red-50 border-red-200' },
}

export function TabMetas({ clientId }: { clientId: string }) {
  const [metas,     setMetas]     = useState<Meta[]>([])
  const [ind,       setInd]       = useState<any>(null)
  const [loading,   setLoading]   = useState(true)
  const [showForm,  setShowForm]  = useState(false)
  const [editMeta,  setEditMeta]  = useState<Meta | null>(null)
  const [form, setForm] = useState<Omit<Meta, 'id'>>({
    clientId, tipo: 'pj', indicador: 'margLiq', label: 'Margem Líquida',
    valorMeta: 0, unidade: '%', prazo: '', status: 'em_andamento',
  })

  const load = async () => {
    setLoading(true)
    try {
      const [m, i] = await Promise.all([
        questionarioApi.metas.list(clientId),
        pjApi.dre.indicadores(clientId),
      ])
      setMetas(m); setInd(i)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleSave = async () => {
    if (!form.prazo || !form.valorMeta) return
    if (editMeta?.id) {
      await questionarioApi.metas.update(editMeta.id, form)
      setEditMeta(null)
    } else {
      await questionarioApi.metas.create({ ...form, clientId })
    }
    setShowForm(false)
    load()
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir esta meta?')) return
    await questionarioApi.metas.delete(id)
    load()
  }

  const handleStatusChange = async (id: string, status: string) => {
    await questionarioApi.metas.update(id, { status })
    load()
  }

  // Valor atual de cada indicador
  const valorAtual = (key: string): number | null => {
    if (!ind?.indicadores) return null
    const v = ind.indicadores[key]
    return typeof v === 'number' ? v : null
  }

  // Progresso da meta (0-100%)
  const progresso = (meta: Meta): number => {
    const atual = valorAtual(meta.indicador)
    if (atual === null || meta.valorMeta === 0) return 0
    const p = (atual / meta.valorMeta) * 100
    return Math.min(100, Math.max(0, p))
  }

  // Radar chart data
  const radarData = INDICADORES_PJ.filter(i => metas.find(m => m.indicador === i.key)).map(i => {
    const meta = metas.find(m => m.indicador === i.key)
    const atual = valorAtual(i.key)
    const metaV = meta?.valorMeta ?? 0
    return {
      indicador: i.label.substring(0, 12),
      meta:  metaV,
      atual: Math.min(atual ?? 0, metaV * 1.5),
    }
  })

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  const metasAtingidas = metas.filter(m => m.status === 'atingida').length
  const metasPendentes = metas.filter(m => m.status === 'em_andamento' && new Date(m.prazo) < new Date()).length

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Metas de Indicadores</h2>
          <p className="text-xs text-gray-500 mt-0.5">Defina metas financeiras e acompanhe o progresso em tempo real</p>
        </div>
        <button onClick={() => { setShowForm(true); setEditMeta(null) }}
          className="flex items-center gap-2 bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-700">
          <Plus size={14} /> Nova Meta
        </button>
      </div>

      {/* Resumo */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total de Metas', value: metas.length, cor: 'bg-blue-50 border-blue-200' },
          { label: 'Metas Atingidas', value: metasAtingidas, cor: 'bg-emerald-50 border-emerald-200' },
          { label: 'Prazo Vencido', value: metasPendentes, cor: metasPendentes > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-100' },
        ].map(k => (
          <div key={k.label} className={`rounded-xl border p-4 ${k.cor}`}>
            <p className="text-xs text-gray-500">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
          </div>
        ))}
      </div>

      {/* Radar chart */}
      {radarData.length >= 3 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Radar — Meta vs. Atual</h3>
          <ResponsiveContainer width="100%" height={220}>
            <RadarChart data={radarData}>
              <PolarGrid />
              <PolarAngleAxis dataKey="indicador" tick={{ fontSize: 10 }} />
              <Radar dataKey="meta"  stroke="#1565C0" fill="#1565C0" fillOpacity={0.1} name="Meta" />
              <Radar dataKey="atual" stroke="#1B5E20" fill="#1B5E20" fillOpacity={0.2} name="Atual" />
            </RadarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {/* Formulário */}
      {showForm && (
        <Card className="p-5 border-2 border-blue-100">
          <h3 className="font-semibold text-sm text-gray-700 mb-4">{editMeta ? 'Editar Meta' : 'Nova Meta'}</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="col-span-2">
              <label className={lbl}>Indicador</label>
              <select className={inp} value={form.indicador} onChange={e => {
                const ind = INDICADORES_PJ.find(i => i.key === e.target.value)
                setForm(f => ({ ...f, indicador: e.target.value, label: ind?.label ?? '', unidade: ind?.unidade ?? '%' }))
              }}>
                {INDICADORES_PJ.map(i => <option key={i.key} value={i.key}>{i.label}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Valor da Meta ({form.unidade})</label>
              <input type="number" step="0.1" className={inp} value={form.valorMeta || ''} onChange={e => setForm(f => ({ ...f, valorMeta: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Prazo</label>
              <input type="date" className={inp} value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Observação</label>
              <input className={inp} value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} placeholder="Contexto da meta..." />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} className="bg-blue-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-blue-700">Salvar Meta</button>
            <button onClick={() => { setShowForm(false); setEditMeta(null) }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Lista de metas */}
      {loading ? <div className="py-8 text-center text-gray-400 text-sm">Carregando...</div> : (
        <div className="space-y-3">
          {metas.map(meta => {
            const atual = valorAtual(meta.indicador)
            const prog  = progresso(meta)
            const st    = STATUS_INFO[meta.status] ?? STATUS_INFO.em_andamento
            const vencido = meta.status === 'em_andamento' && new Date(meta.prazo) < new Date()
            return (
              <Card key={meta.id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <p className="font-semibold text-gray-900">{meta.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">Prazo: {fmtDate(meta.prazo)} {vencido && <span className="text-red-500 font-medium">— Vencida!</span>}</p>
                    {meta.obs && <p className="text-xs text-gray-400 mt-0.5">{meta.obs}</p>}
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${st.cor}`}>{st.label}</span>
                    <button onClick={() => { setEditMeta(meta); setForm({ ...meta }); setShowForm(true) }} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-400"><Edit2 size={12} /></button>
                    <button onClick={() => meta.id && handleDelete(meta.id)} className="p-1.5 hover:bg-red-50 rounded-lg text-red-400"><Trash2 size={12} /></button>
                  </div>
                </div>

                {/* Barra de progresso */}
                <div className="mb-3">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>Atual: <strong className="text-gray-900">
                      {atual !== null
                        ? meta.unidade === 'R$' ? fmtBRL(atual)
                        : meta.unidade === '%' ? `${(atual * 100).toFixed(1)}%`
                        : `${atual.toFixed(2)}${meta.unidade}`
                        : '—'}
                    </strong></span>
                    <span>Meta: <strong className="text-blue-700">
                      {meta.unidade === 'R$' ? fmtBRL(meta.valorMeta)
                       : meta.unidade === '%' ? `${meta.valorMeta}%`
                       : `${meta.valorMeta}${meta.unidade}`}
                    </strong></span>
                    <span className={`font-bold ${prog >= 100 ? 'text-emerald-600' : prog >= 70 ? 'text-amber-600' : 'text-red-500'}`}>{prog.toFixed(0)}%</span>
                  </div>
                  <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${prog >= 100 ? 'bg-emerald-500' : prog >= 70 ? 'bg-amber-400' : 'bg-blue-500'}`}
                      style={{ width: `${prog}%` }} />
                  </div>
                </div>

                {/* Atualizar status */}
                <div className="flex gap-2">
                  {['em_andamento', 'atingida', 'nao_atingida'].map(s => (
                    <button key={s} onClick={() => meta.id && handleStatusChange(meta.id, s)}
                      className={`px-2 py-1 rounded-lg text-xs font-medium transition-all ${meta.status === s ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
                      {s === 'em_andamento' ? '📊 Em andamento' : s === 'atingida' ? '✅ Atingida' : '❌ Não atingida'}
                    </button>
                  ))}
                </div>
              </Card>
            )
          })}
          {metas.length === 0 && (
            <div className="py-12 text-center text-gray-400">
              <Target size={36} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhuma meta cadastrada</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
