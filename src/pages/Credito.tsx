import { useState } from 'react'
import { CreditCard, Calculator, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { useStore } from '../store/useStore'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const creditLines = [
  { name: 'PRONAMP', rate: 7, maxValue: 1500000, type: 'Agro Custeio', color: 'bg-green-50 text-green-700' },
  { name: 'PRONAF', rate: 4.5, maxValue: 500000, type: 'Agricultura Familiar', color: 'bg-emerald-50 text-emerald-700' },
  { name: 'MODERFROTA', rate: 8.5, maxValue: 5000000, type: 'Máquinas Agrícolas', color: 'bg-blue-50 text-blue-700' },
  { name: 'FCO Empresarial', rate: 8, maxValue: 10000000, type: 'Empresas CO', color: 'bg-purple-50 text-purple-700' },
  { name: 'BNDES Finame', rate: 9, maxValue: 20000000, type: 'Equipamentos', color: 'bg-orange-50 text-orange-700' },
  { name: 'Capital de Giro', rate: 18, maxValue: 2000000, type: 'Empresarial', color: 'bg-amber-50 text-amber-700' },
]

function Simulator() {
  const [sim, setSim] = useState({ value: '500000', rate: '9', term: '60', monthlyRevenue: '100000' })
  const set = (k: string, v: string) => setSim(s => ({ ...s, [k]: v }))

  const value = Number(sim.value.replace(/\D/g, '')) || 0
  const rate = Number(sim.rate) / 100 / 12
  const term = Number(sim.term) || 1
  const monthlyRevenue = Number(sim.monthlyRevenue.replace(/\D/g, '')) || 1

  const pmt = rate > 0 ? value * (rate * Math.pow(1 + rate, term)) / (Math.pow(1 + rate, term) - 1) : value / term
  const totalPaid = pmt * term
  const totalInterest = totalPaid - value
  const commitment = (pmt / monthlyRevenue) * 100
  const capacityOk = commitment <= 30

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30'
  const lbl = 'text-xs font-medium text-gray-600 mb-1 block'

  return (
    <Card className="p-5">
      <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calculator size={16} /> Simulador de Crédito</h3>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div><label className={lbl}>Valor Solicitado (R$)</label><input className={inp} value={sim.value} onChange={e => set('value', e.target.value)} /></div>
        <div><label className={lbl}>Taxa de Juros (% a.a.)</label><input className={inp} value={sim.rate} onChange={e => set('rate', e.target.value)} /></div>
        <div><label className={lbl}>Prazo (meses)</label><input className={inp} value={sim.term} onChange={e => set('term', e.target.value)} /></div>
        <div><label className={lbl}>Receita Mensal (R$)</label><input className={inp} value={sim.monthlyRevenue} onChange={e => set('monthlyRevenue', e.target.value)} /></div>
      </div>
      {value > 0 && (
        <div className="space-y-2 pt-4 border-t">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: 'Parcela Mensal', value: fmtBRL(pmt), highlight: true },
              { label: 'Total Pago', value: fmtBRL(totalPaid) },
              { label: 'Total de Juros', value: fmtBRL(totalInterest) },
              { label: 'Comprometimento', value: `${commitment.toFixed(1)}%` },
            ].map(k => (
              <div key={k.label} className={`p-3 rounded-xl ${k.highlight ? 'bg-af-green text-white' : 'bg-gray-50'}`}>
                <p className={`text-xs ${k.highlight ? 'text-white/70' : 'text-gray-500'}`}>{k.label}</p>
                <p className={`text-lg font-bold ${k.highlight ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
              </div>
            ))}
          </div>
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm mt-2 ${capacityOk ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {capacityOk ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {capacityOk
              ? `Capacidade de pagamento adequada (comprometimento de ${commitment.toFixed(0)}% da receita — abaixo do limite de 30%)`
              : `Atenção: comprometimento de ${commitment.toFixed(0)}% da receita — acima do limite de 30% recomendado`
            }
          </div>
        </div>
      )}
    </Card>
  )
}

export function Credito() {
  const { clients } = useStore()
  const [selectedLine, setSelectedLine] = useState<string | null>(null)

  return (
    <AppLayout title="Estruturação de Crédito" subtitle="Linhas de crédito, simulador e análise de capacidade">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <StatCard label="Operações Ativas" value="5" icon={<CreditCard size={18} />} color="green" />
        <StatCard label="Volume Contratado" value="R$ 4,2M" icon={<TrendingUp size={18} />} color="gold" />
        <StatCard label="Parcela Mensal Total" value="R$ 87k" icon={<CreditCard size={18} />} color="blue" />
        <StatCard label="Taxa Média" value="10,3% a.a." icon={<TrendingUp size={18} />} color="purple" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Simulador */}
        <div className="lg:col-span-2 space-y-4">
          <Simulator />

          {/* Linhas disponíveis */}
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Linhas de Crédito Recomendadas</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {creditLines.map(line => (
                <button
                  key={line.name}
                  onClick={() => setSelectedLine(selectedLine === line.name ? null : line.name)}
                  className={`text-left p-3 rounded-xl border transition-all ${selectedLine === line.name ? 'border-af-green bg-af-green-pale' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${line.color}`}>{line.type}</span>
                    <span className="text-sm font-bold text-af-green">{line.rate}% a.a.</span>
                  </div>
                  <p className="text-sm font-semibold text-gray-900">{line.name}</p>
                  <p className="text-xs text-gray-500">Até {fmtBRL(line.maxValue)}</p>
                </button>
              ))}
            </div>
          </Card>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Checklist para Crédito</h3>
            <div className="space-y-2">
              {[
                { item: 'Documentos pessoais (RG/CPF)', done: true },
                { item: 'Comprovante de renda / faturamento', done: true },
                { item: 'Balanço patrimonial', done: false },
                { item: 'Extratos bancários 6 meses', done: true },
                { item: 'Certidões negativas', done: false },
                { item: 'Matrícula do imóvel (garantia)', done: false },
                { item: 'ITR / CCIR (imóvel rural)', done: true },
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-2 text-sm">
                  <span className={`shrink-0 ${item.done ? 'text-emerald-500' : 'text-gray-300'}`}>
                    {item.done ? '✓' : '○'}
                  </span>
                  <span className={item.done ? 'text-gray-700' : 'text-gray-400'}>{item.item}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 text-xs text-gray-500 bg-gray-50 rounded-lg p-2">
              4 de 7 itens completos
              <div className="mt-1 h-1.5 bg-gray-200 rounded-full"><div className="h-full bg-af-green rounded-full" style={{ width: '57%' }} /></div>
            </div>
          </Card>

          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Análise Rápida de Perfil</h3>
            <div className="space-y-3">
              {[
                { label: 'Score de Crédito', value: 'B+', desc: 'Bom — poucas restrições', color: 'text-emerald-600' },
                { label: 'Capacidade de Pagamento', value: '28%', desc: 'Comprometimento atual', color: 'text-emerald-600' },
                { label: 'Garantias Disponíveis', value: 'R$ 3,2M', desc: 'Imóveis + máquinas', color: 'text-af-green' },
                { label: 'Restrição SFN', value: 'Nenhuma', desc: 'Cadastro limpo', color: 'text-emerald-600' },
              ].map(item => (
                <div key={item.label} className="flex justify-between items-start text-sm py-2 border-b border-gray-50 last:border-0">
                  <div><p className="text-gray-600">{item.label}</p><p className="text-xs text-gray-400">{item.desc}</p></div>
                  <span className={`font-bold ${item.color}`}>{item.value}</span>
                </div>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </AppLayout>
  )
}
