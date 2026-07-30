import { Document, Page, View, Text, StyleSheet } from '@react-pdf/renderer'

// ── Types ──────────────────────────────────────────────────────────────────
export interface RelCultura {
  cultura: string; area: number; produtividade: number; cotacao: number
  custoPorHa: number; areaArrendada: number; custoArrendHa: number
  custoItens?: { categoria: string; valorHa: number }[]
}
export interface RelContrato {
  banco: string; modalidade: string; valorTomado: number
  valorParcela: number; taxa: number; vencimento: string
  totalParcelas: number; parcelaAtual: number
}
export interface RelPatrimonio {
  categoria: string; descricao: string; valorAvaliado: number
  possuiOnus: boolean; valorOnus: number
}
export interface RelCenario {
  nome: string; resultadoTotal10Anos: number; anosPositivos: number
  margLiquidaMedia: number; veredicto: string
}
export interface RelatorioCompletoAgroData {
  clientName: string; clientCity?: string; consultorName: string
  safra: string; dataGeracao: string; horaGeracao?: string
  culturas: RelCultura[]; areaTotal: number; areaArrendada: number
  contratos: RelContrato[]; totalEndividamento: number; servicoAnual: number; saldoDevedor: number
  patrimonio: RelPatrimonio[]; patrimonioGruto: number; totalOnus: number
  margem: number; alavancagem: number; solvencia: number
  endivReceita: number; capPagamento: number; ratingLabel: string; ratingColor: string
  cenarios: RelCenario[]
  projecao10Anos: number; projecaoAnos: { ano: number; resultadoLiquido: number; recBruta: number }[]
}

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  white:   '#FFFFFF',
  green:   '#183828',   // deep forest green — primary brand
  greenMd: '#1F4A34',   // slightly lighter for panels
  greenLt: '#E8F0EA',   // pale green tint for alt rows
  gold:    '#B8975A',   // brand gold
  goldLt:  '#D4B87A',
  ink:     '#1A1A1A',
  body:    '#3C3C3C',
  muted:   '#828282',
  border:  '#E4E4E4',
  pos:     '#1B5E20',   // positive numbers
  neg:     '#8B1A1A',   // negative numbers
  amber:   '#7A5020',
}

// ── Helpers ────────────────────────────────────────────────────────────────
const R = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const pct = (v: number) => `${Number(v).toFixed(1)}%`
const xv  = (v: number) => isFinite(v) && !isNaN(v) ? `${v.toFixed(2)}x` : '—'
const sc  = (ok: boolean, warn?: boolean) => ok ? C.pos : warn ? C.amber : C.neg

