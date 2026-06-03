import { useState } from 'react'
import { FileText, Download, Eye, Search, Filter, Loader2 } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'
import { Button } from '../components/ui/Button'
import { usePDF } from '../pdf/usePDF'

const docs = [
  { id: 1, name: 'Diagnóstico Financeiro — Fazenda São Pedro', type: 'Diagnóstico Agro', client: 'Fazenda São Pedro', date: '2024-06-01', size: '2.4 MB', status: 'Finalizado' },
  { id: 2, name: 'Proposta Comercial — Comércio Expresso', type: 'Proposta', client: 'Comércio Expresso', date: '2024-05-28', size: '1.1 MB', status: 'Enviado' },
  { id: 3, name: 'Contrato de Consultoria — Transportes Ágil', type: 'Contrato', client: 'Transportes Ágil', date: '2024-03-05', size: '856 KB', status: 'Assinado' },
  { id: 4, name: 'Relatório Mensal Maio — Agropecuária Vidal', type: 'Relatório Mensal', client: 'Agropecuária Vidal', date: '2024-05-31', size: '3.2 MB', status: 'Finalizado' },
  { id: 5, name: 'DRE Gerencial — Ind. Metálica Norte', type: 'DRE', client: 'Ind. Metálica Norte', date: '2024-05-15', size: '1.8 MB', status: 'Rascunho' },
  { id: 6, name: 'Plano de Ação 90 dias — Comércio Expresso', type: 'Plano de Ação', client: 'Comércio Expresso', date: '2024-05-10', size: '980 KB', status: 'Finalizado' },
]

const typeColors: Record<string, string> = {
  'Diagnóstico Agro': 'bg-green-100 text-green-800',
  'Proposta':         'bg-blue-100 text-blue-800',
  'Contrato':         'bg-purple-100 text-purple-800',
  'Relatório Mensal': 'bg-amber-100 text-amber-800',
  'DRE':              'bg-orange-100 text-orange-800',
  'Plano de Ação':    'bg-teal-100 text-teal-800',
}
const statusColors: Record<string, string> = {
  'Finalizado': 'text-emerald-600',
  'Enviado':    'text-blue-600',
  'Assinado':   'text-purple-600',
  'Rascunho':   'text-gray-500',
}

// Dados de demonstração para geração rápida de PDF
const DEMO_PJ = {
  clientName: 'Comércio Expresso Ltda', segment: 'Comércio', period: '2024',
  consultorName: 'Carlos Mendes',
  grossRevenue: 980000, deductions: 88200, cmv: 392000,
  fixedExpenses: 196000, variableExpenses: 78400, financialExpenses: 39200, proLabore: 48000,
  totalDebt: 320000, grossMargin: 44.5, netMargin: 13.8, ebitda: 177400, breakeven: 447000,
  classification: 'atencao',
  hasAccounting: true, hasERP: false, hasFinancialControl: false,
  actionPlans: [
    { action: 'Implantar controle de fluxo de caixa semanal', area: 'Financeiro', priority: 'imediata', deadline: '15 dias', status: 'em_andamento' },
    { action: 'Revisar precificação dos produtos principais', area: 'Comercial', priority: 'alta', deadline: '30 dias', status: 'nao_iniciado' },
    { action: 'Renegociar parcelamentos com fornecedores', area: 'Financeiro', priority: 'alta', deadline: '30 dias', status: 'nao_iniciado' },
  ],
}

