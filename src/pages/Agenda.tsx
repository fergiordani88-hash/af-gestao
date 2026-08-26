import { useState, useEffect, useRef, useCallback } from 'react'
import { Plus, ChevronLeft, ChevronRight, Clock, MapPin, User as UserIcon, Check, Calendar as CalendarIcon, ListTodo } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { eventsApi, remindersApi, usersApi } from '../services/api'
import type { CalendarEvent, Reminder, EventType, ReminderPriority } from '../types'

const TYPE_LABEL: Record<EventType, string> = { reuniao: 'Reunião', ligacao: 'Ligação', visita: 'Visita', tarefa: 'Tarefa', outro: 'Outro' }
const TYPE_COLOR: Record<EventType, string> = {
  reuniao: 'bg-blue-100 text-blue-700', ligacao: 'bg-purple-100 text-purple-700',
  visita: 'bg-emerald-100 text-emerald-700', tarefa: 'bg-amber-100 text-amber-700', outro: 'bg-gray-100 text-gray-700',
}
const PRIORITY_COLOR: Record<ReminderPriority, string> = {
  alta: 'bg-red-100 text-red-700', media: 'bg-amber-100 text-amber-700', baixa: 'bg-gray-100 text-gray-600',
}

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'
const fmtDateInput = (d: Date) => d.toISOString().slice(0, 10)
const fmtTime = (iso?: string) => iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : ''
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })
const sameDay = (a: Date, b: Date) => a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()

type SimpleUser = { id: string; name: string }

