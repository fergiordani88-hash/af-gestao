import { useState, useEffect, useRef } from 'react'
import { Plus, Trash2, Edit2, X, Download, TrendingUp, AlertCircle, CheckCircle2, Loader2 } from 'lucide-react'
import { payStorage, type PayContract } from '../../services/payStorage'
import { fetchSelicRate, generateInstallments, countInstallments, calcPMT, PERIOD_MONTHS } from '../../services/contractUtils'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')

const PERIOD_LABEL: Record<string, string> = {
  mensal: 'Mensal', trimestral: 'Trimestral', semestral: 'Semestral', anual: 'Anual', pontual: 'Pontual'
}

const EMPTY: Omit<PayContract, 'id' | 'createdAt'> = {
  tipo: 'receita', parte: '', descricao: '', valor: 0,
  dataInicio: '', periodicidade: 'mensal', diaVencimento: 1, status: 'ativo',
  tipoTaxa: undefined, taxaAnual: undefined, indexador: undefined, valorParcela: undefined,
}

export function TabContratos() {
  const [contracts, setContracts] = useState<PayContract[]>([])
  const [showForm,  setShowForm]  = useState(false)
  const [editItem,  setEditItem]  = useState<PayContract | null>(null)
  const [form,      setForm]      = useState<Omit<PayContract, 'id' | 'createdAt'>>(EMPTY)
  const [selicRate, setSelicRate] = useState<number>(14.75)
  const [selicLoading, setSelicLoading] = useState(false)
  const [selicError, setSelicError] = useState(false)
  const [saving, setSaving] = useState(false)
  const selicFetched = useRef(false)

  const load = () => setContracts(payStorage.getContracts())
  useEffect(load, [])

  useEffect(() => {
    if (showForm && !selicFetched.current) {
      selicFetched.current = true
      setSelicLoading(true)
      fetchSelicRate()
        .then(r => { setSelicRate(r); setSelicError(false) })
        .catch(() => setSelicError(true))
        .finally(() => setSelicLoading(false))
    }
  }, [showForm])

  // Calcula a taxa efetiva e PMT em tempo real
  const effectiveRate = (() => {
    if (!form.tipoTaxa) return 0
    if (form.tipoTaxa === 'prefixada') return form.taxaAnual ?? 0
    return selicRate + (form.taxaAnual ?? 0)
  })()

  const nParcelas = (() => {
    if (!form.dataInicio || !form.periodicidade) return 0
    const pseudo = { ...form, id: '__tmp__', createdAt: '' } as PayContract
    return countInstallments(pseudo)
  })()

  const pmtPreview = (() => {
    if (!form.valor || !form.tipoTaxa || effectiveRate <= 0 || nParcelas <= 0) return form.valor
    return calcPMT(form.valor, effectiveRate, nParcelas, form.periodicidade)
  })()

  const handleSave = async () => {
    if (!form.parte || !form.valor || !form.dataInicio) return
    setSaving(true)

    const finalForm: Omit<PayContract, 'id' | 'createdAt'> = {
      ...form,
      valorParcela: form.tipoTaxa ? Math.round(pmtPreview * 100) / 100 : undefined,
    }

    let contractId: string
    if (editItem?.id) {
      payStorage.updateContract(editItem.id, finalForm)
      contractId = editItem.id
      payStorage.deleteEntriesByContract(contractId)
      setEditItem(null)
    } else {
      const c = payStorage.addContract(finalForm)
      contractId = c.id
    }

    // Gera e salva parcelas no fluxo de caixa
    const fullContract = { ...finalForm, id: contractId, createdAt: new Date().toISOString() } as PayContract
    const installments = generateInstallments(fullContract, selicRate)
    installments.forEach(inst => payStorage.addEntry({ ...inst, recorrente: inst.recorrente }))

    setSaving(false)
    setShowForm(false)
    setForm(EMPTY)
    load()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este contrato e suas parcelas do fluxo de caixa?')) return
    payStorage.deleteEntriesByContract(id)
    payStorage.deleteContract(id)
    load()
  }

  const handleEdit = (c: PayContract) => {
    setEditItem(c)
    setForm({
      tipo: c.tipo, parte: c.parte, descricao: c.descricao, valor: c.valor,
      dataInicio: c.dataInicio, dataFim: c.dataFim, periodicidade: c.periodicidade,
      diaVencimento: c.diaVencimento, status: c.status, obs: c.obs,
      tipoTaxa: c.tipoTaxa, taxaAnual: c.taxaAnual, indexador: c.indexador, valorParcela: c.valorParcela,
    })
    setShowForm(true)
  }

  const handleExport = () => {
    const header = 'Tipo,Parte,Descrição,Valor,Início,Fim,Periodicidade,Dia Vcto,Status,Taxa,Indexador,Parcela'
    const rows = contracts.map(c =>
      `${c.tipo},"${c.parte}","${c.descricao}",${c.valor},${c.dataInicio},${c.dataFim ?? ''},${c.periodicidade},${c.diaVencimento},${c.status},${c.tipoTaxa ?? ''},${c.indexador ?? ''},${c.valorParcela ?? ''}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'contratos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const ativos   = contracts.filter(c => c.status === 'ativo')
  const totalRec = ativos.filter(c => c.tipo === 'receita').reduce((s, c) => s + (c.valorParcela ?? c.valor), 0)
  const totalDesp = ativos.filter(c => c.tipo === 'despesa').reduce((s, c) => s + (c.valorParcela ?? c.valor), 0)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">Cronograma de Contratos</h2>
          <p className="text-xs text-gray-500 mt-0.5">Gerencie contratos recorrentes — parcelas geradas automaticamente no fluxo de caixa</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
            <Download size={13} /> CSV
          </button>
          <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY) }}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Plus size={14} /> Novo Contrato
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-3 gap-3">
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Receita Contratada/período</p>
          <p className="text-lg font-bold text-emerald-700">{fmtBRL(totalRec)}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
          <p className="text-xs text-gray-500">Despesa Contratada/período</p>
          <p className="text-lg font-bold text-red-700">{fmtBRL(totalDesp)}</p>
        </div>
        <div className={`border rounded-xl p-3 text-center ${totalRec - totalDesp >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
          <p className="text-xs text-gray-500">Resultado líquido</p>
          <p className={`text-lg font-bold ${totalRec - totalDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRec - totalDesp)}</p>
        </div>
      </div>

      {/* Formulário */}
      {showForm && (
        <Card className="p-5 border-2 border-amber-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-sm text-gray-700">{editItem ? 'Editar Contrato' : 'Novo Contrato'}</h3>
            <button onClick={() => { setShowForm(false); setEditItem(null) }}><X size={16} className="text-gray-400" /></button>
          </div>

          {/* Dados básicos */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className={lbl}>Tipo</label>
              <div className="flex gap-2">
                {(['receita','despesa'] as const).map(t => (
                  <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize ${form.tipo === t ? (t === 'receita' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white border-gray-200 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>Contraparte (cliente/fornecedor)</label>
              <input className={inp} value={form.parte} onChange={e => setForm(f => ({ ...f, parte: e.target.value }))} placeholder="Nome da empresa/pessoa" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Descrição</label>
              <input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Objeto do contrato" />
            </div>
            <div>
              <label className={lbl}>Valor Principal (R$)</label>
              <input type="number" step="0.01" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Periodicidade</label>
              <select className={inp} value={form.periodicidade} onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value as any }))}>
                {Object.entries(PERIOD_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </div>
            <div>
              <label className={lbl}>Dia de Vencimento</label>
              <input type="number" min="1" max="28" className={inp} value={form.diaVencimento} onChange={e => setForm(f => ({ ...f, diaVencimento: +e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Status</label>
              <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="encerrado">Encerrado</option>
              </select>
            </div>
            <div>
              <label className={lbl}>Início</label>
              <input type="date" className={inp} value={form.dataInicio} onChange={e => setForm(f => ({ ...f, dataInicio: e.target.value }))} />
            </div>
            <div>
              <label className={lbl}>Término (opcional)</label>
              <input type="date" className={inp} value={form.dataFim ?? ''} onChange={e => setForm(f => ({ ...f, dataFim: e.target.value || undefined }))} />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Observações</label>
              <input className={inp} value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value }))} />
            </div>
          </div>

          {/* Seção de Taxa de Juros */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-amber-600" />
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">Encargos Financeiros</span>
              <span className="text-xs text-gray-400">(opcional — para financiamentos e contratos com juros)</span>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Tipo de Taxa</label>
                <div className="flex gap-2">
                  <button onClick={() => setForm(f => ({ ...f, tipoTaxa: undefined, taxaAnual: undefined, indexador: undefined }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${!form.tipoTaxa ? 'bg-gray-700 text-white border-gray-700' : 'bg-white border-gray-200 text-gray-600'}`}>
                    Sem juros
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, tipoTaxa: 'prefixada', indexador: undefined }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.tipoTaxa === 'prefixada' ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                    Pré-fixada
                  </button>
                  <button onClick={() => setForm(f => ({ ...f, tipoTaxa: 'posfixada', indexador: f.indexador ?? 'selic' }))}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${form.tipoTaxa === 'posfixada' ? 'bg-orange-600 text-white border-orange-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                    Pós-fixada
                  </button>
                </div>
              </div>

              {form.tipoTaxa && (
                <>
                  {form.tipoTaxa === 'posfixada' && (
                    <div>
                      <label className={lbl}>Indexador</label>
                      <select className={inp} value={form.indexador ?? 'selic'} onChange={e => setForm(f => ({ ...f, indexador: e.target.value as any }))}>
                        <option value="selic">SELIC</option>
                        <option value="cdi">CDI</option>
                        <option value="ipca">IPCA</option>
                      </select>
                    </div>
                  )}
                  <div>
                    <label className={lbl}>
                      {form.tipoTaxa === 'prefixada' ? 'Taxa % a.a.' : 'Spread % a.a. (sobre indexador)'}
                    </label>
                    <input type="number" step="0.01" min="0" className={inp}
                      value={form.taxaAnual ?? ''} placeholder="Ex: 2.5"
                      onChange={e => setForm(f => ({ ...f, taxaAnual: +e.target.value }))} />
                  </div>
                </>
              )}
            </div>

            {/* Preview SELIC e PMT */}
            {form.tipoTaxa && (
              <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                {form.tipoTaxa === 'posfixada' && (
                  <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Taxa SELIC atual (BCB)</p>
                    <div className="flex items-center gap-2">
                      {selicLoading
                        ? <Loader2 size={14} className="animate-spin text-orange-500" />
                        : selicError
                          ? <AlertCircle size={14} className="text-red-400" />
                          : <CheckCircle2 size={14} className="text-emerald-500" />
                      }
                      <span className="font-bold text-orange-700">
                        {selicLoading ? 'Carregando...' : `${selicRate.toFixed(2)}% a.a.`}
                      </span>
                    </div>
                    {selicError && <p className="text-[10px] text-red-400 mt-0.5">Usando fallback 14,75%</p>}
                    <p className="text-[10px] text-gray-400 mt-0.5">Série BCB 4390 — Meta SELIC</p>
                  </div>
                )}

                {form.tipoTaxa === 'posfixada' && (
                  <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
                    <p className="text-xs text-gray-500 mb-1">Taxa efetiva anual</p>
                    <p className="font-bold text-blue-700">
                      {effectiveRate > 0 ? `${effectiveRate.toFixed(2)}% a.a.` : '—'}
                    </p>
                    <p className="text-[10px] text-gray-400 mt-0.5">
                      SELIC {selicRate.toFixed(2)}% + spread {form.taxaAnual ?? 0}%
                    </p>
                  </div>
                )}

                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
                  <p className="text-xs text-gray-500 mb-1">Valor da parcela estimado</p>
                  <p className="font-bold text-amber-700 text-lg">{fmtBRL(pmtPreview)}</p>
                  <p className="text-[10px] text-gray-400 mt-0.5">
                    {nParcelas > 0 ? `${nParcelas}x · taxa ${effectiveRate > 0 ? effectiveRate.toFixed(2) + '% a.a.' : 'sem juros'}` : 'defina datas para calcular'}
                  </p>
                </div>

                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 col-span-full">
                  <p className="text-[10px] text-gray-500 flex items-center gap-1">
                    <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                    Ao salvar, <strong>{nParcelas > 0 ? nParcelas : '?'} parcela(s)</strong> serão geradas automaticamente no fluxo de caixa com categoria "Contratos".
                  </p>
                </div>
              </div>
            )}

            {!form.tipoTaxa && form.valor > 0 && nParcelas > 0 && (
              <div className="mt-3 bg-gray-50 border border-gray-200 rounded-xl p-3">
                <p className="text-[10px] text-gray-500 flex items-center gap-1">
                  <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />
                  Ao salvar, <strong>{nParcelas} parcela(s)</strong> de <strong>{fmtBRL(form.valor)}</strong> serão geradas automaticamente no fluxo de caixa.
                </p>
              </div>
            )}
          </div>

          <div className="flex gap-2 mt-4">
            <button onClick={handleSave} disabled={saving}
              className="bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-4 py-2 text-sm font-semibold flex items-center gap-2 disabled:opacity-60">
              {saving && <Loader2 size={13} className="animate-spin" />}
              {saving ? 'Salvando...' : 'Salvar e gerar parcelas'}
            </button>
            <button onClick={() => { setShowForm(false); setEditItem(null) }} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">Cancelar</button>
          </div>
        </Card>
      )}

      {/* Tabela */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Tipo','Contraparte','Descrição','Valor/Parcela','Taxa','Periodicidade','Dia Vcto','Início','Término','Status',''].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contracts.length === 0 ? (
                <tr><td colSpan={11} className="py-10 text-center text-gray-400">Nenhum contrato cadastrado</td></tr>
              ) : contracts.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50">
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full font-medium ${c.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                      {c.tipo === 'receita' ? 'Receita' : 'Despesa'}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{c.parte}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.descricao}</td>
                  <td className={`px-3 py-2.5 font-bold ${c.tipo === 'receita' ? 'text-emerald-700' : 'text-red-700'}`}>
                    {fmtBRL(c.valorParcela ?? c.valor)}
                    {c.valorParcela && c.valorParcela !== c.valor && (
                      <span className="text-gray-400 font-normal ml-1 text-[10px]">
                        (principal {fmtBRL(c.valor)})
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">
                    {c.tipoTaxa ? (
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${c.tipoTaxa === 'prefixada' ? 'bg-blue-100 text-blue-700' : 'bg-orange-100 text-orange-700'}`}>
                        {c.tipoTaxa === 'prefixada' ? `Pré ${c.taxaAnual}% a.a.` : `Pós ${c.indexador?.toUpperCase()}+${c.taxaAnual ?? 0}%`}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-3 py-2.5 text-gray-500">{PERIOD_LABEL[c.periodicidade]}</td>
                  <td className="px-3 py-2.5 text-gray-500">Dia {c.diaVencimento}</td>
                  <td className="px-3 py-2.5 text-gray-400">{fmtDate(c.dataInicio)}</td>
                  <td className="px-3 py-2.5 text-gray-400">{c.dataFim ? fmtDate(c.dataFim) : '—'}</td>
                  <td className="px-3 py-2.5">
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${c.status === 'ativo' ? 'bg-emerald-100 text-emerald-700' : c.status === 'suspenso' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-500'}`}>
                      {c.status.charAt(0).toUpperCase() + c.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <button onClick={() => handleEdit(c)} className="p-1 hover:bg-blue-50 rounded text-blue-500"><Edit2 size={13} /></button>
                      <button onClick={() => handleDelete(c.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
