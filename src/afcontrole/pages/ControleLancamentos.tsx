import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Edit2, X, Filter, Download,
  CheckCircle2, XCircle, CreditCard, Smartphone, ArrowLeftRight,
  Building2, FileText, Wallet, DollarSign, AlertTriangle
} from 'lucide-react'
import { controleStorage, type ControleEntry } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')

const CATS_REC  = ['Vendas de Produtos','Prestação de Serviços','Aluguéis','Comissões','Royalties','Outros']
const CATS_DESP = ['Aluguel','Folha de Pagamento','Pró-labore','Fornecedores','Impostos','Energia','Telefone/Internet','Manutenção','Marketing','Transporte','Financeiro/Juros','Outros']

const STATUS_COR: Record<string, string> = {
  pago:      'bg-emerald-100 text-emerald-700',
  pendente:  'bg-amber-100 text-amber-700',
  atrasado:  'bg-red-100 text-red-700',
  previsto:  'bg-gray-100 text-gray-600',
  cancelado: 'bg-gray-200 text-gray-400 line-through',
}
const STATUS_LABELS: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', previsto: 'Previsto', cancelado: 'Cancelado'
}

const FORMAS_PAG = [
  { value: 'debito_cc',    label: 'Débito em Conta',  icon: Building2 },
  { value: 'pix',          label: 'PIX',               icon: Smartphone },
  { value: 'transferencia',label: 'Transferência',     icon: ArrowLeftRight },
  { value: 'cartao_credito',label: 'Cartão de Crédito',icon: CreditCard },
  { value: 'cheque',       label: 'Cheque',            icon: FileText },
  { value: 'outros',       label: 'Outros',            icon: Wallet },
] as const

const EMPTY_FORM: Omit<ControleEntry, 'id' | 'createdAt'> = {
  tipo: 'despesa', categoria: 'Outros', descricao: '', valor: 0,
  dataVenc: '', status: 'pendente', recorrente: false,
}

interface BaixaForm {
  motivo: 'pagamento' | 'cancelamento'
  dataPag: string
  valorPago: number
  formaPagamento: ControleEntry['formaPagamento']
  numeroCheque: string
  banco: string
  contaTitular: string
}

