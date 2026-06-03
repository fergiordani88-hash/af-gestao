import { useState, useEffect } from 'react'
import { Save, ChevronRight, CheckCircle } from 'lucide-react'
import { questionarioApi } from '../../services/questionarioApi'
import { Card } from '../../components/ui/Card'
import { clsx } from 'clsx'

const SECOES_AGRO = [
  {
    id: 'identificacao', label: 'Identificação e Visão Geral', icon: '👨‍🌾',
    perguntas: [
      { id: 'nome',           label: 'Nome do produtor / razão social', tipo: 'text' },
      { id: 'cpf_cnpj',       label: 'CPF / CNPJ', tipo: 'text' },
      { id: 'municipio',      label: 'Município e UF', tipo: 'text' },
      { id: 'grupoEcon',      label: 'Possui grupo econômico? Quais integrantes?', tipo: 'textarea' },
      { id: 'areaTotal',      label: 'Área total da propriedade (ha)', tipo: 'number' },
      { id: 'areaPropria',    label: 'Área própria (ha)', tipo: 'number' },
      { id: 'areaArrendada',  label: 'Área arrendada (ha)', tipo: 'number' },
      { id: 'tempoAtividade', label: 'Há quanto tempo atua na atividade?', tipo: 'text' },
      { id: 'culturas',       label: 'Planta quais culturas?', tipo: 'textarea' },
      { id: 'outrasAtiv',     label: 'Desenvolve outras atividades? (pecuária, armazenagem...)', tipo: 'textarea' },
      { id: 'objetivo',       label: 'Principal objetivo atual', tipo: 'select', opts: ['Crescimento de área','Estabilidade financeira','Redução de risco','Reorganização financeira','Modernização tecnológica'] },
    ]
  },
  {
    id: 'produtividade', label: 'Produtividade e Manejo', icon: '🌱',
    perguntas: [
      { id: 'prodSoja',       label: 'Produtividade média soja (sc/ha)', tipo: 'number' },
      { id: 'prodMilho',      label: 'Produtividade média milho 2ª (sc/ha)', tipo: 'number' },
      { id: 'prodAlgodao',    label: 'Produtividade média algodão (@/ha, se aplicável)', tipo: 'text' },
      { id: 'dentroEsperado', label: 'A produção foi dentro do esperado na última safra?', tipo: 'select', opts: ['Sim, atingiu ou superou','Parcialmente (90-99%)','Abaixo (70-89%)','Muito abaixo (<70%)'] },
      { id: 'quebra',         label: 'Houve quebra recente? Qual motivo?', tipo: 'textarea' },
      { id: 'precAgricola',   label: 'Utiliza agricultura de precisão?', tipo: 'select', opts: ['Sim, plenamente','Parcialmente (algumas ferramentas)','Não, mas planejo','Não'] },
      { id: 'correcaoSolo',   label: 'Realizou correção de solo? Quando?', tipo: 'text' },
      { id: 'assistTec',      label: 'Possui assistência técnica? De quem?', tipo: 'text' },
      { id: 'qtdFunc',        label: 'Possui quantos funcionários?', tipo: 'number' },
      { id: 'safristas',      label: 'Contrata safristas? Quantos?', tipo: 'text' },
    ]
  },
  {
    id: 'fornecedores', label: 'Fornecedores e Compras', icon: '🛒',
    perguntas: [
      { id: 'respCompras',    label: 'Quem é responsável pelas compras de insumos?', tipo: 'text' },
      { id: 'planejamento',   label: 'Existe planejamento de compras ou é por necessidade?', tipo: 'select', opts: ['Planejamento anual antecipado','Planejamento mensal','Por necessidade','Misto'] },
      { id: 'volCompras',     label: 'Volume médio de compras mensais de insumos (R$)', tipo: 'number' },
      { id: 'pagFornec',      label: 'Como paga os fornecedores?', tipo: 'select', opts: ['Majoritariamente à vista','Majoritariamente a prazo','Barter','Misto'] },
      { id: 'pctBarter',      label: '% aproximado de barter nas compras', tipo: 'text' },
      { id: 'sementes',       label: 'Principal fornecedor de sementes', tipo: 'text' },
      { id: 'fertilizantes',  label: 'Principal fornecedor de fertilizantes', tipo: 'text' },
      { id: 'defensivos',     label: 'Principal fornecedor de defensivos', tipo: 'text' },
      { id: 'compraDireto',   label: 'Compra direto da fábrica ou via revenda?', tipo: 'select', opts: ['Direto da fábrica','Via revenda','Misto'] },
      { id: 'limitesFornec',  label: 'Possui limite de crédito com fornecedores?', tipo: 'textarea' },
      { id: 'travaCusto',     label: 'Trava custo (ex: dólar, fertilizantes)?', tipo: 'select', opts: ['Sim, sistematicamente','Eventualmente','Raramente','Não'] },
      { id: 'estoqueInsumos', label: 'Valor estimado do estoque de insumos atual (R$)', tipo: 'number' },
    ]
  },
  {
    id: 'prestadores', label: 'Prestadores de Serviço', icon: '🚜',
    perguntas: [
      { id: 'plantio',        label: 'Plantio é próprio ou terceirizado?', tipo: 'select', opts: ['Próprio (máquina própria)','Terceirizado','Misto'] },
      { id: 'pulverizacao',   label: 'Pulverização é própria ou terceirizada?', tipo: 'select', opts: ['Própria','Terceirizada (terrestre)','Terceirizada (aérea)','Misto'] },
      { id: 'colheita',       label: 'Colheita é própria ou terceirizada?', tipo: 'select', opts: ['Própria','Terceirizada','Misto'] },
      { id: 'custoServicos',  label: 'Custo médio por hectare dos serviços terceirizados (R$/ha)', tipo: 'number' },
      { id: 'maquinarioProp', label: 'Possui maquinário próprio? Quais?', tipo: 'textarea' },
      { id: 'valorMaquinas',  label: 'Valor estimado do maquinário próprio (R$)', tipo: 'number' },
      { id: 'manutencao',     label: 'Como é feita a manutenção do maquinário?', tipo: 'select', opts: ['Preventiva programada','Corretiva quando necessário','Terceirizada','Misto'] },
    ]
  },
  {
    id: 'logistica', label: 'Logística e Armazenagem', icon: '🏭',
    perguntas: [
      { id: 'siloProprio',    label: 'Possui silo/armazém próprio?', tipo: 'select', opts: ['Sim, com capacidade suficiente','Sim, capacidade parcial','Não, usa armazém terceiro','Não, vende direto'] },
      { id: 'capArmazenagem', label: 'Capacidade de armazenagem própria (sacas)', tipo: 'number' },
      { id: 'custoArmazem',   label: 'Custo de armazenagem terceirizada (R$/sc/mês)', tipo: 'text' },
      { id: 'trading',        label: 'Principal trading/cooperativa parceira', tipo: 'text' },
      { id: 'frete',          label: 'Como é feito o frete para o armazém?', tipo: 'select', opts: ['Próprio','Terceirizado — contratado','Terceirizado — spot','Misto'] },
      { id: 'custoFrete',     label: 'Custo médio de frete (R$/ton ou R$/sc)', tipo: 'text' },
    ]
  },
  {
    id: 'comercializacao', label: 'Comercialização da Produção', icon: '📈',
    perguntas: [
      { id: 'estratVenda',    label: 'Qual a estratégia de venda?', tipo: 'select', opts: ['Vende tudo após colheita (spot)','Trava parte antes (fixação)','CPR Física com tradings','Barter (troca por insumos)','Misto'] },
      { id: 'pctVendaAntec',  label: '% da produção vendida/fixada antes da colheita', tipo: 'text' },
      { id: 'momentoVenda',   label: 'Quando costuma vender a produção?', tipo: 'select', opts: ['Durante o plantio (muito antecipado)','Pré-colheita (1-3 meses antes)','Na colheita','Pós-colheita (aguarda preço)','Misto'] },
      { id: 'usaCPR',         label: 'Utiliza CPR (Cédula de Produto Rural)?', tipo: 'select', opts: ['Sim, regularmente','Eventualmente','Não'] },
      { id: 'hedgeBolsa',     label: 'Faz operações de hedge na bolsa (B3/CME)?', tipo: 'select', opts: ['Sim, com orientação especializada','Eventualmente','Não'] },
      { id: 'precificacao',   label: 'Como define o preço mínimo de venda?', tipo: 'textarea' },
    ]
  },
  {
    id: 'gestaoFinanceira', label: 'Gestão Financeira', icon: '💰',
    perguntas: [
      { id: 'controleFinanc', label: 'Como é feito o controle financeiro da propriedade?', tipo: 'select', opts: ['Sistema de gestão rural','Planilhas próprias','Caderno/manual','Não tem controle'] },
      { id: 'dreRural',       label: 'Faz DRE Rural ou demonstrativo de resultado por safra?', tipo: 'select', opts: ['Sim, por safra','Sim, anual','Parcialmente','Não'] },
      { id: 'fluxoCaixa',     label: 'Faz fluxo de caixa da propriedade?', tipo: 'select', opts: ['Sim, mensal','Sim, por safra','Não'] },
      { id: 'custoHa',        label: 'Conhece seu custo por hectare de produção?', tipo: 'select', opts: ['Sim, preciso','Sim, aproximado','Não com precisão','Não'] },
      { id: 'separaContas',   label: 'Separa conta pessoal da conta da propriedade?', tipo: 'select', opts: ['Sim, completamente','Parcialmente','Não'] },
      { id: 'prolabore',      label: 'Retira pró-labore formal da atividade?', tipo: 'select', opts: ['Sim, valor fixo mensal','Eventualmente','Não'] },
      { id: 'impostos',       label: 'Qual regime tributário da propriedade?', tipo: 'select', opts: ['Lucro Presumido (PJ)','Simples Nacional','Pessoa Física (IRPF)','Não sabe'] },
    ]
  },
  {
    id: 'bancos', label: 'Bancos e Crédito Rural', icon: '🏦',
    perguntas: [
      { id: 'bancoPrinc',     label: 'Banco principal para crédito rural', tipo: 'text' },
      { id: 'bancosUtil',     label: 'Todos os bancos utilizados', tipo: 'textarea' },
      { id: 'linhasCred',     label: 'Quais linhas de crédito utiliza?', tipo: 'textarea' },
      { id: 'dividaTotal',    label: 'Dívida total no SFN (R$)', tipo: 'number' },
      { id: 'custeioTotal',   label: 'Total em custeios bancários (R$)', tipo: 'number' },
      { id: 'investTotal',    label: 'Total em investimentos financiados (R$)', tipo: 'number' },
      { id: 'restricoesSFN',  label: 'Possui restrições no SFN?', tipo: 'select', opts: ['Não, cadastro limpo','Sim, em negociação','Sim, pendente'] },
      { id: 'relacionBanco',  label: 'Como é o relacionamento com o banco principal?', tipo: 'select', opts: ['Muito bom — crédito fácil','Bom','Regular','Difícil'] },
      { id: 'precisaCred',    label: 'Precisará de novo crédito na próxima safra?', tipo: 'select', opts: ['Sim, custeio','Sim, investimento','Sim, renegociação','Não'] },
      { id: 'garantias',      label: 'Quais garantias disponíveis para operações?', tipo: 'textarea' },
    ]
  },
  {
    id: 'patrimonio', label: 'Patrimônio e Garantias', icon: '🏡',
    perguntas: [
      { id: 'imoveisRurais',  label: 'Imóveis rurais próprios: área (ha) e valor estimado (R$)', tipo: 'textarea' },
      { id: 'imoveisUrb',     label: 'Imóveis urbanos e valor estimado', tipo: 'textarea' },
      { id: 'maquinasVal',    label: 'Valor total estimado das máquinas/implementos (R$)', tipo: 'number' },
      { id: 'veiculos',       label: 'Veículos e valor estimado (R$)', tipo: 'number' },
      { id: 'rebanho',        label: 'Possui rebanho? Tipo e quantidade', tipo: 'textarea' },
      { id: 'bensOnus',       label: 'Bens com ônus (alienação, hipoteca, penhor)', tipo: 'textarea' },
      { id: 'patrimonioTotal',label: 'Patrimônio total estimado (R$)', tipo: 'number' },
      { id: 'seguroAgricola', label: 'Possui seguro agrícola?', tipo: 'select', opts: ['Sim, cobertura total','Sim, cobertura parcial','Não, mas pretende contratar','Não'] },
      { id: 'seguroMaquinas', label: 'Possui seguro das máquinas?', tipo: 'select', opts: ['Sim','Não'] },
    ]
  },
  {
    id: 'sucessao', label: 'Sucessão e Planejamento', icon: '🎯',
    perguntas: [
      { id: 'sucessao',       label: 'Existe planejamento de sucessão familiar?', tipo: 'select', opts: ['Sim, estruturado formalmente','Em discussão','Não'] },
      { id: 'herdeiros',      label: 'Há herdeiros interessados em continuar a atividade?', tipo: 'select', opts: ['Sim, já envolvidos','Sim, mas ainda jovens','Incerto','Não'] },
      { id: 'holdingRural',   label: 'Possui ou considera uma holding rural/familiar?', tipo: 'select', opts: ['Sim, já constituída','Em estruturação','Pretende montar','Não considera'] },
      { id: 'metaArea',       label: 'Meta de área para as próximas 3 safras (ha)', tipo: 'number' },
      { id: 'investPlan',     label: 'Investimentos planejados para os próximos 2 anos', tipo: 'textarea' },
      { id: 'principalRisco', label: 'Principal risco ao negócio hoje', tipo: 'textarea' },
      { id: 'expectConsult',  label: 'O que espera da consultoria AF Gestão?', tipo: 'textarea' },
    ]
  },
]

