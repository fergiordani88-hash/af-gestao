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

// ── Colors ─────────────────────────────────────────────────────────────────
const C = {
  coverBg: '#0C2416', headerBg: '#0D2B17',
  green: '#1B5E20', greenPale: '#E8F5E9',
  gold: '#C9A96E', goldPale: '#FBF3E0',
  cream: '#FAFAF7', white: '#FFFFFF',
  dark: '#1A1A1A', grayDark: '#616161', grayMid: '#9E9E9E', border: '#E0E0E0',
  red: '#B71C1C', redPale: '#FFEBEE', amber: '#E65100',
}

// ── Styles ─────────────────────────────────────────────────────────────────
const s = StyleSheet.create({
  coverPage: { fontFamily: 'Helvetica', backgroundColor: C.coverBg },
  page: { fontFamily: 'Helvetica', fontSize: 9, color: C.dark, backgroundColor: C.white, paddingBottom: 52 },
  body: { paddingHorizontal: 36, paddingTop: 20 },
  section: { marginBottom: 16 },
  sectionTitle: {
    fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.green,
    textTransform: 'uppercase', letterSpacing: 1,
    marginBottom: 8, paddingBottom: 5,
    borderBottomWidth: 1.5, borderBottomColor: C.gold,
  },
  header: {
    backgroundColor: C.headerBg, paddingHorizontal: 36,
    paddingTop: 16, paddingBottom: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
  },
  goldStripe: { height: 3, backgroundColor: C.gold },
  // KPI
  kpiRow: { flexDirection: 'row', gap: 7, marginBottom: 7 },
  kpi: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: C.border, borderRadius: 5, borderTopWidth: 3, borderTopColor: C.gold, padding: 10 },
  kpiG: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: '#C8E6C9', borderRadius: 5, borderTopWidth: 3, borderTopColor: C.green, padding: 10 },
  kpiR: { flex: 1, backgroundColor: C.white, borderWidth: 1, borderColor: '#FFCDD2', borderRadius: 5, borderTopWidth: 3, borderTopColor: C.red, padding: 10 },
  kpiLabel: { fontSize: 6.5, color: C.grayMid, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 4 },
  kpiVal: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.dark },
  kpiValG: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.green },
  kpiValR: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: C.red },
  // Table
  table: { borderWidth: 1, borderColor: C.border, borderRadius: 5, overflow: 'hidden', marginBottom: 8 },
  thead: { backgroundColor: C.headerBg, flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10 },
  th: { color: C.white, fontSize: 6.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', letterSpacing: 0.5, flex: 1 },
  tr: { flexDirection: 'row', paddingVertical: 5, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: C.border },
  trAlt: { backgroundColor: C.cream },
  trTotal: { backgroundColor: C.greenPale },
  td: { fontSize: 7.5, color: C.dark, flex: 1 },
  // Footer
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    paddingHorizontal: 36, paddingVertical: 9,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    borderTopWidth: 1, borderTopColor: C.border, backgroundColor: C.white,
  },
  footerTxt: { fontSize: 6.5, color: C.grayMid },
  footerGold: { fontSize: 6.5, color: C.gold },
})

// ── Helpers ────────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`
const fmtX = (v: number) => isFinite(v) ? `${v.toFixed(2)}x` : '—'
const sc = (ok: boolean, warn?: boolean) => ok ? C.green : warn ? C.amber : C.red

// ── Logo ───────────────────────────────────────────────────────────────────
function Logo() {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
      <View style={{ width: 28, height: 28, borderRadius: 5, backgroundColor: C.gold, alignItems: 'center', justifyContent: 'center', marginRight: 8 }}>
        <Text style={{ color: C.coverBg, fontSize: 13, fontFamily: 'Helvetica-Bold' }}>AF</Text>
      </View>
      <View style={{ borderLeftWidth: 1, borderLeftColor: '#FFFFFF35', paddingLeft: 8 }}>
        <Text style={{ color: C.white, fontSize: 9, fontFamily: 'Helvetica-Bold' }}>Gestão & Consultoria</Text>
        <Text style={{ color: '#FFFFFF55', fontSize: 5.5, letterSpacing: 0.8, marginTop: 2 }}>PLANEJAMENTO · ESTRATÉGIA · RESULTADOS</Text>
      </View>
    </View>
  )
}

