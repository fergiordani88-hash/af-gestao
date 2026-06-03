import { useState, useEffect } from 'react'
import { Save, RefreshCw, Info } from 'lucide-react'
import { pjApi, type PJDRE } from '../../services/pjApi'
import { pjBenchmarkApi } from '../../services/benchmarkApi'
import { Card } from '../../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const fmtPct  = (v: number) => `${(v * 100).toFixed(1)}%`
const fmtX    = (v: number) => `${v.toFixed(2)}x`
const fmtDias = (v: number) => `${v.toFixed(0)} dias`

const EMPTY_DRE: PJDRE = {
  clientId: '', receitaBruta: 0, cmv: 0, despesasFixas: 0, folha: 0,
  proLabore: 0, tributos: 0, despesasFinanceiras: 0, parcela: 0,
  caixa: 0, aReceber: 0, estoque: 0, aFornecedores: 0,
  dividaTotal: 0, dividaCP: 0, diasEstoque: 30, lucroInformadoSocio: 0,
}

interface Ind { [k: string]: number | string }
interface BM  { label: string; unit: string; min: number; ideal_min: number; ideal_max: number; fonte: string; ano: string; descricao: string }

function semaforo(val: number, bm: BM, invertido = false): 'verde' | 'amarelo' | 'vermelho' {
  // Para indicadores invertidos (quanto menor melhor: custo, endividamento, dias)
  if (invertido) {
    if (val <= bm.ideal_max) return 'verde'
    if (val <= bm.ideal_max * 1.3) return 'amarelo'
    return 'vermelho'
  }
  if (val >= bm.ideal_min) return 'verde'
  if (val >= bm.min) return 'amarelo'
  return 'vermelho'
}

