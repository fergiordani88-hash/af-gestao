import { useState, useEffect } from 'react'
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react'
import { payStorage } from '../../services/payStorage'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const MESES  = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro']
const DIAS   = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']

export function TabFluxoDiario() {
  const today = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [dayData, setDayData] = useState<Record<string, any>>({})
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  useEffect(() => {
    const entries = payStorage.getEntries()
    const map: Record<string, any> = {}
    entries.forEach(e => {
      const d = new Date(e.dataVenc)
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

  const prevMonth = () => { if (month === 0) { setMonth(11); setYear(y => y - 1) } else setMonth(m => m - 1) }
  const nextMonth = () => { if (month === 11) { setMonth(0); setYear(y => y + 1) } else setMonth(m => m + 1) }

  const firstDay = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const todayStr = today.getDate().toString()

  const selectedEntries = selectedDay ? (dayData[selectedDay]?.items ?? []) : []
  const totalRec  = Object.values(dayData).reduce((s: number, d: any) => s + d.receita, 0)
  const totalDesp = Object.values(dayData).reduce((s: number, d: any) => s + d.despesa, 0)

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Fluxo Diário</h2>
          <p className="text-xs text-gray-500 mt-0.5">Visão de calendário — receitas e despesas dia a dia</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={prevMonth} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronLeft size={16} /></button>
          <span className="text-sm font-bold text-gray-900 min-w-[140px] text-center">{MESES[month]} {year}</span>
          <button onClick={nextMonth} className="p-2 hover:bg-gray-100 rounded-xl"><ChevronRight size={16} /></button>
        </div>
      </div>

      {/* Resumo do mês */}
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
                const day = (i + 1).toString()
                const d = dayData[day]
                const isToday = day === todayStr && month === today.getMonth() && year === today.getFullYear()
                const isSelected = selectedDay === day
                return (
                  <button key={day} onClick={() => setSelectedDay(isSelected ? null : day)}
                    className={`min-h-[52px] p-1 rounded-xl border text-left transition-all ${isSelected ? 'border-amber-400 bg-amber-50' : isToday ? 'border-amber-300 bg-amber-50/50' : 'border-gray-100 hover:border-gray-200 bg-white'}`}>
                    <p className={`text-xs font-bold mb-0.5 ${isToday ? 'text-amber-600' : 'text-gray-700'}`}>{day}</p>
                    {d?.receita > 0 && <p className="text-[9px] text-emerald-700 font-medium leading-tight truncate">+{(d.receita / 1000).toFixed(0)}k</p>}
                    {d?.despesa > 0 && <p className="text-[9px] text-red-600 font-medium leading-tight truncate">-{(d.despesa / 1000).toFixed(0)}k</p>}
                  </button>
                )
              })}
            </div>
          </Card>
        </div>

        {/* Detalhes do dia selecionado */}
        <Card className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <Calendar size={15} className="text-amber-500" />
            <h3 className="font-semibold text-sm text-gray-700">
              {selectedDay ? `Dia ${selectedDay} de ${MESES[month]}` : 'Selecione um dia'}
            </h3>
          </div>
          {selectedDay && selectedEntries.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-6">Nenhum lançamento neste dia</p>
          )}
          {selectedDay && selectedEntries.length > 0 && (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2 mb-3">
                <div className="bg-emerald-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Receitas</p>
                  <p className="text-sm font-bold text-emerald-700">{fmtBRL(dayData[selectedDay]?.receita ?? 0)}</p>
                </div>
                <div className="bg-red-50 rounded-lg p-2 text-center">
                  <p className="text-xs text-gray-400">Despesas</p>
                  <p className="text-sm font-bold text-red-700">{fmtBRL(dayData[selectedDay]?.despesa ?? 0)}</p>
                </div>
              </div>
              {selectedEntries.map((e: any) => (
                <div key={e.id} className="flex items-start justify-between p-2 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-xs font-medium text-gray-900">{e.descricao}</p>
                    <p className="text-[10px] text-gray-400">{e.categoria}</p>
                  </div>
                  <p className={`text-xs font-bold ${e.tipo === 'receita' ? 'text-emerald-700' : 'text-red-600'}`}>
                    {e.tipo === 'receita' ? '+' : '-'}{fmtBRL(e.valor)}
                  </p>
                </div>
              ))}
            </div>
          )}
          {!selectedDay && (
            <div className="py-8 text-center text-gray-300">
              <Calendar size={32} className="mx-auto mb-2" />
              <p className="text-xs">Clique em um dia no calendário para ver os lançamentos</p>
            </div>
          )}
        </Card>
      </div>
    </div>
  )
}