// ── Header ─────────────────────────────────────────────────────────────────
function Hdr({ title, sub, client, date }: { title: string; sub: string; client: string; date: string }) {
  return (
    <>
      <View style={s.header}>
        <Logo />
        <View style={{ alignItems: 'flex-end' }}>
          <Text style={{ color: C.white, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{title}</Text>
          <Text style={{ color: '#FFFFFF65', fontSize: 7, marginTop: 2 }}>{sub}</Text>
          <Text style={{ color: C.gold, fontSize: 6.5, marginTop: 3 }}>{client} · {date}</Text>
        </View>
      </View>
      <View style={s.goldStripe} />
    </>
  )
}

// ── Footer ─────────────────────────────────────────────────────────────────
function Ftr({ client, date, hora }: { client: string; date: string; hora?: string }) {
  return (
    <View style={s.footer} fixed>
      <Text style={s.footerTxt}>AF Gestão & Consultoria · Campo Grande/MS · {client} · Confidencial</Text>
      <Text style={s.footerGold}>www.afgestaoeconsultoria.com.br</Text>
      <Text style={s.footerTxt} render={({ pageNumber, totalPages }) =>
        `Gerado em ${date}${hora ? ` às ${hora}` : ''} · Pág. ${pageNumber}/${totalPages}`
      } />
    </View>
  )
}

// ── Cover page ─────────────────────────────────────────────────────────────
function Cover({ data, recBruta }: { data: RelatorioCompletoAgroData; recBruta: number }) {
  return (
    <Page size="A4" style={s.coverPage}>
      <View style={{ height: 7, backgroundColor: C.gold }} />

      {/* Company header */}
      <View style={{ paddingHorizontal: 48, paddingTop: 40, paddingBottom: 32, borderBottomWidth: 1, borderBottomColor: '#FFFFFF10' }}>
        <Logo />
      </View>

      {/* Hero */}
      <View style={{ paddingHorizontal: 48, paddingTop: 52, flex: 1 }}>
        <Text style={{ color: C.gold, fontSize: 7.5, letterSpacing: 2.5, fontFamily: 'Helvetica-Bold', textTransform: 'uppercase', marginBottom: 12 }}>
          Relatório Completo Agro 360°
        </Text>
        <View style={{ width: 40, height: 2, backgroundColor: C.gold, marginBottom: 20 }} />
        <Text style={{ color: C.white, fontSize: 26, fontFamily: 'Helvetica-Bold', lineHeight: 1.2, marginBottom: 10 }}>
          {data.clientName}
        </Text>
        <View style={{ flexDirection: 'row', gap: 20, marginBottom: 44 }}>
          {data.clientCity && <Text style={{ color: '#FFFFFF70', fontSize: 10 }}>{data.clientCity}</Text>}
          <Text style={{ color: C.gold, fontSize: 10, fontFamily: 'Helvetica-Bold' }}>{data.areaTotal.toLocaleString('pt-BR')} ha</Text>
          <Text style={{ color: '#FFFFFF50', fontSize: 10 }}>Safra {data.safra}</Text>
        </View>

        {/* Rating */}
        <View style={{ backgroundColor: data.ratingColor, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 14, alignSelf: 'flex-start', marginBottom: 50 }}>
          <Text style={{ color: '#FFFFFF80', fontSize: 6.5, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 4, fontFamily: 'Helvetica-Bold' }}>Diagnóstico Geral</Text>
          <Text style={{ color: C.white, fontSize: 22, fontFamily: 'Helvetica-Bold' }}>{data.ratingLabel}</Text>
        </View>

        {/* Quick stats */}
        <View style={{ flexDirection: 'row', gap: 28, borderTopWidth: 1, borderTopColor: '#FFFFFF15', paddingTop: 22 }}>
          <View>
            <Text style={{ color: '#FFFFFF50', fontSize: 6.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Endividamento Total</Text>
            <Text style={{ color: C.white, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{fmtBRL(data.totalEndividamento)}</Text>
          </View>
          <View>
            <Text style={{ color: '#FFFFFF50', fontSize: 6.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Receita Bruta</Text>
            <Text style={{ color: C.gold, fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{fmtBRL(recBruta)}</Text>
          </View>
          <View>
            <Text style={{ color: '#FFFFFF50', fontSize: 6.5, textTransform: 'uppercase', letterSpacing: 1, marginBottom: 4 }}>Patrimônio Líquido</Text>
            <Text style={{ color: '#FFFFFF80', fontSize: 12, fontFamily: 'Helvetica-Bold' }}>{fmtBRL(data.patrimonioGruto - data.totalOnus)}</Text>
          </View>
        </View>
      </View>

      {/* Cover bottom */}
      <View style={{ paddingHorizontal: 48, paddingVertical: 18, borderTopWidth: 1, borderTopColor: '#FFFFFF10', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
        <Text style={{ color: '#FFFFFF40', fontSize: 7 }}>Gerado em {data.dataGeracao}{data.horaGeracao ? ` às ${data.horaGeracao}` : ''} · Documento Confidencial</Text>
        <Text style={{ color: C.gold, fontSize: 7 }}>www.afgestaoeconsultoria.com.br</Text>
        <Text style={{ color: '#FFFFFF40', fontSize: 7 }}>Campo Grande/MS</Text>
      </View>
    </Page>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export function RelatorioCompletoAgroPDF({ data }: { data: RelatorioCompletoAgroData }) {
  const culturasCalc = data.culturas.map(c => {
    const recBruta  = c.area * c.produtividade * c.cotacao
    const custo     = c.area * c.custoPorHa * c.cotacao + c.areaArrendada * c.custoArrendHa * (c.cotacao || 1)
    const resultado = recBruta - custo
    const margem    = recBruta > 0 ? resultado / recBruta * 100 : 0
    const pe        = c.cotacao > 0 ? (c.custoPorHa + (c.area > 0 ? c.custoArrendHa * c.areaArrendada / c.area : 0)) : 0
    return { ...c, recBruta, custo, resultado, margem, pe }
  })
  const recBruta   = culturasCalc.reduce((s, c) => s + c.recBruta, 0)
  const custoTotal = culturasCalc.reduce((s, c) => s + c.custo, 0)
  const resOp      = recBruta - custoTotal
  const resPos     = resOp - data.servicoAnual

  const COR: Record<string, string> = { Pessimista: C.red, Base: '#1565C0', Otimista: C.green }

  const h = data.horaGeracao

  return (
    <Document title={`Relatório Agro 360° — ${data.clientName} · Safra ${data.safra}`} author="AF Gestão & Consultoria">

      {/* ── CAPA ── */}
      <Cover data={data} recBruta={recBruta} />

      {/* ── PÁG 1 — RESUMO ── */}
      <Page size="A4" style={s.page}>
        <Hdr title="Resumo Executivo" sub={`Safra ${data.safra} · Diagnóstico Financeiro`} client={data.clientName} date={data.dataGeracao} />
        <View style={s.body}>

          {/* Banner rating */}
          <View style={{ backgroundColor: data.ratingColor, borderRadius: 8, padding: 12, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: '#FFFFFF80', fontSize: 7, textTransform: 'uppercase', letterSpacing: 0.8 }}>Diagnóstico Geral · {data.clientName}</Text>
              <Text style={{ color: C.white, fontSize: 17, fontFamily: 'Helvetica-Bold', marginTop: 3 }}>{data.ratingLabel}</Text>
              <Text style={{ color: '#FFFFFF70', fontSize: 7.5, marginTop: 2 }}>Consultor: {data.consultorName} · {data.dataGeracao}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#FFFFFF60', fontSize: 7 }}>Área Total</Text>
              <Text style={{ color: C.gold, fontSize: 20, fontFamily: 'Helvetica-Bold', marginTop: 2 }}>{data.areaTotal.toLocaleString('pt-BR')} ha</Text>
              {data.clientCity && <Text style={{ color: '#FFFFFF60', fontSize: 7, marginTop: 2 }}>{data.clientCity}</Text>}
            </View>
          </View>

          {/* KPIs */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Resumo Executivo — Safra {data.safra}</Text>
            <View style={s.kpiRow}>
              <View style={s.kpiG}><Text style={s.kpiLabel}>Receita Bruta</Text><Text style={s.kpiValG}>{fmtBRL(recBruta)}</Text></View>
              <View style={s.kpi}><Text style={s.kpiLabel}>Custo de Produção</Text><Text style={s.kpiVal}>{fmtBRL(custoTotal)}</Text></View>
              <View style={resOp >= 0 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Resultado Operacional</Text><Text style={resOp >= 0 ? s.kpiValG : s.kpiValR}>{fmtBRL(resOp)}</Text></View>
              <View style={data.margem >= 20 ? s.kpiG : s.kpi}><Text style={s.kpiLabel}>Margem Operacional</Text><Text style={data.margem >= 20 ? s.kpiValG : s.kpiVal}>{fmtPct(data.margem)}</Text></View>
            </View>
            <View style={s.kpiRow}>
              <View style={s.kpi}><Text style={s.kpiLabel}>Serviço da Dívida/ano</Text><Text style={s.kpiVal}>{fmtBRL(data.servicoAnual)}</Text></View>
              <View style={resPos >= 0 ? s.kpiG : s.kpiR}><Text style={s.kpiLabel}>Resultado após Endivid.</Text><Text style={resPos >= 0 ? s.kpiValG : s.kpiValR}>{fmtBRL(resPos)}</Text></View>
              <View style={data.alavancagem > 50 ? s.kpiR : s.kpi}><Text style={s.kpiLabel}>Saldo Devedor Total</Text><Text style={data.alavancagem > 50 ? s.kpiValR : s.kpiVal}>{fmtBRL(data.totalEndividamento)}</Text></View>
              <View style={s.kpiG}><Text style={s.kpiLabel}>Patrimônio Líquido</Text><Text style={s.kpiValG}>{fmtBRL(data.patrimonioGruto - data.totalOnus)}</Text></View>
            </View>
          </View>

          {/* Indicadores */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Indicadores Financeiros</Text>
            <View style={s.table}>
              <View style={s.thead}>
                {['Indicador', 'Valor', 'Referência Saudável', 'Status'].map((h, i) => (
                  <Text key={i} style={{ ...s.th, flex: i === 0 ? 2 : 1 }}>{h}</Text>
                ))}
              </View>
              {[
                { ind: 'Margem Operacional',       val: fmtPct(data.margem),      ref: '≥ 20%',  ok: data.margem >= 20,      at: data.margem >= 10 },
                { ind: 'Alavancagem (Dív./Patr.)', val: fmtPct(data.alavancagem), ref: '< 30%',  ok: data.alavancagem < 30,  at: data.alavancagem < 50 },
                { ind: 'Solvência (Patr./Dív.)',   val: fmtX(data.solvencia),     ref: '> 2,0x', ok: data.solvencia > 2,     at: data.solvencia > 1 },
                { ind: 'Endivid./Receita Bruta',   val: fmtX(data.endivReceita),  ref: '< 1,0x', ok: data.endivReceita < 1,  at: data.endivReceita < 2 },
                { ind: 'Capacidade de Pagamento',  val: fmtX(data.capPagamento),  ref: '> 1,5x', ok: data.capPagamento > 1.5, at: data.capPagamento > 1 },
              ].map((row, i) => (
                <View key={i} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                  <Text style={{ ...s.td, flex: 2, fontFamily: 'Helvetica-Bold' }}>{row.ind}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: sc(row.ok, row.at) }}>{row.val}</Text>
                  <Text style={{ ...s.td, color: C.grayMid }}>{row.ref}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: sc(row.ok, row.at) }}>
                    {row.ok ? '✓ Saudável' : row.at ? '⚠ Atenção' : '✗ Risco'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Culturas */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Resultado por Cultura</Text>
            <View style={s.table}>
              <View style={s.thead}>
                {['Cultura', 'Área', 'Produt.', 'Cotação', 'Receita', 'Custo', 'Resultado', 'Margem', 'PE'].map((h, i) => (
                  <Text key={i} style={{ ...s.th, flex: i === 0 ? 1.2 : 1, fontSize: 6 }}>{h}</Text>
                ))}
              </View>
              {culturasCalc.map((c, i) => (
                <View key={i} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                  <Text style={{ ...s.td, flex: 1.2, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{c.cultura}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{c.area.toLocaleString('pt-BR')}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{c.produtividade} sc</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>R$ {c.cotacao}</Text>
                  <Text style={{ ...s.td, fontSize: 7, color: C.green }}>{fmtBRL(c.recBruta)}</Text>
                  <Text style={{ ...s.td, fontSize: 7, color: C.red }}>{fmtBRL(c.custo)}</Text>
                  <Text style={{ ...s.td, fontSize: 7, fontFamily: 'Helvetica-Bold', color: c.resultado >= 0 ? C.green : C.red }}>{fmtBRL(c.resultado)}</Text>
                  <Text style={{ ...s.td, fontSize: 7, color: c.margem >= 20 ? C.green : c.margem >= 10 ? C.amber : C.red }}>{fmtPct(c.margem)}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{c.pe.toFixed(1)} sc</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ── PÁG 2 — CONTRATOS ── */}
      <Page size="A4" style={s.page}>
        <Hdr title="Contratos de Crédito Rural" sub="Carteira de Financiamentos · Estrutura do Passivo" client={data.clientName} date={data.dataGeracao} />
        <View style={s.body}>
          <View style={s.section}>
            <Text style={s.sectionTitle}>Carteira de Crédito Rural</Text>
            <View style={s.table}>
              <View style={s.thead}>
                {['Banco', 'Modalidade', 'Valor Tomado', 'Parcela', 'Taxa a.a.', 'Parcelas', 'Vencimento'].map((h, i) => (
                  <Text key={i} style={{ ...s.th, flex: ['Banco', 'Modalidade'].includes(h) ? 1.3 : 1, fontSize: 6 }}>{h}</Text>
                ))}
              </View>
              {data.contratos.map((c, i) => (
                <View key={i} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                  <Text style={{ ...s.td, flex: 1.3, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{c.banco}</Text>
                  <Text style={{ ...s.td, flex: 1.3, fontSize: 6.5 }}>{c.modalidade}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{fmtBRL(c.valorTomado)}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{fmtBRL(c.valorParcela)}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{(c.taxa * (c.taxa < 1 ? 100 : 1)).toFixed(2)}%</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{c.parcelaAtual}/{c.totalParcelas}</Text>
                  <Text style={{ ...s.td, fontSize: 7 }}>{c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—'}</Text>
                </View>
              ))}
              <View style={{ ...s.tr, ...s.trTotal }}>
                <Text style={{ ...s.td, flex: 1.3, fontFamily: 'Helvetica-Bold' }}>TOTAL</Text>
                <Text style={{ ...s.td, flex: 1.3 }}>—</Text>
                <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: C.green }}>{fmtBRL(data.totalEndividamento)}</Text>
                <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: C.red }}>{fmtBRL(data.servicoAnual)}/ano</Text>
                <Text style={s.td}>—</Text><Text style={s.td}>—</Text><Text style={s.td}>—</Text>
              </View>
            </View>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ── PÁG 3 — DRE + PATRIMÔNIO ── */}
      <Page size="A4" style={s.page}>
        <Hdr title="DRE Rural · Patrimônio" sub="Estrutura Financeira · Análise por Hectare" client={data.clientName} date={data.dataGeracao} />
        <View style={s.body}>

          {/* DRE */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>DRE Rural Resumida</Text>
            <View style={{ borderWidth: 1, borderColor: C.border, borderRadius: 6, overflow: 'hidden' }}>
              {[
                { l: 'Receita Bruta',             v: recBruta,          neg: false, bold: false, indent: 0 },
                { l: '(-) Custo de Produção',      v: custoTotal,        neg: true,  bold: false, indent: 12 },
                { l: '= Resultado Operacional',    v: resOp,             neg: false, bold: true,  indent: 0 },
                { l: '(-) Serviço da Dívida/ano',  v: data.servicoAnual, neg: true,  bold: false, indent: 12 },
                { l: '= Resultado após Endivid.',  v: resPos,            neg: false, bold: true,  indent: 0 },
              ].map((row, i) => (
                <View key={i} style={{
                  flexDirection: 'row', justifyContent: 'space-between',
                  paddingVertical: 7, paddingRight: 16, paddingLeft: 16 + row.indent,
                  backgroundColor: row.bold ? C.greenPale : i % 2 === 0 ? C.cream : C.white,
                  borderTopWidth: i > 0 ? 1 : 0, borderTopColor: C.border,
                }}>
                  <Text style={{ fontSize: 8.5, fontFamily: row.bold ? 'Helvetica-Bold' : 'Helvetica', color: C.dark }}>{row.l}</Text>
                  <Text style={{ fontSize: 8.5, fontFamily: row.bold ? 'Helvetica-Bold' : 'Helvetica', color: row.neg ? C.red : row.v >= 0 ? C.green : C.red }}>
                    {row.neg ? `(${fmtBRL(row.v)})` : fmtBRL(row.v)}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Patrimônio KPIs */}
          <View style={s.section}>
            <Text style={s.sectionTitle}>Patrimônio Rural</Text>
            <View style={s.kpiRow}>
              <View style={s.kpiG}><Text style={s.kpiLabel}>Patrimônio Bruto</Text><Text style={s.kpiValG}>{fmtBRL(data.patrimonioGruto)}</Text></View>
              <View style={data.totalOnus > 0 ? s.kpiR : s.kpi}><Text style={s.kpiLabel}>Ônus/Alienações</Text><Text style={data.totalOnus > 0 ? s.kpiValR : s.kpiVal}>{fmtBRL(data.totalOnus)}</Text></View>
              <View style={s.kpiG}><Text style={s.kpiLabel}>Patrimônio Líquido</Text><Text style={s.kpiValG}>{fmtBRL(data.patrimonioGruto - data.totalOnus)}</Text></View>
              <View style={data.solvencia > 2 ? s.kpiG : data.solvencia > 1 ? s.kpi : s.kpiR}>
                <Text style={s.kpiLabel}>Cobertura da Dívida</Text>
                <Text style={data.solvencia > 2 ? s.kpiValG : data.solvencia > 1 ? s.kpiVal : s.kpiValR}>{fmtX(data.solvencia)}</Text>
              </View>
            </View>
            {data.patrimonio.length > 0 && (
              <View style={{ ...s.table, marginTop: 8 }}>
                <View style={s.thead}>
                  {['Categoria', 'Bem / Descrição', 'Valor Avaliado', 'Ônus'].map((h, i) => (
                    <Text key={i} style={{ ...s.th, flex: i === 1 ? 2 : 1, fontSize: 6 }}>{h}</Text>
                  ))}
                </View>
                {data.patrimonio.slice(0, 12).map((p, i) => (
                  <View key={i} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                    <Text style={{ ...s.td, fontSize: 7 }}>{p.categoria}</Text>
                    <Text style={{ ...s.td, flex: 2, fontSize: 7 }}>{p.descricao}</Text>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{fmtBRL(p.valorAvaliado)}</Text>
                    <Text style={{ ...s.td, fontSize: 7, color: p.possuiOnus ? C.red : C.grayMid }}>{p.possuiOnus ? fmtBRL(p.valorOnus) : 'Livre'}</Text>
                  </View>
                ))}
                {data.patrimonio.length > 12 && (
                  <View style={s.tr}><Text style={{ ...s.td, color: C.grayMid, fontSize: 7 }}>... e mais {data.patrimonio.length - 12} bens patrimoniais</Text></View>
                )}
              </View>
            )}
          </View>

          {/* Por ha */}
          {data.areaTotal > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Análise por Hectare</Text>
              <View style={s.table}>
                <View style={s.thead}>
                  {['Indicador', 'Total', 'Por Hectare', 'Referência'].map((h, i) => (
                    <Text key={i} style={{ ...s.th, flex: i === 0 ? 2 : 1, fontSize: 6 }}>{h}</Text>
                  ))}
                </View>
                {[
                  { l: 'Receita Bruta',           tot: recBruta,              ha: recBruta / data.areaTotal,              ref: '> R$ 4.500/ha' },
                  { l: 'Custo de Produção',        tot: custoTotal,            ha: custoTotal / data.areaTotal,            ref: '< R$ 3.500/ha' },
                  { l: 'Resultado Operacional',    tot: resOp,                 ha: resOp / data.areaTotal,                 ref: '> R$ 500/ha' },
                  { l: 'Serviço da Dívida',        tot: data.servicoAnual,     ha: data.servicoAnual / data.areaTotal,     ref: '< R$ 800/ha' },
                  { l: 'Resultado após Endivid.',  tot: resPos,                ha: resPos / data.areaTotal,                ref: '> R$ 0/ha' },
                  { l: 'Saldo Devedor Bancário',   tot: data.totalEndividamento, ha: data.totalEndividamento / data.areaTotal, ref: '< R$ 3.000/ha' },
                ].map((row, i) => (
                  <View key={i} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                    <Text style={{ ...s.td, flex: 2, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{row.l}</Text>
                    <Text style={{ ...s.td, fontSize: 7 }}>{fmtBRL(row.tot)}</Text>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', fontSize: 7 }}>{fmtBRL(row.ha)}</Text>
                    <Text style={{ ...s.td, fontSize: 7, color: C.grayMid }}>{row.ref}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ── PÁG 4 — CENÁRIOS + PROJEÇÃO ── */}
      <Page size="A4" style={s.page}>
        <Hdr title="Cenários · Projeção 10 Anos" sub="Análise de Sustentabilidade Financeira" client={data.clientName} date={data.dataGeracao} />
        <View style={s.body}>

          {data.cenarios.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Simulação de Cenários — Próximos 10 Anos</Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {data.cenarios.map(c => (
                  <View key={c.nome} style={{ flex: 1, borderWidth: 1, borderColor: C.border, borderRadius: 6, borderLeftWidth: 4, borderLeftColor: COR[c.nome] ?? C.grayMid, padding: 12 }}>
                    <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: COR[c.nome] ?? C.grayDark, marginBottom: 8 }}>{c.nome}</Text>
                    <Text style={s.kpiLabel}>Resultado 10 Anos</Text>
                    <Text style={{ fontSize: 11, fontFamily: 'Helvetica-Bold', color: c.resultadoTotal10Anos >= 0 ? C.green : C.red, marginBottom: 6, marginTop: 2 }}>{fmtBRL(c.resultadoTotal10Anos)}</Text>
                    <Text style={s.kpiLabel}>Anos Positivos</Text>
                    <Text style={{ fontSize: 10, fontFamily: 'Helvetica-Bold', color: c.anosPositivos >= 7 ? C.green : c.anosPositivos >= 5 ? C.amber : C.red, marginBottom: 6, marginTop: 2 }}>{c.anosPositivos} de 10</Text>
                    <View style={{ backgroundColor: (COR[c.nome] ?? C.grayMid) + '18', padding: 7, borderRadius: 5 }}>
                      <Text style={{ fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: COR[c.nome] ?? C.grayDark }}>{c.veredicto}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {data.projecaoAnos.length > 0 && (
            <View style={s.section}>
              <Text style={s.sectionTitle}>Projeção Anual — Cenário Base</Text>
              <View style={s.table}>
                <View style={s.thead}>
                  {['Ano', 'Receita Bruta', 'Resultado Líquido', 'Status'].map((h, i) => (
                    <Text key={i} style={s.th}>{h}</Text>
                  ))}
                </View>
                {data.projecaoAnos.map((r, i) => (
                  <View key={r.ano} style={{ ...s.tr, ...(i % 2 === 0 ? s.trAlt : {}) }}>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold' }}>{r.ano}</Text>
                    <Text style={{ ...s.td, color: C.green }}>{fmtBRL(r.recBruta)}</Text>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: r.resultadoLiquido >= 0 ? C.green : C.red }}>{fmtBRL(r.resultadoLiquido)}</Text>
                    <Text style={{ ...s.td, color: r.resultadoLiquido >= 0 ? C.green : C.red }}>{r.resultadoLiquido >= 0 ? '✓ Positivo' : '✗ Negativo'}</Text>
                  </View>
                ))}
                <View style={{ ...s.tr, ...s.trTotal }}>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold' }}>Total 10 Anos</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: C.green }}>{fmtBRL(data.projecaoAnos.reduce((acc, r) => acc + r.recBruta, 0))}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: data.projecao10Anos >= 0 ? C.green : C.red }}>{fmtBRL(data.projecao10Anos)}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: data.projecao10Anos >= 0 ? C.green : C.red }}>{data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length} de 10 positivos</Text>
                </View>
              </View>
            </View>
          )}

          {/* Parecer */}
          <View style={{ backgroundColor: C.greenPale, borderRadius: 8, borderWidth: 1, borderColor: '#A5D6A7', padding: 16, marginTop: 4 }}>
            <Text style={{ fontSize: 9, fontFamily: 'Helvetica-Bold', color: C.green, marginBottom: 8 }}>Parecer Consultivo — AF Gestão & Consultoria</Text>
            <Text style={{ fontSize: 8.5, color: C.grayDark, lineHeight: 1.6 }}>
              A propriedade <Text style={{ fontFamily: 'Helvetica-Bold' }}>{data.clientName}</Text>, com {data.areaTotal.toLocaleString('pt-BR')} ha, apresenta receita de {fmtBRL(recBruta)} na safra {data.safra}, resultado operacional de {fmtBRL(resOp)} e margem de {fmtPct(data.margem)}. O endividamento de {fmtBRL(data.totalEndividamento)} representa {fmtPct(data.alavancagem)} do patrimônio bruto (solvência: {fmtX(data.solvencia)}).
            </Text>
            <Text style={{ fontSize: 8.5, color: C.grayDark, lineHeight: 1.6, marginTop: 8 }}>
              Após o serviço da dívida de {fmtBRL(data.servicoAnual)}/ano, o resultado disponível é {fmtBRL(resPos)} — {resPos >= 0 ? 'indicando capacidade de honrar os compromissos com a receita da safra.' : 'indicando insuficiência de caixa operacional. Atenção imediata recomendada na renegociação das dívidas.'}
            </Text>
          </View>
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>
    </Document>
  )
}
