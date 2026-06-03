import { useState } from 'react'
import { TrendingUp, TrendingDown, DollarSign, AlertTriangle } from 'lucide-react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  LineChart, Line, ComposedChart, ReferenceLine, Legend
} from 'recharts'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'

const cashFlowData = [
  { month: 'Jan', entradas: 85000, saidas: 72000, saldo: 13000 },
  { month: 'Fev', entradas: 92000, saidas: 88000, saldo: 4000 },
  { month: 'Mar', entradas: 78000, saidas: 91000, saldo: -13000 },
  { month: 'Abr', entradas: 105000, saidas: 82000, saldo: 23000 },
  { month: 'Mai', entradas: 98000, saidas: 95000, saldo: 3000 },
  { month: 'Jun', entradas: 120000, saidas: 88000, saldo: 32000 },
  { month: 'Jul', entradas: 88000, saidas: 102000, saldo: -14000 },
  { month: 'Ago', entradas: 95000, saidas: 87000, saldo: 8000 },
  { month: 'Set', entradas: 110000, saidas: 93000, saldo: 17000 },
  { month: 'Out', entradas: 125000, saidas: 98000, saldo: 27000 },
  { month: 'Nov', entradas: 132000, saidas: 105000, saldo: 27000 },
  { month: 'Dez', entradas: 98000, saidas: 88000, saldo: 10000 },
]

const dreData = {
  grossRevenue: 1200000, deductions: 108000, cmv: 480000,
  fixedExpenses: 240000, variableExpenses: 96000,
  financialExpenses: 48000, proLabore: 72000
}

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtK = (v: number) => `R$ ${(v / 1000).toFixed(0)}k`

type Tab = 'fluxo' | 'dre' | 'indicadores'

