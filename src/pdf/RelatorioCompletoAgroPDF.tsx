import { Document, Page, View, Text } from '@react-pdf/renderer'
import { base, colors, PDFHeader, PDFFooter, KPIBox } from './components/Base'

// ── Tipos ─────────────────────────────────────────────────────────────────────
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
  clientName:    string
  clientCity?:   string
  consultorName: string
  safra:         string
  dataGeracao:   string

  // Produção
  culturas:         RelCultura[]
  areaTotal:        number
  areaArrendada:    number

  // Contratos
  contratos:        RelContrato[]
  totalEndividamento: number
  servicoAnual:     number
  saldoDevedor:     number

  // Patrimônio
  patrimonio:        RelPatrimonio[]
  patrimonioGruto:   number
  totalOnus:         number

  // Índices
  margem:          number  // %
  alavancagem:     number  // %
  solvencia:       number  // x
  endivReceita:    number  // x
  capPagamento:    number  // x
  ratingLabel:     string
  ratingColor:     string

  // Cenários
  cenarios:        RelCenario[]

  // Projeção
  projecao10Anos:  number  // resultado líquido total 10 anos
  projecaoAnos:    { ano: number; resultadoLiquido: number; recBruta: number }[]
}

// ── Formatadores ──────────────────────────────────────────────────────────────
const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${Number(v).toFixed(1)}%`
const fmtX   = (v: number) => isFinite(v) ? `${v.toFixed(2)}x` : '∞'

// ── Helpers de cor de status ──────────────────────────────────────────────────
function statusColor(ok: boolean, atencao?: boolean): string {
  if (ok) return colors.green
  if (atencao) return colors.amber
  return colors.red
}

// ── Componente principal ──────────────────────────────────────────────────────
export function RelatorioCompletoAgroPDF({ data }: { data: RelatorioCompletoAgroData }) {

  // Cálculos por cultura
  const culturasCalc = data.culturas.map(c => {
    const recBruta  = c.area * c.produtividade * c.cotacao
    const custo     = c.area * c.custoPorHa * c.cotacao
    const arrend    = c.areaArrendada * c.custoArrendHa * (c.cotacao || 1)
    const resultado = recBruta - custo - arrend
    const margem    = recBruta > 0 ? resultado / recBruta * 100 : 0
    const pe        = c.cotacao > 0 ? (c.custoPorHa + (c.area > 0 ? c.custoArrendHa * c.areaArrendada / c.area : 0)) : 0
    return { ...c, recBruta, custo: custo + arrend, resultado, margem, pe }
  })

  const receitaTotal  = culturasCalc.reduce((s, c) => s + c.recBruta, 0)
  const custoTotal    = culturasCalc.reduce((s, c) => s + c.custo, 0)
  const resultadoOp   = receitaTotal - custoTotal
  const resultadoPos  = resultadoOp - data.servicoAnual

  // Patrimônio por categoria
  const patPorCat: Record<string, number> = {}
  for (const p of data.patrimonio) {
    patPorCat[p.categoria] = (patPorCat[p.categoria] ?? 0) + p.valorAvaliado
  }

  const COR_CENARIO: Record<string, string> = {
    'Pessimista': colors.red, 'Base': colors.blue, 'Otimista': colors.green,
  }

  return (
    <Document title={`Relatório Completo — ${data.clientName} · Safra ${data.safra}`} author="AF Gestão & Consultoria">

      {/* ═══════════════════════════════ PÁGINA 1 — CAPA + RESUMO ══════════════════════════════ */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Relatório Completo Agro 360°"
          subtitle={`Safra ${data.safra} · Diagnóstico Financeiro Integrado`}
          clientName={data.clientName}
          date={data.dataGeracao}
        />

        <View style={base.body}>
          {/* Faixa de rating */}
          <View style={{ backgroundColor: data.ratingColor, borderRadius: 10, padding: 14, marginBottom: 18, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <View>
              <Text style={{ color: colors.white, fontSize: 7.5, textTransform: 'uppercase', letterSpacing: 0.6 }}>Diagnóstico Geral — {data.clientName}</Text>
              <Text style={{ color: colors.white, fontSize: 18, fontWeight: 700, marginTop: 4 }}>{data.ratingLabel}</Text>
              <Text style={{ color: '#FFFFFF80', fontSize: 8, marginTop: 2 }}>Consultor: {data.consultorName} · Gerado em {data.dataGeracao}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={{ color: '#FFFFFF60', fontSize: 7.5 }}>Área Total</Text>
              <Text style={{ color: colors.gold, fontSize: 22, fontWeight: 700 }}>{data.areaTotal.toLocaleString('pt-BR')} ha</Text>
              {data.clientCity && <Text style={{ color: '#FFFFFF60', fontSize: 7 }}>{data.clientCity}</Text>}
            </View>
          </View>

          {/* KPIs principais */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Resumo Executivo — Safra {data.safra}</Text>
            <View style={base.row}>
              <KPIBox label="Receita Bruta"      value={fmtBRL(receitaTotal)}  color="green" />
              <KPIBox label="Custo de Produção"  value={fmtBRL(custoTotal)}    color="default" />
              <KPIBox label="Resultado Operac."  value={fmtBRL(resultadoOp)}   color={resultadoOp >= 0 ? 'green' : 'red'} />
              <KPIBox label="Margem Operacional" value={fmtPct(data.margem)}   color={data.margem >= 20 ? 'green' : data.margem >= 10 ? 'amber' : 'red'} />
            </View>
            <View style={{ ...base.row, marginTop: 8 }}>
              <KPIBox label="Serviço da Dívida"    value={fmtBRL(data.servicoAnual)}  color="default" />
              <KPIBox label="Res. após Endivid."   value={fmtBRL(resultadoPos)}        color={resultadoPos >= 0 ? 'green' : 'red'} />
              <KPIBox label="Saldo Devedor Total"  value={fmtBRL(data.totalEndividamento)} color={data.alavancagem > 50 ? 'red' : 'default'} />
              <KPIBox label="Patrimônio Líquido"   value={fmtBRL(data.patrimonioGruto - data.totalOnus)} color="green" />
            </View>
          </View>

          {/* Índices em tabela compacta */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Indicadores Financeiros</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                {['Indicador', 'Valor', 'Referência Saudável', 'Status'].map(h => (
                  <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Indicador' ? 2 : 1 }}>{h}</Text>
                ))}
              </View>
              {[
                { ind: 'Margem Operacional',         val: fmtPct(data.margem),          ref: '≥ 20%',     ok: data.margem >= 20,   at: data.margem >= 10 },
                { ind: 'Alavancagem (Dív./Patr.)',   val: fmtPct(data.alavancagem),      ref: '< 30%',     ok: data.alavancagem < 30, at: data.alavancagem < 50 },
                { ind: 'Solvência (Patr./Dív.)',     val: fmtX(data.solvencia),          ref: '> 2,0x',    ok: data.solvencia > 2,  at: data.solvencia > 1 },
                { ind: 'Endivid./Receita Bruta',     val: fmtX(data.endivReceita),       ref: '< 1,0x',    ok: data.endivReceita < 1, at: data.endivReceita < 2 },
                { ind: 'Capacidade de Pagamento',    val: fmtX(data.capPagamento),       ref: '> 1,5x',    ok: data.capPagamento > 1.5, at: data.capPagamento > 1 },
              ].map((row, i) => (
                <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                  <Text style={{ ...base.tableCell, flex: 2, fontWeight: 600 }}>{row.ind}</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: statusColor(row.ok, row.at) }}>{row.val}</Text>
                  <Text style={{ ...base.tableCell, color: colors.grayMid }}>{row.ref}</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: statusColor(row.ok, row.at) }}>
                    {row.ok ? '✓ Saudável' : row.at ? '! Atenção' : '✗ Risco'}
                  </Text>
                </View>
              ))}
            </View>
          </View>

          {/* Resultado por cultura */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Resultado por Cultura</Text>
            <View style={base.table}>
              <View style={base.tableHeader}>
                {['Cultura', 'Área (ha)', 'Produt.', 'Cotação', 'Receita', 'Custo', 'Resultado', 'Margem', 'PE (sc/ha)'].map(h => (
                  <Text key={h} style={{ ...base.tableHeaderCell, flex: ['Cultura'].includes(h) ? 1.2 : 1, fontSize: 6 }}>{h}</Text>
                ))}
              </View>
              {culturasCalc.map((c, i) => (
                <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                  <Text style={{ ...base.tableCell, flex: 1.2, fontWeight: 700, fontSize: 7 }}>{c.cultura}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7 }}>{c.area.toLocaleString('pt-BR')}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7 }}>{c.produtividade} sc</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7 }}>R$ {c.cotacao}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7, color: colors.green }}>{fmtBRL(c.recBruta)}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7, color: colors.red }}>{fmtBRL(c.custo)}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7, fontWeight: 700, color: c.resultado >= 0 ? colors.green : colors.red }}>{fmtBRL(c.resultado)}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7, color: c.margem >= 20 ? colors.green : c.margem >= 10 ? colors.amber : colors.red }}>{fmtPct(c.margem)}</Text>
                  <Text style={{ ...base.tableCell, fontSize: 7 }}>{c.pe.toFixed(1)} sc</Text>
                </View>
              ))}
            </View>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>

      {/* ═══════════════════════════ PÁGINA 2 — ENDIVIDAMENTO + PATRIMÔNIO ═════════════════════ */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Relatório Completo Agro 360°"
          subtitle="Endividamento · Patrimônio · Estrutura Financeira"
          clientName={data.clientName}
          date={data.dataGeracao}
        />
        <View style={base.body}>

          {/* Contratos */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Contratos de Crédito Rural</Text>
            {data.contratos.length === 0 ? (
              <Text style={{ ...base.body1, color: colors.grayMid }}>Nenhum contrato cadastrado.</Text>
            ) : (
              <View style={base.table}>
                <View style={base.tableHeader}>
                  {['Banco', 'Modalidade', 'Valor Tomado', 'Parcela', 'Taxa a.a.', 'Parcelas', 'Vencimento'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: ['Banco', 'Modalidade'].includes(h) ? 1.3 : 1, fontSize: 6.5 }}>{h}</Text>
                  ))}
                </View>
                {data.contratos.map((c, i) => (
                  <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, flex: 1.3, fontSize: 7, fontWeight: 600 }}>{c.banco}</Text>
                    <Text style={{ ...base.tableCell, flex: 1.3, fontSize: 7 }}>{c.modalidade}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7, fontWeight: 700 }}>{fmtBRL(c.valorTomado)}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{fmtBRL(c.valorParcela)}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{(c.taxa * (c.taxa < 1 ? 100 : 1)).toFixed(2)}%</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{c.parcelaAtual}/{c.totalParcelas}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{new Date(c.vencimento).toLocaleDateString('pt-BR')}</Text>
                  </View>
                ))}
                <View style={{ ...base.tableRow, backgroundColor: colors.greenPale }}>
                  <Text style={{ ...base.tableCell, flex: 1.3, fontWeight: 700 }}>TOTAL</Text>
                  <Text style={{ ...base.tableCell, flex: 1.3 }}>—</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: colors.green }}>{fmtBRL(data.totalEndividamento)}</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: colors.red }}>{fmtBRL(data.servicoAnual)}/ano</Text>
                  <Text style={base.tableCell}>—</Text>
                  <Text style={base.tableCell}>—</Text>
                  <Text style={base.tableCell}>—</Text>
                </View>
              </View>
            )}
          </View>

          {/* DRE Resumida */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>DRE Rural Resumida</Text>
            <View style={{ ...base.card, padding: 14 }}>
              {[
                { l: 'Receita Bruta',               v: receitaTotal,  bold: false, indent: 0, color: colors.green  },
                { l: '(-) Custo de Produção',        v: -custoTotal,   bold: false, indent: 4, color: colors.red    },
                { l: '= Resultado Operacional',      v: resultadoOp,   bold: true,  indent: 0, color: resultadoOp >= 0 ? colors.green : colors.red },
                { l: '(-) Serviço da Dívida/ano',    v: -data.servicoAnual, bold: false, indent: 4, color: colors.red },
                { l: '= Resultado após Endivid.',    v: resultadoPos,  bold: true,  indent: 0, color: resultadoPos >= 0 ? colors.green : colors.red },
              ].map((row, i) => (
                <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 5, borderBottomWidth: row.bold ? 1 : 0, borderBottomColor: colors.border, paddingLeft: row.indent }}>
                  <Text style={{ fontSize: 8, fontWeight: row.bold ? 700 : 400, color: colors.grayDark }}>{row.l}</Text>
                  <Text style={{ fontSize: 8, fontWeight: row.bold ? 700 : 400, color: row.color }}>{fmtBRL(Math.abs(row.v))}{row.v < 0 ? ' (-)' : ''}</Text>
                </View>
              ))}
            </View>
          </View>

          {/* Patrimônio */}
          <View style={base.section}>
            <Text style={base.sectionTitle}>Patrimônio Rural</Text>
            <View style={base.row}>
              <KPIBox label="Patrimônio Bruto"   value={fmtBRL(data.patrimonioGruto)}  color="green" />
              <KPIBox label="Ônus/Alienações"    value={fmtBRL(data.totalOnus)}         color={data.totalOnus > 0 ? 'red' : 'default'} />
              <KPIBox label="Patrimônio Líquido" value={fmtBRL(data.patrimonioGruto - data.totalOnus)} color="green" />
              <KPIBox label="Cobertura da Dívida" value={fmtX(data.solvencia)} color={data.solvencia > 2 ? 'green' : data.solvencia > 1 ? 'amber' : 'red'} />
            </View>
            {data.patrimonio.length > 0 && (
              <View style={{ ...base.table, marginTop: 10 }}>
                <View style={base.tableHeader}>
                  {['Categoria', 'Bem', 'Valor Avaliado', 'Ônus'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Bem' ? 2 : 1, fontSize: 6.5 }}>{h}</Text>
                  ))}
                </View>
                {data.patrimonio.slice(0, 12).map((p, i) => (
                  <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{p.categoria}</Text>
                    <Text style={{ ...base.tableCell, flex: 2, fontSize: 7 }}>{p.descricao}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7, fontWeight: 600 }}>{fmtBRL(p.valorAvaliado)}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7, color: p.possuiOnus ? colors.red : colors.grayMid }}>
                      {p.possuiOnus ? fmtBRL(p.valorOnus) : 'Livre'}
                    </Text>
                  </View>
                ))}
                {data.patrimonio.length > 12 && (
                  <View style={{ padding: 8 }}>
                    <Text style={{ fontSize: 7, color: colors.grayMid }}>... e mais {data.patrimonio.length - 12} bens patrimoniais</Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Análise por hectare */}
          {data.areaTotal > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Análise por Hectare</Text>
              <View style={base.table}>
                <View style={base.tableHeader}>
                  {['Indicador', 'Total', 'Por Hectare', 'Referência Saudável'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: h === 'Indicador' ? 2 : 1, fontSize: 6.5 }}>{h}</Text>
                  ))}
                </View>
                {[
                  { l: 'Receita Bruta',            tot: receitaTotal,        ha: receitaTotal / data.areaTotal,        ref: '> R$ 4.500/ha' },
                  { l: 'Custo de Produção',         tot: custoTotal,          ha: custoTotal / data.areaTotal,          ref: '< R$ 3.500/ha' },
                  { l: 'Resultado Operacional',     tot: resultadoOp,         ha: resultadoOp / data.areaTotal,         ref: '> R$ 500/ha' },
                  { l: 'Serviço da Dívida',         tot: data.servicoAnual,   ha: data.servicoAnual / data.areaTotal,   ref: '< R$ 800/ha' },
                  { l: 'Resultado após Endivid.',   tot: resultadoPos,        ha: resultadoPos / data.areaTotal,        ref: '> R$ 0/ha' },
                  { l: 'Saldo Devedor Bancário',    tot: data.totalEndividamento, ha: data.totalEndividamento / data.areaTotal, ref: '< R$ 3.000/ha' },
                ].map((row, i) => (
                  <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, flex: 2, fontSize: 7, fontWeight: 600 }}>{row.l}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7 }}>{fmtBRL(row.tot)}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7, fontWeight: 700 }}>{fmtBRL(row.ha)}</Text>
                    <Text style={{ ...base.tableCell, fontSize: 7, color: colors.grayMid }}>{row.ref}</Text>
                  </View>
                ))}
              </View>
            </View>
          )}
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>

      {/* ═══════════════════════════ PÁGINA 3 — CENÁRIOS + PROJEÇÃO ══════════════════════════ */}
      <Page size="A4" style={base.page}>
        <PDFHeader
          title="Relatório Completo Agro 360°"
          subtitle="Simulação de Cenários · Projeção 10 Anos"
          clientName={data.clientName}
          date={data.dataGeracao}
        />
        <View style={base.body}>

          {/* Simulação de Cenários */}
          {data.cenarios.length > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Simulação de Cenários — Próximos 10 Anos</Text>
              <View style={base.row}>
                {data.cenarios.map(c => (
                  <View key={c.nome} style={{ ...base.card, flex: 1, borderLeftWidth: 3, borderLeftColor: COR_CENARIO[c.nome] ?? colors.grayMid }}>
                    <Text style={{ fontSize: 9, fontWeight: 700, color: COR_CENARIO[c.nome] ?? colors.grayDark, marginBottom: 8 }}>{c.nome}</Text>
                    <Text style={{ ...base.label }}>Resultado 10 Anos</Text>
                    <Text style={{ fontSize: 11, fontWeight: 700, color: c.resultadoTotal10Anos >= 0 ? colors.green : colors.red, marginBottom: 4 }}>
                      {fmtBRL(c.resultadoTotal10Anos)}
                    </Text>
                    <Text style={{ ...base.label }}>Anos Positivos</Text>
                    <Text style={{ fontSize: 9, fontWeight: 600, color: c.anosPositivos >= 7 ? colors.green : c.anosPositivos >= 5 ? colors.amber : colors.red, marginBottom: 4 }}>
                      {c.anosPositivos} de 10
                    </Text>
                    <Text style={{ ...base.label }}>Margem Líq. Média</Text>
                    <Text style={{ fontSize: 9, fontWeight: 600, color: c.margLiquidaMedia >= 0.1 ? colors.green : colors.red, marginBottom: 4 }}>
                      {fmtPct(c.margLiquidaMedia * 100)}
                    </Text>
                    <View style={{ backgroundColor: (COR_CENARIO[c.nome] ?? colors.grayMid) + '20', padding: 6, borderRadius: 6 }}>
                      <Text style={{ fontSize: 8, fontWeight: 700, color: COR_CENARIO[c.nome] ?? colors.grayDark }}>{c.veredicto}</Text>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Projeção 10 anos — tabela */}
          {data.projecaoAnos.length > 0 && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Projeção Anual — Cenário Base</Text>
              <View style={base.table}>
                <View style={base.tableHeader}>
                  {['Ano', 'Receita Bruta', 'Resultado Líquido', 'Status'].map(h => (
                    <Text key={h} style={{ ...base.tableHeaderCell, flex: 1 }}>{h}</Text>
                  ))}
                </View>
                {data.projecaoAnos.map((r, i) => (
                  <View key={r.ano} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                    <Text style={{ ...base.tableCell, fontWeight: 700 }}>{r.ano}</Text>
                    <Text style={{ ...base.tableCell, color: colors.green }}>{fmtBRL(r.recBruta)}</Text>
                    <Text style={{ ...base.tableCell, fontWeight: 700, color: r.resultadoLiquido >= 0 ? colors.green : colors.red }}>
                      {fmtBRL(r.resultadoLiquido)}
                    </Text>
                    <Text style={{ ...base.tableCell, color: r.resultadoLiquido >= 0 ? colors.green : colors.red }}>
                      {r.resultadoLiquido >= 0 ? '✓ Positivo' : '✗ Negativo'}
                    </Text>
                  </View>
                ))}
                <View style={{ ...base.tableRow, backgroundColor: colors.greenPale }}>
                  <Text style={{ ...base.tableCell, fontWeight: 700 }}>Total 10 Anos</Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: colors.green }}>
                    {fmtBRL(data.projecaoAnos.reduce((s, r) => s + r.recBruta, 0))}
                  </Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: data.projecao10Anos >= 0 ? colors.green : colors.red }}>
                    {fmtBRL(data.projecao10Anos)}
                  </Text>
                  <Text style={{ ...base.tableCell, fontWeight: 700, color: data.projecao10Anos >= 0 ? colors.green : colors.red }}>
                    {data.projecaoAnos.filter(r => r.resultadoLiquido >= 0).length} de 10 positivos
                  </Text>
                </View>
              </View>
            </View>
          )}

          {/* Custos itemizados (se disponível) */}
          {data.culturas.some(c => c.custoItens && c.custoItens.length > 0) && (
            <View style={base.section}>
              <Text style={base.sectionTitle}>Breakdown de Custo por Componente</Text>
              {data.culturas.filter(c => c.custoItens && c.custoItens.length > 0).map(c => (
                <View key={c.cultura} style={{ marginBottom: 12 }}>
                  <Text style={{ fontSize: 9, fontWeight: 700, color: colors.green, marginBottom: 6 }}>{c.cultura}</Text>
                  <View style={base.table}>
                    <View style={base.tableHeader}>
                      {['Componente', 'sc/ha', 'R$/ha', '% do Custo'].map(h => (
                        <Text key={h} style={base.tableHeaderCell}>{h}</Text>
                      ))}
                    </View>
                    {c.custoItens!.map((it, i) => {
                      const rHa = it.valorHa * c.cotacao
                      const pct = c.custoPorHa > 0 ? it.valorHa / c.custoPorHa * 100 : 0
                      return (
                        <View key={i} style={{ ...base.tableRow, ...(i % 2 === 0 ? base.tableRowAlt : {}) }}>
                          <Text style={{ ...base.tableCell, fontWeight: 600 }}>{it.categoria}</Text>
                          <Text style={base.tableCell}>{it.valorHa.toFixed(2)}</Text>
                          <Text style={base.tableCell}>{fmtBRL(rHa)}</Text>
                          <Text style={base.tableCell}>{fmtPct(pct)}</Text>
                        </View>
                      )
                    })}
                    <View style={{ ...base.tableRow, backgroundColor: colors.greenPale }}>
                      <Text style={{ ...base.tableCell, fontWeight: 700 }}>Total</Text>
                      <Text style={{ ...base.tableCell, fontWeight: 700 }}>{c.custoPorHa.toFixed(2)}</Text>
                      <Text style={{ ...base.tableCell, fontWeight: 700 }}>{fmtBRL(c.custoPorHa * c.cotacao)}</Text>
                      <Text style={{ ...base.tableCell, fontWeight: 700 }}>100%</Text>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          )}

          {/* Parecer final */}
          <View style={{ ...base.cardGreen, padding: 16, marginTop: 8 }}>
            <Text style={{ fontSize: 9.5, fontWeight: 700, color: colors.green, marginBottom: 8 }}>
              Parecer Consultivo — AF Gestão & Consultoria
            </Text>
            <Text style={{ ...base.body1, lineHeight: 1.6 }}>
              A propriedade <Text style={{ fontWeight: 700 }}>{data.clientName}</Text>, com área total de {data.areaTotal.toLocaleString('pt-BR')} ha, apresenta receita projetada de {fmtBRL(receitaTotal)} na safra {data.safra}, com resultado operacional de {fmtBRL(resultadoOp)} e margem de {fmtPct(data.margem)}. O endividamento total de {fmtBRL(data.totalEndividamento)} representa {fmtPct(data.alavancagem)} do patrimônio bruto, com solvência de {fmtX(data.solvencia)}.
              {'\n\n'}
              Após o serviço da dívida ({fmtBRL(data.servicoAnual)}/ano), o resultado disponível é de {fmtBRL(resultadoPos)}, {resultadoPos >= 0 ? 'indicando capacidade de honrar os compromissos financeiros com a receita da safra' : 'indicando insuficiência de caixa operacional — atenção imediata recomendada na renegociação das dívidas'}.
              {data.cenarios.length > 0 && (
                `\n\nNos cenários simulados, a propriedade apresenta resultado ${data.cenarios.find(c => c.nome === 'Pessimista')?.resultadoTotal10Anos! >= 0 ? 'positivo mesmo no cenário pessimista' : 'negativo no cenário pessimista — risco de sustentabilidade em condições adversas de mercado'}. Recomenda-se estruturação do passivo e planejamento de hedge de preços para as próximas safras.`
              )}
            </Text>
          </View>
        </View>
        <PDFFooter clientName={data.clientName} />
      </Page>
    </Document>
  )
}
