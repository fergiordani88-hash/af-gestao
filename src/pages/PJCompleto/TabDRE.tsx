import { useState, useEffect } from 'react'
import { Save, RefreshCw, TrendingUp, TrendingDown, AlertTriangle, CheckCircle } from 'lucide-react'
import { pjApi, type PJDRE, type PJIndicadores } from '../../services/pjApi'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct  = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtX    = (v: number) => `${v.toFixed(2)}x`
const fmtDias = (v: number) => `${v.toFixed(0)} dias`

const BENCHMARK = {
  margBruta:  { min: 0.35, max: 0.55, label: 'Margem Bruta',    ref: '35%–55%' },
  margEbitda: { min: 0.08, max: 0.18, label: 'Margem EBITDA',   ref: '8%–18%' },
  margLiq:    { min: 0.03, max: 0.08, label: 'Margem Líquida',  ref: '3%–8%' },
  liquidezC:  { min: 1.2,  max: 2.0,  label: 'Liquidez Corrente', ref: '1.2–2.0x' },
  cobDivida:  { min: 2.0,  max: 6.0,  label: 'Cobertura Dívida', ref: '≥ 2.0x' },
}

function statusBenchmark(val: number, min: number, max: number) {
  if (val >= min && val <= max) return 'ok'
  if (val >= min * 0.7) return 'warn'
  return 'bad'
}

const statusColor = { ok: 'text-emerald-600', warn: 'text-amber-600', bad: 'text-red-600' }
const statusBg    = { ok: 'bg-emerald-50 border-emerald-200', warn: 'bg-amber-50 border-amber-200', bad: 'bg-red-50 border-red-200' }
const statusLabel = { ok: '✓ Saudável', warn: '⚠ Atenção', bad: '✗ Crítico' }

const EMPTY_DRE: PJDRE = {
  clientId: '', receitaBruta: 0, cmv: 0, despesasFixas: 0, folha: 0,
  proLabore: 0, tributos: 0, despesasFinanceiras: 0, parcela: 0,
  caixa: 0, aReceber: 0, estoque: 0, aFornecedores: 0,
  dividaTotal: 0, dividaCP: 0, diasEstoque: 30, lucroInformadoSocio: 0,
}

