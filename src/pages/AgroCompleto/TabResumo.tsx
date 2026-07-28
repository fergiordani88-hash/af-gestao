import { useState, useEffect } from 'react'
import {
  Sprout, CreditCard, Shield, TrendingUp, TrendingDown,
  MapPin, BarChart2, AlertTriangle, CheckCircle, Info, Activity
} from 'lucide-react'
import { agroApi, type AgroProducao, type AgroPatrimonio, type AgroParcela } from '../../services/agroApi'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtN   = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })
const fmtPct = (v: number) => `${fmtN(v, 1)}%`

function calcRow(p: AgroProducao) {
  const custoPorHaReais  = p.custoPorHa * p.cotacao
  const prodTotal        = p.area * p.produtividade
  const recBruta         = prodTotal * p.cotacao
  const custoTotal       = p.area * custoPorHaReais
  const custoArrendTotal = p.areaArrendada * p.custoArrendHa * (p.cotacao || 1)
  const recLiq           = recBruta - custoTotal - custoArrendTotal
  const custoTotalHa     = custoPorHaReais + (p.area > 0 ? custoArrendTotal / p.area : 0)
  const peHa             = p.cotacao > 0 ? custoTotalHa / p.cotacao : 0
  return { prodTotal, recBruta, custoTotal, custoArrendTotal, recLiq, peHa, custoTotalHa }
}

type Status = 'ok' | 'atencao' | 'risco'

