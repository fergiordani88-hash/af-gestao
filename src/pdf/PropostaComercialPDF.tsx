import { Document, Page, View, Text } from '@react-pdf/renderer'
import { base, colors, PDFHeader, PDFFooter } from './components/Base'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })
const today  = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

const validUntil = () => {
  const d = new Date()
  d.setDate(d.getDate() + 30)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })
}

export interface PropostaData {
  clientName:     string
  clientDocument: string
  clientCity:     string
  segment:        string
  consultorName:  string
  plan:           string
  monthlyValue:   number
  setupFee?:      number
  description:    string
  services:       string[]
  deliverables:   string[]
  differentials:  string[]
}

export function PropostaComercialPDF({ data }: { data: PropostaData }) {
  const annual = data.monthlyValue * 12

  return (
    <Document title={`Proposta Comercial — ${data.clientName}`} author="AF Gestão & Consultoria">
      <Page size="A4" style={base.page}>
        {/* Cabeçalho especial da proposta */}
        <View style={{ backgroundColor: colors.dark, paddingHorizontal: 32, paddingTop: 28, paddingBottom: 24 }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <View style={base.logoBox}>
                <Text style={base.logoText}>AF</Text>
              </View>
              <View>
                <Text style={{ color: colors.white, fontSize: 12, fontWeight: 700 }}>AF Gestão & Consultoria</Text>
                <Text style={{ color: '#FFFFFF60', fontSize: 7.5, marginTop: 2 }}>Consultoria Financeira · Estratégica · Crédito Rural</Text>
              </View>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: colors.gold, fontSize: 10, fontWeight: 700 }}>PROPOSTA COMERCIAL</Text>
              <Text style={{ color: '#FFFFFF60', fontSize: 7.5, marginTop: 4 }}>Emissão: {today()}</Text>
              <Text style={{ color: '#FFFFFF60', fontSize: 7.5 }}>Válida até: {validUntil()}</Text>
            </View>
          </View>

          <View style={{ marginTop: 20, padding: 14, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 8 }}>
            <Text style={{ color: '#FFFFFF80', fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.5 }}>Proposta apresentada para</Text>
            <Text style={{ color: colors.white, fontSize: 16, fontWeight: 700, marginTop: 4 }}>{data.clientName}</Text>
            <Text style={{ color: '#FFFFFF60', fontSize: 8, marginTop: 3 }}>{data.clientDocument} · {data.clientCity} · Segmento: {data.segment}</Text>
          </View>
        </View>
        <View style={base.goldStripe} />

        <View style={base.body}>
          {/* Plano e valores */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Plano Contratado</Text>
            <View style={{ ...base.card, backgroundColor: colors.dark }}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <View>
                  <Text style={{ color: '#FFFFFF80', fontSize: 7.5, textTransform: 'uppercase' }}>Plano</Text>
                  <Text style={{ color: colors.white, fontSize: 14, fontWeight: 700 }}>{data.plan}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ color: '#FFFFFF80', fontSize: 7.5, textTransform: 'uppercase' }}>Investimento Mensal</Text>
                  <Text style={{ color: colors.gold, fontSize: 22, fontWeight: 700 }}>{fmtBRL(data.monthlyValue)}</Text>
                  <Text style={{ color: '#FFFFFF60', fontSize: 7.5 }}>Anual: {fmtBRL(annual)}</Text>
                </View>
              </View>
              {data.setupFee && (
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.1)', paddingTop: 8 }}>
                  <Text style={{ color: '#FFFFFF80', fontSize: 8 }}>Taxa de implantação (única)</Text>
                  <Text style={{ color: colors.gold, fontSize: 8, fontWeight: 700 }}>{fmtBRL(data.setupFee)}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Escopo */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Escopo dos Serviços</Text>
            <Text style={{ ...base.body1, marginBottom: 10 }}>{data.description}</Text>
            <View style={base.row}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 8, fontWeight: 700, color: colors.grayDark, marginBottom: 6 }}>Serviços Inclusos</Text>
                {data.services.map((s, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 5, marginBottom: 4 }}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: colors.green, marginTop: 2 }} />
                    <Text style={{ ...base.body1, flex: 1 }}>{s}</Text>
                  </View>
                ))}
              </View>
              <View style={{ flex: 1, paddingLeft: 12, borderLeftWidth: 1, borderLeftColor: colors.border }}>
                <Text style={{ fontSize: 8, fontWeight: 700, color: colors.grayDark, marginBottom: 6 }}>Entregáveis</Text>
                {data.deliverables.map((d, i) => (
                  <View key={i} style={{ flexDirection: 'row', gap: 5, marginBottom: 4 }}>
                    <Text style={{ color: colors.gold, fontSize: 9, marginTop: -1 }}>›</Text>
                    <Text style={{ ...base.body1, flex: 1 }}>{d}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Diferenciais */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Por que AF Gestão & Consultoria?</Text>
            <View style={base.row}>
              {data.differentials.map((d, i) => (
                <View key={i} style={{ ...base.card, flex: 1, alignItems: 'center', paddingVertical: 12 }}>
                  <Text style={{ fontSize: 16, marginBottom: 6 }}>
                    {['🎯', '📊', '💡', '🤝', '🚀', '🔒'][i % 6]}
                  </Text>
                  <Text style={{ ...base.body2, textAlign: 'center', fontWeight: 700, color: colors.grayDark }}>{d}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Metodologia */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Nossa Metodologia — 90 Dias</Text>
            <View style={base.row}>
              {[
                { n: '01', title: 'Diagnóstico', desc: 'Levantamento completo da situação financeira, operacional e de crédito', color: colors.blue },
                { n: '02', title: 'Planejamento', desc: 'Definição de metas, indicadores e plano de ação personalizado', color: colors.amber },
                { n: '03', title: 'Execução', desc: 'Implementação das ações com acompanhamento semanal', color: colors.green },
                { n: '04', title: 'Resultados', desc: 'Mensuração de resultados e ajuste da estratégia', color: colors.gold },
              ].map(step => (
                <View key={step.n} style={{ flex: 1, alignItems: 'center', padding: 8 }}>
                  <View style={{ width: 28, height: 28, borderRadius: 14, backgroundColor: step.color, alignItems: 'center', justifyContent: 'center', marginBottom: 6 }}>
                    <Text style={{ color: colors.white, fontSize: 9, fontWeight: 700 }}>{step.n}</Text>
                  </View>
                  <Text style={{ fontSize: 8, fontWeight: 700, color: step.color, marginBottom: 3, textAlign: 'center' }}>{step.title}</Text>
                  <Text style={{ ...base.body2, textAlign: 'center' }}>{step.desc}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Assinatura */}
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 16, gap: 20 }}>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.dark, paddingTop: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: colors.grayDark, fontWeight: 700 }}>{data.clientName}</Text>
              <Text style={{ fontSize: 7, color: colors.grayMid }}>Contratante · {data.clientDocument}</Text>
            </View>
            <View style={{ flex: 1, borderTopWidth: 1, borderTopColor: colors.dark, paddingTop: 6, alignItems: 'center' }}>
              <Text style={{ fontSize: 8, color: colors.grayDark, fontWeight: 700 }}>AF Gestão & Consultoria</Text>
              <Text style={{ fontSize: 7, color: colors.grayMid }}>Consultor: {data.consultorName}</Text>
            </View>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>
    </Document>
  )
}
