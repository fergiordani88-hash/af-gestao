import { useState, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Sprout, ChevronRight, AlertTriangle, TrendingUp, Download, RefreshCw, Loader2 } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { Badge } from '../components/ui/Badge'
import { useStore } from '../store/useStore'
import { useAuthStore } from '../store/useAuthStore'
import { usePDF } from '../pdf/usePDF'

type Step = 'form' | 'result'

interface AgroForm {
  clientId: string
  ownArea: string; leasedArea: string; leaseValueHa: string
  // Soja
  sojaArea: string; sojaProductivity: string; sojaPrice: string; sojaCostHa: string
  // Milho 2a
  milhoArea: string; milhoProductivity: string; milhoPrice: string; milhoCostHa: string
  // Endividamento
  custeioBank: string; custeioValue: string; custeioRate: string
  investBank: string; investValue: string; investRate: string
  cprValue: string; cprBank: string
  // Estrutura
  ownMachinery: boolean; propertyValue: string; machineryValue: string
  hasInsurance: boolean; hasPlanning: boolean; hasFinancialControl: boolean
}

const num = (s: string) => Number(s.replace(/\D/g, '')) || 0
const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtSc = (v: number) => `${v.toFixed(0)} sc/ha`

function calcAgro(f: AgroForm) {
  const sojaArea = num(f.sojaArea); const sojaProductivity = Number(f.sojaProductivity) || 0
  const sojaPrice = Number(f.sojaPrice) || 0; const sojaCostHa = num(f.sojaCostHa)
  const sojaProd = sojaArea * sojaProductivity
  const sojaRevenue = sojaProd * sojaPrice
  const sojaCost = sojaArea * sojaCostHa
  const sojaResult = sojaRevenue - sojaCost

  const milhoArea = num(f.milhoArea); const milhoProductivity = Number(f.milhoProductivity) || 0
  const milhoPrice = Number(f.milhoPrice) || 0; const milhoCostHa = num(f.milhoCostHa)
  const milhoProd = milhoArea * milhoProductivity
  const milhoRevenue = milhoProd * milhoPrice
  const milhoCost = milhoArea * milhoCostHa
  const milhoResult = milhoRevenue - milhoCost

  const leasedArea = num(f.leasedArea); const leaseValueHa = num(f.leaseValueHa)
  const leaseCost = leasedArea * leaseValueHa
  const totalArea = num(f.ownArea) + leasedArea
  const totalRevenue = sojaRevenue + milhoRevenue
  const totalCost = sojaCost + milhoCost + leaseCost
  const totalResult = totalRevenue - totalCost
  const revenueHa = totalArea > 0 ? totalRevenue / totalArea : 0
  const costHa = totalArea > 0 ? totalCost / totalArea : 0
  const resultHa = revenueHa - costHa
  const margin = totalRevenue > 0 ? (totalResult / totalRevenue) * 100 : 0

  const custeioDebt = num(f.custeioValue); const investDebt = num(f.investValue); const cprDebt = num(f.cprValue)
  const totalDebt = custeioDebt + investDebt + cprDebt
  const debtCoverage = totalRevenue > 0 ? totalDebt / totalRevenue : 0
  const property = num(f.propertyValue); const machinery = num(f.machineryValue)
  const patrimony = property + machinery
  const debtRatio = patrimony > 0 ? (totalDebt / patrimony) * 100 : 0
  const sojaBreakeven = sojaProductivity > 0 && sojaPrice > 0 ? sojaCostHa / sojaPrice : 0

  return {
    sojaProd, sojaRevenue, sojaCost, sojaResult, sojaBreakeven,
    milhoProd, milhoRevenue, milhoCost, milhoResult,
    leaseCost, totalArea, totalRevenue, totalCost, totalResult,
    revenueHa, costHa, resultHa, margin, totalDebt, debtCoverage,
    patrimony, debtRatio, custeioDebt, investDebt, cprDebt
  }
}

