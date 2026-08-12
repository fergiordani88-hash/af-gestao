import { Document, Page, View, Text, StyleSheet, Image } from '@react-pdf/renderer'
import logoAF from '../assets/logo-af.png'

// ── Types ──────────────────────────────────────────────────────────────────
export interface RelCultura {
  cultura: string; area: number; produtividade: number; cotacao: number
  custoPorHa: number; areaArrendada: number; custoArrendHa: number
  custoItens?: { categoria: string; valorHa: number }[]
}
export interface RelContrato {
  banco: string; modalidade: string; saldoDevedor: number
  valorParcela: number; taxa: number; vencimento: string
  totalParcelas: number; parcelaAtual: number
  tomador?: string
}
export interface RelPatrimonio {
  categoria: string; descricao: string; valorAvaliado: number
  possuiOnus: boolean; valorOnus: number
}
export interface RelCenario {
  nome: string; resultadoTotal10Anos: number; anosPositivos: number
  margLiquidaMedia: number; veredicto: string
}
export interface RelHorizonte {
  servico: number; parcelas: number
  peSaud: number; peCrit: number
  saldo: number; pct: number; status: 'ok' | 'atencao' | 'risco'
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
  projecao10Anos: number; projecaoAnos: { ano: number; resultadoLiquido: number; recBruta: number; custoAtividade?: number; endividamento?: number; prejuizoFinanciado?: number }[]
  reestruturacaoIdeal?: {
    totalPassivo: number; resultadoLiquidoCapacidade: number; safraCapacidade: string
    cenarios: { label: string; capacidadeAnual: number; inviavel: boolean; nAnos?: number; parcelaFixa?: number; totalJuros?: number }[]
  }
  contextoMercado?: { cambio?: string; precoRef?: string; panorama?: string; comentario?: string }
  // Análise de crédito ampliada
  jurosAnuais?: number; jurosHa?: number
  jurosAnuaisSacas?: number; jurosSacasHa?: number; jurosCultura?: string
  comprometimentoReceita?: number
  cpHorizonte?: RelHorizonte
  anoHorizonte?: RelHorizonte & { anoRef: number }
  lpHorizonte?: RelHorizonte
  vencimentosPorAno?: { ano: number; valor: number }[]
}

