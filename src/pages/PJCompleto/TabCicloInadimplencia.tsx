import { useState, useEffect } from 'react'
import { Plus, Trash2, Edit2, X, AlertTriangle, CheckCircle } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { historicoApi, type Inadimplencia } from '../../services/historicoApi'
import { pjApi } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const FAIXA_INFO: Record<string, { label: string; cor: string; bgBar: string }> = {
  a_vencer:    { label: 'A vencer',   cor: 'bg-gray-100 text-gray-700',   bgBar: '#6B7280' },
  '1_30':      { label: '1–30 dias',  cor: 'bg-amber-100 text-amber-700', bgBar: '#F59E0B' },
  '31_60':     { label: '31–60 dias', cor: 'bg-orange-100 text-orange-700', bgBar: '#F97316' },
  '61_90':     { label: '61–90 dias', cor: 'bg-red-100 text-red-700',     bgBar: '#EF4444' },
  '91_120':    { label: '91–120 dias',cor: 'bg-red-200 text-red-800',     bgBar: '#DC2626' },
  acima_120:   { label: '+ 120 dias', cor: 'bg-red-300 text-red-900',     bgBar: '#991B1B' },
}

const STATUS_COR: Record<string, string> = {
  em_aberto: 'bg-red-100 text-red-700', negociando: 'bg-amber-100 text-amber-700',
  renegociado: 'bg-blue-100 text-blue-700', perdido: 'bg-gray-100 text-gray-500',
}

