import { Document, Page, Text, View, StyleSheet, pdf } from '@react-pdf/renderer'
import type { FluxoItem, FluxoMensal } from '../../services/agroApi'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2 })

const fmtDate = (d: string | Date) => new Date(d).toLocaleDateString('pt-BR')

const styles = StyleSheet.create({
  page: { fontFamily: 'Helvetica', fontSize: 8, padding: 30, backgroundColor: '#fff' },
  header: { marginBottom: 16 },
  title: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#1a1a1a', marginBottom: 2 },
  subtitle: { fontSize: 8, color: '#6b7280' },
  generated: { fontSize: 7, color: '#9ca3af', marginTop: 2 },
  alert: { backgroundColor: '#fef2f2', borderRadius: 4, padding: '6 10', marginBottom: 10, borderLeft: '3 solid #dc2626' },
  alertText: { color: '#991b1b', fontSize: 8 },
  table: { marginTop: 8 },
  thead: { flexDirection: 'row', backgroundColor: '#f9fafb', borderBottom: '1 solid #e5e7eb', paddingVertical: 5 },
  thCell: { fontFamily: 'Helvetica-Bold', color: '#6b7280', fontSize: 7, paddingHorizontal: 4 },
  row: { flexDirection: 'row', borderBottom: '0.5 solid #f3f4f6', paddingVertical: 4 },
  rowNeg: { flexDirection: 'row', borderBottom: '0.5 solid #f3f4f6', paddingVertical: 4, backgroundColor: '#fff1f2' },
  cell: { color: '#374151', paddingHorizontal: 4 },
  cellBold: { fontFamily: 'Helvetica-Bold', paddingHorizontal: 4 },
  green: { color: '#059669' },
  red: { color: '#dc2626' },
  gray: { color: '#6b7280' },
  footer: { position: 'absolute', bottom: 20, left: 30, right: 30, flexDirection: 'row', justifyContent: 'space-between', borderTop: '0.5 solid #e5e7eb', paddingTop: 6 },
  footerText: { fontSize: 7, color: '#9ca3af' },
  // Mensal
  summaryGrid: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard: { flex: 1, border: '0.5 solid #e5e7eb', borderRadius: 4, padding: '6 8' },
  summaryYear: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 4 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  summaryLabel: { color: '#6b7280' },
  tag: { paddingHorizontal: 4, paddingVertical: 1, borderRadius: 2, fontSize: 7 },
})

// ─── Fluxo Diário PDF ───────────────────────────────────────────────────────

interface DiarioPDFProps {
  items: FluxoItem[]
  saldoInicial: number
  clienteNome?: string
}

