import * as XLSX from 'xlsx'

export interface Secao {
  id: string
  label: string
  icon: string
  perguntas: Array<{ id: string; label: string; tipo: string; opts?: string[] }>
}

// ── Gera e faz download do Excel ──────────────────────────────────────────────
export function downloadQuestionarioExcel(secoes: Secao[], nomeCliente: string) {
  const wb = XLSX.utils.book_new()

  // ── Planilha principal: Questionário ─────────────────────────────────────
  const rows: (string | number)[][] = [
    ['secaoId', 'pergId', 'Seção', 'Pergunta', 'Tipo', 'Opções disponíveis (selecione uma)', 'SUA RESPOSTA'],
  ]

  secoes.forEach(sec => {
    sec.perguntas.forEach(p => {
      rows.push([
        sec.id,
        p.id,
        `${sec.icon} ${sec.label}`,
        p.label,
        p.tipo === 'select' ? 'seleção' : p.tipo === 'textarea' ? 'texto longo' : p.tipo === 'number' ? 'número' : 'texto',
        p.opts?.join(' | ') ?? '',
        '',  // coluna de resposta — vazia para o usuário preencher
      ])
    })
  })

  const ws = XLSX.utils.aoa_to_sheet(rows)

  // Largura das colunas
  ws['!cols'] = [
    { hidden: true },   // secaoId — oculta
    { hidden: true },   // pergId — oculta
    { wch: 28 },        // Seção
    { wch: 60 },        // Pergunta
    { wch: 14 },        // Tipo
    { wch: 80 },        // Opções
    { wch: 50 },        // Resposta
  ]

  // Congela a primeira linha (cabeçalho)
  ws['!freeze'] = { xSplit: 0, ySplit: 1 }

  XLSX.utils.book_append_sheet(wb, ws, 'Questionário')

  // ── Planilha de instruções ───────────────────────────────────────────────
  const instrucoes = XLSX.utils.aoa_to_sheet([
    ['INSTRUÇÕES DE PREENCHIMENTO'],
    [''],
    ['1. Preencha apenas a coluna G (SUA RESPOSTA) de cada linha.'],
    ['2. Para campos do tipo "seleção", copie exatamente uma das opções da coluna F.'],
    ['3. Para campos de "texto" ou "texto longo", escreva livremente.'],
    ['4. Para campos de "número", informe apenas o valor numérico (sem R$, pontos ou vírgulas).'],
    ['5. Não altere as colunas A, B, C, D, E ou F — elas são usadas para importação.'],
    ['6. Não adicione nem remova linhas.'],
    ['7. Salve o arquivo e faça o upload no sistema AF Gestão → aba Questionário → "Importar Excel".'],
    [''],
    [`Cliente: ${nomeCliente}`],
    [`Gerado em: ${new Date().toLocaleDateString('pt-BR')}`],
  ])
  instrucoes['!cols'] = [{ wch: 90 }]
  XLSX.utils.book_append_sheet(wb, instrucoes, 'Instruções')

  XLSX.writeFile(wb, `Questionario_AF_${nomeCliente.replace(/\s+/g, '_')}.xlsx`)
}

// ── Lê o Excel preenchido e retorna as respostas mapeadas por secaoId.pergId ─
export async function readQuestionarioExcel(
  file: File
): Promise<{ respostas: Record<string, Record<string, string>>; total: number; preenchidas: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target!.result as ArrayBuffer)
        const wb = XLSX.read(data, { type: 'array' })
        const ws = wb.Sheets['Questionário']
        if (!ws) throw new Error('Planilha "Questionário" não encontrada. Use o template gerado pelo sistema.')

        const rows = XLSX.utils.sheet_to_json<string[]>(ws, { header: 1, defval: '' }) as string[][]

        const respostas: Record<string, Record<string, string>> = {}
        let total = 0
        let preenchidas = 0

        // Pula o cabeçalho (linha 0)
        for (let i = 1; i < rows.length; i++) {
          const row = rows[i]
          const secaoId = String(row[0] ?? '').trim()
          const pergId  = String(row[1] ?? '').trim()
          const resposta = String(row[6] ?? '').trim()

          if (!secaoId || !pergId) continue
          if (!respostas[secaoId]) respostas[secaoId] = {}

          total++
          if (resposta !== '') {
            respostas[secaoId][pergId] = resposta
            preenchidas++
          }
        }

        resolve({ respostas, total, preenchidas })
      } catch (err: any) {
        reject(new Error(err.message ?? 'Erro ao ler arquivo Excel'))
      }
    }
    reader.onerror = () => reject(new Error('Erro ao ler o arquivo'))
    reader.readAsArrayBuffer(file)
  })
}
