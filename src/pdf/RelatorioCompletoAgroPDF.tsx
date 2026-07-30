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
  cream:    '#F4EFE6',   // warm off-white page background
  white:    '#FFFFFF',
  gold:     '#B8975A',   // AF brand gold — muted, elegant
  goldMid:  '#D4B87A',   // lighter gold for accents
  goldLine: '#C8A86A',
  ink:      '#232318',   // near-black for headings
  body:     '#3A3A32',   // body text
  muted:    '#7A7A6A',   // labels, secondary
  border:   '#D8D2C4',   // very subtle warm border
  positive: '#2B5929',   // deep forest green (numbers only)
  negative: '#8B1A1A',   // deep burgundy (numbers only)
  amber:    '#7A5020',
  strip:    '#E8E0D0',   // thin top strip on content pages
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  coverPage: {
    fontFamily: 'Times-Roman',
    backgroundColor: C.cream,
  },
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.body,
    backgroundColor: C.cream,
    paddingBottom: 44,
  },
  body: { paddingHorizontal: 44, paddingTop: 26 },

  // ── Cover elements ──
  coverCorner: { position: 'absolute', width: 14, height: 14, borderColor: C.gold },
  coverSidebar: {
    position: 'absolute', left: 0, top: 0, bottom: 0, width: 28,
    backgroundColor: C.strip,
    alignItems: 'center', justifyContent: 'center',
  },
  coverSidebarText: {
    fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted,
    letterSpacing: 1.2, textTransform: 'uppercase',
  },

  // ── Page header ──
  pageHeader: {
    backgroundColor: C.strip,
    paddingHorizontal: 44, paddingVertical: 9,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderBottomWidth: 0.75, borderBottomColor: C.gold,
  },
  pageHeaderSection: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },
  pageHeaderBrand:   { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase' },

  // ── Footer ──
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 44, paddingVertical: 10,
    borderTopWidth: 0.5, borderTopColor: C.border,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: C.cream,
  },
  footerLeft:  { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted },
  footerMid:   { fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold },
  footerRight: { fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted },

  // ── Section title ──
  sectionTitle: {
    fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold,
    letterSpacing: 1.8, textTransform: 'uppercase',
    marginBottom: 3, marginTop: 0,
  },
  sectionRule: {
    height: 0.5, backgroundColor: C.goldLine, marginBottom: 14,
  },

  // ── KPI ──
  kpiRow: { flexDirection: 'row', gap: 6, marginBottom: 10 },
  kpiBox: {
    flex: 1, paddingVertical: 11, paddingHorizontal: 12,
    borderWidth: 0.5, borderColor: C.border, borderRadius: 2,
    backgroundColor: C.white,
  },
  kpiLabel: { fontFamily: 'Helvetica', fontSize: 6, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 5 },
  kpiVal:   { fontFamily: 'Times-Roman', fontSize: 13, color: C.ink },
  kpiValPos: { fontFamily: 'Times-Roman', fontSize: 13, color: C.positive },
  kpiValNeg: { fontFamily: 'Times-Roman', fontSize: 13, color: C.negative },

  // ── Table ──
  table:  { marginBottom: 10 },
  thead:  {
    flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10,
    borderBottomWidth: 0.75, borderBottomColor: C.gold,
    backgroundColor: C.strip,
  },
  th: { fontFamily: 'Helvetica', fontSize: 6, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, flex: 1 },
  tr: {
    flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  trAlt: { backgroundColor: C.white },
  trTotal: { backgroundColor: C.strip, borderTopWidth: 0.75, borderTopColor: C.gold },
  td:     { fontFamily: 'Helvetica', fontSize: 7.5, color: C.body, flex: 1 },
  tdBold: { fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.ink, flex: 1 },
  tdPos:  { fontFamily: 'Helvetica', fontSize: 7.5, color: C.positive, flex: 1 },
  tdNeg:  { fontFamily: 'Helvetica', fontSize: 7.5, color: C.negative, flex: 1 },

  // ── DRE rows ──
  dreRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    paddingVertical: 6.5, paddingHorizontal: 12,
    borderBottomWidth: 0.5, borderBottomColor: C.border,
  },
  dreTotal: { backgroundColor: C.strip, borderBottomWidth: 0.75, borderBottomColor: C.gold },
})

