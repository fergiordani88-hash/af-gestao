import { useState, useEffect, useCallback } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download, TrendingDown, Plus, X, CheckCircle2 } from 'lucide-react'
import { controleStorage, type ControleEntry } from '../storage/controleStorage'
import { CATS_DESPESA } from '../utils/categorias'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
const fmtK    = (v: number) => `${(v / 1000).toFixed(0)}k`
const MESES   = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const COLORS  = ['#EF4444','#F97316','#F59E0B','#EAB308','#84CC16','#14B8A6','#6366F1','#EC4899','#8B5CF6','#06B6D4','#10B981','#F43F5E']

type EmptyForm = Omit<ControleEntry, 'id' | 'createdAt'>
const EMPTY: EmptyForm = {
  tipo: 'despesa', categoria: CATS_DESPESA[0], descricao: '', valor: 0,
  dataVenc: '', status: 'pendente', recorrente: false,
}

const STATUS_COR: Record<string, string> = {
  pago:      'bg-emerald-100 text-emerald-700',
  pendente:  'bg-amber-100 text-amber-700',
  atrasado:  'bg-red-100 text-red-700',
  previsto:  'bg-gray-100 text-gray-600',
  cancelado: 'bg-gray-200 text-gray-400',
}
const STATUS_LABELS: Record<string, string> = {
  pago: 'Pago', pendente: 'Pendente', atrasado: 'Atrasado', previsto: 'Previsto', cancelado: 'Cancelado'
}

