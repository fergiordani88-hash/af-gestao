import { useState, useEffect, useRef } from 'react'
import { Mail, CheckCircle2, AlertTriangle, RefreshCw, Unlink, Info } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { emailApi } from '../services/api'
import type { EmailAccountStatus } from '../types'

const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'

export function Configuracoes() {
  const [account, setAccount] = useState<EmailAccountStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [connecting, setConnecting] = useState(false)
  const [syncing, setSyncing] = useState(false)
  const [erro, setErro] = useState('')
  const [syncMsg, setSyncMsg] = useState('')
  const formRef = useRef<HTMLFormElement>(null)

  const load = () => {
    setLoading(true)
    emailApi.getAccount()
      .then((a) => setAccount(a as EmailAccountStatus | null))
      .catch(() => {})
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const connect = async () => {
    if (!formRef.current) return
    const data = new FormData(formRef.current)
    setErro(''); setConnecting(true)
    try {
      const result = await emailApi.connect({
        emailAddress: (data.get('emailAddress') as string || '').trim(),
        imapHost:     (data.get('imapHost') as string || '').trim(),
        imapPort:     Number(data.get('imapPort')) || 993,
        imapSecure:   data.get('imapSecure') === 'on',
        password:     data.get('password') as string,
      })
      setAccount(result.account as EmailAccountStatus)
      setSyncMsg(result.sync.ok
        ? `Conectado! ${result.sync.fetched} e-mail(s) encontrado(s), ${result.sync.matched} vinculado(s) a clientes.`
        : `Conectado, mas a primeira sincronização falhou: ${result.sync.error}`)
    } catch (e: any) {
      setErro(e?.message ?? 'Erro ao conectar. Verifique os dados do servidor.')
    } finally {
      setConnecting(false)
    }
  }

  const disconnect = async () => {
    if (!confirm('Desconectar sua caixa de e-mail? Os e-mails já vinculados aos clientes serão removidos.')) return
    await emailApi.disconnect()
    setAccount(null)
    setSyncMsg('')
  }

  const resync = async () => {
    setSyncing(true); setSyncMsg('')
    try {
      const result = await emailApi.sync(true)
      setSyncMsg(result.ok ? `Sincronizado — ${result.fetched} e-mail(s), ${result.matched} vinculado(s).` : `Falha: ${result.error}`)
      load()
    } finally {
      setSyncing(false)
    }
  }

  return (
    <AppLayout title="Configurações" subtitle="Preferências da conta e integrações">
      <div className="max-w-2xl">
        <Card className="p-6">
          <div className="flex items-center gap-2 mb-1">
            <Mail size={18} className="text-af-green" />
            <h2 className="font-semibold text-gray-900">Conectar e-mail</h2>
          </div>
          <p className="text-xs text-gray-500 mb-5">
            Vincula os e-mails trocados com cada cliente automaticamente no CRM. Funciona com qualquer provedor via IMAP
            (não precisa ser Gmail) — é o mesmo tipo de configuração usada para adicionar sua caixa no Outlook ou no celular.
          </p>

          {loading ? (
            <p className="text-xs text-gray-400">Carregando...</p>
          ) : account ? (
            <div className="space-y-4">
              <div className="flex items-start gap-3 p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800">
                <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
                <div>
                  <p className="font-semibold">{account.emailAddress}</p>
                  <p className="mt-0.5 opacity-80">
                    {account.imapHost}:{account.imapPort} {account.imapSecure ? '(SSL)' : ''}
                  </p>
                  <p className="mt-0.5 opacity-70">
                    {account.lastSyncedAt ? `Última sincronização: ${new Date(account.lastSyncedAt).toLocaleString('pt-BR')}` : 'Ainda não sincronizado'}
                  </p>
                </div>
              </div>
              {account.lastSyncError && (
                <div className="flex items-start gap-2 p-3 rounded-xl bg-red-50 border border-red-200 text-xs text-red-700">
                  <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {account.lastSyncError}
                </div>
              )}
              {syncMsg && <p className="text-xs text-gray-500">{syncMsg}</p>}
              <div className="flex gap-2">
                <Button size="sm" variant="secondary" icon={<RefreshCw size={13} />} onClick={resync} disabled={syncing}>
                  {syncing ? 'Sincronizando...' : 'Sincronizar agora'}
                </Button>
                <Button size="sm" variant="danger" icon={<Unlink size={13} />} onClick={disconnect}>Desconectar</Button>
              </div>
            </div>
          ) : (
            <form ref={formRef} onSubmit={e => { e.preventDefault(); connect() }} className="space-y-3">
              <div className="flex items-start gap-2 p-3 rounded-xl bg-blue-50 border border-blue-200 text-xs text-blue-800">
                <Info size={14} className="shrink-0 mt-0.5" />
                Peça ao suporte da sua hospedagem de e-mail os dados de servidor IMAP (ou veja em "Configurar dispositivo/cliente
                de e-mail" no painel do seu provedor) — geralmente algo como <strong>mail.seudominio.com.br</strong>, porta{' '}
                <strong>993</strong>, com SSL ativado.
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Seu e-mail *</label>
                <input name="emailAddress" type="email" className={inp} placeholder="fernanda@afestrategia.com.br" autoComplete="off" />
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-2">
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Servidor IMAP *</label>
                  <input name="imapHost" className={inp} placeholder="mail.afestrategia.com.br" autoComplete="off" />
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 mb-1 block">Porta</label>
                  <input name="imapPort" type="number" className={inp} defaultValue={993} />
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-gray-600 mb-1 block">Senha do e-mail *</label>
                <input name="password" type="password" className={inp} autoComplete="new-password" />
              </div>
              <label className="flex items-center gap-2 text-xs text-gray-600">
                <input name="imapSecure" type="checkbox" defaultChecked className="rounded border-gray-300" />
                Conexão segura (SSL/TLS) — deixe marcado, a maioria dos provedores exige.
              </label>
              {erro && <p className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2">{erro}</p>}
              <Button type="submit" disabled={connecting}>{connecting ? 'Testando conexão...' : 'Testar e conectar'}</Button>
            </form>
          )}
        </Card>
      </div>
    </AppLayout>
  )
}
