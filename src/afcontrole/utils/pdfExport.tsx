import { Document, Page, Text, View, StyleSheet, pdf, Image } from '@react-pdf/renderer'
import type { ControleEntry } from '../storage/controleStorage'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
const fmtDate = (s: string) => s ? new Date(s).toLocaleDateString('pt-BR') : '—'

const C = { gold: '#C9A258', dark: '#0A0A0A', green: '#1B5E20', red: '#C62828', gray: '#6B7280', light: '#F9FAFB', border: '#E5E7EB' }

const s = StyleSheet.create({
  page:    { fontFamily: 'Helvetica', fontSize: 9, padding: 32, backgroundColor: '#fff' },
  header:  { flexDirection: 'row', alignItems: 'center', marginBottom: 20, paddingBottom: 12, borderBottomWidth: 2, borderBottomColor: C.gold },
  logo:    { width: 40, height: 40, marginRight: 12 },
  brand:   { flex: 1 },
  brandT:  { fontSize: 16, fontFamily: 'Helvetica-Bold', color: C.dark },
  brandS:  { fontSize: 8, color: C.gray, marginTop: 2 },
  meta:    { fontSize: 8, color: C.gray, textAlign: 'right' },
  section: { marginBottom: 16 },
  sTitle:  { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark, marginBottom: 8, paddingBottom: 4, borderBottomWidth: 1, borderBottomColor: C.border },
  kpiRow:  { flexDirection: 'row', gap: 8, marginBottom: 12 },
  kpi:     { flex: 1, backgroundColor: C.light, borderRadius: 6, padding: 10 },
  kpiL:    { fontSize: 7, color: C.gray, marginBottom: 3 },
  kpiV:    { fontSize: 13, fontFamily: 'Helvetica-Bold', color: C.dark },
  table:   { borderWidth: 1, borderColor: C.border, borderRadius: 4 },
  thead:   { flexDirection: 'row', backgroundColor: C.dark, borderRadius: 3 },
  th:      { padding: '5 8', fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff' },
  tr:      { flexDirection: 'row', borderTopWidth: 1, borderTopColor: C.border },
  trAlt:   { backgroundColor: '#F9FAFB' },
  td:      { padding: '4 8', fontSize: 8, color: C.dark },
  foot:    { marginTop: 24, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.border, flexDirection: 'row', justifyContent: 'space-between' },
  footT:   { fontSize: 7, color: C.gray },
})

interface ReportFilter {
  dataInicio?: string; dataFim?: string; tipo?: string
  categoria?: string; status?: string; valorMin?: number; valorMax?: number
}

function filterEntries(entries: ControleEntry[], f: ReportFilter) {
  return entries.filter(e => {
    if (f.tipo && f.tipo !== 'ambos' && e.tipo !== f.tipo) return false
    if (f.categoria && e.categoria !== f.categoria) return false
    if (f.status && e.status !== f.status) return false
    if (f.valorMin !== undefined && e.valor < f.valorMin) return false
    if (f.valorMax !== undefined && e.valor > f.valorMax) return false
    if (f.dataInicio && e.dataVenc < f.dataInicio) return false
    if (f.dataFim && e.dataVenc > f.dataFim) return false
    return true
  })
}

function ReportDoc({ entries, filter, company }: { entries: ControleEntry[]; filter: ReportFilter; company?: string }) {
  const filtered   = filterEntries(entries, filter)
  const receitas   = filtered.filter(e => e.tipo === 'receita')
  const despesas   = filtered.filter(e => e.tipo === 'despesa')
  const totRec     = receitas.reduce((s, e) => s + e.valor, 0)
  const totDesp    = despesas.reduce((s, e) => s + e.valor, 0)
  const resultado  = totRec - totDesp
  const margem     = totRec > 0 ? (resultado / totRec) * 100 : 0

  const catMap: Record<string, { receita: number; despesa: number }> = {}
  filtered.forEach(e => {
    if (!catMap[e.categoria]) catMap[e.categoria] = { receita: 0, despesa: 0 }
    catMap[e.categoria][e.tipo] += e.valor
  })
  const catList = Object.entries(catMap).sort((a, b) => (b[1].receita + b[1].despesa) - (a[1].receita + a[1].despesa)).slice(0, 10)

  const cols = { date: '14%', tipo: '9%', cat: '17%', desc: '25%', valor: '13%', status: '11%', pag: '11%' }

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Cabeçalho */}
        <View style={s.header}>
          <Image src="/logo.png" style={s.logo} />
          <View style={s.brand}>
            <Text style={s.brandT}>AF Controle</Text>
            <Text style={s.brandS}>{company ?? 'Relatório Financeiro'}</Text>
          </View>
          <View>
            <Text style={s.meta}>Gerado em {new Date().toLocaleString('pt-BR')}</Text>
            {filter.dataInicio && <Text style={s.meta}>Período: {fmtDate(filter.dataInicio)} – {fmtDate(filter.dataFim ?? '')}</Text>}
          </View>
        </View>

        {/* KPIs */}
        <View style={s.section}>
          <Text style={s.sTitle}>Resumo Executivo</Text>
          <View style={s.kpiRow}>
            {[
              { l: 'Receita Total', v: fmtBRL(totRec) },
              { l: 'Despesa Total', v: fmtBRL(totDesp) },
              { l: 'Resultado',     v: fmtBRL(resultado) },
              { l: 'Margem Líquida', v: `${margem.toFixed(1)}%` },
            ].map(k => (
              <View key={k.l} style={s.kpi}>
                <Text style={s.kpiL}>{k.l}</Text>
                <Text style={[s.kpiV, { color: k.l === 'Despesa Total' ? C.red : k.l === 'Resultado' && resultado < 0 ? C.red : C.green }]}>{k.v}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Categorias */}
        {catList.length > 0 && (
          <View style={s.section}>
            <Text style={s.sTitle}>Por Categoria</Text>
            <View style={s.table}>
              <View style={s.thead}>
                <Text style={[s.th, { width: '34%' }]}>Categoria</Text>
                <Text style={[s.th, { width: '22%' }]}>Receitas</Text>
                <Text style={[s.th, { width: '22%' }]}>Despesas</Text>
                <Text style={[s.th, { width: '22%' }]}>Resultado</Text>
              </View>
              {catList.map(([cat, v], i) => (
                <View key={cat} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
                  <Text style={[s.td, { width: '34%', fontFamily: 'Helvetica-Bold' }]}>{cat}</Text>
                  <Text style={[s.td, { width: '22%', color: C.green }]}>{fmtBRL(v.receita)}</Text>
                  <Text style={[s.td, { width: '22%', color: C.red }]}>{fmtBRL(v.despesa)}</Text>
                  <Text style={[s.td, { width: '22%', fontFamily: 'Helvetica-Bold', color: v.receita - v.despesa >= 0 ? C.green : C.red }]}>{fmtBRL(v.receita - v.despesa)}</Text>
                </View>
              ))}
            </View>
          </View>
        )}
      </Page>

      {/* Página 2: Lançamentos detalhados */}
      <Page size="A4" style={s.page}>
        <Text style={[s.sTitle, { marginBottom: 10 }]}>Lançamentos Detalhados ({filtered.length} registros)</Text>
        <View style={s.table}>
          <View style={s.thead}>
            <Text style={[s.th, { width: cols.date }]}>Vencimento</Text>
            <Text style={[s.th, { width: cols.tipo }]}>Tipo</Text>
            <Text style={[s.th, { width: cols.cat }]}>Categoria</Text>
            <Text style={[s.th, { width: cols.desc }]}>Descrição</Text>
            <Text style={[s.th, { width: cols.valor }]}>Valor</Text>
            <Text style={[s.th, { width: cols.status }]}>Status</Text>
            <Text style={[s.th, { width: cols.pag }]}>Pagamento</Text>
          </View>
          {filtered.slice(0, 50).map((e, i) => (
            <View key={e.id} style={[s.tr, i % 2 === 1 ? s.trAlt : {}]}>
              <Text style={[s.td, { width: cols.date }]}>{fmtDate(e.dataVenc)}</Text>
              <Text style={[s.td, { width: cols.tipo, color: e.tipo === 'receita' ? C.green : C.red }]}>{e.tipo}</Text>
              <Text style={[s.td, { width: cols.cat }]}>{e.categoria}</Text>
              <Text style={[s.td, { width: cols.desc }]}>{e.descricao.slice(0, 35)}</Text>
              <Text style={[s.td, { width: cols.valor, fontFamily: 'Helvetica-Bold', color: e.tipo === 'receita' ? C.green : C.red }]}>{fmtBRL(e.valor)}</Text>
              <Text style={[s.td, { width: cols.status }]}>{e.status}</Text>
              <Text style={[s.td, { width: cols.pag }]}>{fmtDate(e.dataPag ?? '')}</Text>
            </View>
          ))}
        </View>
        {filtered.length > 50 && <Text style={{ fontSize: 8, color: C.gray, marginTop: 6 }}>* Exibindo os primeiros 50 de {filtered.length} registros. Exporte para Excel para ver todos.</Text>}

        <View style={s.foot}>
          <Text style={s.footT}>AF Controle © {new Date().getFullYear()} — AF Gestão & Consultoria</Text>
          <Text style={s.footT}>Documento gerado automaticamente</Text>
        </View>
      </Page>
    </Document>
  )
}

export async function downloadPDF(entries: ControleEntry[], filter: ReportFilter, company?: string) {
  const doc  = <ReportDoc entries={entries} filter={filter} company={company} />
  const blob = await pdf(doc).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `AF_Controle_${new Date().toISOString().slice(0,10)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
