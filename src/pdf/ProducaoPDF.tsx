import { Document, Page, View, Text } from '@react-pdf/renderer'
import { base, colors, PDFHeader, PDFFooter, KPIBox } from './components/Base'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`
const fmtN   = (v: number, d = 1) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const today  = () => new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' })

export interface ProducaoPDFRow {
  cultura: string
  area: number
  produtividade: number   // sc/ha
  cotacao: number         // R$/sc
  custoPorHa: number      // sc/ha
  areaArrendada: number
  custoArrendHa: number   // sc/ha
}

export interface ProducaoPDFSafra {
  safra: string
  tipo: string            // 'historico' | 'previsao'
  rows: ProducaoPDFRow[]
}

export interface ProducaoPDFData {
  clientName: string
  location?: string
  safras: ProducaoPDFSafra[]
}

function calc(r: ProducaoPDFRow) {
  const custoPorHaReais  = r.custoPorHa * r.cotacao
  const recBruta         = r.area * r.produtividade * r.cotacao
  const custoTotal       = r.area * custoPorHaReais
  const custoArrendTotal = r.areaArrendada * r.custoArrendHa * (r.cotacao || 1)
  const resultado        = recBruta - custoTotal - custoArrendTotal
  const margem           = recBruta > 0 ? (resultado / recBruta) * 100 : 0
  return { recBruta, custoTotal: custoTotal + custoArrendTotal, resultado, margem }
}

export function ProducaoPDF({ data }: { data: ProducaoPDFData }) {
  const safrasComDados = data.safras.filter(s => s.rows.length > 0)

  const resumoSafras = safrasComDados.map(s => {
    const principal = s.rows.find((_r, i) => i === 0) // usa a primeira como referência de área
    const area = s.rows.reduce((m, r) => Math.max(m, r.area), 0) || principal?.area || 0
    const totais = s.rows.reduce((acc, r) => {
      const c = calc(r)
      acc.recBruta += c.recBruta
      acc.custoTotal += c.custoTotal
      return acc
    }, { recBruta: 0, custoTotal: 0 })
    const resultado = totais.recBruta - totais.custoTotal
    const margem = totais.recBruta > 0 ? (resultado / totais.recBruta) * 100 : 0
    return { safra: s.safra, tipo: s.tipo, area, ...totais, resultado, margem }
  })

  return (
    <Document title={`Produtividade por Safra — ${data.clientName}`} author="AF Gestão & Consultoria">
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Produtividade por Safra"
          subtitle={data.location || 'Produção Rural'}
          clientName={data.clientName}
          date={today()}
        />

        <View style={base.body}>
          {/* Resumo comparativo entre safras */}
          {resumoSafras.length > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Resumo por Safra</Text>
              <View style={base.table}>
                <View style={base.tableHeader}>
                  {['Safra', 'Tipo', 'Área (ha)', 'Receita Bruta', 'Custo Total', 'Resultado', 'Margem'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Safra' ? 0.8 : 1, fontSize: 6.5 }}>{h}</Text>
                  ))}
                </View>
                {resumoSafras.map((r, i) => (
                  <View key={r.safra} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, flex: 0.8, fontWeight: 700 }}>{r.safra}</Text>
                    <Text style={base.tableCell}>{r.tipo === 'historico' ? 'Histórico' : 'Previsão'}</Text>
                    <Text style={base.tableCell}>{r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
                    <Text style={base.tableCell}>{fmtBRL(r.recBruta)}</Text>
                    <Text style={{ ...base.tableCell, color: colors.red }}>{fmtBRL(r.custoTotal)}</Text>
                    <Text style={{ ...base.tableCell, fontWeight: 700, color: r.resultado >= 0 ? colors.green : colors.red }}>{fmtBRL(r.resultado)}</Text>
                    <Text style={{ ...base.tableCell, color: r.margem >= 15 ? colors.green : colors.red }}>{fmtPct(r.margem)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Produtividade e resultado por cultura, detalhado por safra */}
          {safrasComDados.map(s => (
            <View key={s.safra} style={base.section} wrap={false}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
                <Text style={{ ...base.sectionTitle, marginBottom: 0, borderBottomWidth: 0, flex: 1 }}>Safra {s.safra}</Text>
                <View style={{
                  paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10,
                  backgroundColor: s.tipo === 'historico' ? colors.bluePale : colors.greenPale,
                }}>
                  <Text style={{ fontSize: 7, fontWeight: 700, color: s.tipo === 'historico' ? colors.blue : colors.green }}>
                    {s.tipo === 'historico' ? 'HISTÓRICO' : 'PREVISÃO'}
                  </Text>
                </View>
              </View>
              <View style={{ ...base.table, marginTop: 0 }}>
                <View style={base.tableHeader}>
                  {['Cultura', 'Área (ha)', 'Produtividade (sc/ha)', 'Cotação (R$/sc)', 'Receita Bruta', 'Custo Total', 'Resultado', 'Margem'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Cultura' ? 1.3 : 1, fontSize: 6.5 }}>{h}</Text>
                  ))}
                </View>
                {s.rows.map((r, i) => {
                  const c = calc(r)
                  return (
                    <View key={`${r.cultura}-${i}`} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                      <Text style={{ ...base.tableCell, flex: 1.3, fontWeight: 700 }}>{r.cultura}</Text>
                      <Text style={base.tableCell}>{r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
                      <Text style={{ ...base.tableCell, fontWeight: 700, color: colors.green }}>{fmtN(r.produtividade)}</Text>
                      <Text style={base.tableCell}>R$ {fmtN(r.cotacao, 2)}</Text>
                      <Text style={base.tableCell}>{fmtBRL(c.recBruta)}</Text>
                      <Text style={{ ...base.tableCell, color: colors.red }}>{fmtBRL(c.custoTotal)}</Text>
                      <Text style={{ ...base.tableCell, fontWeight: 700, color: c.resultado >= 0 ? colors.green : colors.red }}>{fmtBRL(c.resultado)}</Text>
                      <Text style={{ ...base.tableCell, color: c.margem >= 15 ? colors.green : colors.red }}>{fmtPct(c.margem)}</Text>
                    </View>
                  )
                })}
              </View>
            </View>
          ))}

          {safrasComDados.length === 0 && (
            <Text style={base.body1}>Nenhuma safra com dados cadastrados.</Text>
          )}

          {/* KPI final: média de produtividade por cultura entre as safras históricas */}
          {(() => {
            const historicas = safrasComDados.filter(s => s.tipo === 'historico')
            if (historicas.length === 0) return null
            const porCultura: Record<string, number[]> = {}
            for (const s of historicas) {
              for (const r of s.rows) {
                if (!porCultura[r.cultura]) porCultura[r.cultura] = []
                porCultura[r.cultura].push(r.produtividade)
              }
            }
            const medias = Object.entries(porCultura).map(([cultura, vals]) => ({
              cultura, media: vals.reduce((a, b) => a + b, 0) / vals.length,
            }))
            if (medias.length === 0) return null
            return (
              <View style={base.section}>
                <Text style={base.sectionTitle}>Produtividade Média Histórica</Text>
                <View style={base.row}>
                  {medias.map(m => (
                    <KPIBox key={m.cultura} label={m.cultura} value={`${fmtN(m.media)} sc/ha`} color="green" />
                  ))}
                </View>
              </View>
            )
          })()}
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>
    </Document>
  )
}