export function Financeiro() {
  const [tab, setTab] = useState<Tab>('fluxo')
  const [period, setPeriod] = useState('2024')

  const d = dreData
  const net = d.grossRevenue - d.deductions
  const grossProfit = net - d.cmv
  const ebitda = grossProfit - d.fixedExpenses - d.variableExpenses - d.proLabore
  const operatingProfit = ebitda - d.financialExpenses
  const grossMargin = (grossProfit / net) * 100
  const netMargin = (operatingProfit / d.grossRevenue) * 100
  const ebitdaMargin = (ebitda / d.grossRevenue) * 100

  const criticalMonths = cashFlowData.filter(m => m.saldo < 0)
  const totalInflow = cashFlowData.reduce((s, m) => s + m.entradas, 0)
  const totalOutflow = cashFlowData.reduce((s, m) => s + m.saidas, 0)

  const indicators = [
    { label: 'Margem Bruta', value: `${grossMargin.toFixed(1)}%`, status: grossMargin >= 40 ? 'ok' : grossMargin >= 25 ? 'warn' : 'bad', benchmark: '≥ 40%' },
    { label: 'Margem Líquida', value: `${netMargin.toFixed(1)}%`, status: netMargin >= 10 ? 'ok' : netMargin >= 5 ? 'warn' : 'bad', benchmark: '≥ 10%' },
    { label: 'EBITDA Margin', value: `${ebitdaMargin.toFixed(1)}%`, status: ebitdaMargin >= 15 ? 'ok' : ebitdaMargin >= 8 ? 'warn' : 'bad', benchmark: '≥ 15%' },
    { label: 'Ponto de Equilíbrio', value: fmtBRL((d.fixedExpenses + d.proLabore) / (grossMargin / 100)), status: 'info', benchmark: 'mensal' },
  ]

  return (
    <AppLayout title="Planejamento Financeiro" subtitle="DRE gerencial, fluxo de caixa e indicadores">
      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl w-fit mb-6">
        {(['fluxo', 'dre', 'indicadores'] as Tab[]).map(t => (
          <button key={t} onClick={() => setTab(t)} className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-colors ${tab === t ? 'bg-white shadow-sm text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {t === 'fluxo' ? 'Fluxo de Caixa' : t === 'dre' ? 'DRE Gerencial' : 'Indicadores'}
          </button>
        ))}
      </div>

      {tab === 'fluxo' && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <StatCard label="Total Entradas" value={fmtBRL(totalInflow)} icon={<TrendingUp size={18} />} color="green" />
            <StatCard label="Total Saídas" value={fmtBRL(totalOutflow)} icon={<TrendingDown size={18} />} color="gold" />
            <StatCard label="Saldo Acumulado" value={fmtBRL(totalInflow - totalOutflow)} icon={<DollarSign size={18} />} color={totalInflow > totalOutflow ? 'green' : 'red'} />
            <StatCard label="Meses Críticos" value={String(criticalMonths.length)} sub="saldo negativo" icon={<AlertTriangle size={18} />} color={criticalMonths.length > 0 ? 'red' : 'green'} />
          </div>

          <Card className="p-5 mb-4">
            <h3 className="font-semibold text-gray-900 mb-4">Fluxo de Caixa Mensal — {period}</h3>
            <ResponsiveContainer width="100%" height={280}>
              <ComposedChart data={cashFlowData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="month" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 10 }} tickFormatter={fmtK} />
                <Tooltip formatter={(v: number) => fmtBRL(v)} />
                <Legend />
                <ReferenceLine y={0} stroke="#DC2626" strokeDasharray="4 4" />
                <Bar dataKey="entradas" fill="#1B5E20" name="Entradas" radius={[2, 2, 0, 0]} opacity={0.8} />
                <Bar dataKey="saidas" fill="#F9A825" name="Saídas" radius={[2, 2, 0, 0]} opacity={0.8} />
                <Line type="monotone" dataKey="saldo" stroke="#1565C0" strokeWidth={2} dot={{ r: 3 }} name="Saldo" />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          {criticalMonths.length > 0 && (
            <Card className="p-4 border border-red-100 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle size={16} className="text-red-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-semibold text-red-800">Atenção — Meses com Saldo Negativo</p>
                  <p className="text-xs text-red-600 mt-1">
                    {criticalMonths.map(m => `${m.month} (${fmtBRL(m.saldo)})`).join(' | ')}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Recomendação: antecipar recebimentos ou estruturar capital de giro para esses períodos.</p>
                </div>
              </div>
            </Card>
          )}
        </>
      )}

      {tab === 'dre' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">DRE Gerencial — Anual {period}</h3>
            <div className="space-y-2">
              {[
                { label: 'Receita Bruta', value: d.grossRevenue, level: 0, bold: false },
                { label: '(–) Deduções e Impostos', value: -d.deductions, level: 1, bold: false },
                { label: '= Receita Líquida', value: net, level: 0, bold: true },
                { label: '(–) CMV / CPV', value: -d.cmv, level: 1, bold: false },
                { label: '= Lucro Bruto', value: grossProfit, level: 0, bold: true },
                { label: '(–) Despesas Fixas', value: -d.fixedExpenses, level: 1, bold: false },
                { label: '(–) Despesas Variáveis', value: -d.variableExpenses, level: 1, bold: false },
                { label: '(–) Pró-labore', value: -d.proLabore, level: 1, bold: false },
                { label: '= EBITDA', value: ebitda, level: 0, bold: true },
                { label: '(–) Despesas Financeiras', value: -d.financialExpenses, level: 1, bold: false },
                { label: '= Resultado Operacional', value: operatingProfit, level: 0, bold: true },
              ].map((row) => (
                <div key={row.label} className={`flex justify-between text-sm py-1.5 border-b border-gray-50 ${row.level === 1 ? 'pl-3' : ''}`}>
                  <span className={`${row.bold ? 'font-bold text-gray-900' : 'text-gray-600'}`}>{row.label}</span>
                  <span className={`${row.bold ? 'font-bold' : 'font-medium'} ${row.value < 0 ? 'text-red-500' : row.bold ? 'text-af-green' : 'text-gray-900'}`}>
                    {fmtBRL(row.value)}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-4">Composição dos Custos</h3>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={[
                  { name: 'CMV', value: d.cmv },
                  { name: 'Desp. Fixas', value: d.fixedExpenses },
                  { name: 'Pró-labore', value: d.proLabore },
                  { name: 'Desp. Variáveis', value: d.variableExpenses },
                  { name: 'Financeiras', value: d.financialExpenses },
                ]} layout="vertical">
                  <XAxis type="number" tick={{ fontSize: 10 }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={80} />
                  <Tooltip formatter={(v: number) => fmtBRL(v)} />
                  <Bar dataKey="value" fill="#1B5E20" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card className="p-4 bg-af-green-pale/40 border border-af-green/20">
              <h3 className="font-semibold text-af-green mb-2 text-sm">Resumo das Margens</h3>
              <div className="grid grid-cols-3 gap-2 text-center">
                {[['Bruta', grossMargin], ['EBITDA', ebitdaMargin], ['Líquida', netMargin]].map(([l, v]) => (
                  <div key={String(l)}>
                    <p className="text-xs text-gray-500">{l}</p>
                    <p className={`text-lg font-bold ${(v as number) < 5 ? 'text-red-500' : 'text-af-green'}`}>{(v as number).toFixed(1)}%</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      )}

      {tab === 'indicadores' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {indicators.map(ind => (
              <Card key={ind.label} className="p-5 flex items-center gap-4">
                <div className={`w-3 h-12 rounded-full ${ind.status === 'ok' ? 'bg-emerald-400' : ind.status === 'warn' ? 'bg-amber-400' : ind.status === 'bad' ? 'bg-red-400' : 'bg-blue-400'}`} />
                <div className="flex-1">
                  <p className="text-xs text-gray-500">{ind.label}</p>
                  <p className="text-2xl font-bold text-gray-900">{ind.value}</p>
                  <p className="text-xs text-gray-400">Referência: {ind.benchmark}</p>
                </div>
                <div className={`px-2 py-1 rounded-lg text-xs font-medium ${ind.status === 'ok' ? 'bg-emerald-50 text-emerald-700' : ind.status === 'warn' ? 'bg-amber-50 text-amber-700' : ind.status === 'bad' ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'}`}>
                  {ind.status === 'ok' ? 'Saudável' : ind.status === 'warn' ? 'Atenção' : ind.status === 'bad' ? 'Crítico' : 'Info'}
                </div>
              </Card>
            ))}
          </div>

          {/* Stress test */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Análise de Cenários — Stress Test</h3>
            <div className="grid grid-cols-3 gap-3">
              {[
                { name: 'Conservador', icon: '📉', pct: -15, color: 'bg-red-50 border-red-200' },
                { name: 'Base', icon: '📊', pct: 0, color: 'bg-gray-50 border-gray-200' },
                { name: 'Otimista', icon: '📈', pct: 20, color: 'bg-emerald-50 border-emerald-200' },
              ].map(s => {
                const adjRevenue = d.grossRevenue * (1 + s.pct / 100)
                const adjNet = adjRevenue - d.deductions
                const adjGrossProfit = adjNet - d.cmv
                const adjEbitda = adjGrossProfit - d.fixedExpenses - d.variableExpenses - d.proLabore
                const adjResult = adjEbitda - d.financialExpenses
                const adjMargin = adjRevenue > 0 ? (adjResult / adjRevenue) * 100 : 0
                return (
                  <div key={s.name} className={`rounded-xl border p-4 ${s.color}`}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-lg">{s.icon}</span>
                      <div>
                        <p className="font-semibold text-gray-900 text-sm">{s.name}</p>
                        <p className="text-xs text-gray-500">Receita {s.pct > 0 ? '+' : ''}{s.pct}%</p>
                      </div>
                    </div>
                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between"><span className="text-gray-500">Receita</span><span className="font-semibold">{fmtBRL(adjRevenue)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">EBITDA</span><span className={`font-semibold ${adjEbitda < 0 ? 'text-red-500' : ''}`}>{fmtBRL(adjEbitda)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Resultado</span><span className={`font-bold ${adjResult < 0 ? 'text-red-500' : 'text-emerald-700'}`}>{fmtBRL(adjResult)}</span></div>
                      <div className="flex justify-between"><span className="text-gray-500">Margem</span><span className={`font-bold ${adjMargin < 0 ? 'text-red-500' : ''}`}>{adjMargin.toFixed(1)}%</span></div>
                    </div>
                  </div>
                )
              })}
            </div>
          </Card>
        </div>
      )}
    </AppLayout>
  )
}