// ── Formatters ─────────────────────────────────────────────────────────────
const R = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const pct = (v: number) => `${Number(v).toFixed(1)}%`
const xv  = (v: number) => isFinite(v) && !isNaN(v) ? `${v.toFixed(2)}x` : '—'
const sc  = (ok: boolean, warn?: boolean) => ok ? C.positive : warn ? C.amber : C.negative

// ── Logo block ─────────────────────────────────────────────────────────────
function Logo({ dark = false }: { dark?: boolean }) {
  const textColor = dark ? C.white : C.ink
  return (
    <View style={{ alignItems: 'center' }}>
      <Text style={{ fontFamily: 'Times-Roman', fontSize: 28, color: C.gold, letterSpacing: -1 }}>AF</Text>
      <Text style={{ fontFamily: 'Times-Roman', fontSize: 10.5, color: textColor, marginTop: -2, letterSpacing: 0.5 }}>Gestão & Consultoria</Text>
      <View style={{ width: 120, height: 0.5, backgroundColor: C.gold, marginTop: 6, marginBottom: 6 }} />
      <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.gold, letterSpacing: 2.5, textTransform: 'uppercase' }}>PLANEJAMENTO · ESTRATÉGIA · RESULTADOS</Text>
    </View>
  )
}

// ── Page header ─────────────────────────────────────────────────────────────
function Hdr({ section, client, date }: { section: string; client: string; date: string }) {
  return (
    <View style={s.pageHeader}>
      <Text style={s.pageHeaderSection}>{section}</Text>
      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted }}>{client} · Safra {date}</Text>
      <Text style={s.pageHeaderBrand}>AF Gestão & Consultoria</Text>
    </View>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Ftr({ client, date, hora }: { client: string; date: string; hora?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerLeft}>AF Gestão & Consultoria · Campo Grande/MS</Text>
      <Text style={s.footerMid}>www.afgestaoeconsultoria.com.br</Text>
      <Text style={s.footerRight} render={({ pageNumber, totalPages }) =>
        `${client} · Gerado em ${date}${hora ? ` às ${hora}` : ''} · ${pageNumber}/${totalPages}`
      } />
    </View>
  )
}

// ── Section heading ─────────────────────────────────────────────────────────
function Section({ title }: { title: string }) {
  return (
    <View style={{ marginBottom: 12, marginTop: 4 }}>
      <Text style={s.sectionTitle}>{title}</Text>
      <View style={s.sectionRule} />
    </View>
  )
}

