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
  const prodTotal        = r.area * r.produtividade
  const recBruta         = prodTotal * r.cotacao
  const custoProducao    = r.area * custoPorHaReais
  const custoArrendTotal = r.areaArrendada * r.custoArrendHa * (r.cotacao || 1)
  const custoTotal       = custoProducao + custoArrendTotal
  const resultado        = recBruta - custoTotal
  const margem           = recBruta > 0 ? (resultado / recBruta) * 100 : 0
  return { prodTotal, recBruta, custoPorHaReais, custoProducao, custoArrendTotal, custoTotal, resultado, margem }
}

// ── Tabela de resumo por safra ────────────────────────────────────────────
const RESUMO_COLS: { key: string; label: string; flex: number }[] = [
  { key: 'safra',       label: 'Safra',               flex: 0.7 },
  { key: 'tipo',        label: 'Tipo',                 flex: 0.7 },
  { key: 'area',        label: 'Área (ha)',            flex: 0.8 },
  { key: 'recBruta',    label: 'Receita Bruta',        flex: 1.1 },
  { key: 'custoProd',   label: 'Custo Produção',       flex: 1.1 },
  { key: 'custoArrend', label: 'Custo Arrendamento',   flex: 1.1 },
  { key: 'custoTotal',  label: 'Custo Total',          flex: 1.1 },
  { key: 'resultado',   label: 'Resultado',            flex: 1.1 },
  { key: 'margem',      label: 'Margem',               flex: 0.7 },
]

// ── Tabela detalhada por cultura, dentro de cada safra ────────────────────
const DETALHE_COLS: { key: string; label: string; flex: number }[] = [
  { key: 'cultura',     label: 'Cultura',              flex: 1.3 },
  { key: 'area',        label: 'Área (ha)',            flex: 0.8 },
  { key: 'produt',      label: 'Produt. (sc/ha)',      flex: 0.9 },
  { key: 'cotacao',     label: 'Cotação (R$/sc)',      flex: 0.8 },
  { key: 'prodTotal',   label: 'Prod. Total (sc)',     flex: 0.9 },
  { key: 'recBruta',    label: 'Receita Bruta',        flex: 1.1 },
  { key: 'custoHa',     label: 'Custo/ha (R$)',        flex: 0.9 },
  { key: 'custoProd',   label: 'Custo Produção',       flex: 1.1 },
  { key: 'areaArrend',  label: 'Área Arrend. (ha)',    flex: 0.8 },
  { key: 'custoArrend', label: 'Custo Arrendamento',   flex: 1.1 },
  { key: 'custoTotal',  label: 'Custo Total',          flex: 1.1 },
  { key: 'resultado',   label: 'Resultado',            flex: 1.1 },
  { key: 'margem',      label: 'Margem',               flex: 0.7 },
]

function TableHeader({ cols }: { cols: { key: string; label: string; flex: number }[] }) {
  return (
    <View style={base.tableHeader}>
      {cols.map(c => (
        <Text key={c.key} style={{ ...base.tableHeaderCell, flex: c.flex, fontSize: 6.5 }}>{c.label}</Text>
      ))}
    </View>
  )
}

export function ProducaoPDF({ data }: { data: ProducaoPDFData }) {
  const safrasComDados = data.safras.filter(s => s.rows.length > 0)

  const resumoSafras = safrasComDados.map(s => {
    const principal = s.rows.find((_r, i) => i === 0) // usa a primeira como referência de área
    const area = s.rows.reduce((m, r) => Math.max(m, r.area), 0) || principal?.area || 0
    const totais = s.rows.reduce((acc, r) => {
      const c = calc(r)
      acc.recBruta += c.recBruta
      acc.custoProducao += c.custoProducao
      acc.custoArrendTotal += c.custoArrendTotal
      acc.custoTotal += c.custoTotal
      return acc
    }, { recBruta: 0, custoProducao: 0, custoArrendTotal: 0, custoTotal: 0 })
    const resultado = totais.recBruta - totais.custoTotal
    const margem = totais.recBruta > 0 ? (resultado / totais.recBruta) * 100 : 0
    return { safra: s.safra, tipo: s.tipo, area, ...totais, resultado, margem }
  })

  return (
    <Document title={`Produtividade por Safra — ${data.clientName}`} author="AF Gestão & Consultoria">
      <Page size="A4" orientation="landscape" style={base.page}>
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
                <TableHeader cols={RESUMO_COLS} />
                {resumoSafras.map((r, i) => (
                  <View key={r.safra} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, flex: 0.7, fontWeight: 700 }}>{r.safra}</Text>
                    <Text style={{ ...base.tableCell, flex: 0.7 }}>{r.tipo === 'historico' ? 'Histórico' : 'Previsão'}</Text>
                    <Text style={{ ...base.tableCell, flex: 0.8 }}>{r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.1 }}>{fmtBRL(r.recBruta)}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(r.custoProducao)}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(r.custoArrendTotal)}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(r.custoTotal)}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.1, fontWeight: 700, color: r.resultado >= 0 ? colors.green : colors.red }}>{fmtBRL(r.resultado)}</Text>
                    <Text style={{ ...base.tableCell, flex: 0.7, color: r.margem >= 15 ? colors.green : colors.red }}>{fmtPct(r.margem)}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Produtividade, receita e custo por cultura, detalhado por safra */}
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
                <TableHeader cols={DETALHE_COLS} />
                {s.rows.map((r, i) => {
                  const c = calc(r)
                  return (
                    <View key={`${r.cultura}-${i}`} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                      <Text style={{ ...base.tableCell, flex: 1.3, fontWeight: 700 }}>{r.cultura}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.8 }}>{r.area.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.9, fontWeight: 700, color: colors.green }}>{fmtN(r.produtividade)}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.8 }}>R$ {fmtN(r.cotacao, 2)}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.9 }}>{fmtN(c.prodTotal, 0)}</Text>
                      <Text style={{ ...base.tableCell, flex: 1.1 }}>{fmtBRL(c.recBruta)}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.9 }}>{fmtBRL(c.custoPorHaReais)}</Text>
                      <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(c.custoProducao)}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.8 }}>{r.areaArrendada.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</Text>
                      <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(c.custoArrendTotal)}</Text>
                      <Text style={{ ...base.tableCell, flex: 1.1, color: colors.red }}>{fmtBRL(c.custoTotal)}</Text>
                      <Text style={{ ...base.tableCell, flex: 1.1, fontWeight: 700, color: c.resultado >= 0 ? colors.green : colors.red }}>{fmtBRL(c.resultado)}</Text>
                      <Text style={{ ...base.tableCell, flex: 0.7, color: c.margem >= 15 ? colors.green : colors.red }}>{fmtPct(c.margem)}</Text>
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