const semaforoStyle = {
  verde:    { dot: 'bg-emerald-500', bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-800', label: 'Saudável' },
  amarelo:  { dot: 'bg-amber-400',   bg: 'bg-amber-50 border-amber-200',    text: 'text-amber-800',   label: 'Atenção' },
  vermelho: { dot: 'bg-red-500',     bg: 'bg-red-50 border-red-200',        text: 'text-red-800',     label: 'Crítico' },
}

function IndicadorCard({ label, valor, valorFmt, bm, invertido = false, fonte, descricao }: {
  label: string; valor: number; valorFmt: string; bm?: BM; invertido?: boolean; fonte?: string; descricao?: string
}) {
  const [showInfo, setShowInfo] = useState(false)
  const cor = bm ? semaforo(valor, bm, invertido) : null
  const st  = cor ? semaforoStyle[cor] : null

  return (
    <div className={`rounded-xl border p-3.5 relative ${st?.bg ?? 'bg-white border-gray-100'}`}>
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-semibold text-gray-600">{label}</p>
        {descricao && (
          <button onClick={() => setShowInfo(s => !s)} className="text-gray-300 hover:text-gray-500">
            <Info size={12} />
          </button>
        )}
      </div>

      <p className={`text-xl font-bold ${st?.text ?? 'text-gray-900'}`}>{valorFmt}</p>

      {bm && (
        <p className="text-xs text-gray-400 mt-0.5">
          Ideal: {bm.ideal_min}{bm.unit === '%' ? '%' : ''} – {bm.ideal_max}{bm.unit === '%' ? '%' : ''}
          {bm.unit === 'x' ? 'x' : ''}
          {bm.unit === 'R$' ? ' R$' : ''}
          {bm.unit === 'dias' ? ' dias' : ''}
          {bm.unit === 'sc/ha' ? ' sc/ha' : ''}
        </p>
      )}

      {cor && st && (
        <div className="flex items-center gap-1 mt-1.5">
          <span className={`w-2 h-2 rounded-full ${st.dot}`} />
          <span className={`text-xs font-medium ${st.text}`}>{st.label}</span>
        </div>
      )}

      {showInfo && (bm || descricao) && (
        <div className="absolute z-10 top-full left-0 mt-1 w-64 bg-white border border-gray-200 rounded-xl shadow-lg p-3 text-xs text-gray-600">
          {descricao && <p className="mb-1">{descricao}</p>}
          {bm && <p className="text-gray-400">Fonte: {bm.fonte} ({bm.ano})</p>}
        </div>
      )}
    </div>
  )
}

const CLASSIFICACAO_INFO: Record<string, { label: string; emoji: string; cor: string }> = {
  saudavel:       { label: 'Financeiramente Saudável', emoji: '✅', cor: 'bg-emerald-50 border-emerald-300 text-emerald-800' },
  atencao:        { label: 'Atenção',                  emoji: '⚠️', cor: 'bg-amber-50 border-amber-300 text-amber-800' },
  critico:        { label: 'Situação Crítica',         emoji: '🚨', cor: 'bg-orange-50 border-orange-300 text-orange-800' },
  reestruturacao: { label: 'Reestruturação Urgente',   emoji: '🔴', cor: 'bg-red-50 border-red-300 text-red-800' },
}

export function TabDRE({ clientId }: { clientId: string }) {
  const [dre, setDre]     = useState<PJDRE>({ ...EMPTY_DRE, clientId })
  const [ind, setInd]     = useState<any>(null)
  const [bm,  setBm]      = useState<Record<string, BM>>({})
  const [segmento, setSegmento] = useState('COMERCIO')
  const [saving, setSaving]     = useState(false)
  const [dirty, setDirty]       = useState(false)

  const loadBm = async (seg: string) => {
    try { setBm(await pjBenchmarkApi.getPJ(seg)) } catch {}
  }

  const load = async () => {
    const r = await pjApi.dre.indicadores(clientId)
    if (r) { setDre({ ...r.dre, clientId }); setInd(r.indicadores); setDirty(false) }
  }

  useEffect(() => { load() }, [clientId])
  useEffect(() => { loadBm(segmento) }, [segmento])

  const set = (k: keyof PJDRE, v: number) => { setDre(d => ({ ...d, [k]: v })); setDirty(true) }

  const handleSave = async () => {
    setSaving(true)
    try { const r = await pjApi.dre.save({ ...dre, clientId }); setInd(r.indicadores); setDirty(false) }
    finally { setSaving(false) }
  }

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  const cls = ind?.classificacao ? CLASSIFICACAO_INFO[ind.classificacao] : null

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="font-bold text-gray-900">DRE Gerencial & Indicadores Completos</h2>
          <p className="text-xs text-gray-500">Todos os indicadores com benchmark real por setor — fontes: IMEA, Sebrae, IEDI, PwC Brasil</p>
        </div>
        <div className="flex items-center gap-3">
          <select value={segmento} onChange={e => setSegmento(e.target.value)}
            className="border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white">
            <option value="COMERCIO">Comércio Varejista</option>
            <option value="SERVICOS">Serviços</option>
            <option value="INDUSTRIA">Indústria</option>
          </select>
          <button onClick={handleSave} disabled={saving || !dirty}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-xl px-4 py-2 text-sm font-semibold">
            <Save size={15} /> {saving ? 'Salvando...' : dirty ? 'Salvar' : 'Salvo'}
          </button>
        </div>
      </div>

      {/* Classificação geral */}
      {cls && (
        <div className={`flex items-center gap-4 p-4 rounded-2xl border-2 ${cls.cor}`}>
          <span className="text-3xl">{cls.emoji}</span>
          <div>
            <p className="font-bold text-lg">{cls.label}</p>
            {ind?.leituraCaixa && <p className="text-sm opacity-80">{ind.leituraCaixa}</p>}
            {ind?.prioridadeFinanceira && <p className="text-xs opacity-70 mt-0.5">Prioridade: {ind.prioridadeFinanceira}</p>}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Formulário de entradas */}
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4 pb-2 border-b">Entradas — DRE Mensal</h3>
          <div className="space-y-4">
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Receita & Custo</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Receita Bruta (R$/mês)</label><input type="number" className={inp} value={dre.receitaBruta || ''} onChange={e => set('receitaBruta', +e.target.value)} /></div>
                <div><label className={lbl}>CMV — Custo da Mercadoria</label><input type="number" className={inp} value={dre.cmv || ''} onChange={e => set('cmv', +e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Despesas Operacionais</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Despesas Fixas (excl. folha)</label><input type="number" className={inp} value={dre.despesasFixas || ''} onChange={e => set('despesasFixas', +e.target.value)} /></div>
                <div><label className={lbl}>Folha de Pagamento</label><input type="number" className={inp} value={dre.folha || ''} onChange={e => set('folha', +e.target.value)} /></div>
                <div><label className={lbl}>Pró-labore dos Sócios</label><input type="number" className={inp} value={dre.proLabore || ''} onChange={e => set('proLabore', +e.target.value)} /></div>
                <div><label className={lbl}>Tributos Mensais Estimados</label><input type="number" className={inp} value={dre.tributos || ''} onChange={e => set('tributos', +e.target.value)} /></div>
                <div><label className={lbl}>Despesas Financeiras (juros)</label><input type="number" className={inp} value={dre.despesasFinanceiras || ''} onChange={e => set('despesasFinanceiras', +e.target.value)} /></div>
                <div><label className={lbl}>Parcela Bancária Total</label><input type="number" className={inp} value={dre.parcela || ''} onChange={e => set('parcela', +e.target.value)} /></div>
              </div>
            </div>
            <div>
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Balanço Simplificado</p>
              <div className="grid grid-cols-2 gap-3">
                <div><label className={lbl}>Caixa / Bancos</label><input type="number" className={inp} value={dre.caixa || ''} onChange={e => set('caixa', +e.target.value)} /></div>
                <div><label className={lbl}>Clientes a Receber</label><input type="number" className={inp} value={dre.aReceber || ''} onChange={e => set('aReceber', +e.target.value)} /></div>
                <div><label className={lbl}>Estoque (R$)</label><input type="number" className={inp} value={dre.estoque || ''} onChange={e => set('estoque', +e.target.value)} /></div>
                <div><label className={lbl}>A Pagar Fornecedores</label><input type="number" className={inp} value={dre.aFornecedores || ''} onChange={e => set('aFornecedores', +e.target.value)} /></div>
                <div><label className={lbl}>Dívida Total (financeira)</label><input type="number" className={inp} value={dre.dividaTotal || ''} onChange={e => set('dividaTotal', +e.target.value)} /></div>
                <div><label className={lbl}>Dívida Curto Prazo (12m)</label><input type="number" className={inp} value={dre.dividaCP || ''} onChange={e => set('dividaCP', +e.target.value)} /></div>
                <div><label className={lbl}>Dias médios em estoque</label><input type="number" className={inp} value={dre.diasEstoque || ''} onChange={e => set('diasEstoque', +e.target.value)} /></div>
                <div><label className={lbl}>Lucro informado pelo sócio</label><input type="number" className={inp} value={dre.lucroInformadoSocio || ''} onChange={e => set('lucroInformadoSocio', +e.target.value)} /></div>
              </div>
            </div>
          </div>
        </Card>

        {/* DRE calculado */}
        {ind && (
          <Card className="p-5">
            <h3 className="font-semibold text-gray-900 mb-3">DRE Gerencial</h3>
            <div className="space-y-1 text-sm">
              {[
                { label: 'Receita Bruta',               val: dre.receitaBruta,        pct: '100%',              neg: false, total: false },
                { label: '(–) CMV',                     val: -dre.cmv,                pct: fmtPct(ind.cmvRec),  neg: true,  total: false, indent: true },
                { label: '= Lucro Bruto',               val: ind.lucBruto,            pct: fmtPct(ind.margBruta), neg: false, total: true },
                { label: '(–) Desp. Operacionais',      val: -ind.despOp,             pct: fmtPct(ind.custoFixoRec), neg: true, total: false, indent: true },
                { label: '= EBITDA',                    val: ind.ebitda,              pct: fmtPct(ind.margEbitda), neg: false, total: true },
                { label: '(–) Tributos',                val: -dre.tributos,           pct: fmtPct(dre.receitaBruta > 0 ? dre.tributos/dre.receitaBruta : 0), neg: true, total: false, indent: true },
                { label: '(–) Desp. Financeiras',       val: -dre.despesasFinanceiras,pct: '',                  neg: true,  total: false, indent: true },
                { label: '= Lucro Líquido',             val: ind.lucLiq,              pct: fmtPct(ind.margLiq), neg: false, total: true },
                { label: '(–) Amortização da Dívida',   val: -ind.amortizacao,        pct: '',                  neg: true,  total: false, indent: true },
                { label: '= Sobra de Caixa',            val: ind.sobraCaixa,          pct: fmtPct(ind.margCaixa), neg: false, total: true },
              ].map((r, i) => (
                <div key={i} className={`flex justify-between py-1.5 border-b border-gray-50 ${r.total ? 'bg-blue-50/60 px-2 rounded font-bold' : ''}`}>
                  <span className={`${r.indent ? 'pl-3 text-gray-500' : 'font-medium text-gray-800'} text-xs`}>{r.label}</span>
                  <div className="flex items-center gap-2">
                    {r.pct && <span className="text-xs text-gray-400">{r.pct}</span>}
                    <span className={`text-xs font-semibold ${r.val < 0 ? 'text-red-600' : r.total ? 'text-blue-700' : 'text-gray-900'}`}>{fmtBRL(r.val)}</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>

      {ind && (
        <>
          {/* Indicadores por grupo com benchmark */}
          <div>
            <h3 className="font-bold text-gray-900 mb-3">Indicadores Financeiros vs. Benchmark — {segmento === 'COMERCIO' ? 'Comércio Varejista' : segmento === 'SERVICOS' ? 'Serviços' : 'Indústria'}</h3>
            <p className="text-xs text-gray-400 mb-4">Benchmark real: Sebrae, IEDI Cartas 1223/1280, PwC Brasil 2024. Hover no ℹ para detalhes da fonte.</p>

            {/* Rentabilidade */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Rentabilidade</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <IndicadorCard label="Margem Bruta"    valor={ind.margBruta}  valorFmt={fmtPct(ind.margBruta)}  bm={bm.margBruta}  descricao={bm.margBruta?.descricao} />
                <IndicadorCard label="Margem EBITDA"   valor={ind.margEbitda} valorFmt={fmtPct(ind.margEbitda)} bm={bm.margEbitda} descricao={bm.margEbitda?.descricao} />
                <IndicadorCard label="Margem Líquida"  valor={ind.margLiq}    valorFmt={fmtPct(ind.margLiq)}    bm={bm.margLiq}    descricao={bm.margLiq?.descricao} />
                <IndicadorCard label="Sobra de Caixa/Receita" valor={ind.margCaixa} valorFmt={fmtPct(ind.margCaixa)} descricao="Quanto da receita sobra após pagar operação, tributos, pró-labore e parcela bancária." />
              </div>
            </div>

            {/* Liquidez */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Liquidez & Solvência</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <IndicadorCard label="Liquidez Corrente" valor={ind.liquidezC}  valorFmt={fmtX(ind.liquidezC)}  bm={bm.liquidezC}  descricao={bm.liquidezC?.descricao} />
                <IndicadorCard label="Liquidez Seca"     valor={ind.liquidezS}  valorFmt={fmtX(ind.liquidezS)}  bm={bm.liquidezS}  descricao={bm.liquidezS?.descricao} />
                <IndicadorCard label="Solvência Geral"   valor={ind.solvencia}  valorFmt={fmtX(ind.solvencia)}  bm={bm.solvencia}  descricao={bm.solvencia?.descricao} />
                <IndicadorCard label="Caixa/Saídas Críticas" valor={ind.caixaSaidas} valorFmt={fmtX(ind.caixaSaidas)} descricao="Caixa dividido por CMV + parcela bancária. Quanto o caixa cobre as saídas críticas do mês." />
              </div>
            </div>

            {/* Endividamento */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Endividamento</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <IndicadorCard label="Cobertura da Dívida"  valor={ind.cobDivida}        valorFmt={fmtX(ind.cobDivida)}           bm={bm.cobDivida}    descricao={bm.cobDivida?.descricao} />
                <IndicadorCard label="Endividamento/Receita" valor={ind.endivRec}         valorFmt={fmtPct(ind.endivRec)}          bm={bm.endivRec}     invertido descricao={bm.endivRec?.descricao} />
                <IndicadorCard label="Capital de Terceiros" valor={ind.capitalTerc}       valorFmt={fmtPct(ind.capitalTerc)}       bm={bm.capitalTerc}  invertido descricao={bm.capitalTerc?.descricao} />
                <IndicadorCard label="Grau de Alavancagem"  valor={ind.grauAlavancagem}   valorFmt={fmtPct(ind.grauAlavancagem)}   descricao="Dívida financeira em relação aos ativos circulantes. Quanto maior, mais alavancada." />
              </div>
            </div>

            {/* Eficiência operacional */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Eficiência Operacional</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                <IndicadorCard label="CMV / Receita"         valor={ind.cmvRec}       valorFmt={fmtPct(ind.cmvRec)}       bm={bm.cmvRec}      invertido descricao={bm.cmvRec?.descricao} />
                <IndicadorCard label="Custo Fixo / Receita"  valor={ind.custoFixoRec} valorFmt={fmtPct(ind.custoFixoRec)} bm={bm.custoFixo}   invertido descricao={bm.custoFixo?.descricao} />
                <IndicadorCard label="Giro de Estoque"       valor={ind.giroEstoque}  valorFmt={fmtDias(ind.giroEstoque)} bm={bm.giroEst}     invertido descricao={bm.giroEst?.descricao} />
                <IndicadorCard label="NCG"                   valor={ind.ncg}          valorFmt={fmtBRL(ind.ncg)}          descricao="Necessidade de Capital de Giro: recursos presos em clientes e estoque além do que fornecedores financiam." />
              </div>
            </div>

            {/* Ponto de equilíbrio */}
            <div className="mb-4">
              <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Ponto de Equilíbrio</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                <IndicadorCard label="Ponto de Equilíbrio"  valor={ind.peBS} valorFmt={fmtBRL(ind.peBS)} descricao="Faturamento mínimo mensal para cobrir todas as despesas fixas e operacionais." />
                <div className={`rounded-xl border p-3.5 ${dre.receitaBruta >= ind.peBS && ind.peBS > 0 ? 'bg-emerald-50 border-emerald-200' : 'bg-red-50 border-red-200'}`}>
                  <p className="text-xs font-semibold text-gray-600 mb-1">Distância do PE</p>
                  <p className={`text-xl font-bold ${dre.receitaBruta >= ind.peBS && ind.peBS > 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {ind.peBS > 0 ? fmtPct((dre.receitaBruta - ind.peBS) / Math.max(dre.receitaBruta, 1)) : '—'}
                  </p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {dre.receitaBruta >= ind.peBS && ind.peBS > 0 ? `+${fmtBRL(dre.receitaBruta - ind.peBS)} acima do PE` : ind.peBS > 0 ? `${fmtBRL(ind.peBS - dre.receitaBruta)} abaixo do PE` : '—'}
                  </p>
                </div>
                <div className="rounded-xl border p-3.5 bg-gray-50 border-gray-100">
                  <p className="text-xs font-semibold text-gray-600 mb-1">Faturamento Atual vs PE</p>
                  <div className="w-full bg-gray-200 rounded-full h-2 mt-2 mb-1">
                    <div className={`h-2 rounded-full transition-all ${dre.receitaBruta >= ind.peBS ? 'bg-emerald-500' : 'bg-red-500'}`}
                      style={{ width: `${Math.min(100, ind.peBS > 0 ? (dre.receitaBruta / ind.peBS) * 100 : 0).toFixed(0)}%` }} />
                  </div>
                  <p className="text-xs text-gray-400">{ind.peBS > 0 ? `${((dre.receitaBruta / ind.peBS) * 100).toFixed(0)}% do PE atingido` : '—'}</p>
                </div>
              </div>
            </div>
          </div>

          {/* Diagnóstico qualitativo */}
          <Card className="p-5 bg-gradient-to-br from-gray-50 to-blue-50/30">
            <h3 className="font-bold text-gray-900 mb-4">Diagnóstico Qualitativo Automático</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {[
                { label: 'Resultado Operacional', status: ind.diagResultado },
                { label: 'Viabilidade Real',       status: ind.diagViabilidade },
                { label: 'Situação da Liquidez',   status: ind.diagLiquidez },
                { label: 'Nível de Endividamento', status: ind.diagEndividamento },
                { label: 'Cobertura Bancária',     status: ind.diagCobertura },
                { label: 'Leitura Rápida de Caixa',status: ind.leituraCaixa },
              ].map(({ label, status }) => {
                const isOk = status?.toLowerCase().includes('confort') || status?.toLowerCase().includes('baixo') || status?.toLowerCase().includes('positivo') || status?.toLowerCase().includes('viável') || status?.toLowerCase().includes('paga')
                const isWarn = status?.toLowerCase().includes('atenção') || status?.toLowerCase().includes('adequa') || status?.toLowerCase().includes('moderad') || status?.toLowerCase().includes('apertado')
                const cor = isOk ? 'bg-emerald-50 border-emerald-200' : isWarn ? 'bg-amber-50 border-amber-200' : 'bg-red-50 border-red-200'
                const dot = isOk ? 'bg-emerald-500' : isWarn ? 'bg-amber-400' : 'bg-red-500'
                return (
                  <div key={label} className={`flex items-start gap-2.5 p-3 rounded-xl border ${cor}`}>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 mt-0.5 ${dot}`} />
                    <div>
                      <p className="text-xs font-semibold text-gray-600">{label}</p>
                      <p className="text-sm font-medium text-gray-900">{status}</p>
                    </div>
                  </div>
                )
              })}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-xl">
              <p className="text-xs font-bold text-blue-700 mb-0.5">🎯 Prioridade Financeira Sugerida pela AF Gestão</p>
              <p className="text-sm text-blue-900 font-medium">{ind.prioridadeFinanceira}</p>
            </div>
          </Card>
        </>
      )}

      {!ind && dre.receitaBruta === 0 && (
        <div className="flex items-center justify-center rounded-2xl bg-gray-50 border border-dashed border-gray-200 p-10">
          <div className="text-center text-gray-400">
            <RefreshCw size={32} className="mx-auto mb-2 opacity-40" />
            <p className="text-sm">Preencha os dados e salve para ver todos os indicadores com benchmark</p>
          </div>
        </div>
      )}
    </div>
  )
}