// ── Common styles ──────────────────────────────────────────────────────────
const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica', fontSize: 8.5, color: C.body,
    backgroundColor: C.white, paddingBottom: 42,
  },

  // Page header band
  hdrBand: {
    backgroundColor: C.green,
    paddingHorizontal: 36, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  hdrGoldLine: { height: 2, backgroundColor: C.gold },
  hdrSection:  { fontFamily: 'Helvetica', fontSize: 7, color: '#FFFFFF99', letterSpacing: 1.4, textTransform: 'uppercase' },
  hdrClient:   { fontFamily: 'Helvetica', fontSize: 7, color: C.gold, letterSpacing: 0.5 },
  hdrBrand:    { fontFamily: 'Helvetica', fontSize: 7, color: '#FFFFFF70', letterSpacing: 1.4, textTransform: 'uppercase' },

  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 36, paddingVertical: 9,
    borderTopWidth: 0.5, borderTopColor: C.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.white,
  },
  ftL: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted },
  ftM: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold },
  ftR: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted },

  // Body
  body:    { paddingHorizontal: 36, paddingTop: 20 },
  section: { marginBottom: 16 },

  // Section heading
  secLabel: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold, letterSpacing: 1.8, textTransform: 'uppercase', marginBottom: 3 },
  secLine:  { height: 0.75, backgroundColor: C.gold, marginBottom: 12 },

  // KPI grid
  kpiRow: { flexDirection: 'row', gap: 6, marginBottom: 6 },
  kpi: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 0.5, borderColor: C.border, borderRadius: 3,
    borderTopWidth: 2, borderTopColor: C.gold,
    paddingVertical: 10, paddingHorizontal: 10,
  },
  kpiG: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 0.5, borderColor: '#A5C8A5', borderRadius: 3,
    borderTopWidth: 2, borderTopColor: C.pos,
    paddingVertical: 10, paddingHorizontal: 10,
  },
  kpiR: {
    flex: 1, backgroundColor: C.white,
    borderWidth: 0.5, borderColor: '#D4AAAA', borderRadius: 3,
    borderTopWidth: 2, borderTopColor: C.neg,
    paddingVertical: 10, paddingHorizontal: 10,
  },
  kpiLabel: { fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  kpiVal:   { fontFamily: 'Times-Roman', fontSize: 12, color: C.ink },
  kpiValG:  { fontFamily: 'Times-Roman', fontSize: 12, color: C.pos },
  kpiValR:  { fontFamily: 'Times-Roman', fontSize: 12, color: C.neg },

  // Table
  tbl:  { marginBottom: 10, borderWidth: 0.5, borderColor: C.border, borderRadius: 3, overflow: 'hidden' },
  thd:  { backgroundColor: C.green, flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10 },
  th:   { fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.white, textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  tr:   { flexDirection: 'row', paddingVertical: 5.5, paddingHorizontal: 10, borderTopWidth: 0.5, borderTopColor: C.border },
  trA:  { backgroundColor: '#F7F9F7' },
  trT:  { backgroundColor: C.greenLt, borderTopWidth: 1, borderTopColor: C.gold },
  td:   { fontFamily: 'Helvetica', fontSize: 7.5, color: C.body, flex: 1 },
  tdB:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.ink, flex: 1 },
  tdG:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.pos, flex: 1 },
  tdR:  { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.neg, flex: 1 },

  // DRE row
  dreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 7, paddingRight: 14, paddingLeft: 14,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  dreTotal: { backgroundColor: C.greenLt, borderTopWidth: 1, borderTopColor: C.gold },

  // Right panel (dark green)
  panel: {
    backgroundColor: C.green, borderRadius: 4, padding: 16, marginBottom: 10,
  },
  panelTitle: { fontFamily: 'Helvetica', fontSize: 6, color: C.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 10 },
  panelStat: { marginBottom: 10 },
  panelLabel: { fontFamily: 'Helvetica', fontSize: 5.5, color: '#FFFFFF70', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  panelVal: { fontFamily: 'Times-Roman', fontSize: 13, color: C.white },
  panelValG: { fontFamily: 'Times-Roman', fontSize: 13, color: '#7FBA7F' },
  panelValR: { fontFamily: 'Times-Roman', fontSize: 13, color: '#E88080' },
  panelDiv: { height: 0.5, backgroundColor: '#FFFFFF20', marginVertical: 6 },
})

// ── Page header ─────────────────────────────────────────────────────────────
function Hdr({ section, client, safra }: { section: string; client: string; safra: string }) {
  return (
    <>
      <View style={s.hdrBand}>
        <Text style={s.hdrSection}>{section}</Text>
        <Text style={s.hdrClient}>{client} · Safra {safra}</Text>
        <Text style={s.hdrBrand}>AF Gestão & Consultoria</Text>
      </View>
      <View style={s.hdrGoldLine} />
    </>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Ftr({ client, date, hora }: { client: string; date: string; hora?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.ftL}>AF Gestão & Consultoria · Campo Grande/MS</Text>
      <Text style={s.ftM}>www.afgestaoeconsultoria.com.br</Text>
      <Text style={s.ftR} render={({ pageNumber, totalPages }) =>
        `${client} · ${date}${hora ? ` às ${hora}` : ''} · Pág. ${pageNumber}/${totalPages}`
      } />
    </View>
  )
}

// ── Section heading ─────────────────────────────────────────────────────────
function Sec({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 12 }}>
      <Text style={s.secLabel}>{title}</Text>
      <View style={s.secLine} />
    </View>
  )
}

