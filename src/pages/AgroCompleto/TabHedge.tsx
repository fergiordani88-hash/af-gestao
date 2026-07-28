import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Shield, PlusCircle, Trash2, Info, TrendingUp } from 'lucide-react'
import { agroApi, type AgroProducao } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtSc = (v: number) => `${v.toFixed(1)} sc`

interface TrancheTrava {
  id: string
  pctTravado: number   // % da produção travada
  precoTrava: number   // preço em R$/sc na trava
  tipo: string         // 'Contrato a termo' | 'CPR' | 'NDF' | 'Opção call' | 'Outro'
}

interface SafraHedge {
  safra: string
  cultura: string
  producaoTotal: number   // sacas (area × produt)
  cotacaoSpot: number     // preço spot atual cadastrado
  tranches: TrancheTrava[]
}

function novaTraanche(): TrancheTrava {
  return { id: Math.random().toString(36).slice(2), pctTravado: 0, precoTrava: 0, tipo: 'Contrato a termo' }
}

const TIPOS_HEDGE = ['Contrato a termo', 'CPR', 'NDF', 'Opção call', 'Opção put', 'Outro']

const inp = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-right focus:outline-none focus:ring-1 focus:ring-blue-300'
const sel = 'border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-1 focus:ring-blue-300'

export function TabHedge({ clientId }: { clientId: string }) {
  const [loading, setLoading] = useState(true)
  const [safras, setSafras]   = useState<SafraHedge[]>([])
  const [safraIdx, setSafraIdx] = useState(0)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    agroApi.producao.list(clientId).then(prods => {
      // Agrupar por safra
      const map: Record<string, SafraHedge> = {}
      for (const p of prods) {
        const key = p.safra
        if (!map[key]) {
          map[key] = { safra: p.safra, cultura: p.cultura, producaoTotal: 0, cotacaoSpot: p.cotacao, tranches: [] }
        }
        map[key].producaoTotal += p.area * p.produtividade
        if (p.cotacao > map[key].cotacaoSpot) map[key].cotacaoSpot = p.cotacao
      }
      const lista = Object.values(map).sort((a, b) => b.safra.localeCompare(a.safra))
      // Adicionar uma tranche default vazia por safra
      setSafras(lista.map(s => ({ ...s, tranches: [novaTraanche()] })))
    }).finally(() => setLoading(false))
  }, [clientId])

  const safra = safras[safraIdx]

  const addTranche = () => {
    setSafras(prev => prev.map((s, i) => i === safraIdx
      ? { ...s, tranches: [...s.tranches, novaTraanche()] } : s))
  }

  const removeTranche = (id: string) => {
    setSafras(prev => prev.map((s, i) => i === safraIdx
      ? { ...s, tranches: s.tranches.filter(t => t.id !== id) } : s))
  }

  const updateTranche = (id: string, field: keyof TrancheTrava, val: any) => {
    setSafras(prev => prev.map((s, i) => i === safraIdx
      ? { ...s, tranches: s.tranches.map(t => t.id === id ? { ...t, [field]: val } : t) } : s))
  }

  const resultado = useMemo(() => {
    if (!safra) return null
    const prod = safra.producaoTotal
    const spot = safra.cotacaoSpot

    const tranches = safra.tranches.filter(t => t.pctTravado > 0 && t.precoTrava > 0)

    const pctTravadoTotal = tranches.reduce((s, t) => s + t.pctTravado, 0)
    const pctSpot         = Math.max(0, 100 - pctTravadoTotal)

    const receitaTrava = tranches.reduce((s, t) => {
      const sc = prod * t.pctTravado / 100
      return s + sc * t.precoTrava
    }, 0)

    const receitaSpot  = prod * pctSpot / 100 * spot
    const receitaTotal = receitaTrava + receitaSpot
    const receitaFullSpot = prod * spot
    const precoMedio  = prod > 0 ? receitaTotal / prod : 0
    const ganho       = receitaTotal - receitaFullSpot  // pode ser negativo (perda de upside)

    return { prod, spot, pctTravadoTotal, pctSpot, receitaTrava, receitaSpot, receitaTotal, receitaFullSpot, precoMedio, ganho }
  }, [safra])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-3" />
      <span>Carregando produção...</span>
    </div>
  )

  if (safras.length === 0) return (
    <div className="text-center py-24 text-gray-400">
      <Shield size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhuma produção cadastrada</p>
      <p className="text-sm mt-1">Cadastre produção na aba <strong>Produção</strong> para usar o simulador.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Trava de Preço / Hedge</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Simule diferentes estratégias de comercialização — misture travas com venda a preço spot
        </p>
      </div>

      {/* Seletor de safra */}
      {safras.length > 1 && (
        <div className="flex gap-2">
          {safras.map((s, i) => (
            <button key={s.safra} onClick={() => setSafraIdx(i)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold border transition-colors
                ${i === safraIdx ? 'bg-blue-600 text-white border-blue-600' : 'text-gray-600 border-gray-200 hover:bg-gray-50'}`}>
              Safra {s.safra}
            </button>
          ))}
        </div>
      )}

      {safra && resultado && (
        <>
          {/* Cards de resultado */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="bg-gray-50 rounded-2xl p-4">
              <p className="text-xs text-gray-500 mb-1">Produção estimada</p>
              <p className="text-lg font-bold text-gray-900">{fmtSc(resultado.prod)}</p>
              <p className="text-xs text-gray-400">{safra.cultura} · Safra {safra.safra}</p>
            </div>
            <div className="bg-blue-50 rounded-2xl p-4">
              <p className="text-xs text-blue-600 mb-1">Preço spot atual</p>
              <p className="text-lg font-bold text-blue-800">{fmtBRL(resultado.spot)}/sc</p>
              <p className="text-xs text-blue-400">Cotação cadastrada na produção</p>
            </div>
            <div className="bg-violet-50 rounded-2xl p-4">
              <p className="text-xs text-violet-600 mb-1">Preço médio blended</p>
              <p className={`text-lg font-bold ${resultado.precoMedio >= resultado.spot ? 'text-violet-800' : 'text-amber-700'}`}>
                {fmtBRL(resultado.precoMedio)}/sc
              </p>
              <p className="text-xs text-violet-400">{resultado.pctTravadoTotal.toFixed(0)}% travado · {resultado.pctSpot.toFixed(0)}% spot</p>
            </div>
            <div className={`rounded-2xl p-4 ${resultado.ganho >= 0 ? 'bg-emerald-50' : 'bg-amber-50'}`}>
              <p className={`text-xs mb-1 ${resultado.ganho >= 0 ? 'text-emerald-600' : 'text-amber-600'}`}>
                {resultado.ganho >= 0 ? 'Proteção de receita' : 'Oportunidade não capturada'}
              </p>
              <p className={`text-lg font-bold ${resultado.ganho >= 0 ? 'text-emerald-800' : 'text-amber-700'}`}>
                {resultado.ganho >= 0 ? '+' : ''}{fmtBRL(resultado.ganho)}
              </p>
              <p className={`text-xs ${resultado.ganho >= 0 ? 'text-emerald-400' : 'text-amber-400'}`}>
                vs. vender tudo a spot
              </p>
            </div>
          </div>

          {/* Barra visual de composição */}
          <Card>
            <div className="px-4 py-3 border-b">
              <h4 className="font-semibold text-sm text-gray-900">Composição da receita</h4>
            </div>
            <div className="px-4 py-4 space-y-3">
              <div className="flex items-center gap-2 text-xs">
                <span className="text-gray-500 w-16 shrink-0">Travado</span>
                <div className="flex-1 h-5 bg-gray-100 rounded-full overflow-hidden flex">
                  {safra.tranches.filter(t => t.pctTravado > 0 && t.precoTrava > 0).map((t, i) => (
                    <div key={t.id} style={{ width: `${t.pctTravado}%` }}
                      className={`h-full ${['bg-blue-500','bg-violet-500','bg-indigo-500','bg-sky-500'][i % 4]} transition-all`}
                      title={`${t.tipo}: ${t.pctTravado}% @ ${fmtBRL(t.precoTrava)}/sc`}
                    />
                  ))}
                  {resultado.pctSpot > 0 && (
                    <div style={{ width: `${resultado.pctSpot}%` }} className="h-full bg-gray-300" title={`Spot: ${resultado.pctSpot.toFixed(0)}%`} />
                  )}
                </div>
                <span className="text-gray-500 w-16 text-right shrink-0">Spot</span>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 pt-2">
                {safra.tranches.filter(t => t.pctTravado > 0 && t.precoTrava > 0).map((t, i) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs text-gray-600">
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${['bg-blue-500','bg-violet-500','bg-indigo-500','bg-sky-500'][i % 4]}`} />
                    <span>{t.tipo} — {t.pctTravado}% @ {fmtBRL(t.precoTrava)}/sc</span>
                  </div>
                ))}
                {resultado.pctSpot > 0 && (
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-gray-300 shrink-0" />
                    <span>Spot — {resultado.pctSpot.toFixed(0)}% @ {fmtBRL(resultado.spot)}/sc</span>
                  </div>
                )}
              </div>

              {/* Resumo financeiro */}
              <div className="border-t pt-3 grid grid-cols-3 gap-3 text-xs">
                <div>
                  <p className="text-gray-500">Receita travada</p>
                  <p className="font-bold text-blue-700">{fmtBRL(resultado.receitaTrava)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Receita spot</p>
                  <p className="font-bold text-gray-700">{fmtBRL(resultado.receitaSpot)}</p>
                </div>
                <div>
                  <p className="text-gray-500">Receita total blended</p>
                  <p className="font-bold text-violet-700 text-sm">{fmtBRL(resultado.receitaTotal)}</p>
                </div>
              </div>
            </div>
          </Card>

          {/* Tabela de tranches */}
          <Card>
            <div className="px-4 py-3 border-b flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900">Estratégias de trava</h4>
              <button onClick={addTranche}
                className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-semibold">
                <PlusCircle size={13} /> Adicionar tranche
              </button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b">
                    {['Instrumento', '% Produção', 'Preço trava (R$/sc)', 'Sacas travadas', 'Receita travada', ''].map(h => (
                      <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase text-xs">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {safra.tranches.map(t => {
                    const sc        = resultado.prod * t.pctTravado / 100
                    const receita   = sc * t.precoTrava
                    return (
                      <tr key={t.id} className="hover:bg-gray-50/50">
                        <td className="px-1 py-1 w-40">
                          <select value={t.tipo} onChange={e => updateTranche(t.id, 'tipo', e.target.value)} className={`${sel} w-full`}>
                            {TIPOS_HEDGE.map(tp => <option key={tp}>{tp}</option>)}
                          </select>
                        </td>
                        <td className="px-1 py-1 w-28">
                          <input type="number" min={0} max={100} step={5} value={t.pctTravado || ''}
                            onChange={e => updateTranche(t.id, 'pctTravado', +e.target.value)}
                            className={`${inp} w-full`} placeholder="0" />
                        </td>
                        <td className="px-1 py-1 w-36">
                          <input type="number" min={0} step={1} value={t.precoTrava || ''}
                            onChange={e => updateTranche(t.id, 'precoTrava', +e.target.value)}
                            className={`${inp} w-full`} placeholder={String(resultado.spot)} />
                        </td>
                        <td className="px-3 py-2 text-gray-700 font-medium">
                          {t.pctTravado > 0 ? fmtSc(sc) : '—'}
                        </td>
                        <td className={`px-3 py-2 font-semibold ${t.precoTrava >= resultado.spot ? 'text-emerald-700' : 'text-amber-600'}`}>
                          {t.pctTravado > 0 && t.precoTrava > 0 ? fmtBRL(receita) : '—'}
                        </td>
                        <td className="px-2 py-1">
                          {safra.tranches.length > 1 && (
                            <button onClick={() => removeTranche(t.id)} className="text-gray-300 hover:text-red-500">
                              <Trash2 size={13} />
                            </button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t bg-gray-50/50 flex items-start gap-2">
              <Info size={12} className="text-gray-400 mt-0.5 shrink-0" />
              <p className="text-xs text-gray-400">
                O % não travado é vendido automaticamente ao preço spot cadastrado na aba Produção.
                Deixe o preço de trava &gt; cotação spot para simular vantagem sobre o mercado.
              </p>
            </div>
          </Card>
        </>
      )}
    </div>
  )
}