export function TabCicloInadimplencia({ clientId }: { clientId: string }) {
  const [ciclo, setCiclo]   = useState<any>(null)
  const [inad,  setInad]    = useState<any>(null)
  const [loadingCiclo, setLoadingCiclo] = useState(true)
  const [loadingInad,  setLoadingInad]  = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState<Omit<Inadimplencia, 'id'>>({
    clientId, cliente: '', valor: 0, dataVenc: '', status: 'em_aberto', obs: '',
  })
  const [editItem, setEditItem] = useState<Inadimplencia | null>(null)

  const loadCiclo = async () => {
    setLoadingCiclo(true)
    try {
      const dre = await pjApi.dre.get(clientId)
      if (!dre) { setLoadingCiclo(false); return }
      const result = await historicoApi.cicloOperacional({
        receitaBruta: dre.receitaBruta, cmv: dre.cmv,
        estoque: dre.estoque, aReceber: dre.aReceber, aFornecedores: dre.aFornecedores,
      })
      setCiclo(result)
    } finally { setLoadingCiclo(false) }
  }

  const loadInad = async () => {
    setLoadingInad(true)
    try { setInad(await historicoApi.listarInadimplencia(clientId)) }
    finally { setLoadingInad(false) }
  }

  useEffect(() => { loadCiclo(); loadInad() }, [clientId])

  const handleSaveInad = async () => {
    if (!form.cliente || !form.valor || !form.dataVenc) return
    if (editItem?.id) {
      await historicoApi.atualizarInadimplencia(editItem.id, form)
      setEditItem(null)
    } else {
      await historicoApi.criarInadimplencia({ ...form, clientId })
    }
    setShowForm(false)
    setForm({ clientId, cliente: '', valor: 0, dataVenc: '', status: 'em_aberto', obs: '' })
    loadInad()
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200'

  const cicloColor = ciclo
    ? ciclo.cicloFinanceiro <= 15 ? 'text-emerald-700' : ciclo.cicloFinanceiro <= 30 ? 'text-amber-600' : 'text-red-600'
    : 'text-gray-500'

  return (
    <div className="space-y-5">
      {/* Ciclo Operacional */}
      <div>
        <h2 className="font-bold text-gray-900 mb-1">Ciclo Operacional & Financeiro</h2>
        <p className="text-xs text-gray-500 mb-4">Calculado automaticamente a partir do DRE — tempo que o caixa fica exposto entre receber e pagar</p>

        {loadingCiclo ? <div className="py-8 text-center text-gray-400 text-sm">Calculando...</div> : ciclo ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
              {[
                { label: 'PMRE (Estoque)', val: `${ciclo.pmre.toFixed(0)} dias`, desc: 'Prazo médio de renovação do estoque', ok: ciclo.pmre <= 60, bm: '≤ 60 dias' },
                { label: 'PMR (Recebimento)', val: `${ciclo.pmr.toFixed(0)} dias`, desc: 'Prazo médio de recebimento de clientes', ok: ciclo.pmr <= 30, bm: '≤ 30 dias' },
                { label: 'PMP (Pagamento)', val: `${ciclo.pmp.toFixed(0)} dias`, desc: 'Prazo médio de pagamento a fornecedores', ok: ciclo.pmp >= 30, bm: '≥ 30 dias' },
                { label: 'Ciclo Operacional', val: `${ciclo.cicloOperacional.toFixed(0)} dias`, desc: 'PMRE + PMR', ok: ciclo.cicloOperacional <= 60, bm: '≤ 60 dias' },
              ].map(k => (
                <div key={k.label} className={`p-4 rounded-xl border ${k.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs text-gray-500">{k.label}</p>
                  <p className={`text-xl font-bold ${k.ok ? 'text-emerald-700' : 'text-red-700'}`}>{k.val}</p>
                  <p className="text-xs text-gray-400 mt-0.5">Ideal: {k.bm}</p>
                </div>
              ))}
            </div>

            {/* Ciclo financeiro — destaque */}
            <Card className={`p-5 border-2 ${ciclo.cicloFinanceiro <= 15 ? 'border-emerald-300 bg-emerald-50' : ciclo.cicloFinanceiro <= 30 ? 'border-amber-300 bg-amber-50' : 'border-red-300 bg-red-50'}`}>
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <p className="text-sm font-bold text-gray-700 mb-1">Ciclo Financeiro</p>
                  <p className={`text-4xl font-black ${cicloColor}`}>{ciclo.cicloFinanceiro.toFixed(0)} dias</p>
                  <p className="text-xs text-gray-500 mt-1">= PMRE ({ciclo.pmre.toFixed(0)}) + PMR ({ciclo.pmr.toFixed(0)}) – PMP ({ciclo.pmp.toFixed(0)})</p>
                  <p className="text-xs font-semibold text-gray-700 mt-2">📊 {ciclo.diagCiclo}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-500">NCG (Necessidade de Capital de Giro)</p>
                  <p className="text-2xl font-bold text-gray-900">{fmtBRL(ciclo.ncg)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">Exposição diária: {fmtBRL(ciclo.ncgDiaria)}/dia</p>
                  <div className="mt-2 text-xs text-gray-400 space-y-0.5">
                    <p>Benchmark PMR ideal: {ciclo.benchmark.pmr.ideal}</p>
                    <p>Benchmark PMP ideal: {ciclo.benchmark.pmp.ideal}</p>
                    <p>Benchmark Ciclo ideal: {ciclo.benchmark.cicloFinanceiro.ideal}</p>
                  </div>
                </div>
              </div>
            </Card>

            {/* Linha do ciclo visual */}
            <Card className="p-5">
              <p className="text-sm font-semibold text-gray-700 mb-4">Linha do Tempo do Ciclo</p>
              <div className="relative">
                <div className="h-8 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="bg-emerald-400 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: `${Math.min(40, (ciclo.pmre / (ciclo.pmre + ciclo.pmr + 10)) * 100)}%` }}>
                    Est. {ciclo.pmre.toFixed(0)}d
                  </div>
                  <div className="bg-blue-400 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: `${Math.min(40, (ciclo.pmr / (ciclo.pmre + ciclo.pmr + 10)) * 100)}%` }}>
                    Rec. {ciclo.pmr.toFixed(0)}d
                  </div>
                  <div className="bg-orange-400 h-full flex items-center justify-center text-xs text-white font-medium" style={{ width: `${Math.min(30, (ciclo.pmp / (ciclo.pmre + ciclo.pmr + 10)) * 100)}%` }}>
                    Pag. {ciclo.pmp.toFixed(0)}d
                  </div>
                </div>
                <div className="mt-3 flex gap-4 text-xs">
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" /> Estoque</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-blue-400 inline-block" /> A Receber</span>
                  <span className="flex items-center gap-1"><span className="w-3 h-3 rounded-full bg-orange-400 inline-block" /> A Pagar</span>
                </div>
              </div>
            </Card>
          </>
        ) : (
          <div className="py-10 text-center text-gray-400 bg-gray-50 rounded-2xl">
            <AlertTriangle size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Preencha o DRE (caixa, estoque, a receber, a fornecedores) para calcular o ciclo operacional</p>
          </div>
        )}
      </div>

      {/* Inadimplência */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="font-bold text-gray-900">Inadimplência — Aging da Carteira</h2>
            <p className="text-xs text-gray-500 mt-0.5">Controle de clientes em atraso por faixa de vencimento</p>
          </div>
          <button onClick={() => { setShowForm(true); setEditItem(null) }}
            className="flex items-center gap-2 bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-700">
            <Plus size={14} /> Lançar devedor
          </button>
        </div>

        {/* KPIs inadimplência */}
        {inad && inad.totalCarteira > 0 && (
          <div className="grid grid-cols-3 gap-3 mb-4">
            <div className={`p-4 rounded-xl border ${inad.taxaInadimpl > 0.05 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs text-gray-500">Carteira Total</p>
              <p className="text-xl font-bold text-gray-900">{fmtBRL(inad.totalCarteira)}</p>
            </div>
            <div className="p-4 rounded-xl border bg-red-50 border-red-200">
              <p className="text-xs text-gray-500">Total Vencido</p>
              <p className="text-xl font-bold text-red-700">{fmtBRL(inad.totalVencido)}</p>
            </div>
            <div className={`p-4 rounded-xl border ${inad.taxaInadimpl > 0.05 ? 'bg-red-50 border-red-200' : 'bg-emerald-50 border-emerald-200'}`}>
              <p className="text-xs text-gray-500">Taxa de Inadimplência</p>
              <p className={`text-xl font-bold ${inad.taxaInadimpl > 0.05 ? 'text-red-700' : 'text-emerald-700'}`}>
                {(inad.taxaInadimpl * 100).toFixed(1)}%
              </p>
              <p className="text-xs text-gray-400">Benchmark: &lt; 5%</p>
            </div>
          </div>
        )}

        {/* Gráfico aging */}
        {inad && inad.resumo?.length > 0 && (
          <Card className="p-5 mb-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Distribuição por Faixa de Atraso</p>
            <ResponsiveContainer width="100%" height={180}>
              <BarChart data={inad.resumo.filter((r: any) => r.total > 0)}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="faixa" tickFormatter={(v) => FAIXA_INFO[v]?.label ?? v} tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={(v) => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} labelFormatter={(l) => FAIXA_INFO[l]?.label ?? l} />
                <Bar dataKey="total" name="Valor" radius={[4,4,0,0]}>
                  {inad.resumo.map((r: any, i: number) => (
                    <Cell key={i} fill={FAIXA_INFO[r.faixa]?.bgBar ?? '#6B7280'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Formulário */}
        {showForm && (
          <Card className="p-4 border-2 border-red-100 mb-4">
            <h3 className="font-semibold text-sm text-gray-700 mb-3">{editItem ? 'Editar lançamento' : 'Novo devedor'}</h3>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
              <div className="col-span-2"><label className="text-xs font-semibold text-gray-500 mb-1 block">Cliente / Devedor *</label><input className={inp} value={form.cliente} onChange={e => setForm(f => ({ ...f, cliente: e.target.value }))} placeholder="Nome do cliente" /></div>
              <div><label className="text-xs font-semibold text-gray-500 mb-1 block">CPF/CNPJ</label><input className={inp} value={form.documento ?? ''} onChange={e => setForm(f => ({ ...f, documento: e.target.value }))} /></div>
              <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Valor (R$) *</label><input type="number" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} /></div>
              <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Vencimento *</label><input type="date" className={inp} value={form.dataVenc} onChange={e => setForm(f => ({ ...f, dataVenc: e.target.value }))} /></div>
              <div><label className="text-xs font-semibold text-gray-500 mb-1 block">Status</label>
                <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value }))}>
                  <option value="em_aberto">Em aberto</option>
                  <option value="negociando">Negociando</option>
                  <option value="renegociado">Renegociado</option>
                  <option value="perdido">Perdido</option>
                </select>
              </div>
              <div className="col-span-2 md:col-span-4"><label className="text-xs font-semibold text-gray-500 mb-1 block">Observações</label><input className={inp} value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} /></div>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSaveInad} className="bg-red-600 text-white rounded-xl px-4 py-2 text-sm font-semibold hover:bg-red-700">Salvar</button>
              <button onClick={() => { setShowForm(false); setEditItem(null) }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
            </div>
          </Card>
        )}

        {/* Lista */}
        <Card>
          {loadingInad ? <div className="py-10 text-center text-gray-400 text-sm">Carregando...</div> : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Cliente','CPF/CNPJ','Valor','Vencimento','Dias Atraso','Faixa','Status','Obs',''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {(inad?.items ?? []).map((i: any) => (
                    <tr key={i.id} className="hover:bg-gray-50/50 group">
                      <td className="px-3 py-2.5 font-medium text-gray-900">{i.cliente}</td>
                      <td className="px-3 py-2.5 text-gray-500">{i.documento || '—'}</td>
                      <td className="px-3 py-2.5 font-bold text-red-600">{fmtBRL(i.valor)}</td>
                      <td className={`px-3 py-2.5 whitespace-nowrap ${i.diasAtraso > 0 ? 'text-red-600 font-semibold' : 'text-gray-700'}`}>{fmtDate(i.dataVenc)}</td>
                      <td className={`px-3 py-2.5 font-bold ${i.diasAtraso > 60 ? 'text-red-600' : i.diasAtraso > 0 ? 'text-amber-600' : 'text-gray-500'}`}>
                        {i.faixa === 'a_vencer' ? 'A vencer' : `${i.diasAtraso}d`}
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${FAIXA_INFO[i.faixa]?.cor ?? 'bg-gray-100 text-gray-600'}`}>
                          {FAIXA_INFO[i.faixa]?.label ?? i.faixa}
                        </span>
                      </td>
                      <td className="px-3 py-2.5">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_COR[i.status] ?? 'bg-gray-100 text-gray-600'}`}>{i.status.replace('_', ' ')}</span>
                      </td>
                      <td className="px-3 py-2.5 text-gray-500 max-w-xs truncate">{i.obs || '—'}</td>
                      <td className="px-3 py-2.5">
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100">
                          <button onClick={() => { setEditItem(i); setForm({ ...i, clientId }); setShowForm(true) }} className="p-1.5 hover:bg-blue-50 text-blue-400 rounded"><Edit2 size={11} /></button>
                          <button onClick={async () => { if (confirm('Excluir?')) { await historicoApi.deletarInadimplencia(i.id); loadInad() } }} className="p-1.5 hover:bg-red-50 text-red-400 rounded"><X size={11} /></button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {(!inad?.items || inad.items.length === 0) && (
                <div className="py-12 text-center">
                  <CheckCircle size={32} className="mx-auto mb-2 text-emerald-300" />
                  <p className="text-gray-400 text-sm">Sem clientes inadimplentes cadastrados</p>
                </div>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