// ── Cover ──────────────────────────────────────────────────────────────────
function Cover({ data, recBruta }: { data: RelatorioCompletoAgroData; recBruta: number }) {
  const pl = data.patrimonioGruto - data.totalOnus
  const resOp = recBruta  // placeholder reference

  return (
    <Page size="A4" style={{ fontFamily: 'Helvetica', backgroundColor: C.white }}>
      {/* Top gold stripe */}
      <View style={{ height: 3, backgroundColor: C.gold }} />

      {/* Split layout: content left, dark green panel right */}
      <View style={{ flexDirection: 'row', flex: 1 }}>

        {/* LEFT — white content */}
        <View style={{ flex: 1, paddingTop: 52, paddingLeft: 44, paddingRight: 28, paddingBottom: 44 }}>

          {/* Brand label */}
          <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4 }}>
            AF Gestão & Consultoria
          </Text>
          <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted, fontStyle: 'italic', marginBottom: 28 }}>
            apresenta
          </Text>
          <View style={{ width: 36, height: 1.5, backgroundColor: C.gold, marginBottom: 22 }} />

          {/* Main title */}
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 30, color: C.ink, lineHeight: 1.15, marginBottom: 4 }}>
            Relatório Agro
          </Text>
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 30, color: C.green, lineHeight: 1.15 }}>
            360° Completo
          </Text>
          <View style={{ width: 36, height: 1.5, backgroundColor: C.gold, marginTop: 20, marginBottom: 22 }} />

          {/* Client info */}
          <Text style={{ fontFamily: 'Times-Roman', fontSize: 14, color: C.ink, marginBottom: 4 }}>
            {data.clientName}
          </Text>
          {data.clientCity && (
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8.5, color: C.muted, marginBottom: 2 }}>
              {data.clientCity}
            </Text>
          )}
          <Text style={{ fontFamily: 'Helvetica', fontSize: 8.5, color: C.muted }}>
            Safra {data.safra} · {data.areaTotal.toLocaleString('pt-BR')} ha
          </Text>

          {/* Quote — bottom */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: 'Times-Roman', fontSize: 20, color: C.gold, marginBottom: 6 }}>"</Text>
            <Text style={{ fontFamily: 'Times-Roman', fontSize: 9.5, color: C.body, fontStyle: 'italic', lineHeight: 1.7 }}>
              Todo grande negócio rural começa{'\n'}
              com decisões baseadas em dados.
            </Text>
          </View>
        </View>

        {/* RIGHT — dark green panel */}
        <View style={{ width: 195, backgroundColor: C.green, paddingTop: 52, paddingHorizontal: 24, paddingBottom: 44 }}>
          {/* Diagonal gold accent line — simulated with thin border */}
          <View style={{ position: 'absolute', top: 0, left: -1, bottom: 0, width: 1, backgroundColor: C.gold }} />

          {/* Rating badge */}
          <View style={{
            backgroundColor: data.ratingColor, borderRadius: 4,
            paddingHorizontal: 12, paddingVertical: 10, marginBottom: 30, alignSelf: 'flex-start',
          }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: '#FFFFFF99', letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 3 }}>
              Diagnóstico Geral
            </Text>
            <Text style={{ fontFamily: 'Times-Roman', fontSize: 16, color: C.white }}>{data.ratingLabel}</Text>
          </View>

          {/* Stats */}
          {[
            { label: 'Receita Bruta', value: R(recBruta), color: '#7FBA7F' },
            { label: 'Endividamento Total', value: R(data.totalEndividamento), color: C.white },
            { label: 'Patrimônio Líquido', value: R(pl), color: '#7FBA7F' },
            { label: 'Margem Operacional', value: pct(data.margem), color: data.margem >= 20 ? '#7FBA7F' : '#E88080' },
            { label: 'Capacidade de Pagamento', value: xv(data.capPagamento), color: data.capPagamento > 1.5 ? '#7FBA7F' : '#E88080' },
            { label: 'Solvência', value: xv(data.solvencia), color: data.solvencia > 2 ? '#7FBA7F' : '#E88080' },
          ].map((stat, i) => (
            <View key={i} style={s.panelStat}>
              <Text style={s.panelLabel}>{stat.label}</Text>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: stat.color }}>{stat.value}</Text>
              {i < 5 && <View style={s.panelDiv} />}
            </View>
          ))}

          {/* Footer inside panel */}
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: '#FFFFFF50', letterSpacing: 0.5, marginBottom: 2 }}>
              {data.dataGeracao}{data.horaGeracao ? ` às ${data.horaGeracao}` : ''}
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.gold }}>
              www.afgestaoeconsultoria.com.br
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: '#FFFFFF40', marginTop: 2 }}>
              Campo Grande/MS · Confidencial
            </Text>
          </View>
        </View>
      </View>
    </Page>
  )
}

