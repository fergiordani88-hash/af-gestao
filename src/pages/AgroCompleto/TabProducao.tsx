import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Sprout, Info, Copy, CheckSquare } from 'lucide-react'
import { agroApi, type AgroProducao } from '../../services/agroApi'
import { pjBenchmarkApi } from '../../services/benchmarkApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })

const SAFRAS_HISTORICAS = ['2022/23', '2023/24', '2024/25', '2025/26']

const SAFRAS_FUTURAS: string[] = Array.from({ length: 10 }, (_, i) => {
  const a = 2026 + i
  return `${a}/${String(a + 1).slice(-2)}`
})

const CULTURAS_PRINCIPAL = ['Soja', 'Algodão', 'Milho verão', 'Sorgo verão', 'Girassol verão']
const CULTURAS_SEGUNDA   = ['Milho 2ª', 'Sorgo 2ª', 'Milheto', 'Girassol 2ª', 'Algodão 2ª', 'Braquiária']
const CULTURAS_TERCEIRA  = ['Feijão', 'Feijão Carioca', 'Feijão Preto', 'Milho irrigado', 'Arroz irrigado', 'Tomate', 'Hortaliças']

const CULTURAS = [
  { cultura: 'Soja',    ordem: 'principal' },
  { cultura: 'Milho 2ª', ordem: 'segunda' },
]

function benchmarkKey(cultura: string): string {
  const c = cultura.toLowerCase()
  if (c.includes('soja'))     return 'SOJA'
  if (c.includes('milho'))    return 'MILHO'
  if (c.includes('algodão') || c.includes('algodao')) return 'ALGODAO'
  if (c.includes('sorgo'))    return 'SORGO'
  if (c.includes('milheto'))  return 'MILHETO'
  if (c.includes('girassol')) return 'GIRASSOL'
  if (c.includes('feijão') || c.includes('feijao')) return 'FEIJAO'
  return 'SOJA'
}

function calcRow(p: AgroProducao) {
  const custoPorHaReais  = p.custoPorHa * p.cotacao
  const prodTotal        = p.area * p.produtividade
  const recBruta         = prodTotal * p.cotacao
  const custoTotal       = p.area * custoPorHaReais
  const custoArrendTotal = p.areaArrendada * p.custoArrendHa
  const recLiq           = recBruta - custoTotal - custoArrendTotal
  const custoTotalHa     = custoPorHaReais + (p.area > 0 ? custoArrendTotal / p.area : 0)
  const peHa             = p.cotacao > 0 ? custoTotalHa / p.cotacao : 0
  const peHaCOE          = p.custoPorHa
  const margemPct        = recBruta > 0 ? (recLiq / recBruta) * 100 : 0
  const rentabilidadeHa  = p.area > 0 ? recLiq / p.area : 0
  const custoPorSaca     = p.custoPorHa
  const quedaPrecoZero   = p.cotacao > 0 ? ((p.cotacao - peHa) / p.cotacao) * 100 : 0
  const superavitSc      = p.produtividade - peHa
  const riscoQueda       = p.produtividade < peHa * 1.1
  return { prodTotal, recBruta, custoTotal, custoArrendTotal, recLiq, peHa, peHaCOE, margemPct, rentabilidadeHa, custoPorSaca, custoPorHaReais, quedaPrecoZero, superavitSc, riscoQueda }
}

interface RowProps {
  item: AgroProducao
  onChange: (field: keyof AgroProducao, val: number | string) => void
  onSave: () => void
  onDelete: () => void
  dirty: boolean
}

