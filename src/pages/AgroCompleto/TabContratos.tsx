import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { agroApi, type AgroContrato, type AgroParcela } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'
import { clsx } from 'clsx'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const MODALIDADES = ['Capital de giro', 'Repactuação', 'Custeio', 'Investimento', 'Investimento CDI', 'BNDES Finame', 'CPR', 'Pronamp', 'Moderfrota', 'Pronaf', 'Outros']
const PERIODICIDADES = ['Mensal', 'Semestral', 'Anual', 'Trimestral', 'Único']

const EMPTY: Omit<AgroContrato, 'id'> = {
  clientId: '', modalidade: 'Capital de giro', banco: '', numeroContrato: '',
  dataContratacao: '', valorTomado: 0, totalParcelas: 1, parcelaAtual: 1,
  periodicidade: 'Mensal', taxa: 0, vencimento: '', valorParcela: 0, obs: '',
}

function ContratoModal({ contrato, clientId, onClose, onSaved }: {
  contrato?: AgroContrato; clientId: string; onClose: () => void; onSaved: () => void
}) {
  const [form, setForm] = useState<Omit<AgroContrato, 'id'>>(
    contrato ? { ...contrato } : { ...EMPTY, clientId }
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const set = (k: keyof AgroContrato, v: string | number) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.banco || !form.dataContratacao || !form.vencimento || !form.valorTomado) {
      setError('Preencha banco, datas e valor tomado')
      return
    }
    setSaving(true); setError('')
    try {
      if (contrato?.id) await agroApi.contratos.update(contrato.id, form)
      else await agroApi.contratos.create(form as AgroContrato)
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar')
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{contrato ? 'Editar Contrato' : 'Novo Contrato de Crédito'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>

        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Modalidade *</label>
            <select className={inp} value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>
              {MODALIDADES.map(m => <option key={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Banco / Instituição *</label>
            <input className={inp} value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: SICOOB, Bradesco, BB" />
          </div>
          <div>
            <label className={lbl}>Nº do Contrato</label>
            <input className={inp} value={form.numeroContrato ?? ''} onChange={e => set('numeroContrato', e.target.value)} placeholder="Ex: 842709" />
          </div>
          <div>
            <label className={lbl}>Data de Contratação *</label>
            <input type="date" className={inp} value={form.dataContratacao?.toString().split('T')[0] ?? ''} onChange={e => set('dataContratacao', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Valor Tomado (R$) *</label>
            <input type="number" className={inp} value={form.valorTomado || ''} onChange={e => set('valorTomado', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Total de Parcelas</label>
            <input type="number" className={inp} value={form.totalParcelas || ''} onChange={e => set('totalParcelas', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Parcela Atual (nº)</label>
            <input type="number" className={inp} value={form.parcelaAtual || ''} onChange={e => set('parcelaAtual', Number(e.target.value))} />
          </div>
          <div>
            <label className={lbl}>Periodicidade</label>
            <select className={inp} value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>
              {PERIODICIDADES.map(p => <option key={p}>{p}</option>)}
            </select>
          </div>
          <div>
            <label className={lbl}>Taxa (% ao período)</label>
            <input type="number" step="0.001" className={inp} value={form.taxa || ''} onChange={e => set('taxa', Number(e.target.value))} placeholder="Ex: 0.016 para 1,6%" />
          </div>
          <div>
            <label className={lbl}>Vencimento da Próxima Parcela *</label>
            <input type="date" className={inp} value={form.vencimento?.toString().split('T')[0] ?? ''} onChange={e => set('vencimento', e.target.value)} />
          </div>
          <div>
            <label className={lbl}>Valor da Parcela (R$)</label>
            <input type="number" className={inp} value={form.valorParcela || ''} onChange={e => set('valorParcela', Number(e.target.value))} />
          </div>
          <div className="col-span-2">
            <label className={lbl}>Observações</label>
            <input className={inp} value={form.obs ?? ''} onChange={e => set('obs', e.target.value)} placeholder="Garantias, condições especiais, etc." />
          </div>
        </div>

        {error && <p className="px-6 pb-2 text-sm text-red-600 flex items-center gap-1"><AlertTriangle size={13} /> {error}</p>}

        <div className="px-6 pb-6 flex gap-3">
          <button onClick={handleSave} disabled={saving}
            className="flex-1 bg-af-green hover:bg-af-green-light disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 text-sm">
            {saving ? 'Salvando...' : contrato ? 'Salvar alterações' : 'Adicionar contrato'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export function TabContratos({ clientId }: { clientId: string }) {
  const [contratos, setContratos] = useState<AgroContrato[]>([])
  const [cronograma, setCronograma] = useState<{ parcelas: AgroParcela[]; porAno: Record<string, { parcelas: number; total: number }>; totalEndividamento: number; totalFuturo: number }>()
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<AgroContrato | 'new' | null>(null)
  const [anoExpandido, setAnoExpandido] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    try {
      const [c, cr] = await Promise.all([
        agroApi.contratos.list(clientId),
        agroApi.contratos.cronograma(clientId),
      ])
      setContratos(c)
      setCronograma(cr)
    } finally { setLoading(false) }
  }

  useEffect(() => { load() }, [clientId])

  const handleDelete = async (id: string) => {
    if (!confirm('Excluir este contrato?')) return
    await agroApi.contratos.delete(id)
    load()
  }

  const anos = cronograma ? Object.keys(cronograma.porAno).sort() : []

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Contratos de Crédito</h2>
          <p className="text-xs text-gray-500 mt-0.5">Lançamento contrato a contrato → cronograma ordenado automático</p>
        </div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 bg-af-green text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-af-green-light">
          <Plus size={15} /> Novo Contrato
        </button>
      </div>

      {/* KPIs */}
      {cronograma && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Contratos', value: String(contratos.length) },
            { label: 'Endividamento Total', value: fmtBRL(cronograma.totalEndividamento) },
            { label: 'Total Futuro (parcelas)', value: fmtBRL(cronograma.totalFuturo) },
            { label: 'Parcelas Restantes', value: String(cronograma.parcelas.length) },
          ].map(k => (
            <div key={k.label} className="bg-white border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className="text-lg font-bold text-gray-900">{k.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Lista de contratos cadastrados */}
      <Card>
        <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Contratos Cadastrados</div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 border-b">
                  {['Modalidade', 'Banco', 'Contrato', 'Contratação', 'Valor Tomado', 'Total Parc.', 'Parc. Atual', 'Period.', 'Taxa', 'Próx. Venc.', 'Valor Parcela', ''].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 group">
                    <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{c.modalidade}</td>
                    <td className="px-3 py-2.5 text-gray-700">{c.banco}</td>
                    <td className="px-3 py-2.5 text-gray-500">{c.numeroContrato ?? '—'}</td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{fmtDate(c.dataContratacao)}</td>
                    <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(c.valorTomado)}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{c.totalParcelas}</td>
                    <td className="px-3 py-2.5 text-center text-gray-700">{c.parcelaAtual}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.periodicidade}</td>
                    <td className="px-3 py-2.5 text-gray-600">{(c.taxa * 100).toFixed(2)}%</td>
                    <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${new Date(c.vencimento) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>
                      {fmtDate(c.vencimento)}
                    </td>
                    <td className="px-3 py-2.5 font-bold text-gray-900">{fmtBRL(c.valorParcela)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                        <button onClick={() => setModal(c)} className="p-1.5 hover:bg-blue-50 text-blue-500 rounded"><Edit2 size={12} /></button>
                        <button onClick={() => c.id && handleDelete(c.id)} className="p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={12} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contratos.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">Nenhum contrato cadastrado</div>}
          </div>
        )}
      </Card>

      {/* Resumo por ano */}
      {cronograma && anos.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">Resumo por Ano</div>
          <div className="divide-y divide-gray-50">
            {anos.map(ano => {
              const info = cronograma.porAno[ano]
              const parcelasAno = cronograma.parcelas.filter(p => new Date(p.vencimento).getFullYear().toString() === ano)
              const isOpen = anoExpandido === ano
              return (
                <div key={ano}>
                  <button
                    onClick={() => setAnoExpandido(isOpen ? null : ano)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm"
                  >
                    <div className="flex items-center gap-3">
                      {isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      <span className="font-bold text-gray-900">{ano}</span>
                      <span className="text-gray-500">{info.parcelas} parcelas</span>
                    </div>
                    <span className="font-bold text-gray-900">{fmtBRL(info.total)}</span>
                  </button>
                  {isOpen && (
                    <div className="px-4 pb-3">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-gray-100">
                            {['Vencimento', 'Modalidade', 'Banco', 'Contrato', 'Parcela', 'Valor'].map(h => (
                              <th key={h} className="py-1.5 text-left text-gray-400 font-semibold uppercase">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                          {parcelasAno.map((p, i) => (
                            <tr key={i} className="hover:bg-gray-50/50">
                              <td className="py-1.5 font-medium text-gray-900">{fmtDate(p.vencimento)}</td>
                              <td className="py-1.5 text-gray-700">{p.modalidade}</td>
                              <td className="py-1.5 text-gray-600">{p.banco}</td>
                              <td className="py-1.5 text-gray-500">{p.contrato || '—'}</td>
                              <td className="py-1.5 text-gray-600">{p.parcelaNum}/{p.totalParcelas}</td>
                              <td className="py-1.5 font-semibold text-gray-900">{fmtBRL(p.valorParcela)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )
            })}
            <div className="flex justify-between px-4 py-3 bg-gray-50 font-bold text-sm">
              <span>Total Geral</span>
              <span>{fmtBRL(cronograma.totalFuturo)}</span>
            </div>
          </div>
        </Card>
      )}

      {/* Cronograma completo ordenado */}
      {cronograma && cronograma.parcelas.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b border-gray-100 font-semibold text-sm text-gray-700">
            Cronograma Completo — Ordenado por Vencimento ({cronograma.parcelas.length} parcelas)
          </div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50">
                <tr className="border-b">
                  {['Vencimento', 'Modalidade', 'Banco', 'Contrato', 'Contratação', 'Valor Tomado', 'Parcela', 'Period.', 'Taxa', 'Valor Parcela'].map(h => (
                    <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cronograma.parcelas.map((p, i) => {
                  const venc = new Date(p.vencimento)
                  const vencida = venc < new Date()
                  return (
                    <tr key={i} className={clsx('hover:bg-gray-50/50', vencida && 'bg-red-50/30')}>
                      <td className={clsx('px-3 py-2 font-medium whitespace-nowrap', vencida ? 'text-red-600' : 'text-gray-900')}>{fmtDate(p.vencimento)}</td>
                      <td className="px-3 py-2 text-gray-700">{p.modalidade}</td>
                      <td className="px-3 py-2 text-gray-700">{p.banco}</td>
                      <td className="px-3 py-2 text-gray-500">{p.contrato || '—'}</td>
                      <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{fmtDate(p.dataContratacao)}</td>
                      <td className="px-3 py-2 text-gray-700">{fmtBRL(p.valorTomado)}</td>
                      <td className="px-3 py-2 text-center text-gray-700">{p.parcelaNum}/{p.totalParcelas}</td>
                      <td className="px-3 py-2 text-gray-600">{p.periodicidade}</td>
                      <td className="px-3 py-2 text-gray-600">{(p.taxa * 100).toFixed(2)}%</td>
                      <td className="px-3 py-2 font-bold text-gray-900">{fmtBRL(p.valorParcela)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && (
        <ContratoModal
          contrato={modal === 'new' ? undefined : modal}
          clientId={clientId}
          onClose={() => setModal(null)}
          onSaved={() => { load(); setModal(null) }}
        />
      )}
    </div>
  )
}
