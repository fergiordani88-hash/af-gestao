import { Document, Page, View, Text } from '@react-pdf/renderer'
import { base, colors, PDFHeader, PDFFooter, KPIBox, ActionItem } from './components/Base'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`
const today  = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export interface Culture {
  culture: string
  area: number
  productivity: number
  price: number
  costHa: number
}

export interface DiagAgroData {
  clientName:    string
  season:        string
  consultorName: string
  city:          string
  state:         string

  ownArea:       number
  leasedArea:    number
  leaseValueHa:  number
  cultures:      Culture[]

  custeioValue:  number
  custeioBank:   string
  custeioRate:   number
  investValue:   number
  investBank:    string
  investRate:    number
  cprValue:      number
  cprBank:       string

  propertyValue:  number
  machineryValue: number

  hasInsurance:    boolean
  hasPlanning:     boolean
  hasFinancialCtrl:boolean

  classification: string
  totalRevenue:   number
  totalCost:      number
  margin:         number
  revenueHa:      number

  actionPlans?: Array<{ action: string; area: string; priority: string; deadline: string; status: string }>
}

const classLabel: Record<string, { label: string; color: string }> = {
  saudavel:       { label: 'Propriedade Saudável', color: colors.green },
  atencao:        { label: 'Atenção', color: colors.amber },
  critico:        { label: 'Situação Crítica', color: '#E64A19' },
  reestruturacao: { label: 'Reestruturação Urgente', color: colors.red },
}

export function DiagnosticoAgroPDF({ data }: { data: DiagAgroData }) {
  const totalArea   = data.ownArea + data.leasedArea
  const leaseCost   = data.leasedArea * data.leaseValueHa
  const totalResult = data.totalRevenue - data.totalCost
  const resultHa    = totalArea > 0 ? totalResult / totalArea : 0
  const totalDebt   = data.custeioValue + data.investValue + data.cprValue
  const patrimony   = data.propertyValue + data.machineryValue
  const debtRatio   = patrimony > 0 ? (totalDebt / patrimony) * 100 : 0
  const debtCoverage = data.totalRevenue > 0 ? (totalDebt / data.totalRevenue) * 100 : 0
  const cls = classLabel[data.classification] ?? classLabel.atencao

  const culturesCalc = data.cultures.map(c => {
    const revenue = c.area * c.productivity * c.price
    const cost    = c.area * c.costHa
    const result  = revenue - cost
    const margin  = revenue > 0 ? (result / revenue) * 100 : 0
    const breakeven = c.price > 0 ? c.costHa / c.price : 0
    return { ...c, revenue, cost, result, margin, breakeven }
  })

  const risks = [
    data.margin < 15   && `Margem da lavoura baixa (${fmtPct(data.margin)}) — operação próxima do limite`,
    debtRatio > 60     && `Endividamento representa ${fmtPct(debtRatio)} do patrimônio`,
    debtCoverage > 60  && `Dívida compromete ${fmtPct(debtCoverage)} da receita anual`,
    !data.hasInsurance && 'Produção sem seguro agrícola — risco climático descoberto',
    !data.hasPlanning  && 'Ausência de planejamento formal de safra',
    !data.hasFinancialCtrl && 'Sem controle financeiro — decisões sem base de dados',
  ].filter(Boolean) as string[]

  const opportunities = [
    data.custeioValue > 0   && 'Revisar linhas de custeio — possível acesso ao PRONAMP (7% a.a.)',
    leaseCost > data.totalRevenue * 0.2 && 'Custo de arrendamento elevado — renegociar ou reduzir área',
    !data.hasFinancialCtrl  && 'Implantar DRE Rural e fluxo de caixa mensal',
    data.margin > 0 && data.margin < 20 && 'Potencial de melhora de margem com gestão de insumos',
    'Analisar estratégia de venda antecipada (hedge) para proteger preços',
  ].filter(Boolean) as string[]

  return (
    <Document title={`Diagnóstico Agro 360° — ${data.clientName}`} author="AF Gestão & Consultoria">
      {/* ── Página 1: Capa + Produção ── */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Diagnóstico Agro 360°"
          subtitle={`Safra ${data.season} · ${data.city}/${data.state}`}
          clientName={data.clientName}
          date={today()}
        />

        <View style={base.body}>
          {/* Classificação */}
          <View style={{ ...base.card, backgroundColor: colors.dark, marginBottom: 16 }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <View>
                <Text style={{ color: '#FFFFFF80', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Classificação da Propriedade
                </Text>
                <Text style={{ color: cls.color, fontSize: 16, fontWeight: 700, marginTop: 4 }}>
                  {cls.label}
                </Text>
                <Text style={{ color: '#FFFFFF60', fontSize: 8, marginTop: 4 }}>
                  Consultor: {data.consultorName} · Safra: {data.season}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={{ color: '#FFFFFF60', fontSize: 7.5 }}>Área Total</Text>
                <Text style={{ color: colors.gold, fontSize: 18, fontWeight: 700 }}>
                  {totalArea.toLocaleString('pt-BR')} ha
                </Text>
                <Text style={{ color: '#FFFFFF60', fontSize: 7 }}>
                  {data.ownArea.toLocaleString()}ha própria + {data.leasedArea.toLocaleString()}ha arrendada
                </Text>
              </View>
            </View>
          </View>

          {/* KPIs produção */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Resultado da Safra</Text>
            <View style={base.row}>
              <KPIBox label="Receita Total"    value={fmtBRL(data.totalRevenue)} color="green" />
              <KPIBox label="Custo Total"      value={fmtBRL(data.totalCost)} color={data.totalCost > data.totalRevenue ? 'red' : 'default'} />
              <KPIBox label="Resultado"        value={fmtBRL(totalResult)} color={totalResult >= 0 ? 'green' : 'red'} />
              <KPIBox label="Margem da Safra"  value={fmtPct(data.margin)} color={data.margin >= 15 ? 'green' : 'red'} />
            </View>
            <View style={{ ...base.row, marginTop: 8 }}>
              <KPIBox label="Receita/ha"    value={`R$ ${data.revenueHa.toFixed(0)}`} />
              <KPIBox label="Resultado/ha"  value={`R$ ${resultHa.toFixed(0)}`} color={resultHa >= 0 ? 'green' : 'red'} />
              <KPIBox label="Dívida Total"  value={fmtBRL(totalDebt)} color={debtRatio > 60 ? 'red' : 'default'} />
              <KPIBox label="Dívida/Patr."  value={fmtPct(debtRatio)} color={debtRatio > 60 ? 'red' : 'green'} />
            </View>
          </View>

          {/* Tabela de culturas */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Resultado por Cultura</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                {['Cultura', 'Área (ha)', 'Produt. (sc/ha)', 'Cotação (R$/sc)', 'Receita', 'Custo', 'Resultado', 'Margem'].map(h => (
                  <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Cultura' ? 1.2 : 1, fontSize: 6.5 }}>{h}</Text>
                ))}
              </View>
              {culturesCalc.map((c, i) => (
                <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                  <Text style={{ ...base.tableCell, flex: 1.2, fontWeight: 700 }}>{c.culture}</Text>
                  <Text style={base.tableCell}>{c.area.toLocaleString()}</Text>
                  <Text style={base.tableCell}>{c.productivity}</Text>
                  <Text style={base.tableCell}>R$ {c.price}</Text>
                  <Text style={base.tableCell}>{fmtBRL(c.revenue)}</Text>
                  <Text style={{ ...base.tableCell, color: colors.red }}>{fmtBRL(c.cost)}</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: c.result >= 0 ? colors.green : colors.red }}>{fmtBRL(c.result)}</Text>
                  <Text style={{ ...base.tableCell, color: c.margin >= 15 ? colors.green : colors.red }}>{fmtPct(c.margin)}</Text>
                </View>
              ))}
              {/* Ponto de equilíbrio por cultura */}
              {culturesCalc.map((c, i) => (
                <View key={`pe-${i}`} style={{ paddingHorizontal: 10, paddingBottom: 4 }}>
                  <Text style={{ fontSize: 7, color: colors.grayMid }}>
                    {c.culture}: Ponto de equilíbrio = {c.breakeven.toFixed(1)} sc/ha
                    {c.productivity > 0 ? ` (atual ${c.productivity} sc/ha — ${((c.productivity / c.breakeven - 1) * 100).toFixed(0)}% acima do PE)` : ''}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Endividamento */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Estrutura de Endividamento</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                {['Tipo', 'Banco', 'Valor', 'Taxa (a.a.)', '% da Receita'].map(h => (
                  <Text key={h} style={base.tableHeaderCell}>{h}</Text>
                ))}
              </View>
              {[
                ['Custeio', data.custeioBank, data.custeioValue, data.custeioRate],
                ['Investimento', data.investBank, data.investValue, data.investRate],
                ['CPR / Trading', data.cprBank, data.cprValue, 0],
              ].filter(r => Number(r[2]) > 0).map(([tipo, banco, valor, taxa], i) => (
                <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                  <Text style={{ ...base.tableCell, fontWeight: 700 }}>{String(tipo)}</Text>
                  <Text style={base.tableCell}>{String(banco) || '—'}</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700 }}>{fmtBRL(Number(valor))}</Text>
                  <Text style={base.tableCell}>{Number(taxa) > 0 ? `${taxa}%` : '—'}</Text>
                  <Text style={{ ...base.tableCell, color: data.totalRevenue > 0 && Number(valor)/data.totalRevenue > 0.3 ? colors.red : colors.grayDark }}>
                    {data.totalRevenue > 0 ? fmtPct(Number(valor)/data.totalRevenue*100) : '—'}
                  </Text>
                </View>
              ))}
              <View style={{ ...base.tableRow, backgroundColor: colors.greenPale }}>
                <Text style={{ ...base.tableCell, fontWeight: 700 }}>TOTAL</Text>
                <Text style={base.tableCell}>—</Text>
                <Text style={{ ...base.tableCell, fontWeight: 700, color: colors.green }}>{fmtBRL(totalDebt)}</Text>
                <Text style={base.tableCell}>—</Text>
                <Text style={{ ...base.tableCell, fontWeight: 700, color: debtCoverage > 60 ? colors.red : colors.green }}>
                  {fmtPct(debtCoverage)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>

      {/* ── Página 2: Diagnóstico + Ação ── */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Diagnóstico Agro 360°"
          subtitle="Análise e Plano de Ação"
          clientName={data.clientName}
          date={today()}
        />

        <View style={base.body}>
          {/* Patrimônio */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Relação Patrimonial</Text>
            <View style={base.row}>
              <KPIBox label="Imóveis Rurais"       value={fmtBRL(data.propertyValue)} color="green" />
              <KPIBox label="Máquinas/Equipamentos" value={fmtBRL(data.machineryValue)} />
              <KPIBox label="Patrimônio Total"      value={fmtBRL(patrimony)} color="green" />
              <KPIBox label="Cobertura de Dívida"   value={`${(patrimony / Math.max(totalDebt, 1)).toFixed(1)}×`} color={patrimony > totalDebt * 2 ? 'green' : 'amber'} />
            </View>
          </View>

          {/* Riscos */}
          <View style={base.section}>
            <Text style={{ ...base.sectionTitle, color: colors.red, borderBottomColor: colors.red }}>
              Pontos de Atenção
            </Text>
            {risks.length > 0 ? risks.map((r, i) => (
              <View key={i} style={{ ...base.cardRed, flexDirection: 'row', gap: 6, padding: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.red, fontSize: 9 }}>•</Text>
                <Text style={{ ...base.body1, flex: 1 }}>{r}</Text>
              </View>
            )) : <Text style={{ ...base.body1, color: colors.green }}>Nenhum risco crítico identificado.</Text>}
          </View>

          {/* Oportunidades */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Oportunidades de Melhoria</Text>
            {opportunities.map((o, i) => (
              <View key={i} style={{ ...base.cardGreen, flexDirection: 'row', gap: 6, padding: 8, marginBottom: 4 }}>
                <Text style={{ color: colors.green, fontSize: 9 }}>✓</Text>
                <Text style={{ ...base.body1, flex: 1 }}>{o}</Text>
              </View>
            ))}
          </View>

          {/* Controles */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Gestão e Controles</Text>
            <View style={base.row}>
              {[
                ['Seguro Agrícola',    data.hasInsurance],
                ['Planejamento Safra', data.hasPlanning],
                ['Controle Financeiro',data.hasFinancialCtrl],
              ].map(([l, ok]) => (
                <View key={String(l)} style={{ ...base.card, flex: 1, alignItems: 'center' }}>
                  <Text style={{ fontSize: 14, marginBottom: 4 }}>{ok ? '✅' : '❌'}</Text>
                  <Text style={{ ...base.label, textAlign: 'center' }}>{String(l)}</Text>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: ok ? colors.green : colors.red }}>
                    {ok ? 'Sim' : 'Não'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Plano de Ação */}
          {data.actionPlans && data.actionPlans.length > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Plano de Ação</Text>
              <View style={{ flexDirection: 'row', paddingHorizontal: 8, paddingBottom: 4 }}>
                <Text style={{ ...base.label, flex: 1 }}>Ação</Text>
                <Text style={{ ...base.label, minWidth: 48 }}>Prioridade</Text>
                <Text style={{ ...base.label, minWidth: 52 }}>Prazo</Text>
                <Text style={{ ...base.label, minWidth: 70 }}>Status</Text>
              </View>
              {data.actionPlans.map((a, i) => <ActionItem key={i} {...a} idx={i} />)}
            </View>
          )}

          {/* Parecer */}
          <View style={{ ...base.cardGreen, padding: 14 }}>
            <Text style={{ fontSize: 9, fontWeight: 700, color: colors.green, marginBottom: 6 }}>
              Parecer Consultivo — Diagnóstico Agro 360°
            </Text>
            <Text style={base.body1}>
              A propriedade {data.clientName}, com {totalArea.toLocaleString()} hectares totais, apresenta receita projetada de {fmtBRL(data.totalRevenue)} na safra {data.season}, com resultado operacional de {fmtBRL(totalResult)} e margem de {fmtPct(data.margin)}. O nível de endividamento está {debtRatio < 40 ? 'compatível com a capacidade patrimonial da propriedade' : 'acima do recomendado para o porte, exigindo atenção imediata na estruturação das dívidas'}. {risks.length > 0 ? `Foram identificados ${risks.length} pontos críticos que requerem ação imediata.` : ''} A AF Gestão & Consultoria recomenda foco em planejamento financeiro e estruturação de crédito rural para garantir a sustentabilidade das próximas safras.
            </Text>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>
    </Document>
  )
}
