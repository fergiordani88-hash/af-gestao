import { Document, Page, View, Text } from '@react-pdf/renderer'
import {
  base, colors, PDFHeader, PDFFooter, KPIBox, DRERow, ActionItem
} from './components/Base'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`
const today  = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export interface DiagPJData {
  clientName:      string
  segment:         string
  period:          string
  consultorName:   string
  grossRevenue:    number
  deductions:      number
  cmv:             number
  fixedExpenses:   number
  variableExpenses:number
  financialExpenses:number
  proLabore:       number
  totalDebt:       number
  grossMargin:     number
  netMargin:       number
  ebitda:          number
  breakeven:       number
  classification:  string
  hasAccounting:   boolean
  hasERP:          boolean
  hasFinancialControl: boolean
  actionPlans?: Array<{ action: string; area: string; priority: string; deadline: string; status: string }>
}

const classLabel: Record<string, { label: string; color: string }> = {
  saudavel:       { label: 'Financeiramente Saudável', color: colors.green },
  atencao:        { label: 'Atenção', color: colors.amber },
  critico:        { label: 'Situação Crítica', color: '#E64A19' },
  reestruturacao: { label: 'Reestruturação Urgente', color: colors.red },
}

export function DiagnosticoPJPDF({ data }: { data: DiagPJData }) {
  const net         = data.grossRevenue - data.deductions
  const grossProfit = net - data.cmv
  const ebitda      = data.ebitda
  const result      = ebitda - data.financialExpenses
  const cls         = classLabel[data.classification] ?? classLabel.atencao
  const debtRatio   = data.grossRevenue > 0 ? (data.totalDebt / data.grossRevenue) * 100 : 0

  const strengths = [
    data.grossMargin >= 40  && 'Margem bruta saudável — boa eficiência no custo do produto',
    data.netMargin  >= 10   && 'Margem líquida acima de 10% — empresa lucrativa',
    debtRatio       < 30    && 'Endividamento controlado — baixo comprometimento da receita',
    data.hasAccounting      && 'Contabilidade atualizada — boa base para decisões',
    data.hasFinancialControl&& 'Controle financeiro implantado',
  ].filter(Boolean) as string[]

  const risks = [
    data.netMargin  < 5     && `Margem líquida baixa (${fmtPct(data.netMargin)}) — risco de insolvência`,
    data.grossMargin< 30    && `Margem bruta reduzida (${fmtPct(data.grossMargin)}) — revisar CMV e precificação`,
    debtRatio       > 60    && `Endividamento elevado (${fmtPct(debtRatio)} da receita) — risco ao caixa`,
    ebitda          < 0     && 'EBITDA negativo — geração de caixa insuficiente para sustentar a operação',
    !data.hasFinancialControl && 'Ausência de controle financeiro — decisões sem base de dados',
    !data.hasAccounting     && 'Contabilidade desatualizada — impossibilidade de análise precisa',
  ].filter(Boolean) as string[]

  return (
    <Document title={`Diagnóstico PJ — ${data.clientName}`} author="AF Gestão & Consultoria">
      {/* ── Página 1: Capa + DRE ── */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Diagnóstico Empresarial"
          subtitle={`Período: ${data.period}`}
          clientName={data.clientName}
          date={today()}
        />

        <View style={base.body}>
          {/* Classificação */}
          <View style={{ ...base.card, backgroundColor: colors.dark, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#FFFFFF80', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Classificação da Empresa
                </Text>
                <Text style={{ color: cls.color, fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {cls.label}
                </Text>
                <Text style={{ color: '#FFFFFF60', fontSize: 8, marginTop: 4 }}>
                  Consultor: {data.consultorName} · Segmento: {data.segment}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#FFFFFF60', fontSize: 7.5 }}>Ponto de Equilíbrio</Text>
                <Text style={{ color: colors.gold, fontSize: 14, fontWeight: 700 }}>
                  {fmtBRL(data.breakeven)}
                </Text>
                <Text style={{ color: '#FFFFFF60', fontSize: 7 }}>/mês</Text>
              </View>
            </View>
          </View>

          {/* KPIs */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Indicadores Principais</Text>
            <View style={{ ...base.row, flexWrap: 'wrap' }}>
              <KPIBox label="Receita Bruta" value={fmtBRL(data.grossRevenue)} />
              <KPIBox label="Margem Bruta"  value={fmtPct(data.grossMargin)} color={data.grossMargin >= 30 ? 'green' : 'red'} />
              <KPIBox label="EBITDA"        value={fmtBRL(ebitda)} color={ebitda >= 0 ? 'green' : 'red'} />
              <KPIBox label="Margem Líquida" value={fmtPct(data.netMargin)} color={data.netMargin >= 5 ? 'green' : 'red'} />
            </View>
            <View style={{ ...base.row, marginTop: 8 }}>
              <KPIBox label="Dívida Total"      value={fmtBRL(data.totalDebt)} color={debtRatio > 60 ? 'red' : 'default'} />
              <KPIBox label="Endividamento/Rec." value={fmtPct(debtRatio)} color={debtRatio > 60 ? 'red' : 'green'} />
              <KPIBox label="Resultado"          value={fmtBRL(result)} color={result >= 0 ? 'green' : 'red'} />
              <KPIBox label="Ponto de Equilíbrio" value={fmtBRL(data.breakeven)} />
            </View>
          </View>

          {/* DRE */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>DRE Gerencial</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                <Text style={{ ...base.tableHeaderCell, flex: 2 }}>Demonstrativo</Text>
                <Text style={{ ...base.tableHeaderCell, textAlign: 'right' }}>Valor (R$)</Text>
                <Text style={{ ...base.tableHeaderCell, textAlign: 'right' }}>% Receita</Text>
              </View>
              {[
                ['Receita Bruta',                  data.grossRevenue,  100,   false, false],
                ['(–) Deduções e Impostos',         -(data.grossRevenue - net), (data.grossRevenue - net) / data.grossRevenue * 100, true, true],
                ['= Receita Líquida',               net,                net / data.grossRevenue * 100, false, false],
                ['(–) CMV / CPV',                  -data.cmv,          data.cmv / data.grossRevenue * 100, true, true],
                ['= Lucro Bruto',                  grossProfit,        data.grossMargin, false, false],
                ['(–) Despesas Fixas',             -data.fixedExpenses, data.fixedExpenses / data.grossRevenue * 100, true, true],
                ['(–) Despesas Variáveis',         -data.variableExpenses, data.variableExpenses / data.grossRevenue * 100, true, true],
                ['(–) Pró-labore',                 -data.proLabore,    data.proLabore / data.grossRevenue * 100, true, true],
                ['= EBITDA',                       ebitda,             ebitda / data.grossRevenue * 100, false, false],
                ['(–) Despesas Financeiras',       -data.financialExpenses, data.financialExpenses / data.grossRevenue * 100, true, true],
                ['= Resultado Operacional',        result,             data.netMargin, false, false],
              ].map(([label, value, pct, indent, neg], i) => (
                <View key={i} style={{
                  ...base.tableRow,
                  ...(i % 2 === 0 ? base.tableRowAlt : {}),
                  backgroundColor: String(label).startsWith('=') ? colors.greenPale : i % 2 === 0 ? colors.gray : colors.white,
                }}>
                  <Text style={{ ...base.tableCell, flex: 2, fontWeight: String(label).startsWith('=') ? 700 : 400, paddingLeft: indent ? 10 : 0 }}>{String(label)}</Text>
                  <Text style={{ ...base.tableCell, textAlign: 'right', color: neg ? colors.red : String(label).startsWith('=') ? colors.green : colors.dark, fontWeight: String(label).startsWith('=') ? 700 : 400 }}>
                    {fmtBRL(Number(value))}
                  </Text>
                  <Text style={{ ...base.tableCell, textAlign: 'right', color: colors.grayMid }}>
                    {Number(pct).toFixed(1)}%
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>

      {/* ── Página 2: Diagnóstico + Plano de Ação ── */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Diagnóstico Empresarial"
          subtitle="Análise e Plano de Ação"
          clientName={data.clientName}
          date={today()}
        />

        <View style={base.body}>
          {/* Pontos fortes */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Pontos Fortes</Text>
            {strengths.length > 0 ? strengths.map((s, i) => (
              <View key={i} style={{ flexDirection: 'row', gap: 6, marginBottom: 4 }}>
                <Text style={{ color: colors.green, fontSize: 9, marginTop: 1 }}>✓</Text>
                <Text style={base.body1}>{s}</Text>
              </View>
            )) : <Text style={{ ...base.body2, color: colors.grayMid }}>Nenhum ponto forte identificado neste período.</Text>}
          </View>

          {/* Riscos */}
          <View style={base.section}>
            <Text style={{ ...base.sectionTitle, color: colors.red, borderBottomColor: colors.red }}>
              Pontos de Atenção e Riscos
            </Text>
            {risks.length > 0 ? risks.map((r, i) => (
              <View key={i} style={{ ...base.cardRed, flexDirection: 'row', gap: 6, padding: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.red, fontSize: 9 }}>•</Text>
                <Text style={{ ...base.body1, flex: 1 }}>{r}</Text>
              </View>
            )) : <Text style={{ ...base.body2, color: colors.green }}>Nenhum risco crítico identificado.</Text>}
          </View>

          {/* Controles */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Controles Internos</Text>
            <View style={base.row}>
              {[
                ['Contabilidade Atualizada', data.hasAccounting],
                ['Sistema ERP / Gestão',     data.hasERP],
                ['Controle de Caixa',         data.hasFinancialControl],
              ].map(([label, ok]) => (
                <View key={String(label)} style={{ ...base.card, flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginBottom: 4 }}>{ok ? '✅' : '❌'}</Text>
                  <Text style={{ ...base.label, textAlign: 'center' }}>{String(label)}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: ok ? colors.green : colors.red }}>
                    {ok ? 'Implantado' : 'Ausente'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Plano de Ação */}
          {data.actionPlans && data.actionPlans.length > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Plano de Ação</Text>
              <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4, gap: 8 }}>
                <Text style={{ ...base.label, flex: 1 }}>Ação</Text>
                <Text style={{ ...base.label, minWidth: 48 }}>Prioridade</Text>
                <Text style={{ ...base.label, minWidth: 52 }}>Prazo</Text>
                <Text style={{ ...base.label, minWidth: 70 }}>Status</Text>
              </View>
              {data.actionPlans.map((a, i) => (
                <ActionItem key={i} {...a} idx={i} />
              ))}
            </View>
          )}

          {/* Roadmap 90 dias */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Roadmap 90 Dias — AF Gestão</Text>
            <View style={base.row}>
              {[
                { period: '0–15 dias', color: colors.red, items: ['Mapear todas as dívidas', 'Levantar fluxo de caixa', 'Identificar vazamentos financeiros'] },
                { period: '15–30 dias', color: colors.amber, items: ['Revisar precificação', 'Implantar controle financeiro', 'Negociar com fornecedores'] },
                { period: '30–60 dias', color: colors.blue, items: ['Estruturar crédito bancário', 'DRE gerencial mensal', 'Treinamento da equipe'] },
                { period: '60–90 dias', color: colors.green, items: ['Revisão de metas', 'Estratégia de crescimento', 'Governança financeira'] },
              ].map(col => (
                <View key={col.period} style={{ flex: 1, borderTopWidth: 3, borderTopColor: col.color, padding: 8, backgroundColor: colors.gray, borderRadius: 4 }}>
                  <Text style={{ fontSize: 7.5, fontWeight: 700, color: col.color, marginBottom: 6 }}>{col.period}</Text>
                  {col.items.map((item, i) => (
                    <View key={i} style={{ flexDirection: 'row', gap: 4, marginBottom: 3 }}>
                      <Text style={{ fontSize: 7, color: colors.grayMid }}>›</Text>
                      <Text style={{ fontSize: 7, color: colors.grayDark, flex: 1 }}>{item}</Text>
                    </View>
                  ))}
                </View>
              ))}
            </View>
          </View>

          {/* Parecer */}
          <View style={{ ...base.cardGreen, padding: 14 }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: colors.green, marginBottom: 6 }}>
              Parecer Consultivo — AF Gestão & Consultoria
            </Text>
            <Text style={base.body1}>
              Com base na análise financeira realizada, a empresa {data.clientName} apresenta receita bruta de {fmtBRL(data.grossRevenue)}, com margem líquida de {fmtPct(data.netMargin)} e EBITDA de {fmtBRL(ebitda)}. A classificação atual é "{cls.label}". {risks.length > 0 ? `Foram identificados ${risks.length} pontos críticos que requerem ação imediata.` : 'A empresa demonstra solidez operacional.'} A AF Gestão & Consultoria está comprometida em transformar esses indicadores em decisões estratégicas que geram resultado real e crescimento sustentável.
            </Text>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>
    </Document>
  )
}
