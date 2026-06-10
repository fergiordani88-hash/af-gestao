import { useState, useEffect } from 'react'
import {
  ChevronLeft, ChevronRight, Calendar, Wallet,
  TrendingUp, TrendingDown, Settings, CheckCircle2, Clock, AlertTriangle, X
} from 'lucide-react'
import { controleStorage, type ControleEntry } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtDate = (s: string) => new Date(s + 'T12:00:00').toLocaleDateString('pt-BR')
const MESES   = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS    = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

const STATUS_ICON: Record<string, React.ReactNode> = {
  pago:      <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />,
  pendente:  <Clock size={11} className="text-amber-500 shrink-0" />,
  atrasado:  <AlertTriangle size={11} className="text-red-500 shrink-0" />,
  previsto:  <Clock size={11} className="text-gray-400 shrink-0" />,
  cancelado: <X size={11} className="text-gray-300 shrink-0" />,
}

type Aba = 'extrato' | 'calendario'

export function ControleFluxoDiario() {
  const today = new Date()
  const [aba,        setAba]       = useState<Aba>('extrato')
  const [year,       setYear]      = useState(today.getFullYear())
  const [month,      setMonth]     = useState(today.getMonth())
  const [dayData,    setDayData]   = useState<Record<string, any>>({})
  const [selectedDay,setSelDay]    = useState<string | null>(null)
  const [fluxo,      setFluxo]     = useState<any[]>([])
  const [saldoInicial, setSaldoInicial] = useState(controleStorage.getSaldoInicial())
  const [showSaldoForm, setShowSaldoForm] = useState(false)
  const [saldoForm, setSaldoForm]  = useState({
    valor: saldoInicial?.valor?.toString() ?? '',
    data:  saldoInicial?.data  ?? today.toISOString().slice(0, 10),
  })

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  // Calendário
  useEffect(() => {
    const entries = controleStorage.getEntries()
    const map: Record<string, any> = {}
    entries.forEach(e => {
      if (e.status === 'cancelado') return
      const d = new Date(e.dataVenc + 'T12:00:00')
      if (d.getFullYear() === year && d.getMonth() === month) {
        const key = d.getDate().toString()
        if (!map[key]) map[key] = { receita: 0, despesa: 0, items: [] }
        if (e.tipo === 'receita') map[key].receita += e.valor
        else map[key].despesa += e.valor
        map[key].items.push(e)
      }
    })
    setDayData(map)
  }, [year, month])

  // Extrato: toda a base de dados do mês selecionado
  useEffect(() => {
    const start = `${year}-${String(month + 1).padStart(2, '0')}-01`
    const lastDay = new Date(year, month + 1, 0).getDate()
    const end   = `${year}-${String(month + 1).padStart(2, '0')}-${lastDay}`
    setFluxo(controleStorage.getDailyFlux(start, end))
  }, [year, month, saldoInicial])

  const handleSalvarSaldo = () => {
    const si = { valor: parseFloat(saldoForm.valor) || 0, data: saldoForm.data }
    controleStorage.setSaldoInicial(si)
    setSaldoInicial(si)
    setShowSaldoForm(false)
  }

  // KPIs calendário
  const totalRec  = Object.values(dayData).reduce((s: number, d: any) => s + d.receita, 0)
  const totalDesp = Object.values(dayData).reduce((s: number, d: any) => s + d.despesa, 0)

  // KPIs extrato
  const totalEntradas = fluxo.reduce((s, d) => s + d.entradas, 0)
  const totalSaidas   = fluxo.reduce((s, d) => s + d.saidas, 0)
  const saldoFinal    = fluxo.length > 0 ? fluxo[fluxo.length - 1].saldo : (saldoInicial?.valor ?? 0)
  const saldoInicialValor = saldoInicial?.valor ?? 0

  const firstDay    = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr    = today.getDate().toString()

  const selectedEntries: ControleEntry[] = selectedDay ? (dayData[selectedDay]?.items ?? []) : []

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-300'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <ControleLayout title="Fluxo de Caixa" subtitle="Acompanhe entradas, saídas e saldo dia a dia">
      <div className="space-y-5">

        {/* Navegação mês + abas */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200"><ChevronLeft size={15} /></button>
            <span className="text-sm font-bold text-gray-900 min-w-[150px] text-center">{MESES[month]} {year}</span>
            <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl border border-gray-200"><ChevronRight size={15} /></button>
          </div>

          <div className="flex items-center gap-2">
            {/* Saldo inicial */}
            <button onClick={() => setShowSaldoForm(true)}
              className="flex items-center gap-1.5 border border-gray-200 bg-white text-gray-600 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-gray-50">
              <Wallet size={13} /> {saldoInicial ? `Saldo inicial: ${fmtBRL(saldoInicial.valor)}` : 'Definir saldo inicial'}
            </button>

            {/* Toggle abas */}
            <div className="flex bg-gray-100 rounded-xl p-1 text-xs font-semibold">
              <button onClick={() => setAba('extrato')}
                className={`px-3 py-1.5 rounded-lg transition-all ${aba === 'extrato' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                📋 Extrato
              </button>
              <button onClick={() => setAba('calendario')}
                className={`px-3 py-1.5 rounded-lg transition-all ${aba === 'calendario' ? 'bg-white shadow text-gray-900' : 'text-gray-500'}`}>
                📅 Calendário
              </button>
            </div>
          </div>
        </div>

        {/* Modal saldo inicial */}
        {showSaldoForm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <Wallet size={18} className="text-[#C9A258]" />
                  <h3 className="font-bold text-gray-900">Saldo Inicial em Caixa</h3>
                </div>
                <button onClick={() => setShowSaldoForm(false)}><X size={16} className="text-gray-400" /></button>
              </div>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Informe quanto havia no caixa em uma data de referência. O sistema calculará o saldo dia a dia a partir daí.
              </p>
              <div className="space-y-3">
                <div>
                  <label className={lbl}>Valor do saldo (R$)</label>
                  <input type="number" step="0.01" className={inp} placeholder="Ex: 5.000,00"
                    value={saldoForm.valor} onChange={e => setSaldoForm(f => ({ ...f, valor: e.target.value }))} />
                </div>
                <div>
                  <label className={lbl}>Data de referência</label>
                  <input type="date" className={inp}
                    value={saldoForm.data} onChange={e => setSaldoForm(f => ({ ...f, data: e.target.value }))} />
                </div>
              </div>
              <div className="flex gap-2 mt-5">
                <button onClick={handleSalvarSaldo}
                  className="flex-1 bg-[#C9A258] hover:bg-[#b8913f] text-white rounded-xl py-2.5 text-sm font-bold">
                  Salvar
                </button>
                <button onClick={() => setShowSaldoForm(false)}
                  className="px-4 border border-gray-200 rounded-xl text-sm text-gray-600">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ── ABA EXTRATO ────────────────────────────────────── */}
        {aba === 'extrato' && (
          <>
            {/* Banner saldo inicial ausente */}
            {!saldoInicial && (
              <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl p-4">
                <AlertTriangle size={18} className="text-amber-500 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm font-semibold text-amber-800">Saldo inicial não definido</p>
                  <p className="text-xs text-amber-600 mt-0.5">Para ver o saldo acumulado no extrato, defina o valor que havia no caixa em uma data de referência.</p>
                </div>
                <button onClick={() => setShowSaldoForm(true)}
                  className="shrink-0 bg-amber-500 hover:bg-amber-600 text-white rounded-xl px-3 py-2 text-xs font-bold">
                  Definir agora
                </button>
              </div>
            )}

            {/* KPIs do mês */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wallet size={14} className="text-gray-500" />
                  <p className="text-xs text-gray-500 font-medium">Saldo Inicial</p>
                </div>
                <p className={`text-xl font-bold ${saldoInicialValor >= 0 ? 'text-gray-800' : 'text-red-600'}`}>
                  {fmtBRL(saldoInicialValor)}
                </p>
                {saldoInicial && <p className="text-[10px] text-gray-400 mt-1">ref. {fmtDate(saldoInicial.data)}</p>}
              </div>
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingUp size={14} className="text-emerald-600" />
                  <p className="text-xs text-emerald-700 font-medium">Entradas no Mês</p>
                </div>
                <p className="text-xl font-bold text-emerald-700">{fmtBRL(totalEntradas)}</p>
                <p className="text-[10px] text-gray-400 mt-1">previsto no período</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-center">
                <div className="flex items-center justify-center gap-1 mb-1">
                  <TrendingDown size={14} className="text-red-600" />
                  <p className="text-xs text-red-700 font-medium">Saídas no Mês</p>
                </div>
                <p className="text-xl font-bold text-red-700">{fmtBRL(totalSaidas)}</p>
                <p className="text-[10px] text-gray-400 mt-1">previsto no período</p>
              </div>
              <div className={`border rounded-xl p-4 text-center ${saldoFinal >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <div className="flex items-center justify-center gap-1 mb-1">
                  <Wallet size={14} className={saldoFinal >= 0 ? 'text-blue-600' : 'text-red-500'} />
                  <p className={`text-xs font-medium ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>Saldo Final</p>
                </div>
                <p className={`text-xl font-bold ${saldoFinal >= 0 ? 'text-blue-700' : 'text-red-700'}`}>
                  {fmtBRL(saldoFinal)}
                </p>
                <p className="text-[10px] text-gray-400 mt-1">saldo real (pagos)</p>
              </div>
            </div>

            {/* Tabela extrato */}
            {fluxo.length === 0 ? (
              <Card className="p-8 text-center">
                <Calendar size={40} className="mx-auto text-gray-200 mb-3" />
                <p className="text-gray-400 font-medium">Nenhum lançamento em {MESES[month]}</p>
                <p className="text-xs text-gray-300 mt-1">Cadastre receitas e despesas em "Lançamentos" para ver o extrato aqui</p>
              </Card>
            ) : (
              <Card>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-gray-50 border-b">
                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[11px]">Data</th>
                        <th className="px-4 py-3 text-left font-bold text-gray-500 uppercase text-[11px]">Descrição</th>
                        <th className="px-4 py-3 text-right font-bold text-emerald-600 uppercase text-[11px]">Entradas</th>
                        <th className="px-4 py-3 text-right font-bold text-red-500 uppercase text-[11px]">Saídas</th>
                        <th className="px-4 py-3 text-right font-bold text-gray-500 uppercase text-[11px]">Saldo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {fluxo.map((dia, idx) => (
                        <>
                          {/* Linha-resumo do dia */}
                          <tr key={`d-${idx}`}
                            className={`border-b font-semibold ${dia.saldo < 0 ? 'bg-red-50' : idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/40'}`}>
                            <td className="px-4 py-3 text-gray-700 font-bold whitespace-nowrap">
                              {fmtDate(dia.date)}
                            </td>
                            <td className="px-4 py-3 text-gray-500">
                              <span className="text-[10px] bg-gray-100 text-gray-500 rounded-full px-2 py-0.5">
                                {dia.items.length} lançamento{dia.items.length !== 1 ? 's' : ''}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-emerald-700">
                              {dia.entradas > 0 ? `+${fmtBRL(dia.entradas)}` : '—'}
                            </td>
                            <td className="px-4 py-3 text-right text-red-600">
                              {dia.saidas > 0 ? `-${fmtBRL(dia.saidas)}` : '—'}
                            </td>
                            <td className={`px-4 py-3 text-right font-bold text-base ${dia.saldo < 0 ? 'text-red-700' : 'text-gray-900'}`}>
                              {dia.saldo < 0 && (
                                <span className="text-red-500 mr-1 text-xs">⚠</span>
                              )}
                              {fmtBRL(dia.saldo)}
                            </td>
                          </tr>
                          {/* Linhas de detalhe de cada lançamento */}
                          {dia.items.map((e: ControleEntry) => (
                            <tr key={e.id} className={`border-b border-dashed border-gray-100 ${e.status === 'cancelado' ? 'opacity-40' : ''}`}>
                              <td className="px-4 py-2 pl-8 text-gray-400 text-[10px]">
                                {STATUS_ICON[e.status]}
                              </td>
                              <td className="px-4 py-2 text-gray-600">
                                <span className={`inline-block mr-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${e.tipo === 'receita' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'}`}>
                                  {e.tipo === 'receita' ? '↑' : '↓'}
                                </span>
                                {e.descricao}
                                <span className="text-gray-300 ml-1">· {e.categoria}</span>
                              </td>
                              <td className="px-4 py-2 text-right text-emerald-600">
                                {e.tipo === 'receita' ? fmtBRL(e.valor) : ''}
                              </td>
                              <td className="px-4 py-2 text-right text-red-500">
                                {e.tipo === 'despesa' ? fmtBRL(e.valor) : ''}
                              </td>
                              <td className="px-4 py-2 text-right">
                                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                  e.status === 'pago'      ? 'bg-emerald-100 text-emerald-700' :
                                  e.status === 'atrasado'  ? 'bg-red-100 text-red-700' :
                                  e.status === 'cancelado' ? 'bg-gray-100 text-gray-400' :
                                  'bg-amber-100 text-amber-600'
                                }`}>
                                  {e.status === 'pago' ? 'Pago' : e.status === 'atrasado' ? 'Atrasado' : e.status === 'cancelado' ? 'Cancelado' : 'Pendente'}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </>
                      ))}

                      {/* Linha de totais */}
                      <tr className="bg-gray-800 text-white font-bold">
                        <td className="px-4 py-3 rounded-bl-xl" colSpan={2}>TOTAL DO MÊS</td>
                        <td className="px-4 py-3 text-right text-emerald-300">+{fmtBRL(totalEntradas)}</td>
                        <td className="px-4 py-3 text-right text-red-300">-{fmtBRL(totalSaidas)}</td>
                        <td className={`px-4 py-3 text-right text-lg rounded-br-xl ${saldoFinal < 0 ? 'text-red-300' : 'text-white'}`}>
                          {fmtBRL(saldoFinal)}
                        </td>
                      </tr>
                    </tbody>
                  </table>
                </div>

                {/* Legenda */}
                <div className="flex flex-wrap gap-4 px-4 py-3 border-t border-gray-100 bg-gray-50/50 text-[10px] text-gray-400">
                  <span className="flex items-center gap-1"><CheckCircle2 size={10} className="text-emerald-500" /> Pago / Recebido</span>
                  <span className="flex items-center gap-1"><Clock size={10} className="text-amber-500" /> Pendente</span>
                  <span className="flex items-center gap-1"><AlertTriangle size={10} className="text-red-500" /> Atrasado</span>
                  <span className="flex items-center gap-1 ml-auto text-red-400 font-semibold">⚠ Saldo negativo = célula vermelha</span>
                </div>
              </Card>
            )}
          </>
        )}

        {/* ── ABA CALENDÁRIO ─────────────────────────────────── */}
        {aba === 'calendario' && (
          <>
            {/* KPIs calendário */}
            <div className="grid grid-cols-3 gap-3">
              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Receitas do Mês</p>
                <p className="text-lg font-bold text-emerald-700">{fmtBRL(totalRec)}</p>
              </div>
              <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-center">
                <p className="text-xs text-gray-500">Despesas do Mês</p>
                <p className="text-lg font-bold text-red-700">{fmtBRL(totalDesp)}</p>
              </div>
              <div className={`border rounded-xl p-3 text-center ${totalRec - totalDesp >= 0 ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'}`}>
                <p className="text-xs text-gray-500">Resultado</p>
                <p className={`text-lg font-bold ${totalRec - totalDesp >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(totalRec - totalDesp)}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
              {/* Calendário */}
              <div className="lg:col-span-2">
                <Card className="p-4">
                  <div className="grid grid-cols-7 mb-2">
                    {DIAS.map(d => (
                      <div key={d} className="text-center text-xs font-semibold text-gray-400 py-1">{d}</div>
                    ))}
                  </div>
                  <div className="grid grid-cols-7 gap-1">
                    {Array.from({ length: firstDay }).map((_, i) => <div key={`e${i}`} />)}
                    {Array.from({ length: daysInMonth }, (_, i) => {
                      const day   = (i + 1).toString()
                      const d     = dayData[day]
                      const isToday    = day === todayStr && month === today.getMonth() && year === today.getFullYear()
                      const isSelected = selectedDay === day
                      const resultado  = (d?.receita ?? 0) - (d?.despesa ?? 0)
                      return (
                        <button key={day} onClick={() => setSelDay(isSelected ? null : day)}
                          className={`min-h-[56px] p-1.5 rounded-xl border text-left transition-all ${isSelected ? 'border-[#C9A258] bg-yellow-50 shadow-sm' : isToday ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                          <p className={`text-xs font-bold mb-0.5 ${isToday ? 'text-[#C9A258]' : 'text-gray-700'}`}>{day}</p>
                          {d?.receita > 0 && <p className="text-[9px] text-emerald-700 font-semibold leading-tight">+{fmtBRL(d.receita).replace('R$ ','')}</p>}
                          {d?.despesa > 0 && <p className="text-[9px] text-red-600 font-semibold leading-tight">-{fmtBRL(d.despesa).replace('R$ ','')}</p>}
                          {d && (
                            <div className={`mt-0.5 h-1 rounded-full ${resultado >= 0 ? 'bg-emerald-300' : 'bg-red-300'}`} />
                          )}
                        </button>
                      )
                    })}
                  </div>
                </Card>
              </div>

              {/* Detalhe do dia */}
              <Card className="p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Calendar size={15} className="text-[#C9A258]" />
                  <h3 className="font-semibold text-sm text-gray-700">
                    {selectedDay ? `Dia ${selectedDay} de ${MESES[month]}` : 'Selecione um dia'}
                  </h3>
                </div>

                {!selectedDay && (
                  <div className="py-8 text-center text-gray-300">
                    <Calendar size={32} className="mx-auto mb-2" />
                    <p className="text-xs">Clique em um dia no calendário<br />para ver os lançamentos</p>
                  </div>
                )}
                {selectedDay && selectedEntries.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-6">Nenhum lançamento neste dia</p>
                )}
                {selectedDay && selectedEntries.length > 0 && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2 mb-3">
                      <div className="bg-emerald-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-400">Receitas</p>
                        <p className="text-sm font-bold text-emerald-700">{fmtBRL(dayData[selectedDay]?.receita ?? 0)}</p>
                      </div>
                      <div className="bg-red-50 rounded-xl p-2 text-center">
                        <p className="text-[10px] text-gray-400">Despesas</p>
                        <p className="text-sm font-bold text-red-700">{fmtBRL(dayData[selectedDay]?.despesa ?? 0)}</p>
                      </div>
                    </div>
                    {selectedEntries.map((e) => (
                      <div key={e.id} className="flex items-start justify-between p-2.5 bg-gray-50 rounded-xl gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-900 truncate">{e.descricao}</p>
                          <p className="text-[10px] text-gray-400">{e.categoria}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            {STATUS_ICON[e.status]}
                            <span className="text-[9px] text-gray-400">{e.status}</span>
                          </div>
                        </div>
                        <p className={`text-xs font-bold shrink-0 ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-600'}`}>
                          {e.tipo === 'receita' ? '+' : '-'}{fmtBRL(e.valor)}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </Card>
            </div>
          </>
        )}
      </div>
    </ControleLayout>
  )
}
