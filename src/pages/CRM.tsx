import { useState } from 'react'
import { Search, Plus, Filter, Phone, Mail, MapPin, Eye, Edit2, MoreVertical, Users } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Badge } from '../components/ui/Badge'
import { Button } from '../components/ui/Button'
import { useStore } from '../store/useStore'
import type { Client, ClientStatus, ClientSegment } from '../types'

type StatusFilter = 'todos' | ClientStatus
type SegmentFilter = 'todos' | ClientSegment

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

function ClientModal({ client, onClose }: { client: Client; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-bold text-gray-900">{client.name}</h2>
            <p className="text-sm text-gray-500">{client.document}</p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant={client.status} />
            <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-500">✕</button>
          </div>
        </div>
        <div className="p-6 grid grid-cols-2 gap-6">
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Contato</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm text-gray-600"><Phone size={14} />{client.phone}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><Mail size={14} />{client.email}</div>
              <div className="flex items-center gap-2 text-sm text-gray-600"><MapPin size={14} />{client.city}, {client.state}</div>
            </div>
          </div>
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide">Financeiro</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm"><span className="text-gray-500">Faturamento</span><span className="font-semibold">{fmtBRL(client.revenue)}</span></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Segmento</span><Badge variant={client.segment} /></div>
              <div className="flex justify-between text-sm"><span className="text-gray-500">Porte</span><span className="capitalize font-medium">{client.size}</span></div>
            </div>
          </div>
          <div className="col-span-2">
            <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Responsável</h3>
            <p className="text-sm text-gray-700">{client.responsible}</p>
          </div>
          {client.notes && (
            <div className="col-span-2">
              <h3 className="font-semibold text-gray-700 text-sm uppercase tracking-wide mb-2">Observações</h3>
              <p className="text-sm text-gray-600 bg-gray-50 rounded-xl p-3">{client.notes}</p>
            </div>
          )}
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button variant="primary" className="flex-1">Gerar Diagnóstico</Button>
          <Button variant="secondary" icon={<Edit2 size={14} />}>Editar</Button>
        </div>
      </div>
    </div>
  )
}