export function ControleDespesas() {
  const [ano,      setAno]      = useState(new Date().getFullYear())
  const [mensal,   setMensal]   = useState<any[]>([])
  const [porCat,   setPorCat]   = useState<any[]>([])
  const [total,    setTotal]    = useState(0)
  const [recentes, setRecentes] = useState<ControleEntry[]>([])
  const [showForm, setShowForm] = useState(false)
  const [form,     setForm]     = useState<EmptyForm>(EMPTY)

  const load = useCallback(() => {
    const now    = new Date(); now.setHours(0, 0, 0, 0)
    const all    = controleStorage.getEntries().map(e => {
      if ((e.status === 'pendente' || e.status === 'previsto') && new Date(e.dataVenc + 'T12:00:00') < now)
        return { ...e, status: 'atrasado' as const }
      return e
    })
    const desp   = all.filter(e => e.tipo === 'despesa')
    const doAno  = desp.filter(e => new Date(e.dataVenc).getFullYear() === ano)

    const m = Array.from({ length: 12 }, (_, i) => {
      const mv = doAno.filter(e => new Date(e.dataVenc).getMonth() === i)
      return {
        mes:      MESES[i],
        pago:     mv.filter(e => e.status === 'pago').reduce((s, e) => s + (e.valorPago ?? e.valor), 0),
        pendente: mv.filter(e => e.status !== 'pago' && e.status !== 'cancelado').reduce((s, e) => s + e.valor, 0),
      }
    })
    setMensal(m)

    const catMap: Record<string, number> = {}
    doAno.filter(e => e.status !== 'cancelado').forEach(e => {
      catMap[e.categoria] = (catMap[e.categoria] ?? 0) + e.valor
    })
    const cats = Object.entries(catMap).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value)
    setPorCat(cats)
    setTotal(doAno.filter(e => e.status !== 'cancelado').reduce((s, e) => s + e.valor, 0))
    setRecentes(desp.filter(e => e.status !== 'cancelado').sort((a, b) => b.dataVenc.localeCompare(a.dataVenc)).slice(0, 8))
  }, [ano])

  useEffect(() => { load() }, [load])

  const handleSave = () => {
    if (!form.descricao || !form.valor || !form.dataVenc) return
    controleStorage.addEntry(form)
    setShowForm(false)
    setForm(EMPTY)
    load()
  }

  const handleExport = () => {
    const entries = controleStorage.getEntries().filter(e => e.tipo === 'despesa' && new Date(e.dataVenc).getFullYear() === ano)
    const header  = 'Categoria,Descrição,Valor,Vencimento,Status'
    const rows    = entries.map(e => `${e.categoria},"${e.descricao}",${e.valor},${e.dataVenc},${e.status}`)
    const csv     = ['﻿' + header, ...rows].join('\n')
    const blob    = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const url     = URL.createObjectURL(blob)
    const a       = document.createElement('a'); a.href = url; a.download = `despesas-${ano}.csv`; a.click()
    URL.revokeObjectURL(url)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <ControleLayout title="Despesas" subtitle="Registre e analise todas as suas saídas financeiras">
      <div className="space-y-5">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Despesas</h2>
            <p className="text-xs text-gray-500 mt-0.5">Registre aqui tudo que você paga ou vai pagar</p>
          </div>
          <div className="flex items-center gap-2">
            <select value={ano} onChange={e => setAno(+e.target.value)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
              {[2023, 2024, 2025, 2026, 2027].map(a => <option key={a}>{a}</option>)}
            </select>
            <button onClick={handleExport} className="flex items-center gap-1.5 border border-gray-200 text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
              <Download size={13} /> CSV
            </button>
            <button onClick={() => setShowForm(s => !s)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              <Plus size={14} /> Nova Despesa
            </button>
          </div>
        </div>

        {/* Formulário rápido */}
        {showForm && (
          <Card className="p-5 border-2 border-red-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-sm text-gray-700">Registrar Nova Despesa</h3>
              <button onClick={() => { setShowForm(false); setForm(EMPTY) }}><X size={16} className="text-gray-400" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="col-span-2">
                <label className={lbl}>Categoria</label>
                <select className={inp} value={form.categoria} onChange={e => setForm(f => ({ ...f, categoria: e.target.value }))}>
                  {CATS_DESPESA.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="col-span-2">
                <label className={lbl}>Descrição</label>
                <input className={inp} value={form.descricao}
                  onChange={e => setForm(f => ({ ...f, descricao: e.target.value }))}
                  placeholder="Ex: Conta de energia — julho" />
              </div>
              <div>
                <label className={lbl}>Valor (R$)</label>
                <input type="number" step="0.01" className={inp} value={form.valor || ''}
                  onChange={e => setForm(f => ({ ...f, valor: +e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Data de vencimento</label>
                <input type="date" className={inp} value={form.dataVenc}
                  onChange={e => setForm(f => ({ ...f, dataVenc: e.target.value }))} />
              </div>
              <div>
                <label className={lbl}>Status</label>
                <select className={inp} value={form.status}
                  onChange={e => setForm(f => ({ ...f, status: e.target.value as any }))}>
                  <option value="pendente">Pendente</option>
                  <option value="pago">Já Pago</option>
                  <option value="previsto">Previsto</option>
                </select>
              </div>
              <div>
                <label className={lbl}>Observações</label>
                <input className={inp} value={form.obs ?? ''}
                  onChange={e => setForm(f => ({ ...f, obs: e.target.value || undefined }))}
                  placeholder="Opcional" />
              </div>
            </div>
            <div className="mt-3 bg-blue-50 border border-blue-100 rounded-xl px-3 py-2">
              <p className="text-[11px] text-blue-600 flex items-center gap-1">
                <CheckCircle2 size={11} className="shrink-0" />
                Esta despesa será automaticamente inserida no Fluxo de Caixa diário.
              </p>
            </div>
            <div className="flex gap-2 mt-3">
              <button onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white rounded-xl px-4 py-2 text-sm font-semibold">
                Salvar Despesa
              </button>
              <button onClick={() => { setShowForm(false); setForm(EMPTY) }}
                className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600">
                Cancelar
              </button>
            </div>
          </Card>
        )}

        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="col-span-2 bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <TrendingDown size={16} className="text-red-600" />
              <p className="text-xs text-gray-500">Total de Despesas {ano}</p>
            </div>
            <p className="text-2xl font-bold text-red-700">{fmtBRL(total)}</p>
            <p className="text-xs text-gray-400 mt-0.5">Média mensal: {fmtBRL(total / 12)}</p>
          </div>
          {porCat.slice(0, 2).map((c, i) => (
            <div key={c.name} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
              <p className="text-xs text-gray-500">#{i + 1} Maior Despesa</p>
              <p className="text-sm font-bold text-gray-900 mt-1 truncate">{c.name}</p>
              <p className="text-lg font-bold text-red-600">{fmtBRL(c.value)}</p>
            </div>
          ))}
        </div>

        {/* Gráfico mensal */}
        {mensal.some(m => m.pago + m.pendente > 0) && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Despesas Mensais — {ano}</h3>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={mensal}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 9 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <Bar dataKey="pago"     name="Pago"     fill="#EF4444" radius={[3,3,0,0]} stackId="a" />
                <Bar dataKey="pendente" name="Pendente" fill="#FCA5A5" radius={[3,3,0,0]} stackId="a" />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        {/* Pizza + ranking */}
        {porCat.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Por Categoria — {ano}</h3>
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={porCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                    label={({ percent }) => `${(percent * 100).toFixed(0)}%`} labelLine={false}>
                    {porCat.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                </PieChart>
              </ResponsiveContainer>
            </Card>
            <Card>
              <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Ranking por Categoria</div>
              <div className="divide-y divide-gray-50 max-h-56 overflow-y-auto">
                {porCat.map((c, i) => (
                  <div key={c.name} className="flex items-center justify-between px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full shrink-0" style={{ background: COLORS[i % COLORS.length] }} />
                      <span className="text-sm text-gray-700">{c.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-red-600">{fmtBRL(c.value)}</p>
                      <p className="text-xs text-gray-400">{total > 0 ? `${((c.value / total) * 100).toFixed(1)}%` : '—'}</p>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {/* Últimos lançamentos */}
        {recentes.length > 0 && (
          <Card>
            <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Últimas Despesas Lançadas</div>
            <div className="divide-y divide-gray-50">
              {recentes.map(e => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{e.descricao}</p>
                    <p className="text-xs text-gray-400">{e.categoria} · Vcto {fmtDate(e.dataVenc)}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_COR[e.status]}`}>
                      {STATUS_LABELS[e.status]}
                    </span>
                    <p className="text-sm font-bold text-red-600">{fmtBRL(e.valor)}</p>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}

        {total === 0 && !showForm && (
          <div className="py-16 text-center text-gray-400">
            <TrendingDown size={48} className="mx-auto mb-4 opacity-20" />
            <p className="font-medium">Nenhuma despesa lançada em {ano}</p>
            <button onClick={() => setShowForm(true)}
              className="mt-3 bg-red-600 hover:bg-red-700 text-white rounded-xl px-5 py-2.5 text-sm font-semibold">
              + Registrar primeira despesa
            </button>
          </div>
        )}
      </div>
    </ControleLayout>
  )
}
