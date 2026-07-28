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

const SAFRAS_HISTORICAS = ['2022/23', '2023/24', '2024/25', '2025/26']

export function TabResumo({ clientId, clienteNome, clienteCidade }: {
  clientId: string; clienteNome?: string; clienteCidade?: string
}) {
  const [producao,  setProducao]  = useState<AgroProducao[]>([])
  const [patrimonio, setPatrimonio] = useState<AgroPatrimonio[]>([])
  const [parcelas,  setParcelas]  = useState<AgroParcela[]>([])
  const [totalEndividamento, setTotalEndividamento] = useState(0)
  const [saldoCaixa, setSaldoCaixa] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [safra, setSafra] = useState('2024/25')

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
  const areaTotal     = prodSafra.reduce((s, p) => s + p.area, 0)
  const areaArrendada = prodSafra.reduce((s, p) => s + p.areaArrendada, 0)
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

      {/* Seletor de safra */}
      <div className="flex items-center gap-3">
        <label className="text-xs font-semibold text-gray-600">Safra de referência:</label>
        <div className="flex gap-1">
          {SAFRAS_HISTORICAS.map(s => (
            <button
              key={s}
              onClick={() => setSafra(s)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                safra === s ? 'bg-af-green text-white shadow' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
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
              <div className="bg-gray-50 rounded-xl p-3 flex justify-between text-xs">
                <span className="text-gray-500">Custo médio/ha</span>
                <span className="font-bold text-gray-800">{fmtBRL(custoMedioHa)}/ha</span>
              </div>
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
        <Section title={`Endividamento · Serviço ${anoAtual}`} icon={CreditCard} color="text-blue-600">
          {parcelas.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem contratos lançados</p>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3 text-center">
                <div className="bg-blue-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Dívida total atual</p>
                  <p className="text-base font-bold text-blue-700">{fmtBRL(totalEndividamento)}</p>
                </div>
                <div className="bg-purple-50 rounded-xl p-3">
                  <p className="text-xs text-gray-500">Parcelas em {anoAtual}</p>
                  <p className="text-base font-bold text-purple-700">{fmtBRL(servicoAnual)}</p>
                  <p className="text-xs text-purple-500">{parcelasAnoAtual.length} parcelas</p>
                </div>
              </div>
              {/* Parcelas por mês no ano atual */}
              {(() => {
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
          )}
        </Section>

        {/* Resultado econômico */}
        <Section title={`Resultado Econômico · Safra ${safra}`} icon={TrendingUp} color="text-emerald-600">
          {!hasProducao ? (
            <p className="text-sm text-gray-400 text-center py-4">Sem produção lançada para safra {safra}</p>
          ) : (
            <div className="space-y-3">
              <div className="space-y-2">
                {[
                  { label: 'Receita bruta', val: receitaBruta, cls: 'text-green-600' },
                  { label: 'Custo de produção', val: -custoTotal, cls: 'text-red-500' },
                  { label: 'Resultado líquido', val: resultadoLiq, cls: resultadoLiq >= 0 ? 'text-blue-700 font-bold' : 'text-red-700 font-bold', border: true },
                ].map(({ label, val, cls, border }) => (
                  <div key={label} className={`flex justify-between items-center py-1 ${border ? 'border-t-2 border-gray-200 mt-1' : ''}`}>
                    <span className="text-sm text-gray-600">{label}</span>
                    <span className={`text-sm ${cls}`}>{val < 0 ? `(${fmtBRL(Math.abs(val))})` : fmtBRL(val)}</span>
                  </div>
                ))}
              </div>
              <div className="bg-gray-50 rounded-xl p-3 grid grid-cols-2 gap-2 text-center text-xs">
                <div>
                  <p className="text-gray-500">Margem líquida</p>
                  <p className={`text-lg font-bold ${margem >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtPct(margem)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Resultado/ha</p>
                  <p className={`text-lg font-bold ${resultadoLiq >= 0 ? 'text-blue-700' : 'text-red-700'}`}>{fmtBRL(areaTotal > 0 ? resultadoLiq / areaTotal : 0)}</p>
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
