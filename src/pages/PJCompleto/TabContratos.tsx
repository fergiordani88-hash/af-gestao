// Contratos PJ — mesma lógica do módulo Agro, usando pjApi
import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, ChevronDown, ChevronUp } from 'lucide-react'
import { pjApi, type PJContrato } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'
import { clsx } from 'clsx'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')
const MODALIDADES = ['Capital de giro', 'Repactuação', 'Investimento', 'Investimento CDI', 'BNDES Finame', 'Crédito pessoal', 'Outros']
const PERIODICIDADES = ['Mensal', 'Semestral', 'Anual', 'Trimestral', 'Único']
const EMPTY: Omit<PJContrato, 'id'> = { clientId: '', modalidade: 'Capital de giro', banco: '', numeroContrato: '', dataContratacao: '', valorTomado: 0, totalParcelas: 1, parcelaAtual: 1, periodicidade: 'Mensal', taxa: 0, vencimento: '', valorParcela: 0, obs: '' }

function Modal({ contrato, clientId, onClose, onSaved }: { contrato?: PJContrato; clientId: string; onClose: () => void; onSaved: () => void }) {
  const [form, setForm] = useState<Omit<PJContrato, 'id'>>(contrato ? { ...contrato } : { ...EMPTY, clientId })
  const [saving, setSaving] = useState(false)
  const set = (k: keyof PJContrato, v: string | number) => setForm(f => ({ ...f, [k]: v }))
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-200'
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h2 className="text-lg font-bold">{contrato ? 'Editar Contrato' : 'Novo Contrato'}</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg"><X size={16} /></button>
        </div>
        <div className="p-6 grid grid-cols-2 gap-4">
          <div className="col-span-2"><label className="text-xs font-semibold text-gray-600 mb-1 block">Modalidade</label><select className={inp} value={form.modalidade} onChange={e => set('modalidade', e.target.value)}>{MODALIDADES.map(m => <option key={m}>{m}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Banco *</label><input className={inp} value={form.banco} onChange={e => set('banco', e.target.value)} placeholder="Ex: SICOOB" /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Nº Contrato</label><input className={inp} value={form.numeroContrato ?? ''} onChange={e => set('numeroContrato', e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Data Contratação</label><input type="date" className={inp} value={form.dataContratacao?.toString().split('T')[0] ?? ''} onChange={e => set('dataContratacao', e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Valor Tomado</label><input type="number" className={inp} value={form.valorTomado || ''} onChange={e => set('valorTomado', +e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Total Parcelas</label><input type="number" className={inp} value={form.totalParcelas || ''} onChange={e => set('totalParcelas', +e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Parcela Atual</label><input type="number" className={inp} value={form.parcelaAtual || ''} onChange={e => set('parcelaAtual', +e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Periodicidade</label><select className={inp} value={form.periodicidade} onChange={e => set('periodicidade', e.target.value)}>{PERIODICIDADES.map(p => <option key={p}>{p}</option>)}</select></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Taxa (% ao período)</label><input type="number" step="0.001" className={inp} value={form.taxa || ''} onChange={e => set('taxa', +e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Próx. Vencimento</label><input type="date" className={inp} value={form.vencimento?.toString().split('T')[0] ?? ''} onChange={e => set('vencimento', e.target.value)} /></div>
          <div><label className="text-xs font-semibold text-gray-600 mb-1 block">Valor da Parcela</label><input type="number" className={inp} value={form.valorParcela || ''} onChange={e => set('valorParcela', +e.target.value)} /></div>
          <div className="col-span-2"><label className="text-xs font-semibold text-gray-600 mb-1 block">Observações</label><input className={inp} value={form.obs ?? ''} onChange={e => set('obs', e.target.value)} /></div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <button onClick={async () => { setSaving(true); try { if (contrato?.id) await pjApi.contratos.update(contrato.id, form); else await pjApi.contratos.create(form as PJContrato); onSaved() } finally { setSaving(false) } }}
            disabled={saving || !form.banco || !form.vencimento}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 text-sm">
            {saving ? 'Salvando...' : contrato ? 'Salvar' : 'Adicionar'}
          </button>
          <button onClick={onClose} className="px-4 py-2.5 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
        </div>
      </div>
    </div>
  )
}

export function TabContratos({ clientId }: { clientId: string }) {
  const [contratos, setContratos] = useState<PJContrato[]>([])
  const [cron, setCron] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<PJContrato | 'new' | null>(null)
  const [anoAberto, setAnoAberto] = useState<string | null>(null)

  const load = async () => {
    setLoading(true)
    const [c, cr] = await Promise.all([pjApi.contratos.list(clientId), pjApi.contratos.cronograma(clientId)])
    setContratos(c); setCron(cr); setLoading(false)
  }
  useEffect(() => { load() }, [clientId])

  const anos = cron ? Object.keys(cron.porAno).sort() : []

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div><h2 className="font-bold text-gray-900">Contratos de Crédito</h2><p className="text-xs text-gray-500 mt-0.5">Contrato a contrato → cronograma ordenado automático</p></div>
        <button onClick={() => setModal('new')} className="flex items-center gap-2 bg-indigo-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-indigo-700"><Plus size={15} /> Novo Contrato</button>
      </div>

      {cron && (
        <div className="grid grid-cols-4 gap-3">
          {[['Contratos', contratos.length], ['Endividamento Total', fmtBRL(cron.totalEndividamento)], ['Total Futuro', fmtBRL(cron.totalFuturo)], ['Parcelas Restantes', cron.parcelas.length]].map(([l, v]: any) => (
            <div key={l} className="bg-white border border-gray-100 rounded-xl p-4"><p className="text-xs text-gray-500">{l}</p><p className="text-base font-bold text-gray-900">{v}</p></div>
          ))}
        </div>
      )}

      <Card>
        <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">Contratos Cadastrados</div>
        {loading ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="bg-gray-50 border-b">{['Modalidade','Banco','Contrato','Contratação','Valor','Total','Atual','Period.','Taxa','Venc.','Parcela',''].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr></thead>
              <tbody className="divide-y divide-gray-50">
                {contratos.map(c => (
                  <tr key={c.id} className="hover:bg-gray-50/50 group">
                    <td className="px-3 py-2.5 font-medium">{c.modalidade}</td>
                    <td className="px-3 py-2.5">{c.banco}</td>
                    <td className="px-3 py-2.5 text-gray-500">{c.numeroContrato ?? '—'}</td>
                    <td className="px-3 py-2.5 whitespace-nowrap">{fmtDate(c.dataContratacao)}</td>
                    <td className="px-3 py-2.5 font-semibold">{fmtBRL(c.valorTomado)}</td>
                    <td className="px-3 py-2.5 text-center">{c.totalParcelas}</td>
                    <td className="px-3 py-2.5 text-center">{c.parcelaAtual}</td>
                    <td className="px-3 py-2.5">{c.periodicidade}</td>
                    <td className="px-3 py-2.5">{(c.taxa * 100).toFixed(2)}%</td>
                    <td className={`px-3 py-2.5 font-medium whitespace-nowrap ${new Date(c.vencimento) < new Date() ? 'text-red-600' : ''}`}>{fmtDate(c.vencimento)}</td>
                    <td className="px-3 py-2.5 font-bold">{fmtBRL(c.valorParcela)}</td>
                    <td className="px-3 py-2.5"><div className="flex gap-1 opacity-0 group-hover:opacity-100"><button onClick={() => setModal(c)} className="p-1.5 hover:bg-blue-50 text-blue-400 rounded"><Edit2 size={12} /></button><button onClick={async () => { if (c.id && confirm('Excluir?')) { await pjApi.contratos.delete(c.id); load() } }} className="p-1.5 hover:bg-red-50 text-red-400 rounded"><Trash2 size={12} /></button></div></td>
                  </tr>
                ))}
              </tbody>
            </table>
            {contratos.length === 0 && <div className="py-10 text-center text-gray-400 text-sm">Nenhum contrato</div>}
          </div>
        )}
      </Card>

      {anos.length > 0 && cron && (
        <Card>
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">Resumo por Ano</div>
          {anos.map(ano => {
            const info = cron.porAno[ano]
            const isOpen = anoAberto === ano
            const parcelasAno = cron.parcelas.filter((p: any) => new Date(p.vencimento).getFullYear().toString() === ano)
            return (
              <div key={ano}>
                <button onClick={() => setAnoAberto(isOpen ? null : ano)} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 text-sm">
                  <div className="flex items-center gap-3">{isOpen ? <ChevronUp size={14} /> : <ChevronDown size={14} />}<span className="font-bold">{ano}</span><span className="text-gray-500">{info.parcelas} parcelas</span></div>
                  <span className="font-bold">{fmtBRL(info.total)}</span>
                </button>
                {isOpen && (
                  <div className="px-4 pb-3 overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead><tr className="border-b">{['Vencimento','Modalidade','Banco','Parcela','Valor'].map(h => <th key={h} className="py-1.5 text-left text-gray-400 font-semibold uppercase">{h}</th>)}</tr></thead>
                      <tbody>{parcelasAno.map((p: any, i: number) => (
                        <tr key={i} className={`hover:bg-gray-50/50 ${new Date(p.vencimento) < new Date() ? 'text-red-600' : ''}`}>
                          <td className="py-1.5 font-medium">{fmtDate(p.vencimento)}</td>
                          <td className="py-1.5">{p.modalidade}</td>
                          <td className="py-1.5">{p.banco}</td>
                          <td className="py-1.5">{p.parcelaNum}/{p.totalParcelas}</td>
                          <td className="py-1.5 font-semibold">{fmtBRL(p.valorParcela)}</td>
                        </tr>
                      ))}</tbody>
                    </table>
                  </div>
                )}
              </div>
            )
          })}
          <div className="flex justify-between px-4 py-3 bg-gray-50 font-bold text-sm border-t"><span>Total</span><span>{fmtBRL(cron.totalFuturo)}</span></div>
        </Card>
      )}

      {cron && cron.parcelas.length > 0 && (
        <Card>
          <div className="px-4 py-3 border-b text-sm font-semibold text-gray-700">Cronograma Completo — Ordenado por Vencimento</div>
          <div className="overflow-x-auto max-h-96">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-gray-50 border-b">
                <tr>{['Vencimento','Modalidade','Banco','Contrato','Val. Tomado','Parcela','Period.','Valor'].map(h => <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>)}</tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {cron.parcelas.map((p: any, i: number) => (
                  <tr key={i} className={clsx('hover:bg-gray-50/50', new Date(p.vencimento) < new Date() && 'bg-red-50/30')}>
                    <td className={`px-3 py-2 font-medium whitespace-nowrap ${new Date(p.vencimento) < new Date() ? 'text-red-600' : 'text-gray-900'}`}>{fmtDate(p.vencimento)}</td>
                    <td className="px-3 py-2">{p.modalidade}</td>
                    <td className="px-3 py-2">{p.banco}</td>
                    <td className="px-3 py-2 text-gray-500">{p.contrato || '—'}</td>
                    <td className="px-3 py-2">{fmtBRL(p.valorTomado)}</td>
                    <td className="px-3 py-2 text-center">{p.parcelaNum}/{p.totalParcelas}</td>
                    <td className="px-3 py-2">{p.periodicidade}</td>
                    <td className="px-3 py-2 font-bold">{fmtBRL(p.valorParcela)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {modal && <Modal contrato={modal === 'new' ? undefined : modal} clientId={clientId} onClose={() => setModal(null)} onSaved={() => { load(); setModal(null) }} />}
    </div>
  )
}
