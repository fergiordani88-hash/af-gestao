import { useState, useEffect } from 'react'
import { Save, ChevronRight, CheckCircle } from 'lucide-react'
import { questionarioApi } from '../../services/questionarioApi'
import { Card } from '../../components/ui/Card'
import { clsx } from 'clsx'

// ── Definição completa das seções e perguntas ─────────────────
const SECOES = [
  {
    id: 'identificacao', label: 'Identificação e Visão Geral', icon: '🏢',
    perguntas: [
      { id: 'empresa',        label: 'Razão Social / Nome Fantasia', tipo: 'text' },
      { id: 'cnpj',           label: 'CNPJ', tipo: 'text' },
      { id: 'endereco',       label: 'Endereço completo', tipo: 'text' },
      { id: 'socios',         label: 'Quadro societário (nome e % de participação)', tipo: 'textarea' },
      { id: 'segmento',       label: 'Segmento de atuação', tipo: 'select', opts: ['Comércio Varejista','Comércio Atacadista','Serviços','Indústria','Tecnologia','Saúde','Educação','Construção Civil','Agronegócio','Outro'] },
      { id: 'atividadePrincipal', label: 'Atividade principal (descreva o que a empresa faz)', tipo: 'textarea' },
      { id: 'regimeTributario', label: 'Regime tributário', tipo: 'select', opts: ['Simples Nacional','Lucro Presumido','Lucro Real','MEI'] },
      { id: 'contador',       label: 'Contador / escritório contábil responsável', tipo: 'text' },
      { id: 'atividade',      label: 'Em atividade desde quando?', tipo: 'date' },
    ]
  },
  {
    id: 'negocio', label: 'Sobre o Negócio', icon: '💼',
    perguntas: [
      { id: 'historia',       label: 'Descreva brevemente a história da empresa', tipo: 'textarea' },
      { id: 'decisao',        label: 'Quem é responsável pela tomada de decisão?', tipo: 'text' },
      { id: 'outrasAtiv',     label: 'Os sócios possuem outras atividades? Quais?', tipo: 'textarea' },
      { id: 'maisLucrativos', label: 'Quais são os produtos/serviços mais lucrativos?', tipo: 'textarea' },
      { id: 'maisVendidos',   label: 'Quais os mais vendidos (maior volume)?', tipo: 'textarea' },
      { id: 'diferencial',    label: 'Qual o diferencial competitivo da empresa?', tipo: 'textarea' },
      { id: 'clientesAlvo',   label: 'Quem são os clientes-alvo?', tipo: 'textarea' },
      { id: 'objetivo',       label: 'Objetivo atual da empresa', tipo: 'select', opts: ['Crescimento acelerado','Estabilidade','Redução de riscos','Reorganização financeira','Expansão geográfica','Outro'] },
    ]
  },
  {
    id: 'faturamento', label: 'Faturamento e Receita', icon: '💰',
    perguntas: [
      { id: 'fatMensal',      label: 'Qual o faturamento médio mensal? (R$)', tipo: 'number' },
      { id: 'fatContabilizado',label: 'Quanto é contabilizado e quanto não é?', tipo: 'textarea' },
      { id: 'aVistaAPrazo',   label: 'Quanto é à vista e quanto é a prazo? (%)', tipo: 'textarea' },
      { id: 'formasPagamento',label: 'Formas de pagamento aceitas e % de cada', tipo: 'textarea' },
      { id: 'sazonalidade',   label: 'Existe sazonalidade no faturamento? Quando são os picos?', tipo: 'textarea' },
      { id: 'ticketMedio',    label: 'Qual o ticket médio por cliente? (R$)', tipo: 'number' },
      { id: 'vendasDia',      label: 'Quantas vendas por dia/mês em média?', tipo: 'text' },
      { id: 'margemPercebida',label: 'O que você imagina de % de margem de lucro?', tipo: 'text' },
      { id: 'caixa',          label: 'Quanto de caixa a empresa tem hoje? (R$)', tipo: 'number' },
      { id: 'aReceber',       label: 'Qual o valor a receber de clientes? (R$)', tipo: 'number' },
      { id: 'precificacao',   label: 'Como é feita a precificação dos produtos/serviços?', tipo: 'textarea' },
    ]
  },
  {
    id: 'fornecedores', label: 'Compras e Fornecedores', icon: '🛒',
    perguntas: [
      { id: 'respCompras',    label: 'Quem é responsável pelas compras?', tipo: 'text' },
      { id: 'planejCompras',  label: 'Existe planejamento ou a compra é por necessidade?', tipo: 'select', opts: ['Planejamento mensal','Planejamento semanal','Por necessidade','Misto'] },
      { id: 'volCompras',     label: 'Qual o volume médio de compras mensais? (R$)', tipo: 'number' },
      { id: 'pagFornec',      label: 'Como paga os fornecedores? (à vista ou a prazo)', tipo: 'select', opts: ['Maior parte à vista','Maior parte a prazo','Misto (50/50)'] },
      { id: 'prazoMedioPag',  label: 'Qual o prazo médio de pagamento? (dias)', tipo: 'number' },
      { id: 'descontoVista',  label: 'Há desconto para pagamento à vista?', tipo: 'select', opts: ['Sim, negociamos sempre','Sim, em alguns casos','Não'] },
      { id: 'qtdFornec',      label: 'Trabalha com quantos fornecedores? Principais?', tipo: 'textarea' },
      { id: 'concentracao',   label: 'Existe concentração de fornecedores?', tipo: 'select', opts: ['Sim, alta (>50% em 1-2 fornecedores)','Moderada (30-50% em 3-4)','Baixa (bem diversificado)'] },
      { id: 'cotacao',        label: 'Faz cotação antes de comprar?', tipo: 'select', opts: ['Sempre','Na maioria das vezes','Raramente','Não'] },
      { id: 'apagar',         label: 'Quanto a empresa deve a fornecedores? (R$)', tipo: 'number' },
    ]
  },
  {
    id: 'estoque', label: 'Estoque e Giro', icon: '📦',
    perguntas: [
      { id: 'valEstoque',     label: 'Quanto tem em estoque hoje? (R$)', tipo: 'number' },
      { id: 'controleEst',    label: 'Tem controle de estoque atualizado?', tipo: 'select', opts: ['Sim, sistema integrado','Sim, planilha','Parcial','Não'] },
      { id: 'sistema',        label: 'Usa sistema ou planilha?', tipo: 'text' },
      { id: 'perdasEst',      label: 'Já teve perdas por falta de controle?', tipo: 'select', opts: ['Sim, significativas','Sim, pequenas','Raramente','Não'] },
      { id: 'maisRapido',     label: 'Quais produtos/serviços vendem mais rápido?', tipo: 'textarea' },
      { id: 'maisParado',     label: 'Quais ficam mais tempo parados ou vendem menos?', tipo: 'textarea' },
      { id: 'diasEstoque',    label: 'Tempo médio que produtos ficam no estoque (dias)', tipo: 'number' },
      { id: 'divergencia',    label: 'Existe divergência entre o físico e o sistema?', tipo: 'select', opts: ['Sim, frequente','Sim, controlada (<2%)','Raramente','Não'] },
    ]
  },
  {
    id: 'equipe', label: 'Equipe e Gestão', icon: '👥',
    perguntas: [
      { id: 'qtdFunc',        label: 'Quantos funcionários a empresa tem?', tipo: 'number' },
      { id: 'regFunc',        label: 'Como são registrados?', tipo: 'select', opts: ['CLT','PJ/Terceirizado','Misto CLT + PJ','Informal'] },
      { id: 'folhaMensal',    label: 'Valor da folha de pagamento mensal (R$)', tipo: 'number' },
      { id: 'proLabore',      label: 'Pró-labore dos sócios (R$/mês)', tipo: 'number' },
      { id: 'beneficios',     label: 'Quais benefícios são oferecidos?', tipo: 'textarea' },
      { id: 'treinamento',    label: 'A empresa investe em treinamento?', tipo: 'select', opts: ['Sim, regularmente','Ocasionalmente','Raramente','Não'] },
      { id: 'rotatividade',   label: 'Qual a rotatividade de pessoal?', tipo: 'select', opts: ['Baixa (<10%/ano)','Média (10-20%/ano)','Alta (>20%/ano)'] },
      { id: 'gestaoProcessos',label: 'Os processos são documentados/padronizados?', tipo: 'select', opts: ['Sim, totalmente','Parcialmente','Poucos processos','Não'] },
    ]
  },
  {
    id: 'bancos', label: 'Bancos e Crédito', icon: '🏦',
    perguntas: [
      { id: 'bancosUtil',     label: 'Quais bancos a empresa utiliza?', tipo: 'textarea' },
      { id: 'contaCorrente',  label: 'Banco principal para conta corrente', tipo: 'text' },
      { id: 'limites',        label: 'Possui limites de crédito? Quais?', tipo: 'textarea' },
      { id: 'dividaTotal',    label: 'Quanto a empresa deve em empréstimos/financiamentos? (R$)', tipo: 'number' },
      { id: 'parcelaMensal',  label: 'Qual a parcela mensal total dos bancos? (R$)', tipo: 'number' },
      { id: 'restricoes',     label: 'A empresa tem restrições no SFN/Serasa?', tipo: 'select', opts: ['Não, cadastro limpo','Sim, em negociação','Sim, pendente'] },
      { id: 'relacionBanco',  label: 'Como é o relacionamento com o banco principal?', tipo: 'select', opts: ['Muito bom — crédito fácil','Bom — alguns produtos disponíveis','Regular','Difícil'] },
      { id: 'precisaCred',    label: 'A empresa precisa de crédito? Para qual finalidade?', tipo: 'textarea' },
    ]
  },
  {
    id: 'impostos', label: 'Impostos e Tributação', icon: '📋',
    perguntas: [
      { id: 'tributosMensais',label: 'Qual o total de tributos mensais estimados? (R$)', tipo: 'number' },
      { id: 'regimeAdequado', label: 'O regime tributário atual é adequado para o porte?', tipo: 'select', opts: ['Sim, já foi revisado recentemente','Acredito que sim, mas nunca revisamos','Não tenho certeza','Não, precisa ser revisto'] },
      { id: 'passivoParcl',   label: 'Existe algum passivo tributário parcelado?', tipo: 'textarea' },
      { id: 'planejTrib',     label: 'Existe planejamento tributário formal?', tipo: 'select', opts: ['Sim','Parcialmente','Não'] },
    ]
  },
  {
    id: 'gestaoFinanceira', label: 'Gestão Financeira', icon: '📊',
    perguntas: [
      { id: 'controleFinanc', label: 'Como é feito o controle financeiro?', tipo: 'select', opts: ['Sistema ERP integrado','Planilhas','Caderno/manual','Não tem controle'] },
      { id: 'fluxoCaixa',     label: 'Faz fluxo de caixa?', tipo: 'select', opts: ['Sim, diário','Sim, semanal','Sim, mensal','Não faz'] },
      { id: 'dre',            label: 'Tem DRE gerencial atualizado?', tipo: 'select', opts: ['Sim, mensalmente','Sim, trimestralmente','Só anual (contabilidade)','Não tem'] },
      { id: 'contabilidade',  label: 'A contabilidade é interna ou terceirizada?', tipo: 'select', opts: ['Interna','Terceirizada — escritório contábil','Terceirizada — contador autônomo'] },
      { id: 'balancetes',     label: 'Recebe balancetes mensais?', tipo: 'select', opts: ['Sim, mensalmente','Trimestral','Só no fechamento anual','Não'] },
      { id: 'investimentos',  label: 'A empresa tem algum investimento financeiro?', tipo: 'textarea' },
      { id: 'margem',         label: 'Qual a margem líquida que você acredita ter? (%)', tipo: 'text' },
      { id: 'principalDesafio',label: 'Qual é o principal desafio financeiro hoje?', tipo: 'textarea' },
    ]
  },
  {
    id: 'planejamento', label: 'Objetivos e Planejamento', icon: '🎯',
    perguntas: [
      { id: 'metaFaturamento',label: 'Qual a meta de faturamento para os próximos 12 meses? (R$)', tipo: 'number' },
      { id: 'expansao',       label: 'Planeja expandir? Como?', tipo: 'textarea' },
      { id: 'investPlan',     label: 'Há investimentos planejados para este ano?', tipo: 'textarea' },
      { id: 'principalRisco', label: 'Qual o principal risco ao negócio hoje?', tipo: 'textarea' },
      { id: 'sucessao',       label: 'Há um plano de sucessão empresarial?', tipo: 'select', opts: ['Sim, estruturado','Em discussão','Não'] },
      { id: 'expectConsultoria', label: 'O que você espera da consultoria AF Gestão?', tipo: 'textarea' },
    ]
  },
]

