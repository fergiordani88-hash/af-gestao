import { useState, useEffect, useCallback } from 'react'
import {
  UserCog, Plus, Edit2, KeyRound, Power, Search,
  CheckCircle, XCircle, Shield, Users, Briefcase, Sprout,
  X, Eye, EyeOff, Loader2, AlertTriangle,
} from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { usersApi, type ApiUser } from '../services/api'
import { useAuthStore } from '../store/useAuthStore'
import { clsx } from 'clsx'

// ── Helpers ────────────────────────────────────────────────────

const ROLES = [
  { value: 'ADMIN',          label: 'Administrador', icon: Shield,    color: 'bg-purple-100 text-purple-700' },
  { value: 'CONSULTOR',      label: 'Consultor',     icon: Briefcase, color: 'bg-blue-100 text-blue-700'   },
  { value: 'CLIENTE_EMPRESA',label: 'Cliente PJ',    icon: Users,     color: 'bg-amber-100 text-amber-700'  },
  { value: 'CLIENTE_RURAL',  label: 'Cliente Rural', icon: Sprout,    color: 'bg-green-100 text-green-700'  },
]

function roleInfo(role: string) {
  return ROLES.find(r => r.value === role) ?? ROLES[1]
}

function RoleBadge({ role }: { role: string }) {
  const info = roleInfo(role)
  return (
    <span className={clsx('inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium', info.color)}>
      <info.icon size={10} />
      {info.label}
    </span>
  )
}

function Avatar({ name, active }: { name: string; active: boolean }) {
  const initials = name.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
  return (
    <div className={clsx(
      'w-9 h-9 rounded-full flex items-center justify-center shrink-0 text-sm font-bold',
      active ? 'bg-af-green text-white' : 'bg-gray-200 text-gray-400'
    )}>
      {initials}
    </div>
  )
}

// ── Modal de criação / edição ──────────────────────────────────

interface UserFormData {
  name: string
  email: string
  password: string
  role: string
}

interface UserModalProps {
  user?: ApiUser
  onClose: () => void
  onSaved: () => void
}