function ProducaoRow({ item, onChange, onSave, onDelete, dirty }: RowProps) {
  const c = calcRow(item)
  const inp = 'w-full border-0 bg-transparent text-right text-sm focus:outline-none focus:bg-gray-50 rounded px-1 py-0.5'

  return (
    <tr className="border-b border-gray-50 hover:bg-gray-50/50">
      <td className="px-3 py-2 text-sm font-medium text-gray-700 whitespace-nowrap">{item.cultura}</td>
      {[
        ['cotacao', item.cotacao],
        ['area', item.area],
        ['produtividade', item.produtividade],
        ['custoPorHa', item.custoPorHa],
      ].map(([field, val]) => (
        <td key={String(field)} className="px-1 py-1">
          <input
            type="number"
            value={val as number || ''}
            onChange={e => onChange(field as keyof AgroProducao, Number(e.target.value))}
            className={inp}
            placeholder="0"
          />
        </td>
      ))}
      <td className="px-3 py-2 text-sm text-right text-blue-600 font-medium whitespace-nowrap" title="Calculado: sacas × cotação">
        {fmtBRL(c.custoPorHaReais)}
      </td>
      {[
        ['areaArrendada', item.areaArrendada],
        ['custoArrendHa', item.custoArrendHa],
      ].map(([field, val]) => (
        <td key={String(field)} className="px-1 py-1">
          <input
            type="number"
            value={val as number || ''}
            onChange={e => onChange(field as keyof AgroProducao, Number(e.target.value))}
            className={inp}
            placeholder="0"
          />
        </td>
      ))}
      <td className="px-3 py-2 text-sm text-right text-gray-600">{c.prodTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
      <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">{fmtBRL(c.recBruta)}</td>
      <td className="px-3 py-2 text-sm text-right text-red-500">{fmtBRL(c.custoTotal + c.custoArrendTotal)}</td>
      <td className={`px-3 py-2 text-sm text-right font-bold ${c.recLiq >= 0 ? 'text-af-green' : 'text-red-600'}`}>{fmtBRL(c.recLiq)}</td>
      <td className="px-3 py-2 text-sm text-right text-gray-600">{fmtBRL(c.rentabilidadeHa)}/ha</td>
      <td className="px-3 py-2 text-sm text-right text-gray-500">{c.custoPorSaca.toFixed(1)} sc</td>
      <td className="px-3 py-2 text-sm text-right text-gray-500">{c.peHa.toFixed(1)} sc</td>
      <td className={`px-3 py-2 text-sm text-right font-semibold ${c.superavitSc >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{c.superavitSc >= 0 ? '+' : ''}{c.superavitSc.toFixed(1)} sc</td>
      <td className={`px-3 py-2 text-sm text-right ${c.riscoQueda ? 'text-red-500 font-semibold' : 'text-emerald-600'}`}>{c.quedaPrecoZero.toFixed(0)}%</td>
      <td className={`px-3 py-2 text-sm text-right font-semibold ${c.margemPct >= 15 ? 'text-emerald-600' : 'text-red-500'}`}>{c.margemPct.toFixed(1)}%</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          <button
            onClick={onSave}
            disabled={!dirty}
            className={`p-1 rounded transition-colors ${dirty ? 'text-af-green hover:bg-af-green-pale cursor-pointer' : 'text-gray-300 cursor-default'}`}
            title={dirty ? 'Salvar alterações' : 'Sem alterações'}
          ><Save size={13} /></button>
          <button onClick={onDelete} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Excluir cultura"><Trash2 size={13} /></button>
        </div>
      </td>
    </tr>
  )
}

interface SafraBlockProps {
  safra: string
  tipo: string
  rows: AgroProducao[]
  clientId: string
  onDeleteRows: (ids: string[]) => void
  onAddRows: (rows: AgroProducao[]) => void
  onReplaceRows: (oldIds: string[], newRows: AgroProducao[]) => void
  prevRows?: AgroProducao[]
  // Cópia gerenciada pelo pai (operação destrutiva — pai faz reload completo)
  onCopyPrev?: () => void
  copyingPrev?: boolean
}

function SafraBlock({ safra, tipo, rows, clientId, onDeleteRows, onAddRows, onReplaceRows, prevRows, onCopyPrev, copyingPrev }: SafraBlockProps) {
  // Inicializa local a partir de rows APENAS no mount — local é a fonte de verdade depois disso.
  // Não há useEffect de sincronização: mudanças no pai (via callbacks) não sobrescrevem local.
  const [local, setLocal] = useState<(AgroProducao & { dirty?: boolean })[]>(
    () => rows.map(r => ({ ...r, dirty: false }))
  )

  const handleChange = (idx: number, field: keyof AgroProducao, val: number | string) => {
    setLocal(l => l.map((r, i) => i === idx ? { ...r, [field]: val, dirty: true } : r))
  }

  const handleSave = async (idx: number) => {
    const r = local[idx]
    // Remove campos internos que não existem no banco (dirty, id no update)
    const { dirty: _, id: _id, ...payload } = r
    let updated: AgroProducao
    if (r.id) {
      updated = await agroApi.producao.update(r.id, payload)
    } else {
      updated = await agroApi.producao.create(payload)
    }
    setLocal(l => l.map((row, i) => i === idx ? { ...updated, dirty: false } : row))
    onAddRows([updated])
  }

  const handleDeleteCultura = async (idx: number) => {
    const r = local[idx]
    const id = r.id
    setLocal(l => l.filter((_, i) => i !== idx))
    if (id) {
      await agroApi.producao.delete(id)
      onDeleteRows([id])
    }
  }

  const [addError, setAddError] = useState('')
  const handleAdd = async (cultura: string, ordem: string) => {
    setAddError('')
    try {
      // Salva dirty rows primeiro
      const toSave = local.filter(r => r.dirty)
      const savedRows: AgroProducao[] = []
      for (const r of toSave) {
        const { dirty: _, id: _id, ...payload } = r
        const saved = r.id
          ? await agroApi.producao.update(r.id, payload)
          : await agroApi.producao.create(payload)
        savedRows.push(saved)
      }

      const novo = await agroApi.producao.create({
        clientId, safra, tipo, cultura, ordem,
        cotacao: 0, area: 0, produtividade: 0, custoPorHa: 0, areaArrendada: 0, custoArrendHa: 0,
      })

      setLocal(l => [...l.map(r => ({ ...r, dirty: false })), { ...novo, dirty: false }])
      onAddRows([...savedRows, novo])
    } catch (e: any) {
      setAddError(e?.message ?? 'Erro ao adicionar cultura')
    }
  }

  const [saving, setSaving] = useState(false)
  const handleSaveAll = async () => {
    const dirtyRows = local.filter(r => r.dirty)
    if (dirtyRows.length === 0) return
    setSaving(true)
    try {
      const savedRows: AgroProducao[] = []
      for (const r of dirtyRows) {
        const { dirty: _, id: _id, ...payload } = r
        const saved = r.id
          ? await agroApi.producao.update(r.id, payload)
          : await agroApi.producao.create(payload)
        savedRows.push(saved)
      }
      setLocal(l => l.map(r => ({ ...r, dirty: false })))
      onAddRows(savedRows)
    } finally { setSaving(false) }
  }

  const [deletingSafra, setDeletingSafra] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const handleDeleteSafra = async () => {
    if (!confirmDelete) { setConfirmDelete(true); return }
    setDeletingSafra(true)
    try {
      const ids = local.filter(r => r.id).map(r => r.id!)
      for (const id of ids) await agroApi.producao.delete(id)
      setLocal([])
      onDeleteRows(ids)  // Atualiza pai cirurgicamente — sem reload
    } finally { setDeletingSafra(false); setConfirmDelete(false) }
  }

  // Cópia da safra anterior é gerenciada pelo pai via onCopyPrev + copyingPrev

  const [novaCultura, setNovaCultura]   = useState('')
  const [novaOrdem,   setNovaOrdem]     = useState('principal')
  const [showCultForm, setShowCultForm] = useState(false)

  const handleAddCustom = async () => {
    if (!novaCultura) return
    await handleAdd(novaCultura, novaOrdem)
    setNovaCultura(''); setShowCultForm(false)
  }

  const totalRec   = local.reduce((s, r) => s + calcRow(r).recBruta, 0)
  const totalCusto = local.reduce((s, r) => s + calcRow(r).custoTotal + calcRow(r).custoArrendTotal, 0)
  const totalLiq   = totalRec - totalCusto
  const totalArea  = local.reduce((s, r) => s + r.area, 0)

  const missing = CULTURAS.filter(c => !local.find(r => r.cultura === c.cultura))

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tipo === 'historico' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {tipo === 'historico' ? 'Histórico' : 'Previsão'}
          </span>
          <h3 className="font-bold text-gray-900">Safra {safra}</h3>
          {tipo === 'previsao' && prevRows && prevRows.length > 0 && onCopyPrev && (
            <button
              onClick={onCopyPrev}
              disabled={copyingPrev}
              className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-200 px-2.5 py-1 rounded-lg hover:bg-amber-100 disabled:opacity-50"
              title="Copia todas as culturas e valores da safra anterior"
            >
              <Copy size={11} /> {copyingPrev ? 'Copiando...' : 'Repetir safra anterior'}
            </button>
          )}
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-4 text-xs text-gray-500">
            <span>Área: <strong>{totalArea.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ha</strong></span>
            <span>Receita Bruta: <strong className="text-gray-900">{fmtBRL(totalRec)}</strong></span>
            <span>Custo Total: <strong className="text-red-500">{fmtBRL(totalCusto)}</strong></span>
            <span>Resultado: <strong className={totalLiq >= 0 ? 'text-af-green' : 'text-red-600'}>{fmtBRL(totalLiq)}</strong></span>
          </div>
          {local.some(r => r.dirty) && (
            <button onClick={handleSaveAll} disabled={saving}
              className="flex items-center gap-1 text-xs bg-af-green text-white px-3 py-1.5 rounded-lg hover:bg-af-green/90 disabled:opacity-50">
              <CheckSquare size={12} /> {saving ? 'Salvando...' : 'Salvar tudo'}
            </button>
          )}
          {confirmDelete ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-red-600 font-semibold">Confirmar exclusão?</span>
              <button onClick={handleDeleteSafra} disabled={deletingSafra}
                className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-50">
                {deletingSafra ? 'Excluindo...' : 'Sim, excluir'}
              </button>
              <button onClick={() => setConfirmDelete(false)} className="text-xs text-gray-500 px-2 py-1 rounded hover:bg-gray-100">Cancelar</button>
            </div>
          ) : (
            <button onClick={handleDeleteSafra}
              className="flex items-center gap-1 text-xs text-red-500 border border-red-200 px-2.5 py-1.5 rounded-lg hover:bg-red-50">
              <Trash2 size={11} /> Excluir safra
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Cultura', 'Cotação (R$/sc)', 'Área (ha)', 'Produt. (sc/ha)', 'Custo/ha (sc)', 'Custo/ha (R$)', 'Área Arren. (ha)', 'Custo Arren/ha', 'Prod. Total (sc)', 'Rec. Bruta', 'Custo Total', 'Resultado', 'R$/ha', 'Custo/saca', 'PE (sc/ha)', 'Supráv./Déf.', 'Queda máx.', 'Margem', ''].map(h => (
                <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {local.map((row, idx) => (
              <ProducaoRow
                key={row.id ?? idx}
                item={row}
                onChange={(f, v) => handleChange(idx, f, v)}
                onSave={() => handleSave(idx)}
                onDelete={() => handleDeleteCultura(idx)}
                dirty={!!row.dirty}
              />
            ))}
          </tbody>
        </table>
      </div>

      <div className="px-4 py-2 border-t border-gray-50 flex flex-wrap gap-2 items-center">
        {missing.map(m => (
          <button key={m.cultura} onClick={() => handleAdd(m.cultura, m.ordem)}
            className="flex items-center gap-1 text-xs text-af-green hover:bg-af-green-pale px-2 py-1 rounded-lg border border-af-green/30">
            <Plus size={11} /> {m.cultura}
          </button>
        ))}

        {CULTURAS_TERCEIRA.filter(c => !local.find(r => r.cultura === c)).map(c => (
          <button key={c} onClick={() => handleAdd(c, 'terceira')}
            className="flex items-center gap-1 text-xs text-purple-700 hover:bg-purple-50 px-2 py-1 rounded-lg border border-purple-200">
            <Plus size={11} /> {c} <span className="text-purple-400 font-normal">(Pivô)</span>
          </button>
        ))}

        {!showCultForm ? (
          <button onClick={() => setShowCultForm(true)}
            className="flex items-center gap-1 text-xs text-gray-500 hover:bg-gray-100 px-2 py-1 rounded-lg border border-gray-200">
            <Plus size={11} /> Outra cultura
          </button>
        ) : (
          <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-1.5 border border-gray-200">
            <select value={novaOrdem} onChange={e => { setNovaOrdem(e.target.value); setNovaCultura('') }} className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
              <option value="principal">1ª Safra</option>
              <option value="segunda">2ª Safra</option>
              <option value="terceira">3ª Safra (Pivô)</option>
            </select>
            <select value={novaCultura} onChange={e => setNovaCultura(e.target.value)} className="text-xs border border-gray-200 rounded px-1 py-0.5 bg-white">
              <option value="">Selecione...</option>
              {(novaOrdem === 'principal' ? CULTURAS_PRINCIPAL : novaOrdem === 'segunda' ? CULTURAS_SEGUNDA : CULTURAS_TERCEIRA).map(c => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <button onClick={handleAddCustom} disabled={!novaCultura}
              className="text-xs bg-af-green text-white px-2 py-0.5 rounded disabled:opacity-50">Adicionar</button>
            <button onClick={() => { setShowCultForm(false); setAddError('') }} className="text-xs text-gray-400 hover:text-gray-600">✕</button>
          </div>
        )}
        {addError && <span className="text-xs text-red-500 w-full mt-1">{addError}</span>}
      </div>
    </Card>
  )
}

export function TabProducao({ clientId }: { clientId: string }) {
  const [producoes, setProducoes] = useState<AgroProducao[]>([])
  const [initialLoading, setInitialLoading] = useState(true)
  // Versão por safra — só o SafraBlock que recebeu a cópia remonta
  const [safraVersions, setSafraVersions] = useState<Record<string, number>>({})
  const [copyingFor, setCopyingFor] = useState<string | null>(null)

  // Cópia de safra anterior — busca dados do banco (não do estado React que pode estar desatualizado)
  const handleCopyPrevSafra = async (targetSafra: string, targetTipo: string) => {
    setCopyingFor(targetSafra)
    try {
      // 1. Busca dados frescos do banco ANTES de qualquer coisa
      const allRecords = await agroApi.producao.list(clientId)

      // 2. Encontra a safra anterior com dados salvos (mesma lógica de prevRowsFor mas usando dados do banco)
      const todasFrescas = [
        ...SAFRAS_HISTORICAS.map(s => ({ safra: s, rows: allRecords.filter(r => r.safra === s) })),
        ...SAFRAS_FUTURAS.map(s => ({ safra: s, rows: allRecords.filter(r => r.safra === s && r.tipo === targetTipo) })),
      ]
      const idxTarget = todasFrescas.findIndex(s => s.safra === targetSafra)
      let prevRows: AgroProducao[] = []
      for (let i = idxTarget - 1; i >= 0; i--) {
        if (todasFrescas[i].rows.length > 0) { prevRows = todasFrescas[i].rows; break }
      }

      if (prevRows.length === 0) {
        alert('Nenhuma safra anterior com dados encontrada.')
        return
      }

      // Deduplica por cultura (mantém o de maior score, igual ao SafraBlock na tela)
      const deduped = new Map<string, AgroProducao>()
      for (const r of prevRows) {
        const score = (r.cotacao || 0) + (r.area || 0) + (r.produtividade || 0)
        const prev = deduped.get(r.cultura)
        const prevScore = prev ? (prev.cotacao || 0) + (prev.area || 0) + (prev.produtividade || 0) : -1
        if (score > prevScore) deduped.set(r.cultura, r)
      }
      prevRows = Array.from(deduped.values())

      // Se tudo for zero, os dados não foram salvos — avisa o usuário
      const allZero = prevRows.every(r => !r.cotacao && !r.area && !r.produtividade)
      if (allZero) {
        alert('Os dados da safra anterior estão zerados no banco.\n\nClique em "Salvar tudo" na safra anterior antes de copiar.')
        return
      }

      // 3. Mostra preview com dados REAIS do banco
      const preview = prevRows.map(r =>
        `${r.cultura}: cotação ${r.cotacao}, área ${r.area}ha, produt. ${r.produtividade} sc/ha`
      ).join('\n')
      if (!confirm(`Copiar para safra ${targetSafra}?\n\nValores salvos na safra anterior:\n${preview}`)) return

      // 4. Para cada cultura da safra anterior: atualiza se já existe, cria se não existe
      const currentRecords = allRecords.filter(r => r.safra === targetSafra && r.tipo === targetTipo)
      for (const prev of prevRows) {
        const existing = currentRecords.find(r => r.cultura === prev.cultura)
        const vals = {
          cotacao: prev.cotacao, area: prev.area,
          produtividade: prev.produtividade, custoPorHa: prev.custoPorHa,
          areaArrendada: prev.areaArrendada, custoArrendHa: prev.custoArrendHa,
        }
        if (existing?.id) {
          await agroApi.producao.update(existing.id, vals)
        } else {
          await agroApi.producao.create({
            clientId, safra: targetSafra, tipo: targetTipo,
            cultura: prev.cultura, ordem: prev.ordem, ...vals,
          })
        }
      }

      // 5. Reload + remonta APENAS o SafraBlock copiado
      const fresh = await agroApi.producao.list(clientId)
      setProducoes(fresh)
      setSafraVersions(v => ({ ...v, [targetSafra]: (v[targetSafra] ?? 0) + 1 }))
    } finally {
      setCopyingFor(null)
    }
  }

  // Atualiza produção no estado pai sem reload completo
  const handleAddRows = (newRows: AgroProducao[]) => {
    setProducoes(prev => {
      const sem = prev.filter(x => !newRows.some(n => n.id && n.id === x.id))
      return [...sem, ...newRows]
    })
  }

  // Remove registros do estado pai sem reload completo
  const handleDeleteRows = (ids: string[]) => {
    setProducoes(prev => prev.filter(x => !x.id || !ids.includes(x.id)))
  }

  // Remove antigos e insere novos em UMA única atualização — zero re-renders intermediários
  const handleReplaceRows = (oldIds: string[], newRows: AgroProducao[]) => {
    setProducoes(prev => {
      const semAntigos = prev.filter(x => !x.id || !oldIds.includes(x.id))
      const semDup     = semAntigos.filter(x => !newRows.some(n => n.id && n.id === x.id))
      return [...semDup, ...newRows]
    })
  }

  const [bmCache, setBmCache] = useState<Record<string, any>>({})

  const loadBm = async (key: string) => {
    if (bmCache[key]) return
    try {
      const data = await pjBenchmarkApi.getAgro(key)
      setBmCache(c => ({ ...c, [key]: data }))
    } catch {}
  }

  useEffect(() => {
    loadBm('SOJA'); loadBm('MILHO'); loadBm('FEIJAO')
    producoes.forEach(p => loadBm(benchmarkKey(p.cultura)))
  }, [producoes])

  useEffect(() => {
    setInitialLoading(true)
    agroApi.producao.list(clientId)
      .then(data => setProducoes(data))
      .finally(() => setInitialLoading(false))
  }, [clientId])

  const safrasHistoricas = SAFRAS_HISTORICAS.map(safra => {
    const all = producoes.filter(p => p.safra === safra)
    const seen = new Set<string>()
    const rows = [...all]
      .sort((a, b) => {
        const aScore = (a.cotacao || 0) + (a.area || 0) + (a.produtividade || 0)
        const bScore = (b.cotacao || 0) + (b.area || 0) + (b.produtividade || 0)
        return bScore - aScore
      })
      .filter(r => { if (seen.has(r.cultura)) return false; seen.add(r.cultura); return true })
    return { safra, tipo: 'historico', rows }
  })

  const safrasFuturasCadastradas = SAFRAS_FUTURAS.map(safra => ({
    safra,
    tipo: 'previsao',
    rows: producoes.filter(p => p.safra === safra && p.tipo === 'previsao'),
  }))

  const safrasFuturasVazias = safrasFuturasCadastradas.filter(s => s.rows.length === 0)

  // Safra anterior com dados para "Repetir safra anterior"
  function prevRowsFor(safra: string): AgroProducao[] {
    // Constrói lista ordenada de todas as safras (hist + futuras) que tenham dados
    const todas = [
      ...safrasHistoricas,
      ...safrasFuturasCadastradas,
    ]
    // Encontra o índice da safra atual na lista completa (não só nas com dados)
    const idxTotal = todas.findIndex(s => s.safra === safra)
    if (idxTotal <= 0) return []
    // Busca a safra anterior mais próxima que tenha dados
    for (let i = idxTotal - 1; i >= 0; i--) {
      if (todas[i].rows.length > 0) return todas[i].rows
    }
    return []
  }

  const handleAddSafra = async (safra: string, tipo: string) => {
    const jaExiste = producoes.some(p => p.safra === safra)
    if (!jaExiste) {
      const criados: AgroProducao[] = []
      for (const c of CULTURAS) {
        const novo = await agroApi.producao.create({
          clientId, safra, tipo,
          cultura: c.cultura, ordem: c.ordem,
          cotacao: 0, area: 0, produtividade: 0, custoPorHa: 0, areaArrendada: 0, custoArrendHa: 0,
        })
        criados.push(novo)
      }
      // Atualiza estado pai diretamente
      handleAddRows(criados)
    }
  }

  if (initialLoading) return <div className="text-center py-16 text-gray-400 text-sm">Carregando produção...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Produção Rural — Histórico + Planejamento</h2>
          <p className="text-xs text-gray-500 mt-0.5">Registre safras históricas e planeje até 10 safras futuras</p>
        </div>
        <div className="flex flex-wrap gap-2 justify-end max-w-2xl">
          {safrasHistoricas.filter(s => s.rows.length === 0).map(s => (
            <button key={s.safra} onClick={() => handleAddSafra(s.safra, 'historico')} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              <Plus size={12} /> Safra {s.safra}
            </button>
          ))}
        </div>
      </div>

      {safrasHistoricas.map(s => s.rows.length > 0 && (
        <SafraBlock
          key={`${s.safra}-historico-${safraVersions[s.safra] ?? 0}`}
          {...s}
          clientId={clientId}
          onDeleteRows={handleDeleteRows}
          onAddRows={handleAddRows}
          onReplaceRows={handleReplaceRows}
          prevRows={prevRowsFor(s.safra)}
        />
      ))}

      {safrasFuturasCadastradas.map(s => s.rows.length > 0 && (
        <SafraBlock
          key={`${s.safra}-previsao-${safraVersions[s.safra] ?? 0}`}
          {...s}
          clientId={clientId}
          onDeleteRows={handleDeleteRows}
          onAddRows={handleAddRows}
          onReplaceRows={handleReplaceRows}
          prevRows={prevRowsFor(s.safra)}
          onCopyPrev={() => handleCopyPrevSafra(s.safra, s.tipo)}
          copyingPrev={copyingFor === s.safra}
        />
      ))}

      {safrasFuturasVazias.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2 font-semibold uppercase tracking-wide">Adicionar safra de previsão</p>
          <div className="flex flex-wrap gap-2">
            {safrasFuturasVazias.map(s => (
              <button key={s.safra} onClick={() => handleAddSafra(s.safra, 'previsao')}
                className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
                <Plus size={12} /> {s.safra}
              </button>
            ))}
          </div>
        </div>
      )}

      {producoes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Sprout size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Nenhuma safra cadastrada</p>
          <p className="text-gray-400 text-xs mt-1">Clique nos botões acima para adicionar</p>
        </div>
      )}

      {Object.keys(bmCache).length > 0 && (
        <div className="mt-6">
          <h3 className="font-bold text-gray-900 mb-1">Benchmarks de Referência — Mato Grosso</h3>
          <p className="text-xs text-gray-400 mb-4">Fontes: IMEA Safra 2024/25, CONAB, CNA/Senar-MT, CONFAEAB, SISTEMA FAEG.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {[
              { key: 'SOJA',     emoji: '🌾', nome: 'Soja' },
              { key: 'MILHO',    emoji: '🌽', nome: 'Milho 2ª Safra' },
              { key: 'ALGODAO',  emoji: '🪡', nome: 'Algodão' },
              { key: 'SORGO',    emoji: '🌾', nome: 'Sorgo' },
              { key: 'MILHETO',  emoji: '🌿', nome: 'Milheto' },
              { key: 'GIRASSOL', emoji: '🌻', nome: 'Girassol' },
              { key: 'FEIJAO',   emoji: '🫘', nome: 'Feijão (Pivô irrigado)' },
            ].filter(c => bmCache[c.key] && Object.keys(bmCache[c.key]).length > 0).map(({ key, emoji, nome }) => {
              const bm = bmCache[key]
              return (
                <Card key={key} className="p-4">
                  <p className="font-bold text-gray-900 mb-3">{emoji} {nome}</p>
                  <div className="space-y-1.5">
                    {Object.entries(bm).map(([k, v]: [string, any]) => (
                      <div key={k} className="flex items-center justify-between py-1 border-b border-gray-50">
                        <div className="flex items-center gap-1">
                          <span className="text-xs text-gray-700">{v.label}</span>
                          <button title={`${v.descricao}\nFonte: ${v.fonte} (${v.ano})`} className="text-gray-300 hover:text-gray-500"><Info size={9} /></button>
                        </div>
                        <p className="text-xs font-semibold text-gray-900">
                          {v.unit === 'R$'    ? `R$ ${Number(v.ideal_min).toLocaleString('pt-BR', {maximumFractionDigits: 0})}–${Number(v.ideal_max).toLocaleString('pt-BR', {maximumFractionDigits: 0})}` :
                           v.unit === '%'     ? `${v.ideal_min}–${v.ideal_max}%` :
                           v.unit === '@/ha'  ? `${v.ideal_min}–${v.ideal_max} @/ha` :
                           `${v.ideal_min}–${v.ideal_max} ${v.unit}`}
                        </p>
                      </div>
                    ))}
                    {(() => { const first = Object.values(bm)[0] as any; return first ? <p className="text-xs text-gray-400 mt-1">{first.fonte?.split('/')[0]?.trim()} · {first.ano}</p> : null })()}
                  </div>
                </Card>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