export function TabDRE({ clientId }: { clientId: string }) {
  const [dre, setDre]     = useState<PJDRE>({ ...EMPTY_DRE, clientId })
  const [ind, setInd]     = useState<PJIndicadores | null>(null)
  const [saving, setSaving] = useState(false)
  const [dirty, setDirty] = useState(false)

  const load = async () => {
    const r = await pjApi.dre.indicadores(clientId)
    if (r) { setDre({ ...r.dre, clientId }); setInd(r.indicadores); setDirty(false) }
  }

  useEffect(() => { load() }, [clientId])

  const set = (k: keyof PJDRE, v: number) => { setDre(d => ({ ...d, [k]: v })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try {
      const r = await pjApi.dre.save({ ...dre, clientId })
      setInd(r.indicadores)
      setDirty(false)
    } finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-900">DRE Gerencial & Indicadores</h2>
          <p className="text-xs text-gray-500 mt-0.5">Preencha os dados financeiros — os indicadores são calculados automaticamente</p>
        </div>
        <button onClick={handleSave} disabled={saving || !dirty}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold">
          <Save size={15} /> {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formulário */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Entradas — DRE Mensal</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Receita & CMV</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Receita Bruta (R$/mês)</label><input type="number" className={inp} value={dre.receitaBruta || ''} onChange={e => set('receitaBruta', +e.target.value)} /></div>
                <div><label className={lbl}>CMV (R$/mês)</label><input type="number" className={inp} value={dre.cmv || ''} onChange={e => set('cmv', +e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Despesas Operacionais</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Despesas Fixas</label><input type="number" className={inp} value={dre.despesasFixas || ''} onChange={e => set('despesasFixas', +e.target.value)} /></div>
                <div><label className={lbl}>Folha de Pagamento</label><input type="number" className={inp} value={dre.folha || ''} onChange={e => set('folha', +e.target.value)} /></div>
                <div><label className={lbl}>Pró-labore dos Sócios</label><input type="number" className={inp} value={dre.proLabore || ''} onChange={e => set('proLabore', +e.target.value)} /></div>
                <div><label className={lbl}>Tributos Mensais</label><input type="number" className={inp} value={dre.tributos || ''} onChange={e => set('tributos', +e.target.value)} /></div>
                <div><label className={lbl}>Despesas Financeiras</label><input type="number" className={inp} value={dre.despesasFinanceiras || ''} onChange={e => set('despesasFinanceiras', +e.target.value)} /></div>
                <div><label className={lbl}>Parcela Bancária Total</label><input type="number" className={inp} value={dre.parcela || ''} onChange={e => set('parcela', +e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Balanço Patrimonial Simplificado</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Caixa / Bancos</label><input type="number" className={inp} value={dre.caixa || ''} onChange={e => set('caixa', +e.target.value)} /></div>
                <div><label className={lbl}>Clientes a Receber</label><input type="number" className={inp} value={dre.aReceber || ''} onChange={e => set('aReceber', +e.target.value)} /></div>
                <div><label className={lbl}>Estoque</label><input type="number" className={inp} value={dre.estoque || ''} onChange={e => set('estoque', +e.target.value)} /></div>
                <div><label className={lbl}>A Pagar Fornecedores</label><input type="number" className={inp} value={dre.aFornecedores || ''} onChange={e => set('aFornecedores', +e.target.value)} /></div>
                <div><label className={lbl}>Dívida Total</label><input type="number" className={inp} value={dre.dividaTotal || ''} onChange={e => set('dividaTotal', +e.target.value)} /></div>
                <div><label className={lbl}>Dívida Curto Prazo (12m)</label><input type="number" className={inp} value={dre.dividaCP || ''} onChange={e => set('dividaCP', +e.target.value)} /></div>
                <div><label className={lbl}>Dias médios em estoque</label><input type="number" className={inp} value={dre.diasEstoque || ''} onChange={e => set('diasEstoque', +e.target.value)} /></div>
                <div><label className={lbl}>Lucro informado pelo sócio</label><input type="number" className={inp} value={dre.lucroInformadoSocio || ''} onChange={e => set('lucroInformadoSocio', +e.target.value)} /></div>
              </div>
            </div>
          </div>
        </Card>

        {/* DRE calculado */}
        {ind && (
          <div className="space-y-4">
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">DRE Gerencial Calculado</h3>
              <div className="space-y-1 text-sm">
                {[
                  ['Receita Bruta',                dre.receitaBruta,    '', false, false],
                  ['(–) CMV',                     -dre.cmv,            '', true, true],
                  ['= Lucro Bruto',               ind.lucBruto,        fmtPct(ind.margBruta), false, false],
                  ['(–) Despesas Operacionais',   -ind.despOp,         '', true, true],
                  ['= EBITDA',                    ind.ebitda,          fmtPct(ind.margEbitda), false, false],
                  ['(–) Tributos',               -dre.tributos,       '', true, true],
                  ['(–) Despesas Financeiras',   -dre.despesasFinanceiras, '', true, true],
                  ['= Lucro Líquido',             ind.lucLiq,          fmtPct(ind.margLiq), false, false],
                  ['(–) Amortização da Dívida',  -ind.amortizacao,     '', true, true],
                  ['= Sobra de Caixa',            ind.sobraCaixa,      '', false, false],
                ].map(([label, val, pct, indent, neg]) => (
                  <div key={String(label)} className={`flex justify-between py-1.5 border-b border-gray-50 ${String(label).startsWith('=') ? 'bg-blue-50 px-2 rounded font-bold' : ''}`}>
                    <span className={`${indent ? 'pl-3 text-gray-500' : 'font-medium text-gray-800'} text-xs`}>{label}</span>
                    <div className="flex items-center gap-2">
                      {pct && <span className="text-xs text-gray-400">{pct}</span>}
                      <span className={`text-xs font-semibold ${(val as number) < 0 ? 'text-red-600' : String(label).startsWith('=') ? 'text-blue-700' : 'text-gray-900'}`}>{fmtBRL(val as number)}</span>
                    </div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Indicadores com benchmark */}
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Indicadores vs. Benchmark</h3>
              <div className="space-y-2">
                {([
                  ['margBruta',  ind.margBruta,  fmtPct],
                  ['margEbitda', ind.margEbitda, fmtPct],
                  ['margLiq',    ind.margLiq,    fmtPct],
                  ['liquidezC',  ind.liquidezC,  fmtX],
                  ['cobDivida',  ind.cobDivida,  fmtX],
                ] as [keyof typeof BENCHMARK, number, (v: number) => string][]).map(([k, v, fmt]) => {
                  const bm = BENCHMARK[k]
                  const st = statusBenchmark(v, bm.min, bm.max)
                  return (
                    <div key={k} className={`flex items-center justify-between p-2 rounded-xl border ${statusBg[st]}`}>
                      <div>
                        <p className="text-xs font-semibold text-gray-700">{bm.label}</p>
                        <p className="text-xs text-gray-400">Referência: {bm.ref}</p>
                      </div>
                      <div className="text-right">
                        <p className={`text-base font-bold ${statusColor[st]}`}>{fmt(v)}</p>
                        <p className={`text-xs font-medium ${statusColor[st]}`}>{statusLabel[st]}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </Card>

            {/* Mais indicadores */}
            <Card className="p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Outros Indicadores</h3>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { l: 'Liquidez Seca', v: fmtX(ind.liquidezS), ok: ind.liquidezS >= 0.8 },
                  { l: 'NCG', v: fmtBRL(ind.ncg), ok: ind.ncg < dre.receitaBruta * 2 },
                  { l: 'Ponto de Equilíbrio', v: fmtBRL(ind.peBS), ok: ind.peBS < dre.receitaBruta },
                  { l: 'Sobra de Caixa', v: fmtBRL(ind.sobraCaixa), ok: ind.sobraCaixa > 0 },
                ].map(item => (
                  <div key={item.l} className={`p-3 rounded-xl border ${item.ok ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                    <p className="text-xs text-gray-500">{item.l}</p>
                    <p className={`text-base font-bold ${item.ok ? 'text-emerald-700' : 'text-red-700'}`}>{item.v}</p>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        )}

        {!ind && dre.receitaBruta === 0 && (
          <div className="flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-10">
            <div className="text-center text-gray-400">
              <RefreshCw size={32} className="mx-auto mb-2 opacity-40" />
              <p className="text-sm">Preencha os dados e salve para ver os indicadores</p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