// ── Componente de pergunta ────────────────────────────────────
function Pergunta({ p, valor, onChange }: { p: any; valor: string; onChange: (id: string, val: string) => void }) {
  const cls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200 bg-white'
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{p.label}</label>
      {p.tipo === 'textarea' ? (
        <textarea rows={3} className={cls + ' resize-none'} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="Digite aqui..." />
      ) : p.tipo === 'select' ? (
        <select className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)}>
          <option value="">Selecione...</option>
          {p.opts?.map((o: string) => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : p.tipo === 'number' ? (
        <input type="number" className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="0" />
      ) : (
        <input type="text" className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="Digite aqui..." />
      )}
    </div>
  )
}

export function TabQuestionarioAgro({ clientId }: { clientId: string }) {
  const [secaoAtiva, setSecaoAtiva] = useState(0)
  const [respostas,  setRespostas]  = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState(0)

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const q = await questionarioApi.agro.get(clientId)
        if (q) {
          const r: Record<string, Record<string, string>> = {}
          SECOES_AGRO.forEach(s => {
            try { r[s.id] = JSON.parse(q[s.id] ?? '{}') } catch { r[s.id] = {} }
          })
          setRespostas(r)
          setPct(q.percentualConclusao ?? 0)
        }
      } finally { setLoading(false) }
    }
    load()
  }, [clientId])

  const handleChange = (secaoId: string, pergId: string, val: string) => {
    setRespostas(r => ({ ...r, [secaoId]: { ...(r[secaoId] ?? {}), [pergId]: val } }))
    setSaved(false)
  }

  const calcPct = () => {
    const total = SECOES_AGRO.reduce((s, sec) => s + sec.perguntas.length, 0)
    const preenchidas = SECOES_AGRO.reduce((s, sec) => s + sec.perguntas.filter(p => (respostas[sec.id]?.[p.id] ?? '').trim() !== '').length, 0)
    return Math.round((preenchidas / total) * 100)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const secao = SECOES_AGRO[secaoAtiva]
      const novosPct = calcPct()
      await questionarioApi.agro.saveSecao(clientId, secao.id, respostas[secao.id] ?? {}, novosPct)
      setPct(novosPct)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const secao     = SECOES_AGRO[secaoAtiva]
  const respSecao = respostas[secao.id] ?? {}
  const preenchidas = secao.perguntas.filter(p => (respSecao[p.id] ?? '').trim() !== '').length

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Carregando questionário...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Questionário Rural Completo</h2>
          <p className="text-xs text-gray-500 mt-0.5">Levantamento completo do produtor rural — base para o diagnóstico qualitativo</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-xs text-gray-500">Conclusão geral</p>
            <p className="text-lg font-bold text-gray-900">{pct}%</p>
          </div>
          <div className="w-16 h-16">
            <svg viewBox="0 0 36 36" className="w-full h-full rotate-[-90deg]">
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E5E7EB" strokeWidth="3" />
              <circle cx="18" cy="18" r="15.9" fill="none" stroke="#1B5E20" strokeWidth="3"
                strokeDasharray={`${pct} ${100 - pct}`} strokeLinecap="round" />
            </svg>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        <div className="space-y-1">
          {SECOES_AGRO.map((s, idx) => {
            const respS  = respostas[s.id] ?? {}
            const preenS = s.perguntas.filter(p => (respS[p.id] ?? '').trim() !== '').length
            const completo = preenS === s.perguntas.length
            const parcial  = preenS > 0
            return (
              <button key={s.id} onClick={() => setSecaoAtiva(idx)}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                  secaoAtiva === idx ? 'bg-af-green text-white' : 'text-gray-700 hover:bg-gray-100'
                )}>
                <span className="text-lg shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold truncate">{s.label}</p>
                  <p className={`text-xs ${secaoAtiva === idx ? 'text-white/70' : 'text-gray-400'}`}>{preenS}/{s.perguntas.length}</p>
                </div>
                {completo && <CheckCircle size={14} className={secaoAtiva === idx ? 'text-white' : 'text-emerald-500'} />}
                {!completo && parcial && <div className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />}
              </button>
            )
          })}
        </div>

        <Card className="lg:col-span-3 p-5">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <span className="text-2xl">{secao.icon}</span>
              <div>
                <h3 className="font-bold text-gray-900">{secao.label}</h3>
                <p className="text-xs text-gray-500">{preenchidas} de {secao.perguntas.length} respondidas</p>
              </div>
            </div>
            <button onClick={handleSave} disabled={saving}
              className="flex items-center gap-2 bg-af-green hover:bg-af-green-light disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar</>}
            </button>
          </div>

          <div className="mb-5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-af-green rounded-full transition-all"
                style={{ width: `${secao.perguntas.length > 0 ? (preenchidas / secao.perguntas.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {secao.perguntas.map(p => (
              <Pergunta key={p.id} p={p} valor={respSecao[p.id] ?? ''}
                onChange={(pid, val) => handleChange(secao.id, pid, val)} />
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setSecaoAtiva(Math.max(0, secaoAtiva - 1))} disabled={secaoAtiva === 0}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">{secaoAtiva + 1} / {SECOES_AGRO.length}</span>
            {secaoAtiva < SECOES_AGRO.length - 1 ? (
              <button onClick={async () => { await handleSave(); setSecaoAtiva(s => s + 1) }}
                className="flex items-center gap-1 px-4 py-2 bg-af-green text-white rounded-xl text-sm font-semibold hover:bg-af-green-light">
                Salvar e avançar <ChevronRight size={14} />
              </button>
            ) : (
              <button onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-sm font-semibold hover:bg-emerald-700">
                <CheckCircle size={14} /> Concluir
              </button>
            )}
          </div>
        </Card>
      </div>
    </div>
  )
}