// ── Cover ──────────────────────────────────────────────────────────────────
function Cover({ data, recBruta }: { data: RelatorioCompletoAgroData; recBruta: number }) {
  const pl = data.patrimonioGruto - data.totalOnus
  return (
    <Page size="A4" style={s.coverPage}>
      {/* Left sidebar strip */}
      <View style={s.coverSidebar}>
        <Text style={s.coverSidebarText}>
          MATERIAL CONFIDENCIAL · AF GESTÃO & CONSULTORIA
        </Text>
      </View>

      {/* Corner marks */}
      <View style={[s.coverCorner, { top: 36, left: 52, borderTopWidth: 0.75, borderLeftWidth: 0.75 }]} />
      <View style={[s.coverCorner, { top: 36, right: 36, borderTopWidth: 0.75, borderRightWidth: 0.75 }]} />
      <View style={[s.coverCorner, { bottom: 36, left: 52, borderBottomWidth: 0.75, borderLeftWidth: 0.75 }]} />
      <View style={[s.coverCorner, { bottom: 36, right: 36, borderBottomWidth: 0.75, borderRightWidth: 0.75 }]} />

      {/* Gold top accent */}
      <View style={{ height: 3, backgroundColor: C.gold, marginLeft: 28 }} />

      {/* Logo centered */}
      <View style={{ marginLeft: 28, paddingTop: 70, alignItems: 'center' }}>
        <Logo />
      </View>

      {/* Label + title */}
      <View style={{ marginLeft: 28, paddingHorizontal: 60, paddingTop: 58 }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.gold, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 5 }}>
          Área Especializada
        </Text>
        <View style={{ width: 260, height: 0.5, backgroundColor: C.border, marginBottom: 18 }} />

        <Text style={{ fontFamily: 'Times-Roman', fontSize: 26, color: C.ink, lineHeight: 1.2 }}>
          Relatório Agro
        </Text>
        <Text style={{ fontFamily: 'Times-Roman', fontSize: 26, color: C.gold, lineHeight: 1.2, fontStyle: 'italic' }}>
          360° Completo
        </Text>
        <View style={{ width: 60, height: 0.75, backgroundColor: C.gold, marginTop: 18, marginBottom: 22 }} />

        <Text style={{ fontFamily: 'Helvetica', fontSize: 10, color: C.body, lineHeight: 1.6 }}>
          {data.clientName}
        </Text>
        {data.clientCity && (
          <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.muted, marginTop: 2 }}>
            {data.clientCity}
          </Text>
        )}
        <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.muted, marginTop: 2 }}>
          Safra {data.safra} · {data.areaTotal.toLocaleString('pt-BR')} ha
        </Text>
      </View>

      {/* Quick stats — 3 columns */}
      <View style={{ marginLeft: 28, paddingHorizontal: 60, paddingTop: 48, flexDirection: 'row', gap: 0 }}>
        {[
          { label: 'Receita Bruta', value: R(recBruta), col: C.positive },
          { label: 'Endividamento Total', value: R(data.totalEndividamento), col: C.ink },
          { label: 'Patrimônio Líquido', value: R(pl), col: C.positive },
        ].map((stat, i) => (
          <View key={i} style={{ flex: 1, paddingRight: 20 }}>
            <View style={{ height: 1, backgroundColor: i === 0 ? C.gold : C.border, marginBottom: 8 }} />
            <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 5 }}>
              {stat.label}
            </Text>
            <Text style={{ fontFamily: 'Times-Roman', fontSize: 11, color: stat.col }}>
              {stat.value}
            </Text>
          </View>
        ))}
      </View>

      {/* Cover footer */}
      <View style={{
        position: 'absolute', bottom: 0, left: 28, right: 0,
        borderTopWidth: 0.5, borderTopColor: C.border,
        paddingHorizontal: 32, paddingVertical: 12,
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted }}>
          Gerado em {data.dataGeracao}{data.horaGeracao ? ` às ${data.horaGeracao}` : ''} · Campo Grande/MS
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.gold }}>
          www.afgestaoeconsultoria.com.br
        </Text>
        <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted }}>
          Documento Confidencial
        </Text>
      </View>
    </Page>
  )
}

