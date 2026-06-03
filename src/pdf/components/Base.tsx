import {
  Document, Page, View, Text, StyleSheet, Font, Image
} from '@react-pdf/renderer'
import type { ReactNode } from 'react'

// Paleta de cores AF Gestão
export const colors = {
  green:      '#1B5E20',
  greenLight: '#2E7D32',
  greenPale:  '#E8F5E9',
  gold:       '#F9A825',
  goldPale:   '#FFFDE7',
  dark:       '#0D1B0F',
  gray:       '#F5F5F5',
  grayMid:    '#9E9E9E',
  grayDark:   '#424242',
  white:      '#FFFFFF',
  red:        '#C62828',
  redPale:    '#FFEBEE',
  blue:       '#1565C0',
  bluePale:   '#E3F2FD',
  amber:      '#F57F17',
  amberPale:  '#FFF8E1',
  border:     '#E0E0E0',
}

// Registrar fontes
Font.register({
  family: 'Inter',
  fonts: [
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuLyfAZ9hiJ-Ek-_EeA.woff', fontWeight: 400 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuGKYAZ9hiJ-Ek-_EeA.woff', fontWeight: 600 },
    { src: 'https://fonts.gstatic.com/s/inter/v13/UcCO3FwrK3iLTeHuS_fvQtMwCp50KnMw2boKoduKmMEVuFuYAZ9hiJ-Ek-_EeA.woff', fontWeight: 700 },
  ]
})

export const base = StyleSheet.create({
  page: {
    fontFamily: 'Inter',
    fontSize: 9,
    color: colors.dark,
    backgroundColor: colors.white,
    paddingTop: 0,
    paddingBottom: 48,
    paddingHorizontal: 0,
  },
  // Cabeçalho verde escuro
  header: {
    backgroundColor: colors.dark,
    paddingHorizontal: 32,
    paddingTop: 24,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLeft: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  logoBox: {
    width: 36, height: 36, borderRadius: 8,
    backgroundColor: colors.gold,
    alignItems: 'center', justifyContent: 'center',
  },
  logoText: { color: colors.dark, fontSize: 14, fontWeight: 700 },
  headerTitle: { color: colors.white, fontSize: 11, fontWeight: 700 },
  headerSub:   { color: '#FFFFFF80', fontSize: 8, marginTop: 2 },
  headerRight: { alignItems: 'flex-end' },
  headerDate:  { color: '#FFFFFF60', fontSize: 7.5 },

  // Faixa dourada decorativa
  goldStripe: { height: 4, backgroundColor: colors.gold },

  // Corpo
  body: { paddingHorizontal: 32, paddingTop: 24 },

  // Seções
  section: { marginBottom: 20 },
  sectionTitle: {
    fontSize: 10, fontWeight: 700, color: colors.green,
    textTransform: 'uppercase', letterSpacing: 0.8,
    marginBottom: 10, paddingBottom: 4,
    borderBottomWidth: 1.5, borderBottomColor: colors.green,
  },

  // Cards / boxes
  card: {
    backgroundColor: colors.white, borderRadius: 8,
    borderWidth: 1, borderColor: colors.border,
    padding: 12, marginBottom: 8,
  },
  cardGreen: {
    backgroundColor: colors.greenPale, borderRadius: 8,
    borderWidth: 1, borderColor: '#A5D6A7',
    padding: 12, marginBottom: 8,
  },
  cardRed: {
    backgroundColor: colors.redPale, borderRadius: 8,
    borderWidth: 1, borderColor: '#EF9A9A',
    padding: 12, marginBottom: 8,
  },
  cardAmber: {
    backgroundColor: colors.amberPale, borderRadius: 8,
    borderWidth: 1, borderColor: '#FFE082',
    padding: 12, marginBottom: 8,
  },
  cardBlue: {
    backgroundColor: colors.bluePale, borderRadius: 8,
    borderWidth: 1, borderColor: '#90CAF9',
    padding: 12, marginBottom: 8,
  },

  // Grid
  row: { flexDirection: 'row', gap: 8 },
  col2: { flex: 1 },
  col3: { flex: 1 },

  // Texto
  label: { fontSize: 7.5, color: colors.grayMid, textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 2 },
  value: { fontSize: 11, fontWeight: 700, color: colors.dark },
  valueGreen: { fontSize: 11, fontWeight: 700, color: colors.green },
  valueRed:   { fontSize: 11, fontWeight: 700, color: colors.red },
  body1:  { fontSize: 9, color: colors.grayDark, lineHeight: 1.5 },
  body2:  { fontSize: 8, color: colors.grayMid,  lineHeight: 1.4 },
  bold:   { fontWeight: 700 },

  // Tabela
  table: { borderWidth: 1, borderColor: colors.border, borderRadius: 6, overflow: 'hidden', marginBottom: 8 },
  tableHeader: { backgroundColor: colors.dark, flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10 },
  tableHeaderCell: { color: colors.white, fontSize: 7.5, fontWeight: 700, textTransform: 'uppercase', flex: 1 },
  tableRow: { flexDirection: 'row', paddingVertical: 6, paddingHorizontal: 10, borderTopWidth: 1, borderTopColor: colors.border },
  tableRowAlt: { backgroundColor: colors.gray },
  tableCell: { fontSize: 8.5, color: colors.dark, flex: 1 },

  // Badge
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20, alignSelf: 'flex-start' },
  badgeGreen: { backgroundColor: colors.greenPale },
  badgeRed:   { backgroundColor: colors.redPale },
  badgeAmber: { backgroundColor: colors.amberPale },

  // Rodapé
  footer: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    borderTopWidth: 1, borderTopColor: colors.border,
    paddingHorizontal: 32, paddingVertical: 10,
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  footerText: { fontSize: 7, color: colors.grayMid },
  pageNumber: { fontSize: 7, color: colors.grayMid },
})

