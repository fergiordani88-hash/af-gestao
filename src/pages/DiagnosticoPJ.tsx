import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Building2, ChevronRight, CheckCircle, AlertTriangle, TrendingDown, TrendingUp, Download, RefreshCw, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePDF } from '../pdf/usePDF'

type Step = 'form' | 'result'

interface PJForm {
  clientId: string; segment: string; employees: string
  grossRevenue: string; deductions: string; cmv: string
  fixedExpenses: string; variableExpenses: string; financialExpenses: string; proLabore: string
  totalDebt: string; shortTermDebt: string; bankName: string
  mainProduct: string; avgTicket: string; clientCount: string
  hasAccounting: boolean; hasERP: boolean; hasFinancialControl: boolean
}

const calcDRE = (f: PJForm) => {
  const num = (s: string) => Number(s.replace(/\D/g, '')) || 0
  const gross = num(f.grossRevenue)
  const deductions = num(f.deductions)
  const net = gross - deductions
  const cmv = num(f.cmv)
  const grossProfit = net - cmv
  const fixed = num(f.fixedExpenses)
  const variable = num(f.variableExpenses)
  const financial = num(f.financialExpenses)
  const proLabore = num(f.proLabore)
  const ebitda = grossProfit - fixed - variable - proLabore
  const operatingProfit = ebitda - financial
  const grossMargin = net > 0 ? (grossProfit / net) * 100 : 0
  const netMargin = gross > 0 ? (operatingProfit / gross) * 100 : 0
  const breakeven = fixed + proLabore > 0 ? (fixed + proLabore) / (grossMargin / 100) : 0
  const debt = num(f.totalDebt)
  const debtRatio = gross > 0 ? (debt / gross) * 100 : 0
  return { gross, net, cmv, grossProfit, fixed, variable, financial, proLabore, ebitda, operatingProfit, grossMargin, netMargin, breakeven, debt, debtRatio }
}