// ── Brand tokens ───────────────────────────────────────────────────────────
const C = {
  white:   '#FFFFFF',
  green:   '#1E6B3C',   // vibrant forest green — clearly green, not black
  greenMd: '#257A45',   // medium green for panels
  greenLt: '#E8F4ED',   // pale green tint for alt rows
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
              Trabalhamos para transformar desafios financeiros em oportunidades de crescimento. Com estratégia, conhecimento e compromisso com o futuro do seu negócio.
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
              <Text style={s.th}>Seu Valor</Text>
              <Text style={{ ...s.th, flex: 1.2 }}>Saudável</Text>
              <Text style={{ ...s.th, flex: 1.2 }}>Atenção</Text>
              <Text style={{ ...s.th, flex: 1.2 }}>Risco</Text>
              <Text style={s.th}>Status</Text>
            </View>
            {[
              { ind: 'Margem Operacional',       val: pct(data.margem),       saud: '≥ 20%',    at: '10–20%',   risk: '< 10%',    ok: data.margem >= 20,       warn: data.margem >= 10 },
              { ind: 'Alavancagem (Dív./Patr.)', val: pct(data.alavancagem),  saud: '< 30%',    at: '30–50%',   risk: '> 50%',    ok: data.alavancagem < 30,   warn: data.alavancagem < 50 },
              { ind: 'Solvência (Patr./Dív.)',   val: xv(data.solvencia),     saud: '> 2,0x',   at: '1,0–2,0x', risk: '< 1,0x',   ok: data.solvencia > 2,      warn: data.solvencia > 1 },
              { ind: 'Endivid./Receita Bruta',   val: xv(data.endivReceita),  saud: '< 1,0x',   at: '1,0–2,0x', risk: '> 2,0x',   ok: data.endivReceita < 1,   warn: data.endivReceita < 2 },
              { ind: 'Capacidade de Pagamento',  val: xv(data.capPagamento),  saud: '> 1,5x',   at: '1,0–1,5x', risk: '< 1,0x',   ok: data.capPagamento > 1.5, warn: data.capPagamento > 1 },
            ].map((row, i) => (
              <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                <Text style={{ ...s.tdB, flex: 2 }}>{row.ind}</Text>
                <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: sc(row.ok, row.warn) }}>{row.val}</Text>
                <Text style={{ ...s.td, flex: 1.2, color: C.pos }}>{row.saud}</Text>
                <Text style={{ ...s.td, flex: 1.2, color: C.amber }}>{row.at}</Text>
                <Text style={{ ...s.td, flex: 1.2, color: C.neg }}>{row.risk}</Text>
                <Text style={{ ...s.td, color: sc(row.ok, row.warn), fontFamily: 'Helvetica-Bold' }}>
                  {row.ok ? '✓ Saudável' : row.warn ? '⚠ Atenção' : '✗ Risco'}
                </Text>
              </View>
            ))}
          </View>

          {/* Legenda interpretativa para o produtor */}
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 14 }}>
            {[
              { titulo: 'Margem Operacional', desc: 'De cada R$100 de receita, quanto sobra após pagar os custos de produção. Abaixo de 20% o negócio tem pouca folga para imprevistos.' },
              { titulo: 'Alavancagem', desc: 'Quanto da propriedade está financiada com dívida. Acima de 50% significa que mais da metade do patrimônio pertence ao banco.' },
              { titulo: 'Solvência', desc: 'Quantas vezes o patrimônio cobre o total das dívidas. Abaixo de 1x significa que as dívidas são maiores que todos os bens.' },
              { titulo: 'Endivid./Receita', desc: 'Quantos anos de receita seriam necessários para quitar toda a dívida. Acima de 2x é sinal de endividamento elevado.' },
              { titulo: 'Cap. de Pagamento', desc: 'Quantas vezes o resultado da safra cobre o serviço anual da dívida. Abaixo de 1x significa que a safra não paga as parcelas.' },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: '#F7F9F7', borderRadius: 3, borderTopWidth: 1.5, borderTopColor: C.gold, padding: 8 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6.5, color: C.green, marginBottom: 4 }}>{item.titulo}</Text>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, lineHeight: 1.55 }}>{item.desc}</Text>
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
            {/* Referências em PROPORÇÃO (% da receita/resultado), não R$/ha fixo — a mesma área
                física costuma rodar 2 safras (ex: soja + milho 2ª), então um limite fixo em R$/ha
                penalizaria injustamente qualquer propriedade com dupla safra, que naturalmente tem
                receita e custo por hectare mais altos que um cultivo único. */}
            {data.areaTotal > 0 && [
              { l: 'Receita Bruta',          tot: recBruta,                 ha: recBruta / data.areaTotal,                 ref: 'Benchmark regional',              ok: true },
              { l: 'Custo de Produção',       tot: custoTotal,               ha: custoTotal / data.areaTotal,               ref: '< 75% da receita bruta',          ok: recBruta > 0 && custoTotal <= 0.75 * recBruta },
              { l: 'Resultado Operacional',   tot: resOp,                    ha: resOp / data.areaTotal,                    ref: 'Margem > 20%',                    ok: recBruta > 0 && resOp / recBruta > 0.20 },
              { l: 'Serviço da Dívida',       tot: data.servicoAnual,        ha: data.servicoAnual / data.areaTotal,        ref: '< 30% do resultado operacional',  ok: resOp > 0 ? data.servicoAnual / resOp < 0.30 : data.servicoAnual === 0 },
              { l: 'Resultado após Endivid.', tot: resPos,                   ha: resPos / data.areaTotal,                   ref: 'Valor positivo',                  ok: resPos >= 0 },
              { l: 'Saldo Devedor Bancário',  tot: data.totalEndividamento,  ha: data.totalEndividamento / data.areaTotal,  ref: '< 1× Receita Bruta',              ok: recBruta > 0 && data.totalEndividamento <= recBruta },
            ].map((row, i) => {
              const ok = row.ok
              return (
                <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                  <Text style={{ ...s.tdB, flex: 2 }}>{row.l}</Text>
                  <Text style={s.td}>{R(row.tot)}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: ok ? C.pos : C.neg }}>{R(row.ha)}</Text>
                  <Text style={{ ...s.td, flex: 1.5, color: C.muted }}>{row.ref}</Text>
                </View>
              )
            })}
          </View>

        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 3 — CONTRATOS ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Contratos de Crédito Rural" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {/* Resumo do endividamento — por tomador e por instituição, sem detalhar cada operação */}
          {(() => {
            const hasTomador = data.contratos.some(c => c.tomador)

            const porBanco: Record<string, { n: number; valor: number; servico: number }> = {}
            for (const c of data.contratos) {
              if (!porBanco[c.banco]) porBanco[c.banco] = { n: 0, valor: 0, servico: 0 }
              porBanco[c.banco].n++
              porBanco[c.banco].valor += c.saldoDevedor
              porBanco[c.banco].servico += c.valorParcela
            }
            const bancos = Object.entries(porBanco).sort((a, b) => b[1].valor - a[1].valor)

            let tomadoresResumo: [string, { n: number; valor: number; servico: number }][] = []
            if (hasTomador) {
              const porTomador: Record<string, { n: number; valor: number; servico: number }> = {}
              for (const c of data.contratos) {
                const nome = c.tomador ?? 'Sem tomador específico'
                if (!porTomador[nome]) porTomador[nome] = { n: 0, valor: 0, servico: 0 }
                porTomador[nome].n++
                porTomador[nome].valor += c.saldoDevedor
                porTomador[nome].servico += c.valorParcela
              }
              tomadoresResumo = Object.entries(porTomador).sort((a, b) => b[1].valor - a[1].valor)
            }

            const resumoTabela = (titulo: string, colNome: string, linhas: [string, { n: number; valor: number; servico: number }][]) => (
              <View style={{ marginBottom: 14 }}>
                <Sec title={titulo} />
                <View style={s.tbl}>
                  <View style={s.thd}>
                    <Text style={{ ...s.th, flex: 2.2 }}>{colNome}</Text>
                    <Text style={s.th}>Operações</Text>
                    <Text style={s.th}>Valor Total</Text>
                    <Text style={s.th}>Serviço Anual</Text>
                  </View>
                  {linhas.map(([nome, g], i) => (
                    <View key={i} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                      <Text style={{ ...s.tdB, flex: 2.2 }}>{nome}</Text>
                      <Text style={s.td}>{g.n}</Text>
                      <Text style={s.tdB}>{R(g.valor)}</Text>
                      <Text style={{ ...s.td, color: C.neg }}>{R(g.servico)}/ano</Text>
                    </View>
                  ))}
                  <View style={[s.tr, s.trT]}>
                    <Text style={{ ...s.tdB, flex: 2.2 }}>Total Geral</Text>
                    <Text style={s.tdB}>{data.contratos.length}</Text>
                    <Text style={s.tdG}>{R(data.totalEndividamento)}</Text>
                    <Text style={s.tdR}>{R(data.servicoAnual)}/ano</Text>
                  </View>
                </View>
              </View>
            )

            return (
              <>
                {hasTomador && resumoTabela('Resumo do Endividamento — por Tomador', 'Tomador', tomadoresResumo)}
                {resumoTabela('Resumo do Endividamento — por Instituição', 'Instituição', bancos)}
              </>
            )
          })()}

          {/* Estrutura do passivo + indicadores com explicação */}
          <Sec title="Estrutura do Passivo" />
          <View style={{ flexDirection: 'row', gap: 6, marginBottom: 10 }}>
            {[
              { label: 'Saldo Devedor', val: R(data.totalEndividamento), style: s.kpi, valStyle: s.kpiVal },
              { label: 'Serviço Anual', val: R(data.servicoAnual), style: s.kpiR, valStyle: s.kpiValR },
              { label: 'Alavancagem', val: pct(data.alavancagem), style: data.alavancagem < 30 ? s.kpiG : s.kpiR, valStyle: data.alavancagem < 30 ? s.kpiValG : s.kpiValR },
              { label: 'Cap. de Pagamento', val: xv(data.capPagamento), style: data.capPagamento > 1.5 ? s.kpiG : s.kpiR, valStyle: data.capPagamento > 1.5 ? s.kpiValG : s.kpiValR },
              { label: 'Solvência', val: xv(data.solvencia), style: data.solvencia > 2 ? s.kpiG : s.kpiR, valStyle: data.solvencia > 2 ? s.kpiValG : s.kpiValR },
            ].map((k, i) => (
              <View key={i} style={k.style}><Text style={s.kpiLabel}>{k.label}</Text><Text style={k.valStyle}>{k.val}</Text></View>
            ))}
          </View>

          {/* Legenda indicadores do passivo */}
          <View style={{ flexDirection: 'row', gap: 5, marginBottom: 12 }}>
            {[
              { t: 'Saldo Devedor', d: 'Total das dívidas bancárias em aberto.' },
              { t: 'Serviço Anual', d: 'Soma de todas as parcelas pagas no ano — o quanto a propriedade precisa gerar só para pagar os bancos.' },
              { t: 'Alavancagem', d: 'Quanto do patrimônio está financiado. Saudável: < 30%. Risco: > 50%.' },
              { t: 'Cap. de Pagamento', d: 'Resultado da safra ÷ serviço da dívida. Abaixo de 1x a safra não cobre as parcelas.' },
              { t: 'Solvência', d: 'Patrimônio líquido ÷ dívidas. Abaixo de 1x as dívidas superam todos os bens.' },
            ].map((item, i) => (
              <View key={i} style={{ flex: 1, backgroundColor: '#F7F9F7', borderRadius: 3, borderTopWidth: 1.5, borderTopColor: C.gold, padding: 6 }}>
                <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 6, color: C.green, marginBottom: 3 }}>{item.t}</Text>
                <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, lineHeight: 1.5 }}>{item.d}</Text>
              </View>
            ))}
          </View>

        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 4 — ANÁLISE DE CRÉDITO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Análise de Crédito" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {/* Custo dos juros em sacas */}
          {(data.jurosAnuais ?? 0) > 0 && (
            <>
              <Sec title={`Custo dos Juros Bancários em Sacas${data.jurosCultura ? ` — referência ${data.jurosCultura}` : ''}`} />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                <View style={{ ...s.kpiR, flex: 1 }}>
                  <Text style={s.kpiLabel}>Juros bancários anuais</Text>
                  <Text style={s.kpiValR}>{R(data.jurosAnuais!)}</Text>
                  {(data.jurosAnuaisSacas ?? 0) > 0 && (
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.neg, marginTop: 4 }}>
                      {data.jurosAnuaisSacas!.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} sacas
                    </Text>
                  )}
                </View>
                <View style={{ ...s.kpiR, flex: 1 }}>
                  <Text style={s.kpiLabel}>Por hectare</Text>
                  <Text style={s.kpiValR}>{R(data.jurosHa ?? 0)}/ha</Text>
                  {(data.jurosSacasHa ?? 0) > 0 && (
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.neg, marginTop: 4 }}>
                      {(data.jurosSacasHa!).toFixed(1)} sc/ha
                    </Text>
                  )}
                </View>
                {(data.comprometimentoReceita ?? 0) > 0 && (() => {
                  const cr = data.comprometimentoReceita!
                  const st = cr > 35 ? s.kpiR : cr > 20 ? s.kpi : s.kpiG
                  const col = cr > 35 ? C.neg : cr > 20 ? C.amber : C.pos
                  const label = cr > 35 ? 'Risco — receita muito comprometida com banco' : cr > 20 ? 'Atenção — monitorar evolução' : 'Saudável — dentro dos parâmetros'
                  return (
                    <View style={{ ...st, flex: 2 }}>
                      <Text style={s.kpiLabel}>Comprometimento da receita com banco</Text>
                      <Text style={{ fontFamily: 'Times-Roman', fontSize: 18, color: col }}>{pct(cr)}</Text>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted, marginTop: 3 }}>{label}</Text>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginTop: 2 }}>Saudável: &lt; 20% · Atenção: 20–35% · Risco: &gt; 35%</Text>
                    </View>
                  )
                })()}
              </View>
            </>
          )}

          {/* CP / Dentro do Ano / LP */}
          {(data.cpHorizonte || data.anoHorizonte || data.lpHorizonte) && (
            <>
              <Sec title="Capacidade de Pagamento por Horizonte" />
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
                {[
                  { label: 'Curto Prazo', sub: '≤ 360 dias', h: data.cpHorizonte },
                  { label: `Dentro do Ano`, sub: String(data.anoHorizonte?.anoRef ?? ''), h: data.anoHorizonte },
                  { label: 'Longo Prazo', sub: '> 360 dias · serviço médio anual', h: data.lpHorizonte },
                ].filter(item => item.h).map((item, i) => {
                  const h2 = item.h!
                  const col = h2.status === 'ok' ? C.pos : h2.status === 'atencao' ? C.amber : C.neg
                  const bg  = h2.status === 'ok' ? '#E8F4ED' : h2.status === 'atencao' ? '#FFF8E1' : '#FFEBEE'
                  const bor = h2.status === 'ok' ? '#A5D6A7' : h2.status === 'atencao' ? '#FFE082' : '#FFCDD2'
                  return (
                    <View key={i} style={{ flex: 1, backgroundColor: bg, borderWidth: 0.5, borderColor: bor, borderRadius: 4, borderTopWidth: 3, borderTopColor: col, padding: 12 }}>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: col, marginBottom: 1 }}>{item.label}</Text>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 10 }}>{item.sub}</Text>

                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 1 }}>Serviço das parcelas</Text>
                      <Text style={{ fontFamily: 'Times-Roman', fontSize: 12, color: C.ink, marginBottom: 2 }}>{R(h2.servico)}</Text>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 10 }}>{h2.parcelas} vencimento{h2.parcelas !== 1 ? 's' : ''}</Text>

                      <View style={{ height: 0.5, backgroundColor: bor, marginBottom: 8 }} />

                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 1 }}>PE saudável (30%)</Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.pos, marginBottom: 6 }}>{R(h2.peSaud)}</Text>
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 1 }}>PE crítico (50%)</Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 8, color: C.amber, marginBottom: 8 }}>{R(h2.peCrit)}</Text>

                      <View style={{ height: 0.5, backgroundColor: bor, marginBottom: 8 }} />

                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 1 }}>Comprometimento atual</Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 14, color: col, marginBottom: 4 }}>{pct(h2.pct)}</Text>

                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 1 }}>{h2.saldo >= 0 ? 'Superávit de caixa' : 'Déficit de caixa'}</Text>
                      <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: h2.saldo >= 0 ? C.pos : C.neg, marginBottom: 8 }}>{R(Math.abs(h2.saldo))}</Text>

                      <View style={{ backgroundColor: col, borderRadius: 3, paddingHorizontal: 8, paddingVertical: 4, alignSelf: 'flex-start' }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7, color: C.white }}>
                          {h2.status === 'ok' ? '✓ Saudável' : h2.status === 'atencao' ? '⚠ Atenção' : '✗ Risco'}
                        </Text>
                      </View>
                    </View>
                  )
                })}
              </View>
            </>
          )}

          {/* Concentração de vencimentos por ano */}
          {(data.vencimentosPorAno ?? []).length > 0 && (() => {
            const anoCorte360 = new Date(new Date().getTime() + 360 * 24 * 60 * 60 * 1000).getFullYear()
            const venc = data.vencimentosPorAno!
            const maxVal = Math.max(...venc.map(v => v.valor), 1)
            return (
              <>
                <Sec title="Concentração de Vencimentos por Ano (a partir de hoje)" />
                <View style={{ marginBottom: 8 }}>
                  {venc.map((v, i) => {
                    const barW = (v.valor / maxVal) * 100
                    const isCP = v.ano <= anoCorte360
                    const barColor = isCP ? '#1976D2' : '#7B1FA2'
                    return (
                      <View key={i} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 5, gap: 10 }}>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: isCP ? '#1976D2' : '#7B1FA2', width: 30 }}>{v.ano}</Text>
                        <View style={{ flex: 1, height: 14, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' }}>
                          <View style={{ width: `${barW}%` as any, height: '100%', backgroundColor: barColor, borderRadius: 2 }} />
                        </View>
                        <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 7.5, color: C.ink, width: 80, textAlign: 'right' }}>{R(v.valor)}</Text>
                      </View>
                    )
                  })}
                  <View style={{ flexDirection: 'row', gap: 20, marginTop: 8 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 12, height: 7, backgroundColor: '#1976D2', borderRadius: 1 }} />
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted }}>Curto prazo (≤ 360 dias)</Text>
                    </View>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 5 }}>
                      <View style={{ width: 12, height: 7, backgroundColor: '#7B1FA2', borderRadius: 1 }} />
                      <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted }}>Longo prazo (&gt; 360 dias)</Text>
                    </View>
                  </View>
                </View>
              </>
            )
          })()}

        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 5 — CENÁRIOS + PROJEÇÃO ══ */}
      <Page size="A4" style={s.page}>
        <Hdr section="Cenários · Projeção 10 Anos" client={data.clientName} safra={data.safra} />
        <View style={s.body}>

          {data.contextoMercado && (data.contextoMercado.cambio || data.contextoMercado.precoRef || data.contextoMercado.panorama || data.contextoMercado.comentario) && (
            <>
              <Sec title="Contexto de Mercado" />
              <View style={{ flexDirection: 'row', gap: 20, marginBottom: 8 }}>
                {data.contextoMercado.cambio && (
                  <View>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Câmbio (R$/US$)</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.ink }}>{data.contextoMercado.cambio}</Text>
                  </View>
                )}
                {data.contextoMercado.precoRef && (
                  <View>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Preço de Referência (CEPEA)</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.ink }}>{data.contextoMercado.precoRef}</Text>
                  </View>
                )}
                {data.contextoMercado.panorama && (
                  <View>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 5.5, color: C.muted, textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 2 }}>Panorama Climático</Text>
                    <Text style={{ fontFamily: 'Helvetica-Bold', fontSize: 9, color: C.ink }}>{data.contextoMercado.panorama}</Text>
                  </View>
                )}
              </View>
              {data.contextoMercado.comentario && (
                <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: C.body, lineHeight: 1.6, marginBottom: 6 }}>
                  {data.contextoMercado.comentario}
                </Text>
              )}
              <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginBottom: 14 }}>
                Contexto preenchido manualmente pelo consultor no momento da análise — não é atualizado automaticamente.
              </Text>
            </>
          )}

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
                  {['Ano', 'Receita Bruta', 'Custos da Atividade', 'Endividamento', 'Prejuízo Financiado', 'Resultado Líquido', 'Situação'].map(h2 => (
                    <Text key={h2} style={{ ...s.th, flex: h2 === 'Ano' ? 0.6 : 1 }}>{h2}</Text>
                  ))}
                </View>
                {data.projecaoAnos.map((r, i) => (
                  <View key={r.ano} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                    <Text style={{ ...s.tdB, flex: 0.6 }}>{r.ano}</Text>
                    <Text style={{ ...s.td, color: C.pos }}>{R(r.recBruta)}</Text>
                    <Text style={{ ...s.td, color: C.neg }}>{r.custoAtividade != null ? R(r.custoAtividade) : '—'}</Text>
                    <Text style={{ ...s.td, color: C.neg }}>{r.endividamento != null ? R(r.endividamento) : '—'}</Text>
                    <Text style={{ ...s.td, color: C.neg }}>{r.prejuizoFinanciado ? R(r.prejuizoFinanciado) : '—'}</Text>
                    <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: r.resultadoLiquido >= 0 ? C.pos : C.neg }}>{R(r.resultadoLiquido)}</Text>
                    <Text style={{ ...s.td, color: r.resultadoLiquido >= 0 ? C.pos : C.neg }}>
                      {r.resultadoLiquido >= 0 ? '✓ Positivo' : '✗ Negativo'}
                    </Text>
                  </View>
                ))}
                <View style={[s.tr, s.trT]}>
                  <Text style={{ ...s.tdB, flex: 0.6 }}>Total 10 Anos</Text>
                  <Text style={s.tdG}>{R(data.projecaoAnos.reduce((a, r) => a + r.recBruta, 0))}</Text>
                  <Text style={{ ...s.td, color: C.neg }}>{R(data.projecaoAnos.reduce((a, r) => a + (r.custoAtividade ?? 0), 0))}</Text>
                  <Text style={{ ...s.td, color: C.neg }}>{R(data.projecaoAnos.reduce((a, r) => a + (r.endividamento ?? 0), 0))}</Text>
                  <Text style={{ ...s.td, color: C.neg }}>{R(data.projecaoAnos.reduce((a, r) => a + (r.prejuizoFinanciado ?? 0), 0))}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: data.projecao10Anos >= 0 ? C.pos : C.neg }}>{R(data.projecao10Anos)}</Text>
                  <Text style={{ ...s.td, color: C.muted }}>{data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length} de 10 positivos</Text>
                </View>
              </View>
              <Text style={{ fontFamily: 'Helvetica', fontSize: 6, color: C.muted, marginTop: 4 }}>
                Prejuízo Financiado: resultado negativo do ano anterior, capitalizado à taxa média dos contratos vigentes — representa o crédito necessário para cobrir o déficit.
              </Text>
            </>
          )}

          {/* Parecer — panel + text */}
          {(() => {
            const custoHa    = data.areaTotal > 0 ? custoTotal / data.areaTotal : 0
            const servicoHa  = data.areaTotal > 0 ? data.servicoAnual / data.areaTotal : 0
            const saldoHa    = data.areaTotal > 0 ? data.totalEndividamento / data.areaTotal : 0
            const foraDoSaudavel: string[] = []
            if (custoHa   > 3500) foraDoSaudavel.push('custo de produção')
            if (servicoHa > 800)  foraDoSaudavel.push('serviço da dívida')
            if (saldoHa   > 3000) foraDoSaudavel.push('saldo devedor bancário')

            const anosPositivos = data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length
            const totalAnosProj = data.projecaoAnos.length

            // Sempre prioriza o cenário mais conservador (30% do resultado) — menor
            // comprometimento preserva margem de segurança contra oscilação de preço,
            // clima e câmbio. Só recorre a um cenário mais agressivo se o conservador
            // não for viável (nem cobre os juros do passivo nesse ritmo).
            const cenarios = data.reestruturacaoIdeal?.cenarios ?? []
            const cenarioConservador = cenarios.find(c => c.label.includes('30%'))
            const cenarioAlternativo = cenarios.find(c => !c.inviavel)

            const p1 = `A propriedade ${data.clientName} apresenta receita bruta de ${R(recBruta)} e resultado operacional de ${R(resOp)}, com margem de ${pct(data.margem)} — ${data.margem >= 20 ? 'nível saudável para a atividade' : 'abaixo da referência saudável de 20% para o setor'}.`

            const p2 = `O endividamento total de ${R(data.totalEndividamento)} representa ${pct(data.alavancagem)} do patrimônio bruto (saudável: < 30%), com solvência de ${xv(data.solvencia)} (saudável: > 2,0x) e relação endividamento/receita bruta de ${xv(data.endivReceita)} (saudável: < 1,0x). A capacidade de pagamento está em ${xv(data.capPagamento)} (saudável: > 1,5x)${(data.comprometimentoReceita ?? 0) > 0 ? `, com ${pct(data.comprometimentoReceita!)} da receita bruta comprometida com bancos` : ''}. Após o serviço da dívida de ${R(data.servicoAnual)}/ano, o resultado disponível é ${R(resPos)}${foraDoSaudavel.length ? `. Na análise por hectare, ${foraDoSaudavel.join(', ')} estão fora da referência saudável` : ''}.`

            const p3 = totalAnosProj > 0
              ? `Mantida a estrutura de dívida atual, sem qualquer reestruturação, a projeção de 10 anos indica ${anosPositivos} de ${totalAnosProj} anos com resultado líquido positivo, com resultado acumulado de ${R(data.projecao10Anos)} no período — o desequilíbrio não se corrige com o tempo caso nenhuma ação seja tomada.`
              : ''

            let p4: string
            if (cenarioConservador && !cenarioConservador.inviavel) {
              p4 = `Diante do diagnóstico "${data.ratingLabel}", recomenda-se a reestruturação do passivo no cenário mais conservador simulado — comprometendo ${cenarioConservador.label}, com prazo estimado de ${cenarioConservador.nAnos} anos. Prioriza-se o menor comprometimento do resultado porque preserva maior margem de segurança diante de oscilações de preço, clima e câmbio ao longo do período, reduzindo o risco de nova inadimplência mesmo que o prazo de amortização seja mais longo.`
            } else if (cenarioAlternativo) {
              p4 = `Diante do diagnóstico "${data.ratingLabel}", o cenário mais conservador simulado (30% do resultado) não é suficiente para cobrir os juros do passivo nesse ritmo — recomenda-se comprometer ${cenarioAlternativo.label}, com prazo estimado de ${cenarioAlternativo.nAnos} anos, de modo a alinhar o cronograma financeiro à real capacidade de geração de caixa da atividade.`
            } else {
              p4 = `Diante do diagnóstico "${data.ratingLabel}", recomenda-se atenção imediata à renegociação do passivo junto às instituições credoras — nos cenários simulados, mesmo comprometendo a totalidade do resultado líquido não é possível cobrir os juros do passivo ao ritmo atual, reforçando a urgência de uma reestruturação negociada individualmente com cada credor.`
            }

            const pStyle = { fontFamily: 'Helvetica' as const, fontSize: 8, color: C.body, lineHeight: 1.6, marginBottom: 6 }

            return (
              <View style={{ flexDirection: 'row', gap: 14, marginTop: 10 }}>
                <View style={{ width: 170, alignItems: 'center', justifyContent: 'center' }}>
                  <Image src={logoAF} style={{ width: 220 }} />
                </View>
                <View style={{ flex: 1 }}>
                  <Sec title="Parecer Consultivo" />
                  <Text style={pStyle}>{p1}</Text>
                  <Text style={pStyle}>{p2}</Text>
                  {p3 && <Text style={pStyle}>{p3}</Text>}
                  <Text style={{ ...pStyle, marginBottom: 8 }}>{p4}</Text>
                  <View style={{ backgroundColor: C.greenLt, borderLeftWidth: 2, borderLeftColor: C.green, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 2 }}>
                    <Text style={{ fontFamily: 'Helvetica', fontSize: 7, color: C.green, lineHeight: 1.6 }}>
                      Relatório gerado em {data.dataGeracao}{data.horaGeracao ? ` às ${data.horaGeracao}` : ''} por {data.consultorName} · AF Gestão & Consultoria · Campo Grande/MS
                    </Text>
                  </View>
                </View>
              </View>
            )
          })()}
        </View>
        <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
      </Page>

      {/* ══ PÁG 6 — REESTRUTURAÇÃO DE PASSIVO ══ */}
      {data.reestruturacaoIdeal && (
        <Page size="A4" style={s.page}>
          <Hdr section="Reestruturação de Passivo — Proposta Ideal" client={data.clientName} safra={data.safra} />
          <View style={s.body}>
            <Sec title="Proposta de Reestruturação Ideal" />
            <Text style={{ fontFamily: 'Helvetica', fontSize: 8, color: C.body, lineHeight: 1.7, marginBottom: 12 }}>
              Simulação de consolidação de <Text style={{ fontFamily: 'Helvetica-Bold' }}>todo o passivo contratado</Text> ({R(data.reestruturacaoIdeal.totalPassivo)}) em parcelas anuais fixas, a uma taxa de 1% a.m. (12,68% a.a. efetivo) <Text style={{ fontFamily: 'Helvetica-Bold' }}>sem indexador</Text> — cenário concessivo para orientar a negociação junto às instituições credoras. A capacidade de pagamento considera o Resultado Líquido projetado para a safra {data.reestruturacaoIdeal.safraCapacidade} ({R(data.reestruturacaoIdeal.resultadoLiquidoCapacidade)}).
            </Text>

            <View style={s.tbl}>
              <View style={s.thd}>
                {['Cenário', 'Capacidade Anual', 'Parcela Anual Fixa', 'Prazo', 'Total de Juros'].map(h2 => (
                  <Text key={h2} style={{ ...s.th, flex: h2 === 'Cenário' ? 1.3 : 1 }}>{h2}</Text>
                ))}
              </View>
              {data.reestruturacaoIdeal.cenarios.map((c, i) => (
                <View key={c.label} style={[s.tr, i % 2 === 0 ? s.trA : {}]}>
                  <Text style={{ ...s.tdB, flex: 1.3 }}>{c.label}</Text>
                  <Text style={s.td}>{R(c.capacidadeAnual)}</Text>
                  <Text style={{ ...s.td, fontFamily: 'Helvetica-Bold', color: c.inviavel ? C.neg : C.pos }}>
                    {c.inviavel ? '—' : R(c.parcelaFixa ?? 0)}
                  </Text>
                  <Text style={s.td}>{c.inviavel ? '—' : `${c.nAnos} ${(c.nAnos ?? 0) > 1 ? 'anos' : 'ano'}`}</Text>
                  <Text style={{ ...s.td, color: C.neg }}>{c.inviavel ? '—' : R(c.totalJuros ?? 0)}</Text>
                </View>
              ))}
            </View>

            {data.reestruturacaoIdeal.cenarios.some(c => c.inviavel) && (
              <Text style={{ fontFamily: 'Helvetica', fontSize: 7.5, color: C.neg, marginTop: 10, lineHeight: 1.6 }}>
                Atenção: em ao menos um cenário a capacidade de pagamento não cobre nem os juros de 1% a.m. (12,68% a.a. efetivo) sobre o saldo devedor — nesse ritmo o passivo cresceria indefinidamente. Recomenda-se aporte de capital, alienação de ativos ou redução do passivo antes de negociar a reestruturação.
              </Text>
            )}

            <Text style={{ fontFamily: 'Helvetica', fontSize: 6.5, color: C.muted, marginTop: 10, lineHeight: 1.6 }}>
              Simulação de caráter indicativo — parcela fixa (sistema Price) sobre o saldo total, taxa de 1% a.m. (12,68% a.a. efetivo) sem indexador, prazo arredondado para o número inteiro de anos seguinte. Não substitui a negociação formal das condições com cada instituição credora.
            </Text>
          </View>
          <Ftr client={data.clientName} date={data.dataGeracao} hora={h} />
        </Page>
      )}
    </Document>
  )
}
