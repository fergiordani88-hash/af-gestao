import { pdf } from '@react-pdf/renderer'
import { createElement } from 'react'
import { DiagnosticoPJPDF,  type DiagPJData   } from './DiagnosticoPJPDF'
import { DiagnosticoAgroPDF, type DiagAgroData } from './DiagnosticoAgroPDF'
import { PropostaComercialPDF, type PropostaData } from './PropostaComercialPDF'

function slugify(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
}

async function downloadPDF(element: React.ReactElement, filename: string) {
  const blob = await pdf(element).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export const usePDF = () => ({
  exportDiagnosticoPJ: async (data: DiagPJData) => {
    const el = createElement(DiagnosticoPJPDF, { data })
    await downloadPDF(el, `diagnostico-pj-${slugify(data.clientName)}.pdf`)
  },

  exportDiagnosticoAgro: async (data: DiagAgroData) => {
    const el = createElement(DiagnosticoAgroPDF, { data })
    await downloadPDF(el, `diagnostico-agro-${slugify(data.clientName)}.pdf`)
  },

  exportProposta: async (data: PropostaData) => {
    const el = createElement(PropostaComercialPDF, { data })
    await downloadPDF(el, `proposta-${slugify(data.clientName)}.pdf`)
  },
})