function Badge({ status, label }: { status: Status; label: string }) {
  const cls: Record<Status, string> = {
    ok:      'bg-green-100 text-green-700 border-green-200',
    atencao: 'bg-amber-100 text-amber-700 border-amber-200',
    risco:   'bg-red-100   text-red-700   border-red-200',
  }
  const icon: Record<Status, React.ElementType> = {
    ok:      CheckCircle,
    atencao: AlertTriangle,
    risco:   AlertTriangle,
  }
  const Icon = icon[status]
  return (
    <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${cls[status]}`}>
      <Icon size={11} /> {label}
    </span>
  )
}

function KpiCard({ title, value, sub, icon: Icon, color, right }: {
  title: string; value: string; sub?: string
  icon: React.ElementType; color: string; right?: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className={`p-1.5 rounded-lg ${color} bg-opacity-10`}>
            <Icon size={15} className={color} />
          </div>
          <span className="text-xs font-semibold text-gray-500">{title}</span>
        </div>
        {right}
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-500">{sub}</p>}
    </div>
  )
}

function Section({ title, icon: Icon, color, children }: {
  title: string; icon: React.ElementType; color: string; children: React.ReactNode
}) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-2 px-5 py-3 border-b border-gray-50 ${color.replace('text-', 'bg-').replace('-600', '-50').replace('-700', '-50')}`}>
        <Icon size={16} className={color} />
        <h3 className={`text-sm font-bold ${color}`}>{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function IndiceRow({ label, value, status, tooltip }: { label: string; value: string; status: Status; tooltip: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div className="flex items-center gap-2">
        <span className="text-sm text-gray-700">{label}</span>
        <span className="relative group cursor-default">
          <Info size={12} className="text-gray-400" />
          <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            {tooltip}
          </div>
        </span>
      </div>
      <div className="flex items-center gap-3">
        <span className="text-sm font-bold text-gray-900">{value}</span>
        <Badge status={status} label={status === 'ok' ? 'Saudável' : status === 'atencao' ? 'Atenção' : 'Risco'} />
      </div>
    </div>
  )
}

const SAFRA_ATUAL = '2025/26'

export function TabResumo({ clientId, clienteNome, clienteCidade }: {
  clientId: string; clienteNome?: string; clienteCidade?: string
}) {
  const [producao,  setProducao]  = useState<AgroProducao[]>([])
  const [patrimonio, setPatrimonio] = useState<AgroPatrimonio[]>([])
  const [parcelas,  setParcelas]  = useState<AgroParcela[]>([])
  const [totalEndividamento, setTotalEndividamento] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const safra = SAFRA_ATUAL

  useEffect(() => {
    setLoading(true)
    Promise.all([
      agroApi.producao.list(clientId),
      agroApi.patrimonio.list(clientId),
      agroApi.contratos.cronograma(clientId),
      agroApi.fluxoDiario(clientId, 0),
    ]).then(([prod, pat, crono, fluxo]) => {
      setProducao(prod)
      setPatrimonio(pat)
      setParcelas(crono.parcelas)
      setTotalEndividamento(crono.totalEndividamento)
      setSaldoCaixa(fluxo.saldoFinal)
    }).catch(console.error).finally(() => setLoading(false))
  }, [clientId])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-gray-400">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-af-green mr-3" />
        <span className="text-sm">Carregando diagnóstico...</span>
      </div>
    )
  }

  // ── Produção da safra selecionada ──────────────────────────────
  const prodSafra = producao.filter(p => p.safra === safra)

  // Soja + Milho 2ª + Feijão são cultivados na MESMA terra em rotação.
  // A área física é a da cultura principal (ordem = 'principal').
  // Se não houver principal, usa a de maior área. Não somar entre culturas.
  const principal = prodSafra.find(p => p.ordem === 'principal') ?? prodSafra.reduce<AgroProducao | undefined>(
    (m, p) => (!m || p.area > m.area) ? p : m, undefined
  )
  const areaTotal     = principal?.area ?? 0
  const areaArrendada = principal?.areaArrendada ?? 0
  const areaPropria   = areaTotal - areaArrendada
  const pctArrendada  = areaTotal > 0 ? (areaArrendada / areaTotal) * 100 : 0

  const culturas = [...new Set(prodSafra.map(p => p.cultura))]

  const receitaBruta  = prodSafra.reduce((s, p) => s + calcRow(p).recBruta,   0)
  const custoTotal    = prodSafra.reduce((s, p) => s + calcRow(p).custoTotal + calcRow(p).custoArrendTotal, 0)
  const resultadoLiq  = receitaBruta - custoTotal
  const margem        = receitaBruta > 0 ? (resultadoLiq / receitaBruta) * 100 : 0
  const custoMedioHa  = areaTotal > 0 ? custoTotal / areaTotal : 0

  // ── Patrimônio ─────────────────────────────────────────────────
  const patrimonioGruto  = patrimonio.reduce((s, p) => s + p.valorAvaliado, 0)
  const totalOnus        = patrimonio.reduce((s, p) => s + p.valorOnus, 0)
  const patrimonioLiqPat = patrimonioGruto - totalOnus

  // ── Endividamento ───────────────────────────────────────────────
  const anoAtual = new Date().getFullYear()
  const parcelasAnoAtual = parcelas.filter(p => new Date(p.vencimento).getFullYear() === anoAtual)
  const servicoAnual = parcelasAnoAtual.reduce((s, p) => s + p.valorParcela, 0)

  // ── Índices ────────────────────────────────────────────────────
  const alavancagem   = patrimonioGruto > 0 ? (totalEndividamento / patrimonioGruto) * 100 : 0
  const solvencia     = totalEndividamento > 0 ? patrimonioLiqPat / totalEndividamento : Infinity
  const endivReceita  = receitaBruta > 0 ? totalEndividamento / receitaBruta : 0
  const capPagamento  = servicoAnual > 0 ? resultadoLiq / servicoAnual : Infinity

  const statusAlavancagem: Status = alavancagem < 30 ? 'ok' : alavancagem < 50 ? 'atencao' : 'risco'
  const statusSolvencia:   Status = solvencia > 2   ? 'ok' : solvencia > 1   ? 'atencao' : 'risco'
  const statusEndivRec:    Status = endivReceita < 1 ? 'ok' : endivReceita < 2 ? 'atencao' : 'risco'
  const statusCapPag:      Status = capPagamento > 1.5 ? 'ok' : capPagamento > 1 ? 'atencao' : 'risco'
  const statusMargem:      Status = margem > 20 ? 'ok' : margem > 10 ? 'atencao' : 'risco'

  // Rating geral
  const scores = [statusAlavancagem, statusSolvencia, statusEndivRec, statusCapPag, statusMargem]
  const riscos  = scores.filter(s => s === 'risco').length
  const atencoes = scores.filter(s => s === 'atencao').length
  const ratingGeral: Status = riscos > 0 ? 'risco' : atencoes > 1 ? 'atencao' : 'ok'
  const ratingLabel = ratingGeral === 'ok' ? 'Situação Saudável' : ratingGeral === 'atencao' ? 'Requer Atenção' : 'Alto Risco'

  const hasProducao = prodSafra.length > 0

  return (
    <div className="space-y-6">

      {/* Cabeçalho do produtor */}
      <div className="bg-gradient-to-r from-af-green to-emerald-600 rounded-2xl p-5 text-white flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Sprout size={20} />
            <h2 className="text-lg font-bold">{clienteNome ?? 'Produtor'}</h2>
          </div>
          {clienteCidade && (
            <div className="flex items-center gap-1 text-sm text-green-100">
              <MapPin size={13} />
              {clienteCidade}
            </div>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {culturas.length > 0 ? culturas.map(c => (
              <span key={c} className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full font-medium">{c}</span>
            )) : (
              <span className="bg-white/20 text-white text-xs px-2 py-0.5 rounded-full">Sem produção lançada</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-bold border-2 ${
            ratingGeral === 'ok' ? 'bg-green-100 text-green-800 border-green-200' :
            ratingGeral === 'atencao' ? 'bg-amber-100 text-amber-800 border-amber-200' :
            'bg-red-100 text-red-800 border-red-200'
          }`}>
            {ratingGeral === 'ok' ? <CheckCircle size={14} /> : <AlertTriangle size={14} />}
            {ratingLabel}
          </div>
          <p className="text-xs text-green-200 mt-1">Rating geral do produtor</p>
        </div>
      </div>

      {/* Indicador de safra */}
      <div className="flex items-center gap-3">
        <span className="bg-af-green text-white text-xs font-bold px-3 py-1 rounded-lg">Safra {SAFRA_ATUAL}</span>
        {!hasProducao && (
          <span className="text-xs text-amber-600 font-medium">⚠ Sem dados lançados para esta safra</span>
        )}
      </div>

      {/* KPIs rápidos */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          title="Área Total Plantada"
          value={`${fmtN(areaTotal, 0)} ha`}
          sub={`${fmtN(areaPropria, 0)} ha própria · ${fmtN(areaArrendada, 0)} ha arrendada (${fmtPct(pctArrendada)})`}
          icon={Sprout}
          color="text-green-600"
        />
        <KpiCard
          title="Receita Bruta"
          value={fmtBRL(receitaBruta)}
          sub={`Safra ${safra}`}
          icon={TrendingUp}
          color="text-emerald-600"
        />
        <KpiCard
          title="Resultado Líquido"
          value={fmtBRL(resultadoLiq)}
          sub={`Margem ${fmtPct(margem)}`}
          icon={BarChart2}
          color={resultadoLiq >= 0 ? 'text-blue-600' : 'text-red-600'}
          right={<Badge status={statusMargem} label={statusMargem === 'ok' ? 'Boa margem' : statusMargem === 'atencao' ? 'Margem baixa' : 'Margem negativa'} />}
        />
        <KpiCard
          title="Endividamento Total"
          value={fmtBRL(totalEndividamento)}
          sub={`Serviço ${anoAtual}: ${fmtBRL(servicoAnual)}`}
          icon={CreditCard}
          color="text-blue-600"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* Produção */}
        <Section title="Produção & Área" icon={Sprout} color="text-green-600">
          {!hasProducao ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem produção lançada para safra {safra}</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-green-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Área própria</p>
                  <p className="text-lg font-bold text-green-700">{fmtN(areaPropria, 0)} ha</p>
                </div>
                <div className="bg-amber-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Área arrendada</p>
                  <p className="text-lg font-bold text-amber-700">{fmtN(areaArrendada, 0)} ha</p>
                  <p className="text-xs text-amber-500">{fmtPct(pctArrendada)}</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Total</p>
                  <p className="text-lg font-bold text-blue-700">{fmtN(areaTotal, 0)} ha</p>
                </div>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-gray-500 border-b border-gray-100">
                    <th className="text-left py-1">Cultura</th>
                    <th className="text-right py-1">Área</th>
                    <th className="text-right py-1">Produt.</th>
                    <th className="text-right py-1">P.E.</th>
                    <th className="text-right py-1">Resultado</th>
                  </tr>
                </thead>
                <tbody>
                  {prodSafra.map(p => {
                    const c = calcRow(p)
                    return (
                      <tr key={p.id ?? p.cultura} className="border-b border-gray-50">
                        <td className="py-1.5 font-medium text-gray-800">{p.cultura}</td>
                        <td className="text-right text-gray-600">{fmtN(p.area, 0)} ha</td>
                        <td className="text-right text-gray-600">{fmtN(p.produtividade, 1)} sc</td>
                        <td className="text-right text-amber-600 font-medium">{fmtN(c.peHa, 1)} sc</td>
                        <td className={`text-right font-bold ${c.recLiq >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtBRL(c.recLiq)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Section>

        {/* Patrimônio */}
        <Section title="Patrimônio" icon={Shield} color="text-orange-600">
          {patrimonio.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem patrimônio lançado</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3 text-center">
                <div className="bg-orange-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Patrimônio bruto</p>
                  <p className="text-base font-bold text-orange-700">{fmtBRL(patrimonioGruto)}</p>
                </div>
                <div className="bg-red-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Gravames/ônus</p>
                  <p className="text-base font-bold text-red-700">{fmtBRL(totalOnus)}</p>
                </div>
                <div className={`rounded-xl p-3 ${patrimonioLiqPat >= 0 ? 'bg-green-50' : 'bg-red-50'}`}>
                  <p className="text-xs text-gray-500">Patrimônio líquido</p>
                  <p className={`text-base font-bold ${patrimonioLiqPat >= 0 ? 'text-green-700' : 'text-red-700'}`}>{fmtBRL(patrimonioLiqPat)}</p>
                </div>
              </div>
              {/* Categorias */}
              {(() => {
                const byCat: Record<string, number> = {}
                patrimonio.forEach(p => { byCat[p.categoria] = (byCat[p.categoria] ?? 0) + p.valorAvaliado })
                return (
                  <div className="space-y-1.5">
                    {Object.entries(byCat).sort((a, b) => b[1] - a[1]).map(([cat, val]) => {
                      const pct = patrimonioGruto > 0 ? (val / patrimonioGruto) * 100 : 0
                      return (
                        <div key={cat} className="flex items-center gap-2">
                          <span className="text-xs text-gray-600 w-28 truncate">{cat}</span>
                          <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                            <div className="bg-orange-400 h-1.5 rounded-full" style={{ width: `${pct}%` }} />
                          </div>
                          <span className="text-xs font-medium text-gray-700 w-24 text-right">{fmtBRL(val)}</span>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </Section>

        {/* Endividamento */}
        <Section title="Endividamento" icon={CreditCard} color="text-blue-600">
          <div className="space-y-3">
            {/* Custos da atividade */}
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-3">
              <p className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">Custos da Atividade</p>
              {!hasProducao ? (
                <p className="text-xs text-gray-400">Sem produção lançada</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Custo de produção</span>
                    <span className="font-semibold text-amber-800">{fmtBRL(custoTotal)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Custo por ha</span>
                    <span className="font-semibold text-amber-800">{fmtBRL(custoMedioHa)}/ha</span>
                  </div>
                </div>
              )}
            </div>

            {/* Endividamento bancário */}
            <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
              <p className="text-xs font-bold text-blue-700 mb-2 uppercase tracking-wide">Endividamento Bancário</p>
              {parcelas.length === 0 ? (
                <p className="text-xs text-gray-400">Sem contratos lançados</p>
              ) : (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Saldo devedor total</span>
                    <span className="font-semibold text-blue-800">{fmtBRL(totalEndividamento)}</span>
                  </div>
                  <div className="flex justify-between text-xs">
                    <span className="text-gray-600">Parcelas em {anoAtual}</span>
                    <span className="font-semibold text-blue-800">{fmtBRL(servicoAnual)}</span>
                  </div>
                  <div className="flex justify-between text-xs text-gray-500">
                    <span>{parcelasAnoAtual.length} vencimentos no ano</span>
                  </div>
                </div>
              )}
            </div>

            {/* Gráfico de vencimentos */}
            {parcelas.length > 0 && (() => {
              const meses: Record<number, number> = {}
              parcelasAnoAtual.forEach(p => {
                const m = new Date(p.vencimento).getMonth()
                meses[m] = (meses[m] ?? 0) + p.valorParcela
              })
              const maxVal = Math.max(...Object.values(meses), 1)
              const nomMes = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
              return (
                <div>
                  <p className="text-xs font-semibold text-gray-500 mb-2">Concentração de vencimentos {anoAtual}</p>
                  <div className="flex items-end gap-0.5 h-12">
                    {Array.from({ length: 12 }, (_, i) => {
                      const val = meses[i] ?? 0
                      const h = maxVal > 0 ? (val / maxVal) * 100 : 0
                      return (
                        <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
                          <div className="w-full bg-blue-200 rounded-t" style={{ height: `${h}%`, minHeight: val > 0 ? 2 : 0 }} title={`${nomMes[i]}: ${fmtBRL(val)}`} />
                          <span className="text-gray-400" style={{ fontSize: 8 }}>{nomMes[i].slice(0,1)}</span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })()}
          </div>
        </Section>

        {/* Resultado econômico */}
        <Section title={`Resultado Econômico · Safra ${safra}`} icon={TrendingUp} color="text-emerald-600">
          {!hasProducao ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem produção lançada para safra {safra}</p>
          ) : (
            <div className="space-y-3">
              {/* DRE simplificada */}
              <div className="space-y-1">
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">Receita bruta</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Produção total (sc) × Cotação (R$/sc) por cultura.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm font-semibold text-green-600">{fmtBRL(receitaBruta)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">(-) Custo de produção</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Custo/ha × Área + Custo de arrendamento. Inclui insumos, mão de obra e operações.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm text-red-500">({fmtBRL(custoTotal)})</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t border-gray-200">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-semibold text-gray-700">Resultado operacional</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Receita bruta − Custo de produção. Saudável: margem {'>'} 20%.
                      </div>
                    </span>
                  </div>
                  <span className={`text-sm font-bold ${resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(resultadoLiq)}</span>
                </div>
                <div className="flex justify-between items-center py-1">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-gray-600">(-) Serviço da dívida ({anoAtual})</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Total de parcelas bancárias com vencimento em {anoAtual}. Saudável: resultado operacional {'>'} 1,5× o serviço da dívida.
                      </div>
                    </span>
                  </div>
                  <span className="text-sm text-red-500">{servicoAnual > 0 ? `(${fmtBRL(servicoAnual)})` : '—'}</span>
                </div>
                <div className="flex justify-between items-center py-1.5 border-t-2 border-gray-300">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm font-bold text-gray-900">Resultado após endividamento</span>
                    <span className="relative group cursor-default"><Info size={11} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional − Serviço da dívida. Mostra o que sobra de caixa após pagar todas as obrigações. Saudável: valor positivo.
                      </div>
                    </span>
                  </div>
                  {(() => {
                    const resAfterDebt = resultadoLiq - servicoAnual
                    return <span className={`text-base font-bold ${resAfterDebt >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>{fmtBRL(resAfterDebt)}</span>
                  })()}
                </div>
              </div>

              {/* Indicadores */}
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Margem operacional</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Receita bruta. Saudável: {'>'} 20%. Atenção: 10–20%. Risco: {'<'} 10%.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusMargem === 'ok' ? 'text-emerald-600' : statusMargem === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>{fmtPct(margem)}</p>
                  <Badge status={statusMargem} label={statusMargem === 'ok' ? 'Saudável' : statusMargem === 'atencao' ? 'Atenção' : 'Risco'} />
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Resultado/ha</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-56 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Área total. Indica a rentabilidade por hectare cultivado.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(areaTotal > 0 ? resultadoLiq / areaTotal : 0)}</p>
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Capacidade de pagamento</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Resultado operacional ÷ Serviço anual da dívida. Saudável: {'>'} 1,5×. Atenção: 1–1,5×. Risco: {'<'} 1×.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusCapPag === 'ok' ? 'text-emerald-600' : statusCapPag === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                    {capPagamento === Infinity || servicoAnual === 0 ? '—' : `${fmtN(capPagamento, 2)}×`}
                  </p>
                  {servicoAnual > 0 && <Badge status={statusCapPag} label={statusCapPag === 'ok' ? 'Saudável' : statusCapPag === 'atencao' ? 'Atenção' : 'Risco'} />}
                </div>
                <div>
                  <div className="flex items-center gap-1 mb-0.5">
                    <p className="text-gray-500 font-semibold">Endiv. / Receita bruta</p>
                    <span className="relative group cursor-default"><Info size={10} className="text-gray-400" />
                      <div className="absolute left-4 top-0 w-60 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                        Saldo devedor total ÷ Receita bruta anual. Saudável: {'<'} 1×. Atenção: 1–2×. Risco: {'>'} 2×.
                      </div>
                    </span>
                  </div>
                  <p className={`text-xl font-bold ${statusEndivRec === 'ok' ? 'text-emerald-600' : statusEndivRec === 'atencao' ? 'text-amber-600' : 'text-red-600'}`}>
                    {receitaBruta === 0 ? '—' : `${fmtN(endivReceita, 2)}×`}
                  </p>
                  {receitaBruta > 0 && <Badge status={statusEndivRec} label={statusEndivRec === 'ok' ? 'Saudável' : statusEndivRec === 'atencao' ? 'Atenção' : 'Risco'} />}
                </div>
              </div>

              {saldoCaixa !== null && (
                <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
                  <div className="flex items-center gap-2 text-xs text-gray-500">
                    <Activity size={13} />
                    Saldo projetado de caixa
                  </div>
                  <span className={`text-sm font-bold ${saldoCaixa >= 0 ? 'text-green-600' : 'text-red-600'}`}>{fmtBRL(saldoCaixa)}</span>
                </div>
              )}
            </div>
          )}
        </Section>
      </div>

      {/* Análise de alavancagem e solvência */}
      <Section title="Análise de Alavancagem & Solvência" icon={BarChart2} color="text-indigo-600">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8">
          <div>
            <IndiceRow
              label="Índice de alavancagem"
              value={`${fmtPct(alavancagem)} do patrimônio bruto`}
              status={statusAlavancagem}
              tooltip="Dívida total ÷ Patrimônio bruto. Saudável: < 30%. Atenção: 30-50%. Risco: > 50%."
            />
            <IndiceRow
              label="Índice de solvência"
              value={solvencia === Infinity ? 'Sem dívida' : `${fmtN(solvencia, 2)}x`}
              status={statusSolvencia}
              tooltip="Patrimônio líquido ÷ Dívida total. Saudável: > 2x. Atenção: 1-2x. Risco: < 1x."
            />
          </div>
          <div>
            <IndiceRow
              label="Endividamento / Receita bruta"
              value={endivReceita === Infinity || receitaBruta === 0 ? '—' : `${fmtN(endivReceita, 2)}x`}
              status={statusEndivRec}
              tooltip="Dívida total ÷ Receita bruta anual. Saudável: < 1x. Atenção: 1-2x. Risco: > 2x."
            />
            <IndiceRow
              label="Capacidade de pagamento"
              value={capPagamento === Infinity || servicoAnual === 0 ? 'Sem parcelas' : `${fmtN(capPagamento, 2)}x`}
              status={statusCapPag}
              tooltip="Resultado líquido ÷ Serviço anual da dívida. Saudável: > 1,5x. Atenção: 1-1,5x. Risco: < 1x."
            />
          </div>
        </div>
        <div className="mt-4 p-3 bg-indigo-50 rounded-xl">
          <p className="text-xs text-indigo-700">
            <strong>Legenda:</strong> Saudável (verde) = dentro dos parâmetros de crédito rural.
            Atenção (amarelo) = monitorar evolução. Risco (vermelho) = comprometimento elevado — considerar
            renegociação ou reestruturação do passivo.
          </p>
        </div>
      </Section>

    </div>
  )
}