const classify = (netMargin: number, debtRatio: number) => {
  if (netMargin >= 10 && debtRatio < 30) return 'saudavel'
  if (netMargin >= 5 && debtRatio < 60) return 'atencao'
  if (netMargin >= 0 && debtRatio < 100) return 'critico'
  return 'reestruturacao'
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${v.toFixed(1)}%`

export function DiagnosticoPJ() {
  // ── Todos os hooks no topo — nunca dentro de if/loops ──────────
  const { clients } = useStore()
  const { user } = useAuthStore()
  const { exportDiagnosticoPJ } = usePDF()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('form')
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState<PJForm>({
    clientId: '', segment: 'comercio', employees: '', grossRevenue: '', deductions: '',
    cmv: '', fixedExpenses: '', variableExpenses: '', financialExpenses: '', proLabore: '',
    totalDebt: '', shortTermDebt: '', bankName: '', mainProduct: '', avgTicket: '', clientCount: '',
    hasAccounting: false, hasERP: false, hasFinancialControl: false
  })

  // Pré-seleciona cliente vindo do CRM
  useEffect(() => {
    const clientId = searchParams.get('clientId')
    if (clientId) {
      const client = clients.find(c => c.id === clientId)
      if (client) {
        setForm(f => ({
          ...f,
          clientId,
          segment: client.segment === 'agro' ? 'comercio' : client.segment,
        }))
      }
    }
  }, [searchParams, clients])

  const set = (k: keyof PJForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'
  const label = 'text-xs font-medium text-gray-600 mb-1 block'

  const dre = step === 'result' ? calcDRE(form) : null
  const classification = dre ? classify(dre.netMargin, dre.debtRatio) : null

  const dreChartData = dre ? [
    { name: 'Receita Bruta', value: dre.gross },
    { name: 'Receita Líquida', value: dre.net },
    { name: 'Lucro Bruto', value: dre.grossProfit },
    { name: 'EBITDA', value: dre.ebitda },
    { name: 'Resultado', value: dre.operatingProfit },
  ] : []

  if (step === 'result' && dre) {
    const points = [
      dre.netMargin < 5 && 'Margem líquida abaixo de 5% — empresa opera no limite',
      dre.grossMargin < 30 && 'Margem bruta baixa — revisar CMV e precificação',
      dre.debtRatio > 60 && 'Endividamento elevado em relação ao faturamento',
      dre.ebitda < 0 && 'EBITDA negativo — geração de caixa insuficiente',
      !form.hasFinancialControl && 'Ausência de controle financeiro estruturado',
    ].filter(Boolean) as string[]

    const opportunities = [
      dre.grossMargin < 50 && 'Revisar precificação e mix de produtos/serviços',
      dre.fixed > dre.gross * 0.4 && 'Reduzir custo fixo — representa mais de 40% da receita',
      dre.debtRatio > 30 && 'Estruturar crédito: consolidar dívidas em linhas mais baratas',
      !form.hasAccounting && 'Implantar contabilidade gerencial para melhorar decisões',
      dre.netMargin > 0 && dre.netMargin < 10 && 'Potencial de crescimento de margem com gestão financeira',
    ].filter(Boolean) as string[]

    const clientName = clients.find(c => c.id === form.clientId)?.name ?? 'Cliente'

    const handleExport = async () => {
      setExporting(true)
      try {
        await exportDiagnosticoPJ({
          clientName,
          segment:      form.segment,
          period:       new Date().getFullYear().toString(),
          consultorName: user?.name ?? 'Consultor AF',
          grossRevenue: dre.gross,
          deductions:   dre.gross - dre.net,
          cmv:          dre.cmv,
          fixedExpenses:    dre.fixed,
          variableExpenses: dre.variable,
          financialExpenses:dre.financial,
          proLabore:        dre.proLabore,
          totalDebt:        Number(form.totalDebt.replace(/\D/g, '')) || 0,
          grossMargin:  dre.grossMargin,
          netMargin:    dre.netMargin,
          ebitda:       dre.ebitda,
          breakeven:    dre.breakeven,
          classification: classification ?? 'atencao',
          hasAccounting:       form.hasAccounting,
          hasERP:              form.hasERP,
          hasFinancialControl: form.hasFinancialControl,
          actionPlans: points.map((p, i) => ({
            action:   p,
            area:     'Financeiro',
            priority: i === 0 ? 'imediata' : 'alta',
            deadline: i === 0 ? '15 dias' : '30 dias',
            status:   'nao_iniciado',
          })),
        })
      } finally {
        setExporting(false)
      }
    }

    return (
      <AppLayout title="Diagnóstico Empresarial" subtitle={`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Diagnóstico</span>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="font-semibold text-gray-900">{clientName}</span>
            <Badge variant={classification as any} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => setStep('form')}>Novo</Button>
            <Button icon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        {/* KPIs */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Receita Bruta', value: fmtBRL(dre.gross), icon: TrendingUp, color: 'text-af-green' },
            { label: 'Margem Bruta', value: fmtPct(dre.grossMargin), icon: dre.grossMargin >= 30 ? TrendingUp : TrendingDown, color: dre.grossMargin >= 30 ? 'text-emerald-600' : 'text-red-500' },
            { label: 'Margem Líquida', value: fmtPct(dre.netMargin), icon: dre.netMargin >= 5 ? TrendingUp : TrendingDown, color: dre.netMargin >= 5 ? 'text-emerald-600' : 'text-red-500' },
            { label: 'Endividamento', value: fmtPct(dre.debtRatio), icon: dre.debtRatio < 60 ? CheckCircle : AlertTriangle, color: dre.debtRatio < 60 ? 'text-emerald-600' : 'text-red-500' },
          ].map(k => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <div className="flex items-end justify-between">
                <p className="text-xl font-bold text-gray-900">{k.value}</p>
                <k.icon size={18} className={k.color} />
              </div>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* DRE waterfall */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">DRE Gerencial</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={dreChartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 9 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {dreChartData.map((entry, idx) => (
                    <rect key={idx} fill={entry.value >= 0 ? '#1B5E20' : '#DC2626'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-2 text-sm">
              {[
                ['Receita Bruta', dre.gross, ''],
                ['(–) Deduções', dre.gross - dre.net, 'text-red-500'],
                ['= Receita Líquida', dre.net, 'font-semibold'],
                ['(–) CMV', dre.cmv, 'text-red-500'],
                ['= Lucro Bruto', dre.grossProfit, 'font-semibold'],
                ['(–) Fixos + Pró-labore', dre.fixed + dre.proLabore, 'text-red-500'],
                ['= EBITDA', dre.ebitda, 'font-semibold'],
                ['(–) Desp. Financeiras', dre.financial, 'text-red-500'],
                ['= Resultado Operacional', dre.operatingProfit, 'font-bold text-lg'],
              ].map(([label, val, cls]) => (
                <div key={String(label)} className="flex justify-between border-b border-gray-50 pb-1">
                  <span className={`text-gray-600 ${cls}`}>{label}</span>
                  <span className={`font-medium ${(val as number) < 0 ? 'text-red-500' : ''} ${cls}`}>{fmtBRL(val as number)}</span>
                </div>
              ))}
            </div>
          </Card>

          {/* Points */}
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Pontos de Atenção</h3>
              {points.length ? (
                <ul className="space-y-2">
                  {points.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-red-50 rounded-lg px-3 py-2">
                      <span className="text-red-500 mt-0.5">•</span>{p}
                    </li>
                  ))}
                </ul>
              ) : <p className="text-sm text-emerald-600">Nenhum ponto crítico identificado</p>}
            </Card>
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-af-green" /> Oportunidades</h3>
              <ul className="space-y-2">
                {opportunities.map((o, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm text-gray-700 bg-emerald-50 rounded-lg px-3 py-2">
                    <span className="text-emerald-600 mt-0.5">✓</span>{o}
                  </li>
                ))}
              </ul>
            </Card>
          </div>
        </div>

        {/* Plano de ação */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Plano de Ação — Próximos 90 Dias</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {[
              { period: '0–15 dias', color: 'border-red-200 bg-red-50', items: ['Levantar todas as dívidas', 'Mapear fluxo de caixa', 'Identificar vazamentos financeiros'] },
              { period: '15–30 dias', color: 'border-amber-200 bg-amber-50', items: ['Revisar precificação', 'Implantar controle financeiro', 'Negociar com fornecedores'] },
              { period: '30–60 dias', color: 'border-blue-200 bg-blue-50', items: ['Estruturar crédito bancário', 'Implantar fluxo de caixa semanal', 'Treinamento equipe financeira'] },
              { period: '60–90 dias', color: 'border-emerald-200 bg-emerald-50', items: ['Revisão de metas', 'Estratégia de crescimento', 'Governança financeira'] },
            ].map(col => (
              <div key={col.period} className={`rounded-xl border p-3 ${col.color}`}>
                <p className="text-xs font-bold text-gray-700 mb-2">{col.period}</p>
                <ul className="space-y-1.5">
                  {col.items.map((item, i) => <li key={i} className="text-xs text-gray-600 flex items-start gap-1.5"><span className="text-gray-400 mt-0.5">›</span>{item}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </Card>

        {/* Parecer */}
        <Card className="p-5 mt-4 border-2 border-af-green/20 bg-af-green-pale/30">
          <h3 className="font-semibold text-af-green mb-2">Parecer Consultivo — AF Gestão & Consultoria</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            Com base na análise dos dados financeiros apresentados, a empresa encontra-se classificada como <strong>{classification === 'saudavel' ? 'Financeiramente Saudável' : classification === 'atencao' ? 'em Atenção' : classification === 'critico' ? 'em Situação Crítica' : 'em Necessidade Urgente de Reestruturação'}</strong>.
            {dre.netMargin < 5 && ' A margem líquida abaixo de 5% indica pressão operacional que exige ação imediata no controle de custos e revisão da precificação.'}
            {dre.debtRatio > 60 && ' O nível de endividamento representa risco ao fluxo de caixa e requer estruturação urgente das obrigações financeiras.'}
            {dre.netMargin >= 10 && ' A empresa demonstra solidez financeira com oportunidade de expansão sustentável.'}
            {' '}A AF Gestão & Consultoria está preparada para transformar esses números em decisões estratégicas que geram resultado real.
          </p>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Diagnóstico Empresarial" subtitle="Análise financeira e estratégica — PJ">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-blue-50 text-blue-600 rounded-xl"><Building2 size={20} /></span>
            <div>
              <h2 className="font-bold text-gray-900">Questionário Empresarial</h2>
              <p className="text-sm text-gray-500">Preencha os dados para gerar o diagnóstico completo</p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Cliente */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">1. Identificação</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={label}>Cliente *</label>
                  <select className={inp} value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                    <option value="">Selecione o cliente...</option>
                    {clients.filter(c => c.segment !== 'agro').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className={label}>Segmento</label>
                  <select className={inp} value={form.segment} onChange={e => set('segment', e.target.value)}>
                    <option value="comercio">Comércio</option><option value="servicos">Serviços</option><option value="industria">Indústria</option>
                  </select>
                </div>
                <div><label className={label}>Nº de Funcionários</label><input className={inp} value={form.employees} onChange={e => set('employees', e.target.value)} placeholder="Ex: 15" /></div>
              </div>
            </section>

            {/* DRE */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">2. Dados Financeiros (mensal R$)</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  ['grossRevenue', 'Faturamento Bruto *'], ['deductions', 'Deduções (impostos, devoluções)'],
                  ['cmv', 'CMV (Custo da Mercadoria)'], ['fixedExpenses', 'Despesas Fixas'],
                  ['variableExpenses', 'Despesas Variáveis'], ['financialExpenses', 'Despesas Financeiras'],
                  ['proLabore', 'Pró-labore dos Sócios'], ['totalDebt', 'Dívida Total (R$)'],
                ].map(([key, lbl]) => (
                  <div key={key}>
                    <label className={label}>{lbl}</label>
                    <input className={inp} value={form[key as keyof PJForm] as string} onChange={e => set(key as keyof PJForm, e.target.value)} placeholder="0" />
                  </div>
                ))}
              </div>
            </section>

            {/* Controles */}
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">3. Controles Internos</h3>
              <div className="space-y-2">
                {([['hasAccounting', 'Possui contabilidade atualizada'], ['hasERP', 'Utiliza sistema ERP/gestão'], ['hasFinancialControl', 'Realiza controle de fluxo de caixa']] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k] as boolean} onChange={e => set(k, e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{l}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" disabled={!form.clientId || !form.grossRevenue} onClick={() => setStep('result')}>
              Gerar Diagnóstico Completo
            </Button>
            <Button variant="secondary" onClick={() => setForm(f => ({ ...f, clientId: '', grossRevenue: '', cmv: '', fixedExpenses: '', variableExpenses: '', financialExpenses: '', proLabore: '', totalDebt: '' }))}>
              Limpar
            </Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