export function DiagnosticoAgro() {
  // ── Todos os hooks no topo ──────────────────────────────────────
  const { clients } = useStore()
  const { user } = useAuthStore()
  const { exportDiagnosticoAgro } = usePDF()
  const [searchParams] = useSearchParams()
  const [step, setStep] = useState<Step>('form')
  const [exporting, setExporting] = useState(false)
  const [form, setForm] = useState<AgroForm>({
    clientId: '', ownArea: '', leasedArea: '', leaseValueHa: '',
    sojaArea: '', sojaProductivity: '58', sojaPrice: '118', sojaCostHa: '',
    milhoArea: '', milhoProductivity: '100', milhoPrice: '48', milhoCostHa: '',
    custeioBank: '', custeioValue: '', custeioRate: '12',
    investBank: '', investValue: '', investRate: '8',
    cprValue: '', cprBank: '',
    ownMachinery: true, propertyValue: '', machineryValue: '',
    hasInsurance: false, hasPlanning: false, hasFinancialControl: false
  })

  // Pré-seleciona cliente vindo do CRM
  useEffect(() => {
    const clientId = searchParams.get('clientId')
    if (clientId) {
      setForm(f => ({ ...f, clientId }))
    }
  }, [searchParams])

  const set = (k: keyof AgroForm, v: string | boolean) => setForm(f => ({ ...f, [k]: v }))
  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30 focus:border-af-green'
  const lbl = 'text-xs font-medium text-gray-600 mb-1 block'

  if (step === 'result') {
    const d = calcAgro(form)
    const client = clients.find(c => c.id === form.clientId)
    const classification = d.margin >= 20 && d.debtRatio < 40 ? 'saudavel' : d.margin >= 10 && d.debtRatio < 70 ? 'atencao' : d.margin >= 0 ? 'critico' : 'reestruturacao'

    const culturaData = [
      { name: 'Soja', receita: d.sojaRevenue, custo: d.sojaCost, resultado: d.sojaResult },
      { name: 'Milho 2ª', receita: d.milhoRevenue, custo: d.milhoCost, resultado: d.milhoResult },
    ]

    const points = [
      d.margin < 15 && `Margem da lavoura abaixo de 15% (atual: ${d.margin.toFixed(1)}%)`,
      d.debtRatio > 60 && `Endividamento equivale a ${d.debtRatio.toFixed(0)}% do patrimônio`,
      d.debtCoverage > 0.6 && 'Dívida compromete mais de 60% da receita anual',
      !form.hasInsurance && 'Produção sem seguro agrícola — risco climático sem cobertura',
      !form.hasPlanning && 'Ausência de planejamento de safra formalizado',
      d.sojaBreakeven > Number(form.sojaProductivity) * 0.9 && 'Ponto de equilíbrio da soja muito próximo da produtividade atual',
    ].filter(Boolean) as string[]

    const opportunities = [
      d.custeioDebt > 0 && 'Revisar custeio bancário: possível troca por linhas PRONAMP/MODERFROTA',
      d.leaseCost > d.totalRevenue * 0.2 && 'Custo de arrendamento elevado — renegociar preço ou reduzir área',
      !form.hasFinancialControl && 'Implantar DRE Rural e fluxo de caixa mensal',
      d.margin > 0 && 'Oportunidade de alongamento de dívida de custeio para investimento',
      'Análise de tradings para venda antecipada com melhor cotação',
    ].filter(Boolean) as string[]

    const handleExport = async () => {
      setExporting(true)
      try {
        await exportDiagnosticoAgro({
          clientName:    client?.name ?? 'Produtor',
          season:        '2024/2025',
          consultorName: user?.name ?? 'Consultor AF',
          city:          client?.city ?? '',
          state:         client?.state ?? 'MT',
          ownArea:       num(form.ownArea),
          leasedArea:    num(form.leasedArea),
          leaseValueHa:  num(form.leaseValueHa),
          cultures: [
            num(form.sojaArea) > 0 ? { culture: 'Soja', area: num(form.sojaArea), productivity: Number(form.sojaProductivity), price: Number(form.sojaPrice), costHa: num(form.sojaCostHa) } : null,
            num(form.milhoArea) > 0 ? { culture: 'Milho 2ª', area: num(form.milhoArea), productivity: Number(form.milhoProductivity), price: Number(form.milhoPrice), costHa: num(form.milhoCostHa) } : null,
          ].filter(Boolean) as any[],
          custeioValue: d.custeioDebt,
          custeioBank:  form.custeioBank,
          custeioRate:  Number(form.custeioRate),
          investValue:  d.investDebt,
          investBank:   form.investBank,
          investRate:   Number(form.investRate),
          cprValue:     d.cprDebt,
          cprBank:      form.cprBank,
          propertyValue:  num(form.propertyValue),
          machineryValue: num(form.machineryValue),
          hasInsurance:    form.hasInsurance,
          hasPlanning:     form.hasPlanning,
          hasFinancialCtrl:form.hasFinancialControl,
          classification,
          totalRevenue: d.totalRevenue,
          totalCost:    d.totalCost,
          margin:       d.margin,
          revenueHa:    d.revenueHa,
          actionPlans: points.map((p, i) => ({
            action: p, area: 'Operacional',
            priority: i === 0 ? 'imediata' : 'alta',
            deadline: i === 0 ? '15 dias' : '30 dias',
            status: 'nao_iniciado',
          })),
        })
      } finally {
        setExporting(false)
      }
    }

    return (
      <AppLayout title="Diagnóstico Agro 360°" subtitle={`Relatório gerado em ${new Date().toLocaleDateString('pt-BR')}`}>
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <span className="text-gray-400 text-sm">Diagnóstico Agro</span>
            <ChevronRight size={14} className="text-gray-300" />
            <span className="font-semibold text-gray-900">{client?.name ?? 'Produtor'}</span>
            <Badge variant={classification as any} />
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" icon={<RefreshCw size={14} />} onClick={() => setStep('form')}>Novo</Button>
            <Button icon={exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />} onClick={handleExport} disabled={exporting}>
              {exporting ? 'Gerando PDF...' : 'Exportar PDF'}
            </Button>
          </div>
        </div>

        {/* KPIs principais */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Área Total', value: `${d.totalArea.toLocaleString()} ha` },
            { label: 'Receita Total', value: fmtBRL(d.totalRevenue) },
            { label: 'Resultado Lavoura', value: fmtBRL(d.totalResult), neg: d.totalResult < 0 },
            { label: 'Margem da Safra', value: `${d.margin.toFixed(1)}%`, neg: d.margin < 10 },
          ].map(k => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.neg ? 'text-red-500' : 'text-gray-900'}`}>{k.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          {[
            { label: 'Resultado/Hectare', value: fmtBRL(d.resultHa), neg: d.resultHa < 0 },
            { label: 'Dívida Total', value: fmtBRL(d.totalDebt) },
            { label: 'Endividamento/Patrimônio', value: `${d.debtRatio.toFixed(0)}%`, neg: d.debtRatio > 60 },
          ].map(k => (
            <Card key={k.label} className="p-4">
              <p className="text-xs text-gray-500 mb-1">{k.label}</p>
              <p className={`text-xl font-bold ${k.neg ? 'text-red-500' : 'text-gray-900'}`}>{k.value}</p>
            </Card>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          {/* Culturas */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Resultado por Cultura</h3>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={culturaData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `${(v / 1000).toFixed(0)}k`} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Bar dataKey="receita" fill="#1B5E20" name="Receita" radius={[4, 4, 0, 0]} />
                <Bar dataKey="custo" fill="#F9A825" name="Custo" radius={[4, 4, 0, 0]} />
                <Bar dataKey="resultado" fill="#1565C0" name="Resultado" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="mt-4 space-y-3">
              {[
                { name: 'Soja', area: form.sojaArea, productivity: form.sojaProductivity, breakeven: d.sojaBreakeven.toFixed(1), result: d.sojaResult },
                { name: 'Milho 2ª', area: form.milhoArea, productivity: form.milhoProductivity, breakeven: '-', result: d.milhoResult },
              ].filter(r => num(r.area) > 0).map(r => (
                <div key={r.name} className="flex items-center justify-between text-sm p-2 bg-gray-50 rounded-lg">
                  <span className="font-medium text-gray-700">{r.name} — {r.area} ha</span>
                  <div className="flex gap-4 text-xs text-gray-500">
                    <span>Produt: {r.productivity} sc/ha</span>
                    {r.breakeven !== '-' && <span>PE: {r.breakeven} sc/ha</span>}
                    <span className={`font-semibold ${r.result < 0 ? 'text-red-500' : 'text-emerald-600'}`}>{fmtBRL(r.result)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>

          {/* Endividamento */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Estrutura de Endividamento</h3>
            <div className="space-y-3">
              {[
                { label: 'Custeio', value: d.custeioDebt, color: 'bg-amber-400', bank: form.custeioBank, rate: form.custeioRate },
                { label: 'Investimento', value: d.investDebt, color: 'bg-blue-500', bank: form.investBank, rate: form.investRate },
                { label: 'CPR', value: d.cprDebt, color: 'bg-purple-500', bank: form.cprBank, rate: '' },
              ].filter(r => r.value > 0).map(r => (
                <div key={r.label}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600">{r.label} {r.bank && `— ${r.bank}`} {r.rate && `(${r.rate}% a.a.)`}</span>
                    <span className="font-semibold">{fmtBRL(r.value)}</span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div className={`h-full ${r.color} rounded-full`} style={{ width: `${Math.min((r.value / d.totalDebt) * 100, 100)}%` }} />
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t flex justify-between text-sm font-bold">
                <span>Total</span><span className={d.debtCoverage > 0.6 ? 'text-red-500' : ''}>{fmtBRL(d.totalDebt)}</span>
              </div>
              <p className="text-xs text-gray-500">Comprometimento da receita: <span className={`font-semibold ${d.debtCoverage > 0.6 ? 'text-red-500' : 'text-gray-900'}`}>{(d.debtCoverage * 100).toFixed(0)}%</span></p>
            </div>
          </Card>
        </div>

        {/* Pontos e Oportunidades */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><AlertTriangle size={16} className="text-red-500" /> Pontos de Atenção</h3>
            <ul className="space-y-2">{points.map((p, i) => <li key={i} className="flex items-start gap-2 text-sm bg-red-50 rounded-lg px-3 py-2 text-gray-700"><span className="text-red-500 mt-0.5">•</span>{p}</li>)}</ul>
            {!points.length && <p className="text-sm text-emerald-600">Nenhum risco crítico identificado</p>}
          </Card>
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2"><TrendingUp size={16} className="text-af-green" /> Oportunidades</h3>
            <ul className="space-y-2">{opportunities.map((o, i) => <li key={i} className="flex items-start gap-2 text-sm bg-emerald-50 rounded-lg px-3 py-2 text-gray-700"><span className="text-emerald-600 mt-0.5">✓</span>{o}</li>)}</ul>
          </Card>
        </div>

        {/* Parecer */}
        <Card className="p-5 border-2 border-af-green/20 bg-af-green-pale/30">
          <h3 className="font-semibold text-af-green mb-2">Diagnóstico Agro 360° — AF Gestão & Consultoria</h3>
          <p className="text-sm text-gray-700 leading-relaxed">
            A propriedade de <strong>{d.totalArea.toLocaleString()} hectares</strong> apresenta receita projetada de <strong>{fmtBRL(d.totalRevenue)}</strong> na safra atual, com resultado operacional de <strong>{fmtBRL(d.totalResult)}</strong> e margem de <strong>{d.margin.toFixed(1)}%</strong>. O nível de endividamento está <strong>{d.debtRatio < 40 ? 'compatível com a capacidade patrimonial' : 'acima do recomendado para o porte da propriedade'}</strong>. A AF Gestão recomenda ação imediata em planejamento financeiro e estruturação de crédito para garantir a sustentabilidade da operação nas próximas safras.
          </p>
        </Card>
      </AppLayout>
    )
  }

  return (
    <AppLayout title="Diagnóstico Agro 360°" subtitle="Análise completa da propriedade rural">
      <div className="max-w-3xl mx-auto">
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <span className="p-2 bg-af-green-pale text-af-green rounded-xl"><Sprout size={20} /></span>
            <div>
              <h2 className="font-bold text-gray-900">Questionário Rural</h2>
              <p className="text-sm text-gray-500">Preencha os dados da propriedade para gerar o Diagnóstico Agro 360°</p>
            </div>
          </div>

          <div className="space-y-6">
            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">1. Produtor e Área</h3>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <label className={lbl}>Cliente *</label>
                  <select className={inp} value={form.clientId} onChange={e => set('clientId', e.target.value)}>
                    <option value="">Selecione o produtor...</option>
                    {clients.filter(c => c.segment === 'agro').map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div><label className={lbl}>Área Própria (ha)</label><input className={inp} value={form.ownArea} onChange={e => set('ownArea', e.target.value)} placeholder="Ex: 1200" /></div>
                <div><label className={lbl}>Área Arrendada (ha)</label><input className={inp} value={form.leasedArea} onChange={e => set('leasedArea', e.target.value)} placeholder="Ex: 600" /></div>
                <div className="col-span-2"><label className={lbl}>Valor do Arrendamento (R$/ha/ano)</label><input className={inp} value={form.leaseValueHa} onChange={e => set('leaseValueHa', e.target.value)} placeholder="Ex: 1800" /></div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">2. Produção — Soja (Safra Principal)</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Área plantada (ha)</label><input className={inp} value={form.sojaArea} onChange={e => set('sojaArea', e.target.value)} placeholder="Ex: 1800" /></div>
                <div><label className={lbl}>Produtividade esperada (sc/ha)</label><input className={inp} value={form.sojaProductivity} onChange={e => set('sojaProductivity', e.target.value)} /></div>
                <div><label className={lbl}>Cotação média (R$/sc)</label><input className={inp} value={form.sojaPrice} onChange={e => set('sojaPrice', e.target.value)} /></div>
                <div><label className={lbl}>Custo total/ha (R$)</label><input className={inp} value={form.sojaCostHa} onChange={e => set('sojaCostHa', e.target.value)} placeholder="Ex: 6500" /></div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">3. Produção — Milho 2ª Safra</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Área plantada (ha)</label><input className={inp} value={form.milhoArea} onChange={e => set('milhoArea', e.target.value)} placeholder="Ex: 1200" /></div>
                <div><label className={lbl}>Produtividade esperada (sc/ha)</label><input className={inp} value={form.milhoProductivity} onChange={e => set('milhoProductivity', e.target.value)} /></div>
                <div><label className={lbl}>Cotação média (R$/sc)</label><input className={inp} value={form.milhoPrice} onChange={e => set('milhoPrice', e.target.value)} /></div>
                <div><label className={lbl}>Custo total/ha (R$)</label><input className={inp} value={form.milhoCostHa} onChange={e => set('milhoCostHa', e.target.value)} placeholder="Ex: 2800" /></div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">4. Endividamento</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Banco (Custeio)</label><input className={inp} value={form.custeioBank} onChange={e => set('custeioBank', e.target.value)} placeholder="Ex: Sicoob" /></div>
                <div><label className={lbl}>Valor Custeio (R$)</label><input className={inp} value={form.custeioValue} onChange={e => set('custeioValue', e.target.value)} /></div>
                <div><label className={lbl}>Banco (Investimento)</label><input className={inp} value={form.investBank} onChange={e => set('investBank', e.target.value)} placeholder="Ex: BB" /></div>
                <div><label className={lbl}>Valor Investimento (R$)</label><input className={inp} value={form.investValue} onChange={e => set('investValue', e.target.value)} /></div>
                <div><label className={lbl}>CPR / Trading</label><input className={inp} value={form.cprBank} onChange={e => set('cprBank', e.target.value)} placeholder="Nome da trading" /></div>
                <div><label className={lbl}>Valor CPR (R$)</label><input className={inp} value={form.cprValue} onChange={e => set('cprValue', e.target.value)} /></div>
              </div>
            </section>

            <section>
              <h3 className="font-semibold text-gray-700 mb-3 pb-2 border-b">5. Patrimônio e Estrutura</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Valor Imóveis Rurais (R$)</label><input className={inp} value={form.propertyValue} onChange={e => set('propertyValue', e.target.value)} /></div>
                <div><label className={lbl}>Valor Máquinas/Equipamentos (R$)</label><input className={inp} value={form.machineryValue} onChange={e => set('machineryValue', e.target.value)} /></div>
              </div>
              <div className="mt-3 space-y-2">
                {([['hasInsurance', 'Possui seguro agrícola'], ['hasPlanning', 'Realiza planejamento de safra'], ['hasFinancialControl', 'Possui controle financeiro próprio']] as const).map(([k, l]) => (
                  <label key={k} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={form[k] as boolean} onChange={e => set(k, e.target.checked)} className="rounded" />
                    <span className="text-sm text-gray-700">{l}</span>
                  </label>
                ))}
              </div>
            </section>
          </div>

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" disabled={!form.clientId || !form.sojaArea} onClick={() => setStep('result')}>
              Gerar Diagnóstico Agro 360°
            </Button>
            <Button variant="secondary" onClick={() => setStep('form')}>Limpar</Button>
          </div>
        </Card>
      </div>
    </AppLayout>
  )
}