// ── Main component ─────────────────────────────────────────────────────────
export function RelatorioCompletoAgroPDF({ data }: { data: RelatorioCompletoAgroData }) {
  const culturasCalc = data.culturas.map(c => {
    const recBruta  = c.area * c.produtividade * c.cotacao
    const custo     = c.area * c.custoPorHa * c.cotacao + c.areaArrendada * c.custoArrendHa * (c.cotacao || 1)
    const resultado = recBruta - custo
    const margem    = recBruta > 0 ? resultado / recBruta * 100 : 0
    const pe        = c.cotacao > 0 ? (c.custoPorHa + (c.area > 0 ? c.custoArrendHa * c.areaArrendada / c.area : 0)) : 0
    return { ...c, recBruta, custo, resultado, margem, pe }
  })
  const recBruta   = culturasCalc.reduce((acc, c) => acc + c.recBruta, 0)
  const custoTotal = culturasCalc.reduce((acc, c) => acc + c.custo, 0)
  const resOp      = recBruta - custoTotal
  const resPos     = resOp - data.servicoAnual
  const h          = data.horaGeracao

  const COR: Record<string, string> = {
    Pessimista: C.negative, Base: '#1565C0', Otimista: C.positive,
  }

  return (
    <Document title={`Relatório Agro 360° — ${data.clientName}`} author="AF Gestão & Consultoria">

      {/* ══ CAPA ══ */}
      <Cover data={data} recBruta={recBruta} />

      {/* ══ PÁG 1 — RESUMO EXECUTIVO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Resumo Executivo" client={data.clientName} date={data.safra} />
        <View style={s.body}>

          {/* Rating banner — minimal, elegant */}
          <View style={{
            borderLeftWidth: 2, borderLeftColor: C.gold,
            paddingLeft: 14, paddingVertical: 10,
            marginBottom: 22, marginTop: 4,
          }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 4 }}>
              Diagnóstico Geral · {data.clientName}
            </Text>
            <Text style={{ fontFamily: 'Times-Roman', fontSize: 18, color: data.ratingColor }}>
              {data.ratingLabel}
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.muted, marginTop: 3 }}>
              Consultor: {data.consultorName} · {data.dataGeracao} · {data.areaTotal.toLocaleString('pt-BR')} ha
            </Text>
          </View>

          {/* KPIs */}
          <Section title="Resumo Financeiro — Safra" />
          <View style={s.kpiRow}>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Receita Bruta</Text>
              <Text style={s.kpiValPos}>{R(recBruta)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Custo de Produção</Text>
              <Text style={s.kpiVal}>{R(custoTotal)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Resultado Operacional</Text>
              <Text style={resOp >= 0 ? s.kpiValPos : s.kpiValNeg}>{R(resOp)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Margem Operacional</Text>
              <Text style={data.margem >= 20 ? s.kpiValPos : s.kpiVal}>{pct(data.margem)}</Text>
            </View>
          </View>
          <View style={s.kpiRow}>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Serviço da Dívida / ano</Text>
              <Text style={s.kpiVal}>{R(data.servicoAnual)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Resultado após Endivid.</Text>
              <Text style={resPos >= 0 ? s.kpiValPos : s.kpiValNeg}>{R(resPos)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Endividamento Total</Text>
              <Text style={data.alavancagem > 50 ? s.kpiValNeg : s.kpiVal}>{R(data.totalEndividamento)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Patrimônio Líquido</Text>
              <Text style={s.kpiValPos}>{R(data.patrimonioGruto - data.totalOnus)}</Text>
            </View>
          </View>

          {/* Indicadores */}
          <Section title="Indicadores Financeiros" />
          <View style={s.table}>
            <View style={s.thead}>
              <Text style={{ ...s.th, flex: 2 }}>Indicador</Text>
              <Text style={s.th}>Valor</Text>
              <Text style={s.th}>Referência</Text>
              <Text style={s.th}>Status</Text>
            </View>
            {[
              { ind: 'Margem Operacional',       val: pct(data.margem),       ref: '≥ 20%',  ok: data.margem >= 20,      at: data.margem >= 10 },
              { ind: 'Alavancagem (Dív./Patr.)', val: pct(data.alavancagem),  ref: '< 30%',  ok: data.alavancagem < 30,  at: data.alavancagem < 50 },
              { ind: 'Solvência (Patr./Dív.)',   val: xv(data.solvencia),     ref: '> 2,0x', ok: data.solvencia > 2,     at: data.solvencia > 1 },
              { ind: 'Endivid./Receita Bruta',   val: xv(data.endivReceita),  ref: '< 1,0x', ok: data.endivReceita < 1,  at: data.endivReceita < 2 },
              { ind: 'Capacidade de Pagamento',  val: xv(data.capPagamento),  ref: '> 1,5x', ok: data.capPagamento > 1.5, at: data.capPagamento > 1 },
            ].map((row, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                <Text style={{ ...s.tdBold, flex: 2 }}>{row.ind}</Text>
                <Text style={{ ...s.td, color: sc(row.ok, row.at), fontFamily: 'Helvetica-Bold' }}>{row.val}</Text>
                <Text style={{ ...s.td, color: C.muted }}>{row.ref}</Text>
                <Text style={{ ...s.td, color: sc(row.ok, row.at) }}>
                  {row.ok ? 'Saudável' : row.at ? 'Atenção' : 'Risco'}
                </Text>
              </View>
            ))}
          </View>

          {/* Culturas */}
          <Section title="Resultado por Cultura" />
          <View style={s.table}>
            <View style={s.thead}>
              {['Cultura', 'Área (ha)', 'Produt.', 'Cotação', 'Receita Bruta', 'Custo Total', 'Resultado', 'Margem'].map((h2, i) => (
                <Text key={i} style={{ ...s.th, flex: i === 0 ? 1.4 : 1 }}>{h2}</Text>
              ))}
            </View>
            {culturasCalc.map((c, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                <Text style={{ ...s.tdBold, flex: 1.4 }}>{c.cultura}</Text>
                <Text style={s.td}>{c.area.toLocaleString('pt-BR')}</Text>
                <Text style={s.td}>{c.produtividade} sc</Text>
                <Text style={s.td}>R$ {c.cotacao}</Text>
                <Text style={{ ...s.td, color: C.positive }}>{R(c.recBruta)}</Text>
                <Text style={{ ...s.td, color: C.negative }}>{R(c.custo)}</Text>
                <Text style={{ ...s.td, color: c.resultado >= 0 ? C.positive : C.negative, fontFamily: 'Helvetica-Bold' }}>{R(c.resultado)}</Text>
                <Text style={{ ...s.td, color: c.margem >= 20 ? C.positive : c.margem >= 10 ? C.amber : C.negative }}>{pct(c.margem)}</Text>
              </View>
            ))}
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 2 — CONTRATOS ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Contratos de Crédito Rural" client={data.clientName} date={data.safra} />
        <View style={s.body}>
          <Section title="Carteira de Financiamentos" />
          <View style={s.table}>
            <View style={s.thead}>
              {['Instituição', 'Modalidade', 'Valor Tomado', 'Parcela', 'Taxa a.a.', 'Parcelas', 'Vencimento'].map((h2, i) => (
                <Text key={i} style={{ ...s.th, flex: ['Instituição', 'Modalidade'].includes(h2) ? 1.4 : 1 }}>{h2}</Text>
              ))}
            </View>
            {data.contratos.map((c, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                <Text style={{ ...s.tdBold, flex: 1.4 }}>{c.banco}</Text>
                <Text style={{ ...s.td, flex: 1.4, fontSize: 7 }}>{c.modalidade}</Text>
                <Text style={{ ...s.tdBold }}>{R(c.valorTomado)}</Text>
                <Text style={s.td}>{R(c.valorParcela)}</Text>
                <Text style={s.td}>{(c.taxa * (c.taxa < 1 ? 100 : 1)).toFixed(2)}%</Text>
                <Text style={s.td}>{c.parcelaAtual}/{c.totalParcelas}</Text>
                <Text style={s.td}>{c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—'}</Text>
              </View>
            ))}
            <View style={[s.tr, s.trTotal]}>
              <Text style={{ ...s.tdBold, flex: 1.4 }}>Total</Text>
              <Text style={{ ...s.td, flex: 1.4 }} />
              <Text style={{ ...s.tdBold, color: C.ink }}>{R(data.totalEndividamento)}</Text>
              <Text style={{ ...s.tdBold, color: C.negative }}>{R(data.servicoAnual)}/ano</Text>
              <Text style={s.td} /><Text style={s.td} /><Text style={s.td} />
            </View>
          </View>

          {/* Resumo passivo */}
          <View style={{ marginTop: 18 }}>
            <Section title="Estrutura do Passivo" />
            <View style={s.kpiRow}>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>Saldo Devedor Total</Text>
                <Text style={s.kpiVal}>{R(data.totalEndividamento)}</Text>
              </View>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>Serviço Anual da Dívida</Text>
                <Text style={s.kpiValNeg}>{R(data.servicoAnual)}</Text>
              </View>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>Alavancagem</Text>
                <Text style={data.alavancagem < 30 ? s.kpiValPos : s.kpiValNeg}>{pct(data.alavancagem)}</Text>
              </View>
              <View style={s.kpiBox}>
                <Text style={s.kpiLabel}>Cap. de Pagamento</Text>
                <Text style={data.capPagamento > 1.5 ? s.kpiValPos : data.capPagamento > 1 ? s.kpiVal : s.kpiValNeg}>
                  {xv(data.capPagamento)}
                </Text>
              </View>
            </View>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 3 — DRE + PATRIMÔNIO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="DRE Rural · Patrimônio" client={data.clientName} date={data.safra} />
        <View style={s.body}>

          <Section title="Demonstrativo de Resultado Rural" />
          <View style={{ borderWidth: 0.5, borderColor: C.border, borderRadius: 2, overflow: 'hidden', marginBottom: 18 }}>
            {[
              { l: 'Receita Bruta',            v: recBruta,          neg: false, total: false },
              { l: '(-) Custo de Produção',     v: custoTotal,        neg: true,  total: false },
              { l: '= Resultado Operacional',   v: resOp,             neg: false, total: true  },
              { l: '(-) Serviço da Dívida/ano', v: data.servicoAnual, neg: true,  total: false },
              { l: '= Resultado após Endivid.', v: resPos,            neg: false, total: true  },
            ].map((row, i) => (
              <View key={i} style={[s.dreRow, row.total ? s.dreTotal : {}, i % 2 === 0 && !row.total ? { backgroundColor: C.white } : {}]}>
                <Text style={{
                  fontFamily: row.total ? 'Helvetica-Bold' : 'Helvetica',
                  fontSize: 8, color: C.body,
                  paddingLeft: row.neg ? 16 : 0,
                }}>{row.l}</Text>
                <Text style={{
                  fontFamily: row.total ? 'Helvetica-Bold' : 'Helvetica',
                  fontSize: 8,
                  color: row.neg ? C.negative : row.v >= 0 ? C.positive : C.negative,
                }}>{row.neg ? `(${R(row.v)})` : R(row.v)}</Text>
              </View>
            ))}
          </View>

          <Section title="Análise por Hectare" />
          <View style={{ ...s.table, marginBottom: 18 }}>
            <View style={s.thead}>
              {['Indicador', 'Total', 'Por Hectare', 'Referência Saudável'].map((h2, i) => (
                <Text key={i} style={{ ...s.th, flex: i === 0 ? 2 : 1 }}>{h2}</Text>
              ))}
            </View>
            {data.areaTotal > 0 && [
              { l: 'Receita Bruta',          tot: recBruta,              ha: recBruta / data.areaTotal,              ref: '> R$ 4.500/ha' },
              { l: 'Custo de Produção',       tot: custoTotal,            ha: custoTotal / data.areaTotal,            ref: '< R$ 3.500/ha' },
              { l: 'Resultado Operacional',   tot: resOp,                 ha: resOp / data.areaTotal,                 ref: '> R$ 500/ha'   },
              { l: 'Serviço da Dívida',       tot: data.servicoAnual,     ha: data.servicoAnual / data.areaTotal,     ref: '< R$ 800/ha'   },
              { l: 'Saldo Devedor Bancário',  tot: data.totalEndividamento, ha: data.totalEndividamento / data.areaTotal, ref: '< R$ 3.000/ha' },
            ].map((row, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                <Text style={{ ...s.tdBold, flex: 2 }}>{row.l}</Text>
                <Text style={s.td}>{R(row.tot)}</Text>
                <Text style={{ ...s.tdBold }}>{R(row.ha)}</Text>
                <Text style={{ ...s.td, color: C.muted }}>{row.ref}</Text>
              </View>
            ))}
          </View>

          <Section title="Patrimônio Rural" />
          <View style={s.kpiRow}>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Patrimônio Bruto</Text>
              <Text style={s.kpiValPos}>{R(data.patrimonioGruto)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Ônus / Alienações</Text>
              <Text style={data.totalOnus > 0 ? s.kpiValNeg : s.kpiVal}>{R(data.totalOnus)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Patrimônio Líquido</Text>
              <Text style={s.kpiValPos}>{R(data.patrimonioGruto - data.totalOnus)}</Text>
            </View>
            <View style={s.kpiBox}>
              <Text style={s.kpiLabel}>Cobertura da Dívida</Text>
              <Text style={data.solvencia > 2 ? s.kpiValPos : data.solvencia > 1 ? s.kpiVal : s.kpiValNeg}>{xv(data.solvencia)}</Text>
            </View>
          </View>

          {data.patrimonio.length > 0 && (
            <View style={s.table}>
              <View style={s.thead}>
                {['Categoria', 'Bem / Descrição', 'Valor Avaliado', 'Situação'].map((h2, i) => (
                  <Text key={i} style={{ ...s.th, flex: i === 1 ? 2.5 : 1 }}>{h2}</Text>
                ))}
              </View>
              {data.patrimonio.slice(0, 14).map((p, i) => (
                <View key={i} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                  <Text style={s.td}>{p.categoria}</Text>
                  <Text style={{ ...s.td, flex: 2.5 }}>{p.descricao}</Text>
                  <Text style={{ ...s.tdBold }}>{R(p.valorAvaliado)}</Text>
                  <Text style={{ ...s.td, color: p.possuiOnus ? C.negative : C.positive }}>
                    {p.possuiOnus ? `Ônus: ${R(p.valorOnus)}` : 'Livre'}
                  </Text>
                </View>
              ))}
              {data.patrimonio.length > 14 && (
                <View style={s.tr}>
                  <Text style={{ ...s.td, color: C.muted, flex: 4 }}>
                    + {data.patrimonio.length - 14} bens patrimoniais adicionais
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 4 — CENÁRIOS + PROJEÇÃO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Cenários · Projeção 10 Anos" client={data.clientName} date={data.safra} />
        <View style={s.body}>

          {data.cenarios.length > 0 && (
            <>
              <Section title="Simulação de Cenários — Próximos 10 Anos" />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 20 }}>
                {data.cenarios.map(c => (
                  <View key={c.nome} style={{
                    flex: 1, padding: 14,
                    borderWidth: 0.5, borderColor: C.border, borderRadius: 2,
                    borderTopWidth: 1.5, borderTopColor: COR[c.nome] ?? C.muted,
                    backgroundColor: C.white,
                  }}>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: COR[c.nome] ?? C.muted, marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                      {c.nome}
                    </Text>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                      Resultado 10 Anos
                    </Text>
                    <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: c.resultadoTotal10Anos >= 0 ? C.positive : C.negative, marginBottom: 10 }}>
                      {R(c.resultadoTotal10Anos)}
                    </Text>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 3 }}>
                      Anos Positivos
                    </Text>
                    <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: c.anosPositivos >= 7 ? C.positive : c.anosPositivos >= 5 ? C.amber : C.negative, marginBottom: 10 }}>
                      {c.anosPositivos} de 10
                    </Text>
                    <View style={{ height: 0.5, backgroundColor: C.border, marginBottom: 8 }} />
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.body, lineHeight: 1.5 }}>
                      {c.veredicto}
                    </Text>
                  </View>
                ))}
              </View>
            </>
          )}

          {data.projecaoAnos.length > 0 && (
            <>
              <Section title="Projeção Anual — Cenário Base" />
              <View style={s.table}>
                <View style={s.thead}>
                  {['Ano', 'Receita Bruta', 'Resultado Líquido', 'Situação'].map((h2) => (
                    <Text key={h2} style={s.th}>{h2}</Text>
                  ))}
                </View>
                {data.projecaoAnos.map((r, i) => (
                  <View key={r.ano} style={[s.tr, i % 2 === 0 ? s.trAlt : {}]}>
                    <Text style={s.tdBold}>{r.ano}</Text>
                    <Text style={{ ...s.td, color: C.positive }}>{R(r.recBruta)}</Text>
                    <Text style={{ ...s.td, color: r.resultadoLiquido >= 0 ? C.positive : C.negative, fontFamily: 'Helvetica-Bold' }}>
                      {R(r.resultadoLiquido)}
                    </Text>
                    <Text style={{ ...s.td, color: r.resultadoLiquido >= 0 ? C.positive : C.negative }}>
                      {r.resultadoLiquido >= 0 ? 'Positivo' : 'Negativo'}
                    </Text>
                  </View>
                ))}
                <View style={[s.tr, s.trTotal]}>
                  <Text style={s.tdBold}>Total 10 Anos</Text>
                  <Text style={{ ...s.tdBold, color: C.positive }}>{R(data.projecaoAnos.reduce((acc, r) => acc + r.recBruta, 0))}</Text>
                  <Text style={{ ...s.tdBold, color: data.projecao10Anos >= 0 ? C.positive : C.negative }}>{R(data.projecao10Anos)}</Text>
                  <Text style={{ ...s.td, color: C.muted }}>{data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length} de 10 positivos</Text>
                </View>
              </View>
            </>
          )}

          {/* Parecer */}
          <View style={{
            borderLeftWidth: 2, borderLeftColor: C.gold,
            paddingLeft: 14, paddingVertical: 10, marginTop: 16,
          }}>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.gold, letterSpacing: 1.5, textTransform: 'uppercase', marginBottom: 6 }}>
              Parecer Consultivo
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.body, lineHeight: 1.65 }}>
              A propriedade <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.clientName}</Text> apresenta receita bruta de {R(recBruta)} e resultado operacional de {R(resOp)}, com margem de {pct(data.margem)}. O endividamento total de {R(data.totalEndividamento)} representa {pct(data.alavancagem)} do patrimônio bruto (solvência: {xv(data.solvencia)}).
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.body, lineHeight: 1.65, marginTop: 6 }}>
              Após o serviço da dívida de {R(data.servicoAnual)}/ano, o resultado disponível é {R(resPos)} — {resPos >= 0
                ? 'indicando capacidade de honrar os compromissos com a receita da safra.'
                : 'indicando insuficiência de caixa operacional. Recomenda-se atenção imediata à renegociação do passivo.'}
            </Text>
            <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.muted, marginTop: 10 }}>
              AF Gestão & Consultoria · {data.consultorName} · {data.dataGeracao}
            </Text>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>
    </Document>
  )
}