// ── Componentes reutilizáveis ──────────────────────────────────

interface PDFHeaderProps {
  title: string
  subtitle: string
  clientName: string
  date: string
}

export function PDFHeader({ title, subtitle, clientName, date }: PDFHeaderProps) {
  return (
    <>
      <View style={base.header}>
        <View style={base.headerLeft}>
          <View style={base.logoBox}>
            <Text style={base.logoText}>AF</Text>
          </View>
          <View>
            <Text style={base.headerTitle}>AF Gestão & Consultoria</Text>
            <Text style={base.headerSub}>Consultoria Financeira e Estratégica</Text>
          </View>
        </View>
        <View style={base.headerRight}>
          <Text style={{ ...base.headerTitle, fontSize: 10 }}>{title}</Text>
          <Text style={{ ...base.headerSub, marginTop: 3 }}>{subtitle}</Text>
          <Text style={{ ...base.headerDate, marginTop: 4 }}>Cliente: {clientName}</Text>
          <Text style={base.headerDate}>{date}</Text>
        </View>
      </View>
      <View style={base.goldStripe} />
    </>
  )
}

export function PDFFooter({ clientName }: { clientName: string }) {
  return (
    <View style={base.footer} fixed>
      <Text style={base.footerText}>
        AF Gestão & Consultoria · {clientName} · Documento Confidencial
      </Text>
      <Text style={base.pageNumber} render={({ pageNumber, totalPages }) =>
        `Página ${pageNumber} de ${totalPages}`
      } />
    </View>
  )
}

interface KPIBoxProps {
  label: string
  value: string
  color?: 'green' | 'red' | 'amber' | 'default'
}

export function KPIBox({ label, value, color = 'default' }: KPIBoxProps) {
  const valueStyle = color === 'green' ? base.valueGreen : color === 'red' ? base.valueRed : base.value
  return (
    <View style={{ ...base.card, alignItems: 'center', flex: 1 }}>
      <Text style={base.label}>{label}</Text>
      <Text style={valueStyle}>{value}</Text>
    </View>
  )
}

interface DRERowProps {
  label: string
  value: string
  isTotal?: boolean
  indent?: boolean
  negative?: boolean
}

export function DRERow({ label, value, isTotal, indent, negative }: DRERowProps) {
  return (
    <View style={{
      flexDirection: 'row', justifyContent: 'space-between',
      paddingVertical: 4, paddingHorizontal: 8,
      borderBottomWidth: 1, borderBottomColor: colors.border,
      backgroundColor: isTotal ? colors.greenPale : 'transparent',
    }}>
      <Text style={{
        fontSize: isTotal ? 9 : 8.5,
        fontWeight: isTotal ? 700 : 400,
        color: colors.grayDark,
        paddingLeft: indent ? 12 : 0,
      }}>{label}</Text>
      <Text style={{
        fontSize: isTotal ? 9 : 8.5,
        fontWeight: isTotal ? 700 : 400,
        color: negative ? colors.red : isTotal ? colors.green : colors.dark,
      }}>{value}</Text>
    </View>
  )
}

interface ActionItemProps {
  action: string
  area: string
  priority: string
  deadline: string
  status: string
  idx: number
}

const priorityColor: Record<string, string> = {
  imediata: colors.red, alta: '#E64A19', media: colors.amber, baixa: colors.grayMid,
}
const statusLabel: Record<string, string> = {
  nao_iniciado: 'Não iniciado', em_andamento: 'Em andamento',
  concluido: 'Concluído', pendente: 'Pendente', reavaliar: 'Reavaliar',
}

export function ActionItem({ action, area, priority, deadline, status, idx }: ActionItemProps) {
  const pColor = priorityColor[priority] ?? colors.grayMid
  return (
    <View style={{
      flexDirection: 'row', alignItems: 'flex-start', gap: 8,
      padding: 8, marginBottom: 4, borderRadius: 6,
      backgroundColor: idx % 2 === 0 ? colors.gray : colors.white,
      borderLeftWidth: 3, borderLeftColor: pColor,
    }}>
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: 8.5, fontWeight: 700, color: colors.dark }}>{action}</Text>
        <Text style={{ fontSize: 7.5, color: colors.grayMid, marginTop: 2 }}>{area}</Text>
      </View>
      <Text style={{ fontSize: 7.5, color: pColor, fontWeight: 700, minWidth: 48 }}>{priority.toUpperCase()}</Text>
      <Text style={{ fontSize: 7.5, color: colors.grayMid, minWidth: 52 }}>{deadline}</Text>
      <Text style={{ fontSize: 7.5, color: colors.grayDark, minWidth: 70 }}>{statusLabel[status] ?? status}</Text>
    </View>
  )
}