// ── Componente de pergunta ────────────────────────────────────
interface PerguntaProps {
  p: typeof SECOES[0]['perguntas'][0]
  valor: string
  onChange: (id: string, val: string) => void
}

function Pergunta({ p, valor, onChange }: PerguntaProps) {
  const cls = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200 bg-white'
  return (
    <div>
      <label className="text-sm font-medium text-gray-700 mb-1.5 block">{p.label}</label>
      {p.tipo === 'textarea' ? (
        <textarea rows={3} className={cls + ' resize-none'} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="Digite aqui..." />
      ) : p.tipo === 'select' ? (
        <select className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)}>
          <option value="">Selecione...</option>
          {p.opts?.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      ) : p.tipo === 'number' ? (
        <input type="number" className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="0" />
      ) : p.tipo === 'date' ? (
        <input type="date" className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} />
      ) : (
        <input type="text" className={cls} value={valor || ''} onChange={e => onChange(p.id, e.target.value)} placeholder="Digite aqui..." />
      )}
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────
export function TabQuestionario({ clientId }: { clientId: string }) {
  const [secaoAtiva, setSecaoAtiva] = useState(0)
  const [respostas,  setRespostas]  = useState<Record<string, Record<string, string>>>({})
  const [saving, setSaving] = useState(false)
  const [saved,  setSaved]  = useState(false)
  const [loading, setLoading] = useState(true)
  const [pct, setPct] = useState(0)

  // Carrega respostas salvas
  useEffect(() => {
    const load = async () => {
      setLoading(true)
      try {
        const q = await questionarioApi.pj.get(clientId)
        if (q) {
          const r: Record<string, Record<string, string>> = {}
          SECOES.forEach(s => {
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
    const total = SECOES.reduce((s, sec) => s + sec.perguntas.length, 0)
    const preenchidas = SECOES.reduce((s, sec) => {
      return s + sec.perguntas.filter(p => (respostas[sec.id]?.[p.id] ?? '').trim() !== '').length
    }, 0)
    return Math.round((preenchidas / total) * 100)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const secao = SECOES[secaoAtiva]
      const novosPct = calcPct()
      await questionarioApi.pj.saveSecao(clientId, secao.id, respostas[secao.id] ?? {}, novosPct)
      setPct(novosPct)
      setSaved(true)
      setTimeout(() => setSaved(false), 2000)
    } finally { setSaving(false) }
  }

  const secao    = SECOES[secaoAtiva]
  const respSecao = respostas[secao.id] ?? {}
  const preenchidas = secao.perguntas.filter(p => (respSecao[p.id] ?? '').trim() !== '').length

  if (loading) return <div className="py-12 text-center text-gray-400 text-sm">Carregando questionário...</div>

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">Questionário Empresarial Completo</h2>
          <p className="text-xs text-gray-500 mt-0.5">Levantamento completo de informações — base para o diagnóstico qualitativo</p>
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
        {/* Navegação de seções */}
        <div className="space-y-1">
          {SECOES.map((s, idx) => {
            const respS    = respostas[s.id] ?? {}
            const preenS   = s.perguntas.filter(p => (respS[p.id] ?? '').trim() !== '').length
            const completo = preenS === s.perguntas.length
            const parcial  = preenS > 0
            return (
              <button key={s.id} onClick={() => setSecaoAtiva(idx)}
                className={clsx('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-left transition-all',
                  secaoAtiva === idx ? 'bg-blue-600 text-white' : 'text-gray-700 hover:bg-gray-100'
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

        {/* Perguntas da seção */}
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
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl px-4 py-2 text-sm font-semibold">
              {saved ? <><CheckCircle size={14} /> Salvo!</> : saving ? 'Salvando...' : <><Save size={14} /> Salvar seção</>}
            </button>
          </div>

          {/* Barra de progresso da seção */}
          <div className="mb-5">
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all"
                style={{ width: `${secao.perguntas.length > 0 ? (preenchidas / secao.perguntas.length) * 100 : 0}%` }} />
            </div>
          </div>

          <div className="space-y-4">
            {secao.perguntas.map(p => (
              <Pergunta key={p.id} p={p} valor={respSecao[p.id] ?? ''}
                onChange={(pid, val) => handleChange(secao.id, pid, val)} />
            ))}
          </div>

          {/* Navegação entre seções */}
          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-100">
            <button onClick={() => setSecaoAtiva(Math.max(0, secaoAtiva - 1))} disabled={secaoAtiva === 0}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50 disabled:opacity-30">
              ← Anterior
            </button>
            <span className="text-xs text-gray-400">{secaoAtiva + 1} / {SECOES.length}</span>
            {secaoAtiva < SECOES.length - 1 ? (
              <button onClick={async () => { await handleSave(); setSecaoAtiva(s => s + 1) }}
                className="flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700">
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