const DEMO_AGRO = {
  clientName: 'Fazenda São Pedro', season: '2024/2025', consultorName: 'Ana Paula',
  city: 'Sorriso', state: 'MT',
  ownArea: 1200, leasedArea: 600, leaseValueHa: 1800,
  cultures: [
    { culture: 'Soja', area: 1800, productivity: 58, price: 118, costHa: 6500 },
    { culture: 'Milho 2ª', area: 1200, productivity: 100, price: 48, costHa: 2800 },
  ],
  custeioValue: 1200000, custeioBank: 'Sicoob', custeioRate: 12,
  investValue: 800000, investBank: 'BB', investRate: 8.5,
  cprValue: 350000, cprBank: 'Bunge',
  propertyValue: 8000000, machineryValue: 2500000,
  hasInsurance: false, hasPlanning: true, hasFinancialCtrl: false,
  classification: 'atencao',
  totalRevenue: 12372000, totalCost: 10134000, margin: 18.1, revenueHa: 6873,
  actionPlans: [
    { action: 'Renegociar custeio no Sicoob (12% → 9% a.a.)', area: 'Crédito Rural', priority: 'imediata', deadline: '15 dias', status: 'em_andamento' },
    { action: 'Contratar seguro agrícola para soja 24/25', area: 'Gestão de Riscos', priority: 'alta', deadline: '30 dias', status: 'concluido' },
    { action: 'Implantar DRE Rural e fluxo de caixa mensal', area: 'Financeiro', priority: 'alta', deadline: '60 dias', status: 'nao_iniciado' },
  ],
}

const DEMO_PROPOSTA = {
  clientName: 'Transportes Ágil S/A', clientDocument: '98.765.432/0001-11',
  clientCity: 'Rondonópolis/MT', segment: 'Serviços', consultorName: 'Ana Paula',
  plan: 'Consultoria Financeira Empresarial', monthlyValue: 3200, setupFee: 1500,
  description: 'Consultoria financeira estratégica com foco em organização financeira, controle de custos, estruturação de crédito e crescimento sustentável para empresas do setor de serviços.',
  services: [
    'Diagnóstico financeiro completo (DRE + Fluxo de Caixa)',
    'Implantação de controle financeiro gerencial',
    'Planejamento financeiro mensal com metas e indicadores',
    'Estruturação de crédito e negociação bancária',
    'Reunião mensal de acompanhamento com relatório executivo',
    'Suporte via WhatsApp (dias úteis)',
  ],
  deliverables: [
    'Relatório de Diagnóstico Financeiro (PDF)',
    'DRE Gerencial mensal atualizado',
    'Fluxo de Caixa projetado 12 meses',
    'Plano de Ação com 90 dias estruturado',
    'Dashboard de indicadores online',
    'Relatório executivo mensal',
  ],
  differentials: [
    'Equipe especializada em finanças empresariais',
    'Foco em resultado real e mensurável',
    'Análise de crédito rural e empresarial',
    'Suporte ativo — não apenas consultoria passiva',
  ],
}

type PDFType = 'pj' | 'agro' | 'proposta'

