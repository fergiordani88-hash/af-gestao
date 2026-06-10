import { useState, useEffect } from 'react'
import { Save, Building2, CheckCircle } from 'lucide-react'
import { controleStorage, type ControleCompany } from '../storage/controleStorage'
import { Card } from '../../components/ui/Card'
import { ControleLayout } from '../layout/ControleLayout'

const EMPTY: ControleCompany = {
  nomeFantasia: '', razaoSocial: '', documento: '', tipoDoc: 'cnpj',
  cep: '', logradouro: '', numero: '', complemento: '', bairro: '', cidade: '', estado: '',
  telefone: '', email: '', website: '', responsavel: '',
}

const ESTADOS = ['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO']

export function ControleEmpresa() {
  const [form, setForm]   = useState<ControleCompany>(EMPTY)
  const [saved, setSaved] = useState(false)
  const [dirty, setDirty] = useState(false)

  useEffect(() => {
    const c = controleStorage.getCompany()
    if (c) setForm(c)
  }, [])

  const set = (k: keyof ControleCompany, v: string) => { setForm(f => ({ ...f, [k]: v })); setDirty(true); setSaved(false) }

  const handleSave = () => {
    controleStorage.saveCompany(form)
    setSaved(true); setDirty(false)
    setTimeout(() => setSaved(false), 3000)
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'
  const sec = 'text-xs font-bold text-gray-400 uppercase tracking-wide mb-3 mt-5 pb-1 border-b border-gray-100'

  return (
    <ControleLayout title="Minha Empresa" subtitle="Cadastro e dados da empresa">
      <div className="space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-gray-900">Minha Empresa</h2>
            <p className="text-xs text-gray-500 mt-0.5">Dados cadastrais da empresa — usados nos relatórios e documentos</p>
          </div>
          <button onClick={handleSave} disabled={!dirty}
            className="flex items-center gap-2 bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            {saved ? <CheckCircle size={14} /> : <Save size={14} />}
            {saved ? 'Salvo!' : 'Salvar'}
          </button>
        </div>

        <Card className="p-6">
          <p className={sec}>Identificação</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className={lbl}>Nome Fantasia</label>
              <input className={inp} value={form.nomeFantasia} onChange={e => set('nomeFantasia', e.target.value)} placeholder="Nome fantasia da empresa" />
            </div>
            <div>
              <label className={lbl}>Razão Social</label>
              <input className={inp} value={form.razaoSocial} onChange={e => set('razaoSocial', e.target.value)} placeholder="Razão social completa" />
            </div>
            <div>
              <label className={lbl}>Tipo de Documento</label>
              <div className="flex gap-2">
                {(['cnpj','cpf'] as const).map(t => (
                  <button key={t} onClick={() => set('tipoDoc', t)}
                    className={`flex-1 py-2 rounded-xl text-xs font-semibold border uppercase ${form.tipoDoc === t ? 'bg-amber-500 text-white border-amber-500' : 'bg-white border-gray-200 text-gray-600'}`}>
                    {t}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={lbl}>{form.tipoDoc === 'cnpj' ? 'CNPJ' : 'CPF'}</label>
              <input className={inp} value={form.documento} onChange={e => set('documento', e.target.value)}
                placeholder={form.tipoDoc === 'cnpj' ? '00.000.000/0001-00' : '000.000.000-00'} />
            </div>
            <div>
              <label className={lbl}>Responsável / Sócio</label>
              <input className={inp} value={form.responsavel ?? ''} onChange={e => set('responsavel', e.target.value)} placeholder="Nome do responsável" />
            </div>
          </div>

          <p className={sec}>Endereço</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className={lbl}>CEP</label>
              <input className={inp} value={form.cep} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
            </div>
            <div className="col-span-2">
              <label className={lbl}>Logradouro</label>
              <input className={inp} value={form.logradouro} onChange={e => set('logradouro', e.target.value)} placeholder="Rua, Avenida..." />
            </div>
            <div>
              <label className={lbl}>Número</label>
              <input className={inp} value={form.numero} onChange={e => set('numero', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Complemento</label>
              <input className={inp} value={form.complemento ?? ''} onChange={e => set('complemento', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Bairro</label>
              <input className={inp} value={form.bairro} onChange={e => set('bairro', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Cidade</label>
              <input className={inp} value={form.cidade} onChange={e => set('cidade', e.target.value)} />
            </div>
            <div>
              <label className={lbl}>Estado</label>
              <select className={inp} value={form.estado} onChange={e => set('estado', e.target.value)}>
                <option value="">UF</option>
                {ESTADOS.map(uf => <option key={uf}>{uf}</option>)}
              </select>
            </div>
          </div>

          <p className={sec}>Contatos</p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className={lbl}>Telefone / WhatsApp</label>
              <input className={inp} value={form.telefone} onChange={e => set('telefone', e.target.value)} placeholder="(65) 99999-9999" />
            </div>
            <div>
              <label className={lbl}>E-mail</label>
              <input type="email" className={inp} value={form.email} onChange={e => set('email', e.target.value)} placeholder="contato@empresa.com.br" />
            </div>
            <div>
              <label className={lbl}>Website</label>
              <input className={inp} value={form.website ?? ''} onChange={e => set('website', e.target.value)} placeholder="www.empresa.com.br" />
            </div>
          </div>
        </Card>

        {/* Preview do cartão */}
        {form.nomeFantasia && (
          <Card className="p-5 bg-gradient-to-br from-amber-950 to-amber-900 border-amber-700">
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-amber-700/60 flex items-center justify-center">
                <Building2 size={18} className="text-amber-300" />
              </div>
              <div>
                <p className="font-bold text-white">{form.nomeFantasia}</p>
                {form.razaoSocial && <p className="text-amber-200/60 text-xs">{form.razaoSocial}</p>}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 text-xs text-amber-200/60">
              {form.documento && <p>{form.tipoDoc.toUpperCase()}: {form.documento}</p>}
              {form.cidade && <p>{form.cidade}/{form.estado}</p>}
              {form.telefone && <p>{form.telefone}</p>}
              {form.email && <p>{form.email}</p>}
            </div>
          </Card>
        )}
      </div>
    </ControleLayout>
  )
}