export function NewEventModal({ onClose, onSaved, defaultDate }: { onClose: () => void; onSaved: () => void; defaultDate?: Date }) {
  const { clients } = useStore()
  const { user } = useAuthStore()
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    usersApi.list().then((list: any[]) => setUsers(list.filter((u: any) => ['ADMIN', 'CONSULTOR'].includes(u.role)))).catch(() => {})
  }, [])

  const save = async () => {
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const title = (data.get('title') as string || '').trim()
    const date = data.get('date') as string
    const time = data.get('time') as string
    if (!title) { setErro('Informe o título.'); return }
    if (!date) { setErro('Informe a data.'); return }
    setSaving(true); setErro('')
    try {
      await eventsApi.create({
        title,
        description:  (data.get('description') as string) || undefined,
        type:         ((data.get('type') as string) || 'REUNIAO').toUpperCase(),
        startAt:      new Date(`${date}T${time || '09:00'}:00`).toISOString(),
        allDay:       !time,
        location:     (data.get('location') as string) || undefined,
        clientId:     (data.get('clientId') as string) || undefined,
        assignedToId: (data.get('assignedToId') as string) || undefined,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setErro(`Erro ao salvar: ${e?.message ?? 'verifique sua conexão e tente novamente.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Novo Evento</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); save() }}>
          <div className="p-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Título *</label>
              <input name="title" className={inp} placeholder="Ex: Reunião com Fazenda São Pedro" autoComplete="off" />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Data *</label>
                <input name="date" type="date" className={inp} defaultValue={fmtDateInput(defaultDate ?? new Date())} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Hora</label>
                <input name="time" type="time" className={inp} defaultValue="09:00" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Tipo</label>
                <select name="type" className={inp} defaultValue="REUNIAO">
                  <option value="REUNIAO">Reunião</option><option value="LIGACAO">Ligação</option>
                  <option value="VISITA">Visita</option><option value="TAREFA">Tarefa</option><option value="OUTRO">Outro</option>
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Local</label>
              <input name="location" className={inp} placeholder="Opcional" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select name="clientId" className={inp} defaultValue="">
                  <option value="">Nenhum</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Responsável</label>
                <select name="assignedToId" className={inp} defaultValue={user?.id ?? ''}>
                  <option value="">Compartilhado (ambas)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observações</label>
              <textarea name="description" className={inp} rows={2} />
            </div>
            {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Evento'}</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function NewReminderModal({ onClose, onSaved }: { onClose: () => void; onSaved: () => void }) {
  const { clients } = useStore()
  const { user } = useAuthStore()
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [saving, setSaving] = useState(false)
  const [erro, setErro] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  useEffect(() => {
    usersApi.list().then((list: any[]) => setUsers(list.filter((u: any) => ['ADMIN', 'CONSULTOR'].includes(u.role)))).catch(() => {})
  }, [])

  const save = async () => {
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    const title = (data.get('title') as string || '').trim()
    const dueDate = data.get('dueDate') as string
    if (!title) { setErro('Informe o título.'); return }
    if (!dueDate) { setErro('Informe o prazo.'); return }
    setSaving(true); setErro('')
    try {
      await remindersApi.create({
        title,
        description:  (data.get('description') as string) || undefined,
        dueDate:      new Date(dueDate).toISOString(),
        priority:     ((data.get('priority') as string) || 'MEDIA').toUpperCase(),
        clientId:     (data.get('clientId') as string) || undefined,
        assignedToId: (data.get('assignedToId') as string) || undefined,
      })
      onSaved()
      onClose()
    } catch (e: any) {
      setErro(`Erro ao salvar: ${e?.message ?? 'verifique sua conexão e tente novamente.'}`)
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Novo Lembrete</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <form ref={formRef} onSubmit={e => { e.preventDefault(); save() }}>
          <div className="p-6 space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Título *</label>
              <input name="title" className={inp} placeholder="Ex: Cobrar retorno da proposta" autoComplete="off" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prazo *</label>
                <input name="dueDate" type="date" className={inp} defaultValue={fmtDateInput(new Date())} />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Prioridade</label>
                <select name="priority" className={inp} defaultValue="MEDIA">
                  <option value="ALTA">Alta</option><option value="MEDIA">Média</option><option value="BAIXA">Baixa</option>
                </select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Cliente</label>
                <select name="clientId" className={inp} defaultValue="">
                  <option value="">Nenhum</option>
                  {clients.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Responsável</label>
                <select name="assignedToId" className={inp} defaultValue={user?.id ?? ''}>
                  <option value="">Compartilhado (ambas)</option>
                  {users.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-600 mb-1 block">Observações</label>
              <textarea name="description" className={inp} rows={2} />
            </div>
            {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
          </div>
          <div className="px-6 pb-6 flex gap-3">
            <Button type="submit" className="flex-1" disabled={saving}>{saving ? 'Salvando...' : 'Salvar Lembrete'}</Button>
            <Button type="button" variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export function Agenda() {
  const { user } = useAuthStore()
  const [monthAnchor, setMonthAnchor] = useState(() => new Date())
  const [selectedDay, setSelectedDay] = useState(() => new Date())
  const [filter, setFilter] = useState<'todos' | 'mine' | 'partner'>('todos')
  const [users, setUsers] = useState<SimpleUser[]>([])
  const [events, setEvents] = useState<CalendarEvent[]>([])
  const [reminders, setReminders] = useState<Reminder[]>([])
  const [loading, setLoading] = useState(true)
  const [showNewEvent, setShowNewEvent] = useState(false)
  const [showNewReminder, setShowNewReminder] = useState(false)

  const partner = users.find(u => u.id !== user?.id)
  const assignedToId = filter === 'mine' ? user?.id : filter === 'partner' ? partner?.id : undefined

  const load = useCallback(() => {
    setLoading(true)
    const start = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
    const end   = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0, 23, 59, 59)
    Promise.all([
      eventsApi.list({ from: start.toISOString(), to: end.toISOString(), ...(assignedToId && { assignedToId }) }) as Promise<CalendarEvent[]>,
      remindersApi.list({ status: 'pendente', ...(assignedToId && { assignedToId }) }) as Promise<Reminder[]>,
    ])
      .then(([ev, rem]) => { setEvents(ev); setReminders(rem) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [monthAnchor, assignedToId])

  useEffect(() => {
    usersApi.list().then((list: any[]) => setUsers(list.filter((u: any) => ['ADMIN', 'CONSULTOR'].includes(u.role)))).catch(() => {})
  }, [])

  useEffect(() => { load() }, [load])

  const completeReminder = async (id: string) => {
    await remindersApi.complete(id)
    load()
  }

  const setEventStatus = async (id: string, status: string) => {
    await eventsApi.setStatus(id, status)
    load()
  }

  // Grid do mês
  const first = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), 1)
  const startWeekday = first.getDay()
  const daysInMonth = new Date(monthAnchor.getFullYear(), monthAnchor.getMonth() + 1, 0).getDate()
  const cells: (Date | null)[] = [
    ...Array(startWeekday).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(monthAnchor.getFullYear(), monthAnchor.getMonth(), i + 1)),
  ]
  while (cells.length % 7 !== 0) cells.push(null)

  const eventsOnDay = (d: Date) => events.filter(e => sameDay(new Date(e.startAt), d))
  const dayEvents = eventsOnDay(selectedDay).sort((a, b) => new Date(a.startAt).getTime() - new Date(b.startAt).getTime())
  const today = new Date()

  return (
    <AppLayout title="Agenda" subtitle="Agenda compartilhada da consultoria">
      <div className="flex flex-col sm:flex-row gap-3 mb-6 items-start sm:items-center justify-between">
        <div className="flex gap-2">
          {(['todos', 'mine', 'partner'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${filter === f ? 'bg-af-green text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
              {f === 'todos' ? 'Compartilhada' : f === 'mine' ? `Minha (${user?.name.split(' ')[0]})` : `${partner?.name.split(' ')[0] ?? 'Sócia'}`}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button icon={<ListTodo size={15} />} variant="secondary" onClick={() => setShowNewReminder(true)}>Novo Lembrete</Button>
          <Button icon={<Plus size={15} />} onClick={() => setShowNewEvent(true)}>Novo Evento</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Calendário mensal */}
        <Card className="lg:col-span-2 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 capitalize">{monthAnchor.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h3>
            <div className="flex items-center gap-1">
              <button onClick={() => setMonthAnchor(m => new Date(m.getFullYear(), m.getMonth() - 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronLeft size={16} /></button>
              <button onClick={() => { setMonthAnchor(new Date()); setSelectedDay(new Date()) }} className="px-2.5 py-1 text-xs font-medium text-gray-600 hover:bg-gray-100 rounded-lg">Hoje</button>
              <button onClick={() => setMonthAnchor(m => new Date(m.getFullYear(), m.getMonth() + 1, 1))} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><ChevronRight size={16} /></button>
            </div>
          </div>
          <div className="grid grid-cols-7 gap-1 text-center mb-1">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(d => (
              <span key={d} className="text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {cells.map((d, i) => {
              if (!d) return <div key={i} className="aspect-square" />
              const evs = eventsOnDay(d)
              const isSelected = sameDay(d, selectedDay)
              const isToday = sameDay(d, today)
              return (
                <button
                  key={i}
                  onClick={() => setSelectedDay(d)}
                  className={`aspect-square rounded-xl p-1.5 flex flex-col items-center justify-start text-left transition-colors ${
                    isSelected ? 'bg-af-green text-white' : isToday ? 'bg-af-green-pale text-af-green' : 'hover:bg-gray-50 text-gray-700'
                  }`}
                >
                  <span className="text-xs font-semibold">{d.getDate()}</span>
                  {evs.length > 0 && (
                    <span className={`mt-1 w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-af-gold'}`} />
                  )}
                </button>
              )
            })}
          </div>
        </Card>

        {/* Dia selecionado + lembretes */}
        <div className="space-y-5">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <CalendarIcon size={15} className="text-af-green" />
              {selectedDay.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' })}
            </h3>
            {loading ? (
              <p className="text-xs text-gray-400">Carregando...</p>
            ) : dayEvents.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum evento neste dia.</p>
            ) : (
              <div className="space-y-2">
                {dayEvents.map(ev => (
                  <div key={ev.id} className={`p-3 rounded-xl border text-xs ${ev.status === 'concluido' ? 'bg-gray-50 border-gray-100 opacity-60' : 'bg-white border-gray-100'}`}>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-gray-900 truncate">{ev.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-1 text-gray-500">
                          {!ev.allDay && <span className="flex items-center gap-1"><Clock size={11} />{fmtTime(ev.startAt)}</span>}
                          {ev.location && <span className="flex items-center gap-1"><MapPin size={11} />{ev.location}</span>}
                          {ev.assignedTo && <span className="flex items-center gap-1"><UserIcon size={11} />{ev.assignedTo.name.split(' ')[0]}</span>}
                        </div>
                        {ev.client && <p className="text-af-green mt-1 font-medium">{ev.client.name}</p>}
                      </div>
                      <span className={`px-2 py-0.5 rounded-full font-medium shrink-0 ${TYPE_COLOR[ev.type]}`}>{TYPE_LABEL[ev.type]}</span>
                    </div>
                    {ev.status !== 'concluido' && (
                      <button onClick={() => setEventStatus(ev.id, 'CONCLUIDO')} className="mt-2 flex items-center gap-1 text-af-green font-medium hover:underline">
                        <Check size={12} /> Marcar como concluído
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
              <ListTodo size={15} className="text-af-gold" /> Lembretes pendentes
            </h3>
            {loading ? (
              <p className="text-xs text-gray-400">Carregando...</p>
            ) : reminders.length === 0 ? (
              <p className="text-xs text-gray-400">Nenhum lembrete pendente.</p>
            ) : (
              <div className="space-y-2 max-h-80 overflow-y-auto">
                {reminders.map(r => {
                  const overdue = new Date(r.dueDate) < new Date(new Date().setHours(0, 0, 0, 0))
                  return (
                    <div key={r.id} className="flex items-start gap-2 p-2.5 rounded-xl hover:bg-gray-50 text-xs">
                      <button onClick={() => completeReminder(r.id)} className="mt-0.5 w-4 h-4 rounded border border-gray-300 hover:border-af-green hover:bg-af-green-pale shrink-0" title="Concluir" />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-gray-900 truncate">{r.title}</p>
                        <div className="flex flex-wrap items-center gap-2 mt-0.5 text-gray-500">
                          <span className={overdue ? 'text-red-600 font-medium' : ''}>{fmtDay(r.dueDate)}</span>
                          <span className={`px-1.5 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[r.priority]}`}>{r.priority}</span>
                          {r.client && <span className="text-af-green">{r.client.name}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </Card>
        </div>
      </div>

      {showNewEvent && <NewEventModal onClose={() => setShowNewEvent(false)} onSaved={load} defaultDate={selectedDay} />}
      {showNewReminder && <NewReminderModal onClose={() => setShowNewReminder(false)} onSaved={load} />}
    </AppLayout>
  )
}