function NewClientModal({ onClose }: { onClose: () => void }) {
  const { addClient } = useStore()
  const [form, setForm] = useState({ name: '', document: '', phone: '', email: '', city: '', state: 'MT', segment: 'agro' as ClientSegment, revenue: '', responsible: '', status: 'lead' as ClientStatus })

  const save = async () => {
    // Finds first active consultant to set as responsible (temporary — in prod use a select)
    await addClient({ ...form, revenue: Number(form.revenue.replace(/\D/g, '')), size: 'media', responsible: form.responsible || 'Consultor' })
    onClose()
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="flex items-center justify-between p-6 border-b">
          <h2 className="text-lg font-bold">Novo Cliente</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg">✕</button>
        </div>
        <div className="p-6 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">Nome / Razão Social *</label><input className={inp} value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Ex: Fazenda São Pedro" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">CPF / CNPJ</label><input className={inp} value={form.document} onChange={e => setForm(f => ({ ...f, document: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Telefone</label><input className={inp} value={form.phone} onChange={e => setForm(f => ({ ...f, phone: e.target.value }))} /></div>
            <div className="col-span-2"><label className="text-xs font-medium text-gray-600 mb-1 block">E-mail</label><input className={inp} type="email" value={form.email} onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Cidade</label><input className={inp} value={form.city} onChange={e => setForm(f => ({ ...f, city: e.target.value }))} /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Segmento</label>
              <select className={inp} value={form.segment} onChange={e => setForm(f => ({ ...f, segment: e.target.value as ClientSegment }))}>
                <option value="agro">Agro</option><option value="comercio">Comércio</option><option value="servicos">Serviços</option><option value="industria">Indústria</option>
              </select>
            </div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Faturamento Anual (R$)</label><input className={inp} value={form.revenue} onChange={e => setForm(f => ({ ...f, revenue: e.target.value }))} placeholder="Ex: 1.200.000" /></div>
            <div><label className="text-xs font-medium text-gray-600 mb-1 block">Responsável</label><input className={inp} value={form.responsible} onChange={e => setForm(f => ({ ...f, responsible: e.target.value }))} /></div>
          </div>
        </div>
        <div className="px-6 pb-6 flex gap-3">
          <Button onClick={save} className="flex-1" disabled={!form.name}>Salvar Cliente</Button>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

export function CRM() {
  const { clients } = useStore()
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos')
  const [segFilter, setSegFilter] = useState<SegmentFilter>('todos')
  const [selected, setSelected] = useState<Client | null>(null)
  const [showNew, setShowNew] = useState(false)

  const filtered = clients.filter(c => {
    const matchSearch = c.name.toLowerCase().includes(search.toLowerCase()) || c.email.toLowerCase().includes(search.toLowerCase())
    const matchStatus = statusFilter === 'todos' || c.status === statusFilter
    const matchSeg = segFilter === 'todos' || c.segment === segFilter
    return matchSearch && matchStatus && matchSeg
  })

  const statusCounts = {
    todos: clients.length,
    lead: clients.filter(c => c.status === 'lead').length,
    proposta: clients.filter(c => c.status === 'proposta').length,
    negociacao: clients.filter(c => c.status === 'negociacao').length,
    ativo: clients.filter(c => c.status === 'ativo').length,
    inativo: clients.filter(c => c.status === 'inativo').length,
  }

  return (
    <AppLayout title="CRM de Clientes" subtitle="Gestão completa da carteira">
      {/* Filters bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1">
          <Search size={16} className="text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar por nome, e-mail..." className="bg-transparent text-sm outline-none flex-1" />
        </div>
        <select value={segFilter} onChange={e => setSegFilter(e.target.value as SegmentFilter)} className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-af-green/30">
          <option value="todos">Todos segmentos</option>
          <option value="agro">Agro</option><option value="comercio">Comércio</option>
          <option value="servicos">Serviços</option><option value="industria">Indústria</option>
        </select>
        <Button icon={<Plus size={15} />} onClick={() => setShowNew(true)}>Novo Cliente</Button>
      </div>

      {/* Status tabs */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {(['todos', 'lead', 'proposta', 'negociacao', 'ativo', 'inativo'] as const).map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${statusFilter === s ? 'bg-af-green text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {s === 'todos' ? 'Todos' : s.charAt(0).toUpperCase() + s.slice(1)} ({statusCounts[s]})
          </button>
        ))}
      </div>

      {/* Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Cliente', 'Segmento', 'Cidade', 'Faturamento', 'Responsável', 'Status', ''].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {filtered.map(c => (
                <tr key={c.id} className="hover:bg-gray-50/50 transition-colors group">
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="text-sm font-semibold text-gray-900">{c.name}</p>
                      <p className="text-xs text-gray-400">{c.email}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3.5"><Badge variant={c.segment} /></td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{c.city}, {c.state}</td>
                  <td className="px-4 py-3.5 text-sm font-medium text-gray-900">{fmtBRL(c.revenue)}</td>
                  <td className="px-4 py-3.5 text-sm text-gray-600">{c.responsible}</td>
                  <td className="px-4 py-3.5"><Badge variant={c.status} /></td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => setSelected(c)} className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Eye size={14} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Edit2 size={14} /></button>
                      <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><MoreVertical size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {filtered.length === 0 && (
            <div className="py-16 text-center text-gray-400">
              <Users size={32} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">Nenhum cliente encontrado</p>
            </div>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-100 text-xs text-gray-500">
          {filtered.length} de {clients.length} clientes
        </div>
      </Card>

      {selected && <ClientModal client={selected} onClose={() => setSelected(null)} />}
      {showNew && <NewClientModal onClose={() => setShowNew(false)} />}
    </AppLayout>
  )
}