function UserModal({ user, onClose, onSaved }: UserModalProps) {
  const isEdit = !!user
  const [form, setForm] = useState<UserFormData>({
    name:     user?.name  ?? '',
    email:    user?.email ?? '',
    password: '',
    role:     user?.role  ?? 'CONSULTOR',
  })
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')

  const set = (k: keyof UserFormData, v: string) => setForm(f => ({ ...f, [k]: v }))

  const handleSave = async () => {
    if (!form.name.trim())  return setError('Nome é obrigatório.')
    if (!form.email.trim()) return setError('E-mail é obrigatório.')
    if (!isEdit && form.password.length < 6) return setError('Senha deve ter ao menos 6 caracteres.')

    setLoading(true); setError('')
    try {
      if (isEdit) {
        await usersApi.update(user.id, {
          name:  form.name,
          email: form.email,
          role:  form.role,
        })
      } else {
        await usersApi.create({
          name:     form.name,
          email:    form.email,
          password: form.password,
          role:     form.role,
        })
      }
      onSaved()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao salvar.')
    } finally {
      setLoading(false)
    }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green transition-colors'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1.5 block'

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-af-green-pale rounded-xl">
              <UserCog size={18} className="text-af-green" />
            </span>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Editar Usuário' : 'Novo Usuário'}
            </h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400">
            <X size={16} />
          </button>
        </div>

        {/* Form */}
        <div className="px-6 py-5 space-y-4">
          <div>
            <label className={lbl}>Nome completo *</label>
            <input className={inp} value={form.name} onChange={e => set('name', e.target.value)} placeholder="Ex: Ana Paula Silva" />
          </div>

          <div>
            <label className={lbl}>E-mail *</label>
            <input className={inp} type="email" value={form.email} onChange={e => set('email', e.target.value)} placeholder="usuario@afgestao.com.br" />
          </div>

          {!isEdit && (
            <div>
              <label className={lbl}>Senha inicial *</label>
              <div className="relative">
                <input
                  className={inp + ' pr-10'}
                  type={showPass ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  placeholder="Mín. 6 caracteres"
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              <p className="text-xs text-gray-400 mt-1">O usuário poderá alterar a senha após o primeiro acesso.</p>
            </div>
          )}

          <div>
            <label className={lbl}>Perfil de acesso *</label>
            <div className="grid grid-cols-2 gap-2">
              {ROLES.map(r => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => set('role', r.value)}
                  className={clsx(
                    'flex items-center gap-2.5 p-3 rounded-xl border-2 text-left transition-all',
                    form.role === r.value
                      ? 'border-af-green bg-af-green-pale'
                      : 'border-gray-100 hover:border-gray-200 bg-gray-50'
                  )}
                >
                  <r.icon size={16} className={form.role === r.value ? 'text-af-green' : 'text-gray-400'} />
                  <div>
                    <p className={clsx('text-xs font-semibold', form.role === r.value ? 'text-af-green' : 'text-gray-700')}>
                      {r.label}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {error && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 text-red-700 text-sm rounded-xl px-3 py-2.5">
              <AlertTriangle size={14} className="shrink-0" />
              {error}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={handleSave}
            disabled={loading}
            className="flex-1 bg-af-green hover:bg-af-green-light disabled:opacity-60 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 transition-colors text-sm"
          >
            {loading ? <><Loader2 size={15} className="animate-spin" /> Salvando...</> : isEdit ? 'Salvar alterações' : 'Criar usuário'}
          </button>
          <Button variant="secondary" onClick={onClose}>Cancelar</Button>
        </div>
      </div>
    </div>
  )
}

// ── Modal de redefinição de senha ─────────────────────────────

function ResetPasswordModal({ user, onClose }: { user: ApiUser; onClose: () => void }) {
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading]   = useState(false)
  const [success, setSuccess]   = useState(false)
  const [error, setError]       = useState('')

  const handleReset = async () => {
    if (password.length < 6) return setError('Senha deve ter ao menos 6 caracteres.')
    setLoading(true); setError('')
    try {
      await usersApi.resetPassword(user.id, password)
      setSuccess(true)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro ao redefinir senha.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <span className="p-2 bg-amber-50 rounded-xl"><KeyRound size={18} className="text-amber-500" /></span>
            <h2 className="text-base font-bold text-gray-900">Redefinir Senha</h2>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-lg text-gray-400"><X size={16} /></button>
        </div>

        <div className="px-6 py-5">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={40} className="text-emerald-500 mx-auto mb-3" />
              <p className="font-semibold text-gray-900">Senha redefinida com sucesso!</p>
              <p className="text-sm text-gray-500 mt-1">Comunique a nova senha ao usuário <strong>{user.name}</strong>.</p>
              <button onClick={onClose} className="mt-4 bg-af-green text-white text-sm font-medium rounded-xl px-4 py-2 hover:bg-af-green-light">
                Fechar
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-600 mb-4">
                Definir nova senha para <strong>{user.name}</strong>. O usuário precisará usar esta senha no próximo login.
              </p>
              <label className="text-xs font-semibold text-gray-600 mb-1.5 block">Nova senha</label>
              <div className="relative">
                <input
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm pr-10 focus:outline-none focus:ring-2 focus:ring-amber-300 focus:border-amber-400"
                  type={showPass ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="Mín. 6 caracteres"
                  autoFocus
                />
                <button type="button" onClick={() => setShowPass(s => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
              {error && (
                <p className="text-xs text-red-600 mt-2 flex items-center gap-1">
                  <AlertTriangle size={12} /> {error}
                </p>
              )}
              <div className="flex gap-3 mt-5">
                <button
                  onClick={handleReset}
                  disabled={loading || password.length < 6}
                  className="flex-1 bg-amber-500 hover:bg-amber-600 disabled:opacity-50 text-white font-semibold rounded-xl py-2.5 flex items-center justify-center gap-2 text-sm"
                >
                  {loading ? <Loader2 size={14} className="animate-spin" /> : <KeyRound size={14} />}
                  Redefinir senha
                </button>
                <Button variant="secondary" onClick={onClose}>Cancelar</Button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal de confirmação de desativação ───────────────────────

function DeactivateModal({ user, onClose, onConfirm }: { user: ApiUser; onClose: () => void; onConfirm: () => void }) {
  const [loading, setLoading] = useState(false)

  const handleConfirm = async () => {
    setLoading(true)
    await onConfirm()
    setLoading(false)
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
        <div className="text-center">
          <div className="w-14 h-14 bg-red-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Power size={24} className="text-red-500" />
          </div>
          <h2 className="text-lg font-bold text-gray-900 mb-1">
            {user.active ? 'Desativar usuário?' : 'Reativar usuário?'}
          </h2>
          <p className="text-sm text-gray-500 mb-6">
            {user.active
              ? <><strong>{user.name}</strong> perderá acesso ao sistema imediatamente. Você pode reativar a qualquer momento.</>
              : <><strong>{user.name}</strong> voltará a ter acesso ao sistema com o perfil atual.</>
            }
          </p>
          <div className="flex gap-3">
            <button
              onClick={handleConfirm}
              disabled={loading}
              className={clsx(
                'flex-1 font-semibold rounded-xl py-2.5 text-sm flex items-center justify-center gap-2 disabled:opacity-60',
                user.active ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-af-green hover:bg-af-green-light text-white'
              )}
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
              {user.active ? 'Sim, desativar' : 'Sim, reativar'}
            </button>
            <Button variant="secondary" onClick={onClose}>Cancelar</Button>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────

type Modal = { type: 'create' } | { type: 'edit'; user: ApiUser } | { type: 'reset'; user: ApiUser } | { type: 'toggle'; user: ApiUser }

export function Usuarios() {
  const { user: me } = useAuthStore()
  const [users, setUsers]     = useState<ApiUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [roleFilter, setRoleFilter] = useState('todos')
  const [modal, setModal]     = useState<Modal | null>(null)

  const loadUsers = useCallback(async () => {
    setLoading(true)
    try {
      const data = await usersApi.list()
      setUsers(data)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { loadUsers() }, [loadUsers])

  const handleToggle = async (user: ApiUser) => {
    if (user.active) {
      await usersApi.deactivate(user.id)
    } else {
      await usersApi.update(user.id, { active: true })
    }
    await loadUsers()
    setModal(null)
  }

  const filtered = users.filter(u => {
    const matchSearch = u.name.toLowerCase().includes(search.toLowerCase()) ||
                        u.email.toLowerCase().includes(search.toLowerCase())
    const matchRole   = roleFilter === 'todos' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const stats = {
    total:      users.length,
    active:     users.filter(u => u.active).length,
    admins:     users.filter(u => u.role === 'ADMIN').length,
    consultores:users.filter(u => u.role === 'CONSULTOR').length,
    clientes:   users.filter(u => u.role.startsWith('CLIENTE')).length,
  }

  return (
    <AppLayout title="Gestão de Usuários" subtitle="Cadastro, permissões e controle de acesso — exclusivo para administradores">
      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <StatCard label="Total de usuários" value={String(stats.total)}       icon={<Users size={16} />}     color="green" />
        <StatCard label="Ativos"             value={String(stats.active)}      icon={<CheckCircle size={16} />} color="green" />
        <StatCard label="Administradores"   value={String(stats.admins)}      icon={<Shield size={16} />}    color="purple" />
        <StatCard label="Consultores"        value={String(stats.consultores)} icon={<Briefcase size={16} />} color="blue" />
        <StatCard label="Clientes"           value={String(stats.clientes)}    icon={<Sprout size={16} />}    color="gold" />
      </div>

      {/* Barra de ações */}
      <div className="flex flex-col sm:flex-row gap-3 mb-5">
        {/* Busca */}
        <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-3 py-2 flex-1">
          <Search size={15} className="text-gray-400 shrink-0" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por nome ou e-mail..."
            className="bg-transparent text-sm outline-none flex-1"
          />
          {search && (
            <button onClick={() => setSearch('')} className="text-gray-300 hover:text-gray-500">
              <X size={14} />
            </button>
          )}
        </div>

        {/* Filtro de perfil */}
        <select
          value={roleFilter}
          onChange={e => setRoleFilter(e.target.value)}
          className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-af-green/30"
        >
          <option value="todos">Todos os perfis</option>
          {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
        </select>

        <Button icon={<Plus size={15} />} onClick={() => setModal({ type: 'create' })}>
          Novo usuário
        </Button>
      </div>

      {/* Filtros rápidos por perfil */}
      <div className="flex gap-2 mb-5 overflow-x-auto pb-1">
        {[{ label: `Todos (${users.length})`, value: 'todos' },
          ...ROLES.map(r => ({ label: `${r.label} (${users.filter(u => u.role === r.value).length})`, value: r.value }))
        ].map(f => (
          <button
            key={f.value}
            onClick={() => setRoleFilter(f.value)}
            className={clsx(
              'px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-colors',
              roleFilter === f.value
                ? 'bg-af-green text-white'
                : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'
            )}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Tabela */}
      <Card>
        {loading ? (
          <div className="flex items-center justify-center py-20 gap-3 text-gray-400">
            <Loader2 size={20} className="animate-spin" />
            <span className="text-sm">Carregando usuários...</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Usuário', 'E-mail', 'Perfil', 'Clientes', 'Status', 'Criado em', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map(u => (
                  <tr key={u.id} className={clsx('hover:bg-gray-50/50 transition-colors group', !u.active && 'opacity-50')}>
                    {/* Nome + avatar */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-3">
                        <Avatar name={u.name} active={u.active} />
                        <div>
                          <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
                            {u.name}
                            {u.id === me?.id && (
                              <span className="text-xs bg-af-green-pale text-af-green px-1.5 py-0.5 rounded-full font-medium">Você</span>
                            )}
                          </p>
                          {!u.active && <p className="text-xs text-red-400">Conta desativada</p>}
                        </div>
                      </div>
                    </td>

                    {/* E-mail */}
                    <td className="px-4 py-3.5 text-sm text-gray-500">{u.email}</td>

                    {/* Perfil */}
                    <td className="px-4 py-3.5"><RoleBadge role={u.role} /></td>

                    {/* Clientes vinculados */}
                    <td className="px-4 py-3.5 text-sm text-gray-600 text-center">
                      {u._count?.clients ?? '—'}
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <span className={clsx(
                        'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium',
                        u.active ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-600'
                      )}>
                        {u.active ? <CheckCircle size={10} /> : <XCircle size={10} />}
                        {u.active ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>

                    {/* Data */}
                    <td className="px-4 py-3.5 text-xs text-gray-400">
                      {new Date(u.createdAt).toLocaleDateString('pt-BR')}
                    </td>

                    {/* Ações */}
                    <td className="px-4 py-3.5">
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Editar */}
                        <button
                          title="Editar usuário"
                          onClick={() => setModal({ type: 'edit', user: u })}
                          className="p-1.5 hover:bg-blue-50 hover:text-blue-600 rounded-lg text-gray-400 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>

                        {/* Redefinir senha */}
                        <button
                          title="Redefinir senha"
                          onClick={() => setModal({ type: 'reset', user: u })}
                          className="p-1.5 hover:bg-amber-50 hover:text-amber-600 rounded-lg text-gray-400 transition-colors"
                        >
                          <KeyRound size={14} />
                        </button>

                        {/* Ativar / Desativar — não pode fazer em si mesmo */}
                        {u.id !== me?.id && (
                          <button
                            title={u.active ? 'Desativar acesso' : 'Reativar acesso'}
                            onClick={() => setModal({ type: 'toggle', user: u })}
                            className={clsx(
                              'p-1.5 rounded-lg text-gray-400 transition-colors',
                              u.active
                                ? 'hover:bg-red-50 hover:text-red-500'
                                : 'hover:bg-emerald-50 hover:text-emerald-500'
                            )}
                          >
                            <Power size={14} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {filtered.length === 0 && !loading && (
              <div className="py-16 text-center text-gray-400">
                <UserCog size={36} className="mx-auto mb-3 opacity-30" />
                <p className="text-sm">Nenhum usuário encontrado</p>
                {search && (
                  <button onClick={() => setSearch('')} className="text-xs text-af-green mt-2 hover:underline">
                    Limpar busca
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {filtered.length} de {users.length} usuários
          </p>
          <p className="text-xs text-gray-400">
            {stats.active} ativos · {users.length - stats.active} inativos
          </p>
        </div>
      </Card>

      {/* ── Modais ── */}
      {modal?.type === 'create' && (
        <UserModal onClose={() => setModal(null)} onSaved={() => { loadUsers(); setModal(null) }} />
      )}
      {modal?.type === 'edit' && (
        <UserModal user={modal.user} onClose={() => setModal(null)} onSaved={() => { loadUsers(); setModal(null) }} />
      )}
      {modal?.type === 'reset' && (
        <ResetPasswordModal user={modal.user} onClose={() => setModal(null)} />
      )}
      {modal?.type === 'toggle' && (
        <DeactivateModal
          user={modal.user}
          onClose={() => setModal(null)}
          onConfirm={() => handleToggle(modal.user)}
        />
      )}
    </AppLayout>
  )
}
