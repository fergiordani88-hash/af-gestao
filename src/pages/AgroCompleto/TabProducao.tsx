import { useState, useEffect } from 'react'
import { Plus, Trash2, Save, Sprout, Info } from 'lucide-react'
import { agroApi, type AgroProducao } from '../../services/agroApi'
import { pjBenchmarkApi } from '../../services/benchmarkApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })

const SAFRAS_HISTORICAS = ['2022/23', '2023/24', '2024/25']
const SAFRA_PREVISAO = '2025/26'
const CULTURAS = [
  { cultura: 'Soja', ordem: 'principal' },
  { cultura: 'Milho 2ª', ordem: 'segunda' },
]

function calcRow(p: AgroProducao) {
  const prodTotal      = p.area * p.produtividade
  const recBruta       = prodTotal * p.cotacao
  const custoTotal     = p.area * p.custoPorHa
  const custoArrendTotal = p.areaArrendada * p.custoArrendHa
  const recLiq         = recBruta - custoTotal - custoArrendTotal
  const custoTotalHa   = p.custoPorHa + (p.area > 0 ? custoArrendTotal / p.area : 0)
  const peHa           = p.cotacao > 0 ? custoTotalHa / p.cotacao : 0  // PE com arrendamento
  const peHaCOE        = p.cotacao > 0 ? p.custoPorHa / p.cotacao : 0  // PE só custo operacional
  const margemPct      = recBruta > 0 ? (recLiq / recBruta) * 100 : 0
  const rentabilidadeHa= p.area > 0 ? recLiq / p.area : 0
  const custoPorSaca   = p.produtividade > 0 ? p.custoPorHa / p.produtividade : 0
  // Sensibilidade: queda de preço necessária para zerar margem
  const quedaPrecoZero = p.cotacao > 0 ? ((p.cotacao - peHa) / p.cotacao) * 100 : 0
  // Superávit/déficit em relação ao PE
  const superavitSc    = p.produtividade - peHa
  // Risco: se produtividade atual < PE com folga de 10%
  const riscoQueda     = p.produtividade < peHa * 1.1
  return { prodTotal, recBruta, custoTotal, custoArrendTotal, recLiq, peHa, peHaCOE, margemPct, rentabilidadeHa, custoPorSaca, quedaPrecoZero, superavitSc, riscoQueda }
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
      <td className="px-3 py-2 text-sm text-right text-gray-600">{c.prodTotal.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}</td>
      <td className="px-3 py-2 text-sm text-right font-semibold text-gray-900">{fmtBRL(c.recBruta)}</td>
      <td className="px-3 py-2 text-sm text-right text-red-500">{fmtBRL(c.custoTotal + c.custoArrendTotal)}</td>
      <td className={`px-3 py-2 text-sm text-right font-bold ${c.recLiq >= 0 ? 'text-af-green' : 'text-red-600'}`}>{fmtBRL(c.recLiq)}</td>
      <td className="px-3 py-2 text-sm text-right text-gray-600">{fmtBRL(c.rentabilidadeHa)}/ha</td>
      <td className="px-3 py-2 text-sm text-right text-gray-500">R$ {c.custoPorSaca.toFixed(1)}/sc</td>
      <td className="px-3 py-2 text-sm text-right text-gray-500">{c.peHa.toFixed(1)} sc</td>
      <td className={`px-3 py-2 text-sm text-right font-semibold ${c.superavitSc >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>{c.superavitSc >= 0 ? '+' : ''}{c.superavitSc.toFixed(1)} sc</td>
      <td className={`px-3 py-2 text-sm text-right ${c.riscoQueda ? 'text-red-500 font-semibold' : 'text-emerald-600'}`}>{c.quedaPrecoZero.toFixed(0)}%</td>
      <td className={`px-3 py-2 text-sm text-right font-semibold ${c.margemPct >= 15 ? 'text-emerald-600' : 'text-red-500'}`}>{c.margemPct.toFixed(1)}%</td>
      <td className="px-3 py-2">
        <div className="flex gap-1">
          {dirty && <button onClick={onSave} className="p-1 text-af-green hover:bg-af-green-pale rounded" title="Salvar"><Save size={13} /></button>}
          <button onClick={onDelete} className="p-1 text-red-400 hover:bg-red-50 rounded" title="Excluir"><Trash2 size={13} /></button>
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
  onRefresh: () => void
}

function SafraBlock({ safra, tipo, rows, clientId, onRefresh }: SafraBlockProps) {
  const [local, setLocal] = useState<(AgroProducao & { dirty?: boolean })[]>([])

  useEffect(() => { setLocal(rows.map(r => ({ ...r, dirty: false }))) }, [rows])

  const handleChange = (idx: number, field: keyof AgroProducao, val: number | string) => {
    setLocal(l => l.map((r, i) => i === idx ? { ...r, [field]: val, dirty: true } : r))
  }

  const handleSave = async (idx: number) => {
    const r = local[idx]
    if (r.id) await agroApi.producao.update(r.id, r)
    else await agroApi.producao.create(r)
    onRefresh()
  }

  const handleDelete = async (idx: number) => {
    const r = local[idx]
    if (r.id) await agroApi.producao.delete(r.id)
    onRefresh()
  }

  const handleAdd = async (cultura: string, ordem: string) => {
    await agroApi.producao.create({
      clientId, safra, tipo, cultura, ordem,
      cotacao: 0, area: 0, produtividade: 0, custoPorHa: 0, areaArrendada: 0, custoArrendHa: 0,
    })
    onRefresh()
  }

  const totalRec = local.reduce((s, r) => s + calcRow(r).recBruta, 0)
  const totalCusto = local.reduce((s, r) => s + calcRow(r).custoTotal + calcRow(r).custoArrendTotal, 0)
  const totalLiq = totalRec - totalCusto
  const totalArea = local.reduce((s, r) => s + r.area, 0)

  const missing = CULTURAS.filter(c => !local.find(r => r.cultura === c.cultura))

  return (
    <Card className="mb-4">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-3">
          <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${tipo === 'historico' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
            {tipo === 'historico' ? 'Histórico' : 'Previsão'}
          </span>
          <h3 className="font-bold text-gray-900">Safra {safra}</h3>
        </div>
        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Área: <strong>{totalArea.toLocaleString('pt-BR', { maximumFractionDigits: 0 })} ha</strong></span>
          <span>Receita Bruta: <strong className="text-gray-900">{fmtBRL(totalRec)}</strong></span>
          <span>Custo Total: <strong className="text-red-500">{fmtBRL(totalCusto)}</strong></span>
          <span>Resultado: <strong className={totalLiq >= 0 ? 'text-af-green' : 'text-red-600'}>{fmtBRL(totalLiq)}</strong></span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-100">
              {['Cultura', 'Cotação (R$/sc)', 'Área (ha)', 'Produt. (sc/ha)', 'Custo/ha (R$)', 'Área Arren. (ha)', 'Custo Arren/ha', 'Prod. Total (sc)', 'Rec. Bruta', 'Custo Total', 'Resultado', 'R$/ha', 'Custo/saca', 'PE (sc/ha)', 'Supráv./Déf.', 'Queda máx.', 'Margem', ''].map(h => (
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
                onDelete={() => handleDelete(idx)}
                dirty={!!row.dirty}
              />
            ))}
          </tbody>
        </table>
      </div>

      {missing.length > 0 && (
        <div className="px-4 py-2 flex gap-2 border-t border-gray-50">
          {missing.map(m => (
            <button
              key={m.cultura}
              onClick={() => handleAdd(m.cultura, m.ordem)}
              className="flex items-center gap-1 text-xs text-af-green hover:bg-af-green-pale px-2 py-1 rounded-lg border border-af-green/30"
            >
              <Plus size={11} /> {m.cultura}
            </button>
          ))}
        </div>
      )}
    </Card>
  )
}

export function TabProducao({ clientId }: { clientId: string }) {
  const [producoes, setProducoes] = useState<AgroProducao[]>([])
  const [loading, setLoading]     = useState(true)
  const [bmSoja,  setBmSoja]      = useState<Record<string, any>>({})
  const [bmMilho, setBmMilho]     = useState<Record<string, any>>({})

  const load = async () => {
    setLoading(true)
    try {
      const data = await agroApi.producao.list(clientId)
      setProducoes(data)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    pjBenchmarkApi.getAgro('SOJA').then(setBmSoja).catch(() => {})
    pjBenchmarkApi.getAgro('MILHO').then(setBmMilho).catch(() => {})
  }, [])

  useEffect(() => { load() }, [clientId])

  const safrasHistoricas = SAFRAS_HISTORICAS.map(safra => ({
    safra,
    tipo: 'historico',
    rows: producoes.filter(p => p.safra === safra && p.tipo === 'historico'),
  }))

  const safraPrevisao = {
    safra: SAFRA_PREVISAO,
    tipo: 'previsao',
    rows: producoes.filter(p => p.tipo === 'previsao'),
  }

  const handleAddSafra = async (safra: string, tipo: string) => {
    for (const c of CULTURAS) {
      await agroApi.producao.create({
        clientId, safra, tipo,
        cultura: c.cultura, ordem: c.ordem,
        cotacao: 0, area: 0, produtividade: 0, custoPorHa: 0, areaArrendada: 0, custoArrendHa: 0,
      })
    }
    load()
  }

  if (loading) return <div className="text-center py-16 text-gray-400 text-sm">Carregando produção...</div>

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="font-bold text-gray-900">Produção Rural — Histórico Triênio + Previsão</h2>
          <p className="text-xs text-gray-500 mt-0.5">Registre soja, milho e demais culturas por safra</p>
        </div>
        <div className="flex gap-2">
          {safrasHistoricas.filter(s => s.rows.length === 0).map(s => (
            <button key={s.safra} onClick={() => handleAddSafra(s.safra, 'historico')} className="flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-100">
              <Plus size={12} /> Safra {s.safra}
            </button>
          ))}
          {safraPrevisao.rows.length === 0 && (
            <button onClick={() => handleAddSafra(SAFRA_PREVISAO, 'previsao')} className="flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg hover:bg-emerald-100">
              <Plus size={12} /> Previsão {SAFRA_PREVISAO}
            </button>
          )}
        </div>
      </div>

      {[...safrasHistoricas, safraPrevisao].map(s => s.rows.length > 0 && (
        <SafraBlock key={`${s.safra}-${s.tipo}`} {...s} clientId={clientId} onRefresh={load} />
      ))}

      {producoes.length === 0 && (
        <div className="text-center py-16 bg-white rounded-2xl border border-gray-100">
          <Sprout size={40} className="mx-auto mb-3 text-gray-300" />
          <p className="text-gray-500 text-sm">Nenhuma safra cadastrada</p>
          <p className="text-gray-400 text-xs mt-1">Clique nos botões acima para adicionar</p>
        </div>
      )}

      {/* Painel de benchmark por cultura */}
      {(Object.keys(bmSoja).length > 0 || Object.keys(bmMilho).length > 0) && (
        <div className="mt-6">
          <h3 className="font-bold text-gray-900 mb-1">Benchmark de Referência — Mato Grosso</h3>
          <p className="text-xs text-gray-400 mb-4">Fontes: IMEA Safra 2024/25, CONAB, CNA/Senar-MT, Abramilho. Hover no ℹ para detalhes.</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              { label: '🌾 Soja', bm: bmSoja },
              { label: '🌽 Milho 2ª Safra', bm: bmMilho },
            ].map(({ label, bm }) => (
              <Card key={label} className="p-4">
                <p className="font-bold text-gray-900 mb-3">{label}</p>
                <div className="space-y-2">
                  {Object.entries(bm).map(([k, v]: [string, any]) => (
                    <div key={k} className="flex items-center justify-between py-1.5 border-b border-gray-50">
                      <div>
                        <span className="text-xs font-medium text-gray-700">{v.label}</span>
                        <button title={`${v.descricao}\nFonte: ${v.fonte} (${v.ano})`} className="ml-1 text-gray-300 hover:text-gray-500 align-middle">
                          <Info size={10} />
                        </button>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-semibold text-gray-900">
                          {v.unit === 'R$' ? `R$ ${v.ideal_min.toLocaleString('pt-BR', {maximumFractionDigits: 0})} – R$ ${v.ideal_max.toLocaleString('pt-BR', {maximumFractionDigits: 0})}` : ''}
                          {v.unit === '%' ? `${v.ideal_min}% – ${v.ideal_max}%` : ''}
                          {v.unit === 'sc/ha' ? `${v.ideal_min} – ${v.ideal_max} sc/ha` : ''}
                        </p>
                        <p className="text-xs text-gray-400">{v.fonte?.split('/')[0]?.trim()} · {v.ano}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