export function Documentos() {
  const { exportDiagnosticoPJ, exportDiagnosticoAgro, exportProposta } = usePDF()
  const [exporting, setExporting] = useState<PDFType | null>(null)
  const [search, setSearch] = useState('')

  const handleExport = async (type: PDFType) => {
    setExporting(type)
    try {
      if (type === 'pj')      await exportDiagnosticoPJ(DEMO_PJ)
      if (type === 'agro')    await exportDiagnosticoAgro(DEMO_AGRO)
      if (type === 'proposta') await exportProposta(DEMO_PROPOSTA)
    } finally {
      setExporting(null)
    }
  }

  const filtered = docs.filter(d =>
    d.name.toLowerCase().includes(search.toLowerCase()) ||
    d.client.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <AppLayout title="Gestão de Documentos" subtitle="Geração automática de documentos, propostas e relatórios">
      {/* Geração rápida de PDF */}
      <Card className="p-5 mb-6 border-2 border-af-green/20 bg-af-green-pale/20">
        <h2 className="font-semibold text-gray-900 mb-1">Gerar Documento PDF</h2>
        <p className="text-xs text-gray-500 mb-4">Clique para gerar e baixar imediatamente com dados de demonstração</p>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {([
            { type: 'pj'      as PDFType, icon: '🏢', label: 'Diagnóstico Empresarial', sub: 'Comércio Expresso Ltda', color: 'hover:border-blue-300 hover:bg-blue-50' },
            { type: 'agro'    as PDFType, icon: '🌾', label: 'Diagnóstico Agro 360°',   sub: 'Fazenda São Pedro', color: 'hover:border-green-300 hover:bg-green-50' },
            { type: 'proposta'as PDFType, icon: '📋', label: 'Proposta Comercial',       sub: 'Transportes Ágil S/A', color: 'hover:border-purple-300 hover:bg-purple-50' },
          ]).map(item => (
            <button
              key={item.type}
              onClick={() => handleExport(item.type)}
              disabled={exporting !== null}
              className={`text-left p-4 rounded-xl border-2 border-gray-100 bg-white transition-all disabled:opacity-50 ${item.color}`}
            >
              <div className="flex items-start justify-between mb-2">
                <span className="text-2xl">{item.icon}</span>
                {exporting === item.type
                  ? <Loader2 size={16} className="animate-spin text-af-green mt-1" />
                  : <Download size={15} className="text-gray-400 mt-1" />
                }
              </div>
              <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
              <p className="text-xs text-af-green font-medium mt-2">
                {exporting === item.type ? 'Gerando PDF...' : '↓ Baixar PDF'}
              </p>
            </button>
          ))}
        </div>
      </Card>

      {/* Outros templates */}
      <div className="mb-6">
        <h2 className="font-semibold text-gray-900 mb-3">Outros Templates</h2>
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {[
            { label: 'Contrato', icon: '📝', desc: 'Contrato padrão AF' },
            { label: 'Relatório Mensal', icon: '📊', desc: 'Acompanhamento mensal' },
            { label: 'Fluxo de Caixa', icon: '💸', desc: 'DFC projetado' },
            { label: 'DRE Gerencial', icon: '📈', desc: 'DRE mensal/anual' },
            { label: 'Plano de Ação', icon: '🎯', desc: 'Roadmap 90 dias' },
            { label: 'Relatório Agro', icon: '🌱', desc: 'Relatório de safra' },
          ].map(t => (
            <button key={t.label} className="bg-white border border-gray-100 hover:border-af-green/30 hover:bg-af-green-pale/30 rounded-xl p-4 text-left transition-all group">
              <span className="text-2xl">{t.icon}</span>
              <p className="text-sm font-semibold text-gray-800 mt-2 group-hover:text-af-green">{t.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{t.desc}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Lista de documentos */}
      <Card>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-900">Documentos Recentes</h3>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5">
              <Search size={13} className="text-gray-400" />
              <input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Buscar..."
                className="bg-transparent text-sm outline-none w-32"
              />
            </div>
            <Button variant="secondary" size="sm" icon={<Filter size={13} />}>Filtrar</Button>
          </div>
        </div>
        <div className="divide-y divide-gray-50">
          {filtered.map(doc => (
            <div key={doc.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-gray-50/50 transition-colors group">
              <span className="p-2 bg-gray-100 rounded-xl text-gray-400 shrink-0">
                <FileText size={18} />
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{doc.name}</p>
                <p className="text-xs text-gray-400">
                  {doc.client} · {new Date(doc.date).toLocaleDateString('pt-BR')} · {doc.size}
                </p>
              </div>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${typeColors[doc.type] ?? 'bg-gray-100 text-gray-600'}`}>
                {doc.type}
              </span>
              <span className={`text-xs font-medium shrink-0 ${statusColors[doc.status]}`}>
                {doc.status}
              </span>
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Eye size={14} /></button>
                <button className="p-1.5 hover:bg-gray-100 rounded-lg text-gray-500"><Download size={14} /></button>
              </div>
            </div>
          ))}
        </div>
        <div className="px-5 py-3 border-t text-xs text-gray-400">{filtered.length} documentos</div>
      </Card>
    </AppLayout>
  )
}