export function ControleLancamentos() {
  const [entries,    setEntries]    = useState<ControleEntry[]>([])
  const [showForm,   setShowForm]   = useState(false)
  const [editItem,   setEditItem]   = useState<ControleEntry | null>(null)
  const [form,       setForm]       = useState<Omit<ControleEntry, 'id' | 'createdAt'>>(EMPTY_FORM)
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'receita' | 'despesa'>('todos')
  const [filtroSt,   setFiltroSt]   = useState<string>('todos')
  const [filtroMes,  setFiltroMes]  = useState('')
  // Modal de baixa
  const [baixaEntry, setBaixaEntry] = useState<ControleEntry | null>(null)
  const [baixaForm,  setBaixaForm]  = useState<BaixaForm>({
    motivo: 'pagamento',
    dataPag: new Date().toISOString().slice(0, 10),
    valorPago: 0,
    formaPagamento: 'pix',
    numeroCheque: '',
    banco: '',
    contaTitular: '',
  })

  const load = useCallback(() => {
    let all = controleStorage.getEntries()
    const now = new Date(); now.setHours(0, 0, 0, 0)
    all = all.map(e => {
      if (e.status === 'pendente' || e.status === 'previsto') {
        const d = new Date(e.dataVenc); d.setHours(0, 0, 0, 0)
        if (d < now) return { ...e, status: 'atrasado' as const }
      }
      return e
    })
    setEntries(all)
  }, [])

  useEffect(() => { load() }, [load])

  const cats = form.tipo === 'receita' ? CATS_REC : CATS_DESP

  const handleSave = () => {
    if (!form.descricao || !form.valor || !form.dataVenc) return
    if (editItem?.id) { controleStorage.updateEntry(editItem.id, form); setEditItem(null) }
    else controleStorage.addEntry(form)
    setShowForm(false); setForm(EMPTY_FORM); load()
  }

  const handleDelete = (id: string) => {
    if (!confirm('Excluir este lançamento?')) return
    controleStorage.deleteEntry(id); load()
  }

  const handleEdit = (e: ControleEntry) => {
    setEditItem(e)
    setForm({ tipo: e.tipo, categoria: e.categoria, descricao: e.descricao, valor: e.valor, dataVenc: e.dataVenc, dataPag: e.dataPag, status: e.status, recorrente: e.recorrente, periodicidade: e.periodicidade, obs: e.obs })
    setShowForm(true)
  }

  const openBaixa = (e: ControleEntry) => {
    setBaixaEntry(e)
    setBaixaForm({
      motivo: 'pagamento',
      dataPag: new Date().toISOString().slice(0, 10),
      valorPago: e.valor,
      formaPagamento: 'pix',
      numeroCheque: '',
      banco: '',
      contaTitular: '',
    })
  }

  const handleConfirmarBaixa = () => {
    if (!baixaEntry) return
    if (baixaForm.motivo === 'pagamento') {
      controleStorage.updateEntry(baixaEntry.id, {
        status:         'pago',
        motivoBaixa:    'pagamento',
        dataPag:        baixaForm.dataPag,
        valorPago:      baixaForm.valorPago,
        formaPagamento: baixaForm.formaPagamento,
        numeroCheque:   baixaForm.numeroCheque || undefined,
        banco:          baixaForm.banco || undefined,
        contaTitular:   baixaForm.contaTitular || undefined,
      })
    } else {
      controleStorage.updateEntry(baixaEntry.id, {
        status:      'cancelado',
        motivoBaixa: 'cancelamento',
      })
    }
    setBaixaEntry(null)
    load()
  }

  // Filtros
  let visible = entries
  if (filtroTipo !== 'todos') visible = visible.filter(e => e.tipo === filtroTipo)
  if (filtroSt   !== 'todos') visible = visible.filter(e => e.status === filtroSt)
  if (filtroMes)              visible = visible.filter(e => e.dataVenc.startsWith(filtroMes))

  const totalRec  = visible.filter(e => e.tipo === 'receita' && e.status !== 'cancelado').reduce((s, e) => s + e.valor, 0)
  const totalDesp = visible.filter(e => e.tipo === 'despesa' && e.status !== 'cancelado').reduce((s, e) => s + e.valor, 0)
  const totalPagoRec  = visible.filter(e => e.tipo === 'receita' && e.status === 'pago').reduce((s, e) => s + (e.valorPago ?? e.valor), 0)
  const totalPagoDesp = visible.filter(e => e.tipo === 'despesa' && e.status === 'pago').reduce((s, e) => s + (e.valorPago ?? e.valor), 0)

  const handleExport = () => {
    const header = 'Tipo,Categoria,Descrição,Valor,Vencimento,Pagamento,Status,Forma Pagamento,Banco'
    const rows = visible.map(e =>
      `${e.tipo},${e.categoria},"${e.descricao}",${e.valor},${e.dataVenc},${e.dataPag ?? ''},${e.status},${e.formaPagamento ?? ''},${e.banco ?? ''}`
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href = url; a.download = 'lancamentos.csv'; a.click()
    URL.revokeObjectURL(url)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <ControleLayout title="Contas a Pagar e Receber" subtitle="Registre e gerencie todos os seus lançamentos financeiros">

      {/* ── Modal de Baixa ─────────────────────────────────── */}
      {baixaEntry && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <div>
                <h2 className="font-bold text-gray-900">Baixar Lançamento</h2>
                <p className="text-xs text-gray-500 mt-0.5 truncate max-w-xs">{baixaEntry.descricao}</p>
              </div>
              <button onClick={() => setBaixaEntry(null)} className="p-2 rounded-xl hover:bg-gray-100 text-gray-400">
                <X size={18} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-5">
              {/* Valor original */}
              <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                <span className="text-xs text-gray-500">Valor original</span>
                <span className={`font-bold text-lg ${baixaEntry.tipo === 'receita' ? 'text-emerald-700' : 'text-red-700'}`}>
                  {fmtBRL(baixaEntry.valor)}
                </span>
              </div>

              {/* Motivo: dois grandes botões */}
              <div>
                <p className="text-xs font-bold text-gray-600 mb-2">O que deseja fazer?</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => setBaixaForm(f => ({ ...f, motivo: 'pagamento' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${baixaForm.motivo === 'pagamento' ? 'border-emerald-500 bg-emerald-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <CheckCircle2 size={28} className={baixaForm.motivo === 'pagamento' ? 'text-emerald-600' : 'text-gray-300'} />
                    <span className={`text-sm font-bold ${baixaForm.motivo === 'pagamento' ? 'text-emerald-700' : 'text-gray-400'}`}>
                      Registrar Pagamento
                    </span>
                    <span className="text-[10px] text-gray-400 text-center">Conta foi paga/recebida</span>
                  </button>
                  <button
                    onClick={() => setBaixaForm(f => ({ ...f, motivo: 'cancelamento' }))}
                    className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 transition-all ${baixaForm.motivo === 'cancelamento' ? 'border-red-400 bg-red-50' : 'border-gray-200 hover:border-gray-300'}`}
                  >
                    <XCircle size={28} className={baixaForm.motivo === 'cancelamento' ? 'text-red-500' : 'text-gray-300'} />
                    <span className={`text-sm font-bold ${baixaForm.motivo === 'cancelamento' ? 'text-red-600' : 'text-gray-400'}`}>
                      Cancelar / Estornar
                    </span>
                    <span className="text-[10px] text-gray-400 text-center">Conta não será paga</span>
                  </button>
                </div>
              </div>

              {/* Detalhes do pagamento */}
              {baixaForm.motivo === 'pagamento' && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Data do Pagamento</label>
                      <input type="date" className={inp} value={baixaForm.dataPag}
                        onChange={e => setBaixaForm(f => ({ ...f, dataPag: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Valor Pago (R$)</label>
                      <input type="number" step="0.01" className={inp} value={baixaForm.valorPago}
                        onChange={e => setBaixaForm(f => ({ ...f, valorPago: +e.target.value }))} />
                    </div>
                  </div>

                  {/* Forma de pagamento */}
                  <div>
                    <label className={lbl}>Forma de Pagamento</label>
                    <div className="grid grid-cols-3 gap-2">
                      {FORMAS_PAG.map(fp => (
                        <button key={fp.value}
                          onClick={() => setBaixaForm(f => ({ ...f, formaPagamento: fp.value }))}
                          className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border-2 text-center transition-all ${baixaForm.formaPagamento === fp.value ? 'border-[#C9A258] bg-yellow-50' : 'border-gray-200 hover:border-gray-300'}`}
                        >
                          <fp.icon size={18} className={baixaForm.formaPagamento === fp.value ? 'text-[#C9A258]' : 'text-gray-400'} />
                          <span className={`text-[10px] font-semibold leading-tight ${baixaForm.formaPagamento === fp.value ? 'text-[#C9A258]' : 'text-gray-500'}`}>
                            {fp.label}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Cheque — número */}
                  {baixaForm.formaPagamento === 'cheque' && (
                    <div>
                      <label className={lbl}>Número do Cheque</label>
                      <input className={inp} placeholder="Ex: 000123" value={baixaForm.numeroCheque}
                        onChange={e => setBaixaForm(f => ({ ...f, numeroCheque: e.target.value }))} />
                    </div>
                  )}

                  {/* Banco e titular */}
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className={lbl}>Banco</label>
                      <input className={inp} placeholder="Ex: Sicoob, Itaú, BB..." value={baixaForm.banco}
                        onChange={e => setBaixaForm(f => ({ ...f, banco: e.target.value }))} />
                    </div>
                    <div>
                      <label className={lbl}>Titular da Conta</label>
                      <input className={inp} placeholder="Nome do titular" value={baixaForm.contaTitular}
                        onChange={e => setBaixaForm(f => ({ ...f, contaTitular: e.target.value }))} />
                    </div>
                  </div>

                  {/* Aviso diferença de valor */}
                  {baixaForm.valorPago !== baixaEntry.valor && baixaForm.valorPago > 0 && (
                    <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3">
                      <AlertTriangle size={14} className="text-amber-500 shrink-0" />
                      <p className="text-xs text-amber-700">
                        Valor pago difere do original em {fmtBRL(Math.abs(baixaForm.valorPago - baixaEntry.valor))}
                        {baixaForm.valorPago < baixaEntry.valor ? ' (desconto/parcial)' : ' (juros/multa)'}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Aviso cancelamento */}
              {baixaForm.motivo === 'cancelamento' && (
                <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3">
                  <AlertTriangle size={14} className="text-red-500 shrink-0" />
                  <p className="text-xs text-red-700">
                    O lançamento será marcado como cancelado e não afetará o saldo do caixa.
                  </p>
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex gap-3 px-6 pb-6">
              <button onClick={handleConfirmarBaixa}
                className={`flex-1 py-3 rounded-xl font-bold text-white text-sm transition-colors ${baixaForm.motivo === 'pagamento' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-red-500 hover:bg-red-600'}`}>
                {baixaForm.motivo === 'pagamento' ? '✓ Confirmar Pagamento' : '✕ Confirmar Cancelamento'}
              </button>
              <button onClick={() => setBaixaEntry(null)}
                className="px-5 py-3 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
                Voltar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="space-y-4">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Contas a Pagar e Receber</h2>
            <p className="text-xs text-gray-500 mt-0.5">Registre seus lançamentos e efetue as baixas quando pagar ou receber</p>
          </div>
          <div className="flex gap-2">
            <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => { setShowForm(true); setEditItem(null); setForm(EMPTY_FORM) }}
              className="flex items-center gap-2 bg-[#C9A258] hover:bg-[#b8913f] text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Novo Lançamento
            </button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Total Receitas</p>
            <p className="text-lg font-bold text-emerald-700">{fmtBRL(totalRec)}</p>
            <p className="text-[10px] text-emerald-600 mt-0.5">Recebido: {fmtBRL(totalPagoRec)}</p>
          </div>
          <div className="bg-red-50 border border-red-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Total Despesas</p>
            <p className="text-lg font-bold text-red-700">{fmtBRL(totalDesp)}</p>
            <p className="text-[10px] text-red-600 mt-0.5">Pago: {fmtBRL(totalPagoDesp)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${totalRec - totalDesp >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-gray-500">Resultado Previsto</p>
            <p className={`text-lg font-bold ${totalRec - totalDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRec - totalDesp)}</p>
          </div>
          <div className={`border rounded-xl p-3 ${totalPagoRec - totalPagoDesp >= 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
            <p className="text-xs text-gray-500">Resultado Real (caixa)</p>
            <p className={`text-lg font-bold ${totalPagoRec - totalPagoDesp >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(totalPagoRec - totalPagoDesp)}</p>
          </div>
        </div>

        {/* Filtros */}
        <div className="flex gap-2 flex-wrap items-center bg-white border border-gray-100 rounded-xl px-4 py-3">
          <Filter size={14} className="text-gray-400 shrink-0" />
          {(['todos','receita','despesa'] as const).map(t => (
            <button key={t} onClick={() => setFiltroTipo(t)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroTipo === t ? 'bg-[#C9A258] text-white border-[#C9A258]' : 'bg-white border-gray-200 text-gray-600'}`}>
              {t === 'todos' ? 'Todos' : t === 'receita' ? 'Receitas' : 'Despesas'}
            </button>
          ))}
          <span className="text-gray-200">|</span>
          {(['todos','pendente','atrasado','previsto','pago','cancelado'] as const).map(s => (
            <button key={s} onClick={() => setFiltroSt(s)}
              className={`px-3 py-1.5 rounded-full text-xs font-semibold border ${filtroSt === s ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>
              {s === 'todos' ? 'Todos status' : STATUS_LABELS[s]}
            </button>
          ))}
          <input type="month" value={filtroMes} onChange={e => setFiltroMes(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-1.5 text-xs ml-auto" />
        </div>

        {/* Formulário novo/editar */}
        {showForm && (
          <Card className="p-5 border-2 border-yellow-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-700">{editItem ? 'Editar Lançamento' : 'Novo Lançamento'}</h3>
              <button onClick={() => { setShowForm(false); setEditItem(null) }}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className={lbl}>Tipo</label>
                <div className="flex gap-2">
                  {(['receita','despesa'] as const).map(t => (
                    <button key={t} onClick={() => setForm(f => ({ ...f, tipo: t, categoria: t === 'receita' ? CATS_REC[0] : CATS_DESP[0] }))}
                      className={`flex-1 py-2 rounded-xl text-xs font-semibold border capitalize ${form.tipo === t ? (t === 'receita' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-red-600 text-white border-red-600') : 'bg-white border-gray-200 text-gray-600'}`}>
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className={lbl}>Categoria</label>
                <select className={inp} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {cats.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Descrição</label>
                <input className={inp} value={form.descricao} onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))} placeholder="Descrição do lançamento" />
              </div>
              <div>
                <label className={lbl}>Valor (R$)</label>
                <input type="number" step="0.01" className={inp} value={form.valor || ''} onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Vencimento</label>
                <input type="date" className={inp} value={form.dataVenc} onChange={e => setForm(f => ({ ...f, dataVenc: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Status inicial</label>
                <select className={inp} value={form.status} onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="pendente">Pendente</option>
                  <option value="previsto">Previsto</option>
                  <option value="pago">Pago</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Observações</label>
                <input className={inp} value={form.obs ?? ''} onChange={e => setForm(f => ({ ...f, obs: e.target.value || undefined }))} placeholder="Opcional" />
              </div>
            </div>
            <div className="flex items-center gap-3 mt-3">
              <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                <input type="checkbox" checked={form.recorrente} onChange={e => setForm(f => ({ ...f, recorrente: e.target.checked }))} className="rounded" />
                Recorrente
              </label>
              {form.recorrente && (
                <select className="border border-gray-200 rounded-lg px-2 py-1 text-xs" value={form.periodicidade ?? 'mensal'}
                  onChange={e => setForm(f => ({ ...f, periodicidade: e.target.value as any }))}>
                  {['semanal','quinzenal','mensal','bimestral','trimestral','semestral','anual'].map(p => (
                    <option key={p} value={p}>{p.charAt(0).toUpperCase() + p.slice(1)}</option>
                  ))}
                </select>
              )}
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={handleSave} className="bg-[#C9A258] hover:bg-[#b8913f] text-white rounded-xl px-4 py-2 text-sm font-semibold">Salvar</button>
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
                  {['Tipo','Categoria','Descrição','Valor','Vencimento','Baixa','Status',''].map(h => (
                    <th key={h} className="px-3 py-2.5 text-left font-semibold text-gray-500 uppercase whitespace-nowrap text-[11px]">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {visible.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="py-12 text-center">
                      <DollarSign size={32} className="mx-auto text-gray-200 mb-2" />
                      <p className="text-gray-400 text-sm">Nenhum lançamento encontrado</p>
                      <p className="text-gray-300 text-xs mt-1">Clique em "Novo Lançamento" para começar</p>
                    </td>
                  </tr>
                ) : visible.map(e => (
                  <tr key={e.id} className={`hover:bg-gray-50/50 ${e.status === 'cancelado' ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full font-medium text-[11px] ${e.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                        {e.tipo === 'receita' ? '↑ Receita' : '↓ Despesa'}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{e.categoria}</td>
                    <td className="px-3 py-2.5">
                      <p className="font-medium text-gray-900">{e.descricao}</p>
                      {e.obs && <p className="text-[10px] text-gray-400">{e.obs}</p>}
                    </td>
                    <td className={`px-3 py-2.5 font-bold ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-700'}`}>
                      {fmtBRL(e.valor)}
                      {e.valorPago && e.valorPago !== e.valor && (
                        <p className="text-[10px] font-normal text-gray-400">Pago: {fmtBRL(e.valorPago)}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500">{fmtDate(e.dataVenc)}</td>
                    <td className="px-3 py-2.5">
                      {e.status === 'pago' && e.dataPag && (
                        <div>
                          <p className="text-emerald-600 font-medium text-[11px]">{fmtDate(e.dataPag)}</p>
                          {e.formaPagamento && (
                            <p className="text-[10px] text-gray-400">
                              {FORMAS_PAG.find(f => f.value === e.formaPagamento)?.label ?? e.formaPagamento}
                              {e.banco && ` · ${e.banco}`}
                            </p>
                          )}
                        </div>
                      )}
                      {e.status === 'cancelado' && <span className="text-[11px] text-gray-400">Cancelado</span>}
                      {e.status !== 'pago' && e.status !== 'cancelado' && <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COR[e.status]}`}>
                        {STATUS_LABELS[e.status]}
                      </span>
                    </td>
                    <td className="px-3 py-2.5">
                      <div className="flex gap-1">
                        {e.status !== 'pago' && e.status !== 'cancelado' && (
                          <button onClick={() => openBaixa(e)} title="Efetuar baixa"
                            className="p-1.5 hover:bg-emerald-50 rounded-lg text-emerald-600 border border-emerald-200 text-[10px] font-semibold flex items-center gap-1">
                            <CheckCircle2 size={12} /> Baixar
                          </button>
                        )}
                        <button onClick={() => handleEdit(e)} className="p-1 hover:bg-blue-50 rounded text-blue-400"><Edit2 size={13} /></button>
                        <button onClick={() => handleDelete(e.id)} className="p-1 hover:bg-red-50 rounded text-red-400"><Trash2 size={13} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    </ControleLayout>
  )
}