// ── MAIN ───────────────────────────────────────────────────────────────────
export function RelatorioCompletoAgroPDF({ data }: { data: RelatorioCompletoAgroData }) {
  const cc = data.culturas.map(c => {
    const rb  = c.area * c.produtividade * c.cotacao
    const cu  = c.area * c.custoPorHa * c.cotacao + c.areaArrendada * c.custoArrendHa * (c.cotacao || 1)
    const res = rb - cu
    const mg  = rb > 0 ? res / rb * 100 : 0
    const pe  = c.cotacao > 0 ? (c.custoPorHa + (c.area > 0 ? c.custoArrendHa * c.areaArrendada / c.area : 0)) : 0
    return { ...c, rb, cu, res, mg, pe }
  })
  const recBruta   = cc.reduce((a, c) => a + c.rb, 0)
  const custoTotal = cc.reduce((a, c) => a + c.cu, 0)
  const resOp      = recBruta - custoTotal
  const resPos     = resOp - data.servicoAnual
  const h          = data.horaGeracao
  const pl         = data.patrimonioGruto - data.totalOnus

  const COR: Record<string, string> = { Pessimista: C.neg, Base: '#1565C0', Otimista: C.pos }

  return (
    <Document title={`Relatório Agro 360° — ${data.clientName}`} author="AF Gestão & Consultoria">

      {/* ══ CAPA ══ */}
      <Cover data={data} recBruta={recBruta} />

      {/* ══ PÁG 1 — RESUMO EXECUTIVO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Resumo Executivo" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {/* Rating strip */}
          <View style={{
            flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
            backgroundColor: data.ratingColor, borderRadius: 4,
            paddingHorizontal: 16, paddingVertical: 11, marginBottom: 16,
          }}>
            <View>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: '#FFFFFF99', letterSpacing: 1.2, textTransform: 'uppercase', marginBottom: 3 }}>
                Diagnóstico Geral · {data.clientName}
              </Text>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 17, color: C.white }}>{data.ratingLabel}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: '#FFFFFF70', marginBottom: 2 }}>Área Total</Text>
              <Text style={{ fontFamily: 'Times-Roman', fontSize: 18, color: C.gold }}>{data.areaTotal.toLocaleString('pt-BR')} ha</Text>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: '#FFFFFF70', marginTop: 2 }}>
                Consultor: {data.consultorName} · {data.dataGeracao}
              </Text>
            </View>
          </View>

          {/* KPIs */}
          <Sec title="Resumo Financeiro — Safra" />
          <View style={s.kpiRow}>
            <View style={s.kpiG}><Text style={s.kpiLabel}>Receita Bruta</Text><Text style={s.kpiValG}>{R(recBruta)}</Text></View>
            <View style={s.kpi}><Text style={s.kpiLabel}>Custo de Produção</Text><Text style={s.kpiVal}>{R(custoTotal)}</Text></View>
            <View style={resOp >= 0 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Resultado Operacional</Text><Text style={resOp >= 0 ? s.kpiValG : s.kpiValR}>{R(resOp)}</Text></View>
            <View style={data.margem >= 20 ? s.kpiG : s.kpi}><Text style={s.kpiLabel}>Margem Operacional</Text><Text style={data.margem >= 20 ? s.kpiValG : s.kpiVal}>{pct(data.margem)}</Text></View>
          </View>
          <View style={s.kpiRow}>
            <View style={s.kpi}><Text style={s.kpiLabel}>Serviço da Dívida/ano</Text><Text style={s.kpiVal}>{R(data.servicoAnual)}</Text></View>
            <View style={resPos >= 0 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Resultado após Endivid.</Text><Text style={resPos >= 0 ? s.kpiValG : s.kpiValR}>{R(resPos)}</Text></View>
            <View style={data.alavancagem > 50 ? s.kpiR : s.kpi}><Text style={s.kpiLabel}>Endividamento Total</Text><Text style={data.alavancagem > 50 ? s.kpiValR : s.kpiVal}>{R(data.totalEndividamento)}</Text></View>
            <View style={s.kpiG}><Text style={s.kpiLabel}>Patrimônio Líquido</Text><Text style={s.kpiValG}>{R(pl)}</Text></View>
          </View>

          {/* Indicadores */}
          <Sec title="Indicadores Financeiros" />
          <View style={s.tbl}>
            <View style={s.thd}>
              <Text style={{ ...s.th, flex: 2 }}>Indicador</Text>
              <Text style={s.th}>Valor</Text>
              <Text style={s.th}>Referência</Text>
              <Text style={s.th}>Status</Text>
            </View>
            {[
              { ind: 'Margem Operacional',        val: pct(data.margem),       ref: '≥ 20%',  ok: data.margem >= 20,      at: data.margem >= 10 },
              { ind: 'Alavancagem (Dív./Patr.)',  val: pct(data.alavancagem),  ref: '< 30%',  ok: data.alavancagem < 30,  at: data.alavancagem < 50 },
              { ind: 'Solvência (Patr./Dív.)',    val: xv(data.solvencia),     ref: '> 2,0x', ok: data.solvencia > 2,     at: data.solvencia > 1 },
              { ind: 'Endivid./Receita Bruta',    val: xv(data.endivReceita),  ref: '< 1,0x', ok: data.endivReceita < 1,  at: data.endivReceita < 2 },
              { ind: 'Capacidade de Pagamento',   val: xv(data.capPagamento),  ref: '> 1,5x', ok: data.capPagamento > 1.5, at: data.capPagamento > 1 },
            ].map((row, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                <Text style={{ ...s.tdB, flex: 2 }}>{row.ind}</Text>
                <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: sc(row.ok, row.at) }}>{row.val}</Text>
                <Text style={{ ...s.td, color: C.muted }}>{row.ref}</Text>
                <Text style={{ ...s.td, color: sc(row.ok, row.at), fontFamily: 'Helvetica-Bold' }}>
                  {row.ok ? '✓ Saudável' : row.at ? '⚠ Atenção' : '✗ Risco'}
                </Text>
              </View>
            ))}
          </View>

          {/* Culturas */}
          <Sec title="Resultado por Cultura" />
          <View style={s.tbl}>
            <View style={s.thd}>
              {['Cultura', 'Área', 'Produt.', 'Cotação', 'Receita', 'Custo', 'Resultado', 'Margem', 'P.E.'].map((h2, i) => (
                <Text key={i} style={{ ...s.th, flex: i === 0 ? 1.3 : 1, fontSize: 5.5 }}>{h2}</Text>
              ))}
            </View>
            {cc.map((c, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                <Text style={{ ...s.tdB, flex: 1.3, fontSize: 7 }}>{c.cultura}</Text>
                <Text style={{ ...s.td, fontSize: 7 }}>{c.area.toLocaleString('pt-BR')}</Text>
                <Text style={{ ...s.td, fontSize: 7 }}>{c.produtividade} sc</Text>
                <Text style={{ ...s.td, fontSize: 7 }}>R$ {c.cotacao}</Text>
                <Text style={{ ...s.td, fontSize: 7, color: C.pos }}>{R(c.rb)}</Text>
                <Text style={{ ...s.td, fontSize: 7, color: C.neg }}>{R(c.cu)}</Text>
                <Text style={{ ...s.td, fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.res >= 0 ? C.pos : C.neg }}>{R(c.res)}</Text>
                <Text style={{ ...s.td, fontSize: 7, color: c.mg >= 20 ? C.pos : c.mg >= 10 ? C.amber : C.neg }}>{pct(c.mg)}</Text>
                <Text style={{ ...s.td, fontSize: 7 }}>{c.pe.toFixed(1)} sc</Text>
              </View>
            ))}
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 2 — DRE + ANÁLISE POR HECTARE ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="DRE Rural · Análise por Hectare" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {/* Split: DRE left + summary panel right */}
          <View style={{ flexDirection: 'row', gap: 14, marginBottom: 16 }}>
            {/* DRE */}
            <View style={{ flex: 1 }}>
              <Sec title="Demonstrativo de Resultado Rural" />
              <View style={{ borderWidth: 0.5, borderColor: C.border, borderRadius: 3, overflow: 'hidden' }}>
                {[
                  { l: 'Receita Bruta',             v: recBruta,           neg: false, total: false, sub: false },
                  { l: '(-) Custo de Produção',      v: custoTotal,         neg: true,  total: false, sub: true  },
                  { l: '= Resultado Operacional',    v: resOp,              neg: false, total: true,  sub: false },
                  { l: '(-) Serviço da Dívida/ano',  v: data.servicoAnual,  neg: true,  total: false, sub: true  },
                  { l: '= Resultado após Endivid.',  v: resPos,             neg: false, total: true,  sub: false },
                ].map((row, i) => (
                  <View key={i} style={[
                    s.dreRow,
                    row.total ? s.dreTotal : {},
                    i % 2 === 0 && !row.total ? { backgroundColor: '#F7F9F7' } : {},
                  ]}>
                    <Text style={{
                      fontFamily: row.total ? 'Helvetica-Bold' : 'Helvetica',
                      fontSize: 8, color: C.body,
                      paddingLeft: row.sub ? 14 : 0,
                    }}>{row.l}</Text>
                    <Text style={{
                      fontFamily: row.total ? 'Helvetica-Bold' : 'Helvetica',
                      fontSize: 8,
                      color: row.neg ? C.neg : row.v >= 0 ? C.pos : C.neg,
                    }}>{row.neg ? `(${R(row.v)})` : R(row.v)}</Text>
                  </View>
                ))}
              </View>
            </View>

            {/* Right green panel */}
            <View style={{ width: 155 }}>
              <View style={s.panel}>
                <Text style={s.panelTitle}>Posição Patrimonial</Text>
                {[
                  { label: 'Patrimônio Bruto',   value: R(data.patrimonioGruto), color: C.white },
                  { label: 'Ônus / Alienações',  value: R(data.totalOnus),       color: data.totalOnus > 0 ? '#E88080' : '#FFFFFF70' },
                  { label: 'Patrimônio Líquido', value: R(pl),                   color: '#7FBA7F' },
                  { label: 'Cobertura da Dívida', value: xv(data.solvencia),     color: data.solvencia > 2 ? '#7FBA7F' : '#E88080' },
                  { label: 'Alavancagem',         value: pct(data.alavancagem),  color: data.alavancagem < 30 ? '#7FBA7F' : '#E88080' },
                ].map((stat, i) => (
                  <View key={i}>
                    {i > 0 && <View style={s.panelDiv} />}
                    <Text style={s.panelLabel}>{stat.label}</Text>
                    <Text style={{ fontFamily: 'Times-Roman', fontSize: 11, color: stat.color }}>{stat.value}</Text>
                  </View>
                ))}
              </View>
            </View>
          </View>

          {/* Análise por hectare */}
          <Sec title="Análise por Hectare" />
          <View style={s.tbl}>
            <View style={s.thd}>
              <Text style={{ ...s.th, flex: 2 }}>Indicador</Text>
              <Text style={s.th}>Total</Text>
              <Text style={s.th}>Por Hectare</Text>
              <Text style={{ ...s.th, flex: 1.5 }}>Referência Saudável</Text>
            </View>
            {data.areaTotal > 0 && [
              { l: 'Receita Bruta',          tot: recBruta,                 ha: recBruta / data.areaTotal,                 ref: '> R$ 4.500/ha' },
              { l: 'Custo de Produção',       tot: custoTotal,               ha: custoTotal / data.areaTotal,               ref: '< R$ 3.500/ha' },
              { l: 'Resultado Operacional',   tot: resOp,                    ha: resOp / data.areaTotal,                    ref: '> R$ 500/ha'   },
              { l: 'Serviço da Dívida',       tot: data.servicoAnual,        ha: data.servicoAnual / data.areaTotal,        ref: '< R$ 800/ha'   },
              { l: 'Resultado após Endivid.', tot: resPos,                   ha: resPos / data.areaTotal,                   ref: '> R$ 0/ha'     },
              { l: 'Saldo Devedor Bancário',  tot: data.totalEndividamento,  ha: data.totalEndividamento / data.areaTotal,  ref: '< R$ 3.000/ha' },
            ].map((row, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                <Text style={{ ...s.tdB, flex: 2 }}>{row.l}</Text>
                <Text style={s.td}>{R(row.tot)}</Text>
                <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: row.ha >= 0 ? C.pos : C.neg }}>{R(row.ha)}</Text>
                <Text style={{ ...s.td, flex: 1.5, color: C.muted }}>{row.ref}</Text>
              </View>
            ))}
          </View>

          {/* Patrimônio table */}
          {data.patrimonio.length > 0 && (
            <>
              <Sec title="Patrimônio Rural" />
              <View style={s.tbl}>
                <View style={s.thd}>
                  <Text style={s.th}>Categoria</Text>
                  <Text style={{ ...s.th, flex: 2.5 }}>Bem / Descrição</Text>
                  <Text style={s.th}>Valor Avaliado</Text>
                  <Text style={s.th}>Situação</Text>
                </View>
                {data.patrimonio.slice(0, 12).map((p, i) => (
                  <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                    <Text style={s.td}>{p.categoria}</Text>
                    <Text style={{ ...s.td, flex: 2.5 }}>{p.descricao}</Text>
                    <Text style={s.tdB}>{R(p.valorAvaliado)}</Text>
                    <Text style={{ ...s.td, color: p.possuiOnus ? C.neg : C.pos }}>
                      {p.possuiOnus ? `Ônus: ${R(p.valorOnus)}` : 'Livre'}
                    </Text>
                  </View>
                ))}
                {data.patrimonio.length > 12 && (
                  <View style={s.tr}>
                    <Text style={{ ...s.td, color: C.muted, flex: 4 }}>
                      + {data.patrimonio.length - 12} bens patrimoniais adicionais
                    </Text>
                  </View>
                )}
                <View style={[s.tr, s.trT]}>
                  <Text style={s.tdB}>Total</Text>
                  <Text style={{ ...s.td, flex: 2.5 }} />
                  <Text style={{ ...s.tdG }}>{R(data.patrimonioGruto)}</Text>
                  <Text style={{ ...s.td, color: data.totalOnus > 0 ? C.neg : C.muted }}>
                    {data.totalOnus > 0 ? `Ônus: ${R(data.totalOnus)}` : 'Sem ônus'}
                  </Text>
                </View>
              </View>
            </>
          )}
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 3 — CONTRATOS ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Contratos de Crédito Rural" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          <Sec title="Carteira de Financiamentos" />
          <View style={s.tbl}>
            <View style={s.thd}>
              {['Instituição', 'Modalidade', 'Valor Tomado', 'Parcela', 'Taxa a.a.', 'Parcelas', 'Vencimento'].map((h2, i) => (
                <Text key={i} style={{ ...s.th, flex: ['Instituição', 'Modalidade'].includes(h2) ? 1.5 : 1 }}>{h2}</Text>
              ))}
            </View>
            {data.contratos.map((c, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                <Text style={{ ...s.tdB, flex: 1.5 }}>{c.banco}</Text>
                <Text style={{ ...s.td, flex: 1.5, fontSize: 7 }}>{c.modalidade}</Text>
                <Text style={s.tdB}>{R(c.valorTomado)}</Text>
                <Text style={s.td}>{R(c.valorParcela)}</Text>
                <Text style={s.td}>{(c.taxa * (c.taxa < 1 ? 100 : 1)).toFixed(2)}%</Text>
                <Text style={s.td}>{c.parcelaAtual}/{c.totalParcelas}</Text>
                <Text style={s.td}>{c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—'}</Text>
              </View>
            ))}
            <View style={[s.tr, s.trT]}>
              <Text style={{ ...s.tdB, flex: 1.5 }}>Total</Text>
              <Text style={{ ...s.td, flex: 1.5 }} />
              <Text style={s.tdG}>{R(data.totalEndividamento)}</Text>
              <Text style={s.tdR}>{R(data.servicoAnual)}/ano</Text>
              <Text style={s.td} /><Text style={s.td} /><Text style={s.td} />
            </View>
          </View>

          {/* Passivo summary — split layout */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <Sec title="Estrutura do Passivo" />
              <View style={s.kpiRow}>
                <View style={s.kpi}><Text style={s.kpiLabel}>Saldo Devedor</Text><Text style={s.kpiVal}>{R(data.totalEndividamento)}</Text></View>
                <View style={s.kpiR}><Text style={s.kpiLabel}>Serviço Anual</Text><Text style={s.kpiValR}>{R(data.servicoAnual)}</Text></View>
              </View>
              <View style={s.kpiRow}>
                <View style={data.alavancagem < 30 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Alavancagem</Text><Text style={data.alavancagem < 30 ? s.kpiValG : s.kpiValR}>{pct(data.alavancagem)}</Text></View>
                <View style={data.capPagamento > 1.5 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Cap. de Pagamento</Text><Text style={data.capPagamento > 1.5 ? s.kpiValG : s.kpiValR}>{xv(data.capPagamento)}</Text></View>
              </View>
              <View style={s.kpiRow}>
                <View style={data.endivReceita < 1 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Endivid./Receita</Text><Text style={data.endivReceita < 1 ? s.kpiValG : s.kpiValR}>{xv(data.endivReceita)}</Text></View>
                <View style={data.solvencia > 2 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Solvência</Text><Text style={data.solvencia > 2 ? s.kpiValG : s.kpiValR}>{xv(data.solvencia)}</Text></View>
              </View>
            </View>
            {/* Observações no painel verde */}
            <View style={{ width: 170 }}>
              <View style={s.panel}>
                <Text style={s.panelTitle}>Avaliação da Dívida</Text>
                <View style={s.panelStat}>
                  <Text style={s.panelLabel}>Número de Contratos</Text>
                  <Text style={{ fontFamily: 'Times-Roman', fontSize: 13, color: C.white }}>{data.contratos.length}</Text>
                </View>
                <View style={s.panelDiv} />
                <View style={s.panelStat}>
                  <Text style={s.panelLabel}>Maior Credor</Text>
                  <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.white }}>
                    {data.contratos.length > 0
                      ? data.contratos.reduce((a, b) => a.valorTomado > b.valorTomado ? a : b).banco
                      : '—'}
                  </Text>
                </View>
                <View style={s.panelDiv} />
                <View style={s.panelStat}>
                  <Text style={s.panelLabel}>Maior Contrato</Text>
                  <Text style={{ fontFamily: 'Times-Roman', fontSize: 11, color: C.goldLt }}>
                    {data.contratos.length > 0
                      ? R(Math.max(...data.contratos.map(c => c.valorTomado)))
                      : '—'}
                  </Text>
                </View>
                <View style={s.panelDiv} />
                <View style={s.panelStat}>
                  <Text style={s.panelLabel}>Receita Comprometida</Text>
                  <Text style={{ fontFamily: 'Times-Roman', fontSize: 13, color: recBruta > 0 ? (data.servicoAnual / recBruta > 0.3 ? '#E88080' : '#7FBA7F') : C.white }}>
                    {recBruta > 0 ? pct(data.servicoAnual / recBruta * 100) : '—'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 4 — CENÁRIOS + PROJEÇÃO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Cenários · Projeção 10 Anos" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {data.cenarios.length > 0 && (
            <>
              <Sec title="Simulação de Cenários — Próximos 10 Anos" />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 18 }}>
                {data.cenarios.map(c => (
                  <View key={c.nome} style={{
                    flex: 1, backgroundColor: C.white,
                    borderWidth: 0.5, borderColor: C.border, borderRadius: 3,
                    borderTopWidth: 2.5, borderTopColor: COR[c.nome] ?? C.muted,
                    padding: 13,
                  }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: COR[c.nome] ?? C.muted, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
                      {c.nome}
                    </Text>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                      Resultado 10 Anos
                    </Text>
                    <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: c.resultadoTotal10Anos >= 0 ? C.pos : C.neg, marginBottom: 10 }}>
                      {R(c.resultadoTotal10Anos)}
                    </Text>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                      Anos Positivos
                    </Text>
                    <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: c.anosPositivos >= 7 ? C.pos : c.anosPositivos >= 5 ? C.amber : C.neg, marginBottom: 10 }}>
                      {c.anosPositivos} de 10
                    </Text>
                    <View style={{ height: 0.5, backgroundColor: C.border, marginBottom: 8 }} />
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.body, lineHeight: 1.5 }}>{c.veredicto}</Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {data.projecaoAnos.length > 0 && (
            <>
              <Sec title="Projeção Anual — Cenário Base" />
              <View style={s.tbl}>
                <View style={s.thd}>
                  {['Ano', 'Receita Bruta', 'Resultado Líquido', 'Situação'].map(h2 => (
                    <Text key={h2} style={s.th}>{h2}</Text>
                  ))}
                </View>
                {data.projecaoAnos.map((r, i) => (
                  <View key={r.ano} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                    <Text style={s.tdB}>{r.ano}</Text>
                    <Text style={{ ...s.td, color: C.pos }}>{R(r.recBruta)}</Text>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: r.resultadoLiquido >= 0 ? C.pos : C.neg }}>{R(r.resultadoLiquido)}</Text>
                    <Text style={{ ...s.td, color: r.resultadoLiquido >= 0 ? C.pos : C.neg }}>
                      {r.resultadoLiquido >= 0 ? '✓ Positivo' : '✗ Negativo'}
                    </Text>
                  </View>
                ))}
                <View style={[s.tr, s.trT]}>
                  <Text style={s.tdB}>Total 10 Anos</Text>
                  <Text style={s.tdG}>{R(data.projecaoAnos.reduce((a, r) => a + r.recBruta, 0))}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: data.projecao10Anos >= 0 ? C.pos : C.neg }}>{R(data.projecao10Anos)}</Text>
                  <Text style={{ ...s.td, color: C.muted }}>{data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length} de 10 positivos</Text>
                </View>
              </View>
            </>
          )}

          {/* Parecer — panel + text */}
          <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
            <View style={{ width: 120 }}>
              <View style={{ ...s.panel, alignItems: 'center', paddingVertical: 20 }}>
                <Text style={{ fontFamily: 'Times-Roman', fontSize: 28, color: C.gold, marginBottom: 4 }}>AF</Text>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.white, textAlign: 'center', lineHeight: 1.5, marginBottom: 8 }}>
                  Gestão &{'\n'}Consultoria
                </Text>
                <View style={{ width: 40, height: 0.5, backgroundColor: C.gold, marginBottom: 8 }} />
                <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.gold, textAlign: 'center', letterSpacing: 0.8, textTransform: 'uppercase' }}>
                  PLANEJAMENTO{'\n'}ESTRATÉGIA{'\n'}RESULTADOS
                </Text>
              </View>
            </View>
            <View style={{ flex: 1 }}>
              <Sec title="Parecer Consultivo" />
              <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.body, lineHeight: 1.7, marginBottom: 8 }}>
                A propriedade <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.clientName}</Text> apresenta receita bruta de {R(recBruta)} e resultado operacional de {R(resOp)}, com margem de {pct(data.margem)}. O endividamento total de {R(data.totalEndividamento)} representa {pct(data.alavancagem)} do patrimônio bruto, com solvência de {xv(data.solvencia)}.
              </Text>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.body, lineHeight: 1.7, marginBottom: 8 }}>
                Após o serviço da dívida de {R(data.servicoAnual)}/ano, o resultado disponível é {R(resPos)} — {resPos >= 0
                  ? 'indicando capacidade de honrar os compromissos com a receita da safra.'
                  : 'indicando insuficiência de caixa operacional. Recomenda-se atenção imediata à renegociação do passivo.'}
              </Text>
              <View style={{ backgroundColor: C.greenLt, borderLeftWidth: 2, borderLeftColor: C.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2 }}>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.green, lineHeight: 1.6 }}>
                  Relatório gerado em {data.dataGeracao}{data.horaGeracao ? ` às ${data.horaGeracao}` : ''} por {data.consultorName} · AF Gestão & Consultoria · Campo Grande/MS
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>
    </Document>
  )
}