function DiarioPDFDoc({ items, saldoInicial, clienteNome }: DiarioPDFProps) {
  const saldoNeg = items.filter(f => f.saldoFinal < 0).length
  const saldoFinal = items.length ? items[items.length - 1].saldoFinal : saldoInicial
  const totalEntradas = items.filter(f => f.mov === 'ENTRADA').reduce((s, f) => s + f.valor, 0)
  const totalSaidas = items.filter(f => f.mov === 'SAÍDA').reduce((s, f) => s + f.valor, 0)
  const now = new Date().toLocaleString('pt-BR')

  const cols = [
    { label: 'Data', w: '10%' },
    { label: 'Mov.', w: '9%' },
    { label: 'Tipo', w: '14%' },
    { label: 'Origem', w: '12%' },
    { label: 'Descrição', w: '25%' },
    { label: 'Valor', w: '13%' },
    { label: 'Saldo Final', w: '17%' },
  ]

  return (
    <Document>
      <Page size="A4" orientation="landscape" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Fluxo de Caixa Diário{clienteNome ? ` — ${clienteNome}` : ''}</Text>
          <Text style={styles.subtitle}>
            {items.length} movimentos · Saldo inicial: {fmtBRL(saldoInicial)} · Saldo final: {fmtBRL(saldoFinal)} · Entradas: {fmtBRL(totalEntradas)} · Saídas: {fmtBRL(totalSaidas)}
          </Text>
          <Text style={styles.generated}>Gerado em {now}</Text>
        </View>

        {saldoNeg > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>⚠ {saldoNeg} dias com saldo negativo</Text>
          </View>
        )}

        <View style={styles.table}>
          <View style={styles.thead}>
            {cols.map(c => (
              <Text key={c.label} style={[styles.thCell, { width: c.w }]}>{c.label.toUpperCase()}</Text>
            ))}
          </View>
          {items.map((f, i) => {
            const rowStyle = f.saldoFinal < 0 ? styles.rowNeg : styles.row
            const isEntrada = f.mov === 'ENTRADA'
            return (
              <View key={i} style={rowStyle}>
                <Text style={[styles.cell, { width: cols[0].w }]}>{fmtDate(f.data)}</Text>
                <Text style={[styles.cell, isEntrada ? styles.green : styles.red, { width: cols[1].w }]}>
                  {isEntrada ? '▲' : '▼'} {f.mov}
                </Text>
                <Text style={[styles.cell, styles.gray, { width: cols[2].w }]}>{f.tipo}</Text>
                <Text style={[styles.cell, styles.gray, { width: cols[3].w }]}>{f.origem}</Text>
                <Text style={[styles.cell, { width: cols[4].w }]}>{f.descricao}</Text>
                <Text style={[styles.cellBold, isEntrada ? styles.green : styles.red, { width: cols[5].w }]}>
                  {isEntrada ? '+' : '-'}{fmtBRL(f.valor)}
                </Text>
                <Text style={[styles.cellBold, f.saldoFinal >= 0 ? { color: '#111827' } : styles.red, { width: cols[6].w }]}>
                  {fmtBRL(f.saldoFinal)}
                </Text>
              </View>
            )
          })}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AF Gestão & Consultoria — Fluxo de Caixa Diário</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function exportarFluxoDiarioPDF(
  items: FluxoItem[],
  saldoInicial: number,
  clienteNome?: string,
) {
  const blob = await pdf(<DiarioPDFDoc items={items} saldoInicial={saldoInicial} clienteNome={clienteNome} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fluxo-diario${clienteNome ? '-' + clienteNome.replace(/\s+/g, '-') : ''}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}

// ─── Fluxo Mensal PDF ────────────────────────────────────────────────────────

interface MensalPDFProps {
  mensal: FluxoMensal[]
  porAno: Record<string, { entradas: number; saidas: number; resultado: number }>
  saldoInicial: number
  clienteNome?: string
}

function MensalPDFDoc({ mensal, porAno, saldoInicial, clienteNome }: MensalPDFProps) {
  const anos = Object.keys(porAno).sort()
  const mesesNeg = mensal.filter(m => m.saldoFinal < 0).length
  const now = new Date().toLocaleString('pt-BR')

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.title}>Fluxo de Caixa Mensal{clienteNome ? ` — ${clienteNome}` : ''}</Text>
          <Text style={styles.subtitle}>{mensal.length} meses · Saldo inicial: {fmtBRL(saldoInicial)}</Text>
          <Text style={styles.generated}>Gerado em {now}</Text>
        </View>

        {mesesNeg > 0 && (
          <View style={styles.alert}>
            <Text style={styles.alertText}>⚠ {mesesNeg} meses com saldo negativo</Text>
          </View>
        )}

        {/* Resumo por ano */}
        {anos.length > 0 && (
          <View style={styles.summaryGrid}>
            {anos.map(ano => {
              const a = porAno[ano]
              return (
                <View key={ano} style={styles.summaryCard}>
                  <Text style={styles.summaryYear}>{ano}</Text>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { fontSize: 7 }]}>Entradas</Text>
                    <Text style={[{ fontSize: 7, fontFamily: 'Helvetica-Bold' }, styles.green]}>{fmtBRL(a.entradas)}</Text>
                  </View>
                  <View style={styles.summaryRow}>
                    <Text style={[styles.summaryLabel, { fontSize: 7 }]}>Saídas</Text>
                    <Text style={[{ fontSize: 7, fontFamily: 'Helvetica-Bold' }, styles.red]}>{fmtBRL(a.saidas)}</Text>
                  </View>
                  <View style={[styles.summaryRow, { borderTop: '0.5 solid #e5e7eb', paddingTop: 3, marginTop: 2 }]}>
                    <Text style={{ fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#374151' }}>Resultado</Text>
                    <Text style={[{ fontSize: 7, fontFamily: 'Helvetica-Bold' }, a.resultado >= 0 ? styles.green : styles.red]}>{fmtBRL(a.resultado)}</Text>
                  </View>
                </View>
              )
            })}
          </View>
        )}

        {/* Tabela */}
        <View style={styles.table}>
          <View style={styles.thead}>
            {['Mês', 'Saldo Inicial', 'Entradas', 'Saídas', 'Saldo Final'].map(h => (
              <Text key={h} style={[styles.thCell, { width: '20%' }]}>{h.toUpperCase()}</Text>
            ))}
          </View>
          {mensal.map((m, i) => (
            <View key={i} style={m.saldoFinal < 0 ? styles.rowNeg : styles.row}>
              <Text style={[styles.cellBold, { width: '20%', color: '#111827' }]}>{m.mes}</Text>
              <Text style={[styles.cell, styles.gray, { width: '20%' }]}>{fmtBRL(m.saldoInicial)}</Text>
              <Text style={[styles.cell, m.entradas > 0 ? styles.green : styles.gray, { width: '20%' }]}>{m.entradas > 0 ? fmtBRL(m.entradas) : '—'}</Text>
              <Text style={[styles.cell, m.saidas > 0 ? styles.red : styles.gray, { width: '20%' }]}>{m.saidas > 0 ? fmtBRL(m.saidas) : '—'}</Text>
              <Text style={[styles.cellBold, m.saldoFinal >= 0 ? { color: '#111827' } : styles.red, { width: '20%' }]}>{fmtBRL(m.saldoFinal)}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer} fixed>
          <Text style={styles.footerText}>AF Gestão & Consultoria — Fluxo de Caixa Mensal</Text>
          <Text style={styles.footerText} render={({ pageNumber, totalPages }) => `Página ${pageNumber} / ${totalPages}`} />
        </View>
      </Page>
    </Document>
  )
}

export async function exportarFluxoMensalPDF(
  mensal: FluxoMensal[],
  porAno: Record<string, { entradas: number; saidas: number; resultado: number }>,
  saldoInicial: number,
  clienteNome?: string,
) {
  const blob = await pdf(<MensalPDFDoc mensal={mensal} porAno={porAno} saldoInicial={saldoInicial} clienteNome={clienteNome} />).toBlob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `fluxo-mensal${clienteNome ? '-' + clienteNome.replace(/\s+/g, '-') : ''}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
