import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Settings2, CheckCircle, AlertTriangle, RotateCcw, TrendingDown } from 'lucide-react'
import { agroApi, type AgroContrato } from '../../services/agroApi'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`
const fmtN   = (v: number, d = 2) => v.toLocaleString('pt-BR', { minimumFractionDigits: d, maximumFractionDigits: d })

interface ContratoRow {
  id: string
  banco: string
  modalidade: string
  numeroContrato: string
  saldoDevedor: number       // saldo real do cronograma (soma amortizações futuras)
  servicoAnual: number       // parcelas vencendo nos próximos 12 meses
  proximaParcela: number     // valor da próxima parcela
  taxa: number               // a.a. efetiva
  parcelasRestantes: number
  vencimento: string
  selected: boolean
}

function parcelaPrice(saldo: number, taxaAa: number, meses: number): number {
  if (meses <= 0 || saldo <= 0) return 0
  if (taxaAa === 0) return saldo / meses
  const tm = Math.pow(1 + taxaAa, 1 / 12) - 1
  return saldo * (tm * Math.pow(1 + tm, meses)) / (Math.pow(1 + tm, meses) - 1)
}

function parcelaSAC1(saldo: number, taxaAa: number, meses: number): number {
  if (meses <= 0 || saldo <= 0) return 0
  const tm = Math.pow(1 + taxaAa, 1 / 12) - 1
  return saldo / meses + saldo * tm
}

function servicoAnualSAC(saldo: number, taxaAa: number, meses: number): number {
  // soma das 12 primeiras parcelas SAC
  if (meses <= 0 || saldo <= 0) return 0
  const tm = Math.pow(1 + taxaAa, 1 / 12) - 1
  const amort = saldo / meses
  let total = 0
  let s = saldo
  for (let i = 0; i < Math.min(12, meses); i++) {
    total += amort + s * tm
    s -= amort
  }
  return total
}

export function TabReestruturacao({ clientId }: { clientId: string }) {
  const [loading, setLoading]   = useState(true)
  const [contratos, setContratos] = useState<ContratoRow[]>([])
  const [receitaAnual, setReceitaAnual] = useState(0)

  // Simulação unificada para os contratos selecionados
  const [simTaxa,    setSimTaxa]    = useState('')   // % a.a.
  const [simPrazo,   setSimPrazo]   = useState('')   // meses
  const [simSistema, setSimSistema] = useState<'SAC' | 'Price'>('SAC')

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.contratos.list(clientId),
      agroApi.contratos.cronograma(clientId),
      agroApi.producao.list(clientId),
    ]).then(([conts, crono, prods]) => {
      const hoje = new Date()
      const em12 = new Date(hoje.getTime() + 365 * 24 * 60 * 60 * 1000)

      // Agrupa parcelas por contratoId
      const porContrato: Record<string, { amort: number; servico12: number; proxima: number; count: number }> = {}
      for (const p of crono.parcelas as any[]) {
        if (!porContrato[p.contratoId]) porContrato[p.contratoId] = { amort: 0, servico12: 0, proxima: 0, count: 0 }
        porContrato[p.contratoId].amort += p.amortizacao ?? 0
        porContrato[p.contratoId].count++
        const venc = new Date(p.vencimento)
        if (venc >= hoje && venc <= em12) porContrato[p.contratoId].servico12 += p.valorParcela
        if (porContrato[p.contratoId].proxima === 0 && venc >= hoje) {
          porContrato[p.contratoId].proxima = p.valorParcela
        }
      }

      const rows: ContratoRow[] = (conts as AgroContrato[]).map(c => {
        const g = porContrato[c.id ?? ''] ?? { amort: 0, servico12: 0, proxima: 0, count: 0 }
        const taxa = c.taxa < 1 ? c.taxa : c.taxa / 100
        const restantes = Math.max(1, c.totalParcelas - c.parcelaAtual + 1)
        return {
          id:                c.id ?? Math.random().toString(),
          banco:             c.banco,
          modalidade:        c.modalidade,
          numeroContrato:    c.numeroContrato ?? '—',
          saldoDevedor:      g.amort > 0 ? g.amort : c.valorParcela * restantes,
          servicoAnual:      g.servico12,
          proximaParcela:    g.proxima || c.valorParcela,
          taxa,
          parcelasRestantes: restantes,
          vencimento:        c.vencimento ? new Date(c.vencimento).toLocaleDateString('pt-BR') : '—',
          selected:          false,
        }
      })
      setContratos(rows)

      // Receita anual
      const anos: Record<number, number> = {}
      for (const p of prods) {
        if (p.area <= 0) continue
        const ano = parseInt(p.safra.split('/')[0]) + 1
        anos[ano] = (anos[ano] ?? 0) + p.area * p.produtividade * p.cotacao
      }
      const top = Object.keys(anos).map(Number).sort((a, b) => b - a)
      setReceitaAnual(anos[top[0]] ?? 0)
    }).finally(() => setLoading(false))
  }, [clientId])

  const toggleSelect = (id: string) =>
    setContratos(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c))
  const toggleAll = () => {
    const allSel = contratos.every(c => c.selected)
    setContratos(prev => prev.map(c => ({ ...c, selected: !allSel })))
  }

  const selecionados = contratos.filter(c => c.selected)

  const sim = useMemo(() => {
    if (selecionados.length === 0) return null
    const totalSaldo    = selecionados.reduce((s, c) => s + c.saldoDevedor, 0)
    const servicoAtual  = selecionados.reduce((s, c) => s + c.servicoAnual, 0)
    const taxaSim  = simTaxa  ? parseFloat(simTaxa)  / 100 : null
    const prazoSim = simPrazo ? parseInt(simPrazo)         : null

    if (!taxaSim || !prazoSim) return { totalSaldo, servicoAtual, novoParcela: null, novoServicoAnual: null }

    const novoParcela = simSistema === 'Price'
      ? parcelaPrice(totalSaldo, taxaSim, prazoSim)
      : parcelaSAC1(totalSaldo, taxaSim, prazoSim)
    const novoServicoAnual = simSistema === 'Price'
      ? novoParcela * Math.min(12, prazoSim)
      : servicoAnualSAC(totalSaldo, taxaSim, prazoSim)

    const economia = servicoAtual - novoServicoAnual
    const pctRecAtual  = receitaAnual > 0 ? servicoAtual / receitaAnual * 100 : 0
    const pctRecNovo   = receitaAnual > 0 ? novoServicoAnual / receitaAnual * 100 : 0
    const totalSaldoGeral = contratos.reduce((s, c) => s + c.saldoDevedor, 0)
    const servicoGeral    = contratos.reduce((s, c) => s + c.servicoAnual, 0)
    const novoServiceGeral = servicoGeral - servicoAtual + novoServicoAnual
    const pctRecNovGeral  = receitaAnual > 0 ? novoServiceGeral / receitaAnual * 100 : 0

    return {
      totalSaldo, servicoAtual, novoParcela, novoServicoAnual,
      economia, pctRecAtual, pctRecNovo, prazoSim, taxaSim,
      totalSaldoGeral, servicoGeral, novoServiceGeral, pctRecNovGeral,
    }
  }, [selecionados, simTaxa, simPrazo, simSistema, contratos, receitaAnual])

  if (loading) return (
    <div className="flex items-center justify-center py-24 text-gray-400">
      <RefreshCw size={24} className="animate-spin mr-3" />
      <span>Carregando contratos...</span>
    </div>
  )

  if (contratos.length === 0) return (
    <div className="text-center py-24 text-gray-400">
      <Settings2 size={40} className="mx-auto mb-3 opacity-30" />
      <p className="font-medium">Nenhum contrato cadastrado</p>
      <p className="text-sm mt-1">Cadastre contratos na aba <strong>Contratos</strong> para usar o simulador.</p>
    </div>
  )

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Simulador de Reestruturação de Passivo</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Selecione os contratos que deseja reestruturar → defina nova taxa e prazo → veja o impacto consolidado
        </p>
      </div>

      {/* Tabela de contratos — seleção */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
          <h4 className="font-semibold text-sm text-gray-700">
            Contratos — selecione os que entrarão na reestruturação
          </h4>
          {selecionados.length > 0 && (
            <span className="text-xs font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full">
              {selecionados.length} selecionado(s)
            </span>
          )}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="px-3 py-2">
                  <input type="checkbox" checked={contratos.length > 0 && contratos.every(c => c.selected)}
                    onChange={toggleAll} className="rounded" />
                </th>
                {['Banco', 'Modalidade', 'Nº Contrato', 'Saldo Devedor', 'Serviço 12 meses', 'Taxa a.a.', 'Parc. Restantes', 'Vencimento'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratos.map(c => (
                <tr
                  key={c.id}
                  onClick={() => toggleSelect(c.id)}
                  className={`cursor-pointer transition-colors ${c.selected ? 'bg-blue-50 hover:bg-blue-100' : 'hover:bg-gray-50'}`}
                >
                  <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                    <input type="checkbox" checked={c.selected} onChange={() => toggleSelect(c.id)} className="rounded" />
                  </td>
                  <td className="px-3 py-2.5 font-medium text-gray-900 whitespace-nowrap">{c.banco}</td>
                  <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{c.modalidade}</td>
                  <td className="px-3 py-2.5 text-gray-400">{c.numeroContrato}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-900">{fmtBRL(c.saldoDevedor)}</td>
                  <td className="px-3 py-2.5 text-red-500 font-semibold">{c.servicoAnual > 0 ? fmtBRL(c.servicoAnual) : '—'}</td>
                  <td className="px-3 py-2.5 text-gray-600">{fmtPct(c.taxa)}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.parcelasRestantes}</td>
                  <td className="px-3 py-2.5 text-gray-600">{c.vencimento}</td>
                </tr>
              ))}
            </tbody>
            {/* Totais */}
            <tfoot className="bg-gray-50 border-t-2 border-gray-200 font-bold text-xs">
              <tr>
                <td colSpan={4} className="px-3 py-2.5 text-gray-700">
                  Total geral ({contratos.length} contratos)
                </td>
                <td className="px-3 py-2.5 text-gray-900">{fmtBRL(contratos.reduce((s, c) => s + c.saldoDevedor, 0))}</td>
                <td className="px-3 py-2.5 text-red-600">{fmtBRL(contratos.reduce((s, c) => s + c.servicoAnual, 0))}</td>
                <td colSpan={3} />
              </tr>
              {selecionados.length > 0 && (
                <tr className="bg-blue-50">
                  <td colSpan={4} className="px-3 py-2 text-blue-700">
                    Selecionados para reestruturação ({selecionados.length} contratos)
                  </td>
                  <td className="px-3 py-2 text-blue-900">{fmtBRL(selecionados.reduce((s, c) => s + c.saldoDevedor, 0))}</td>
                  <td className="px-3 py-2 text-blue-700">{fmtBRL(selecionados.reduce((s, c) => s + c.servicoAnual, 0))}</td>
                  <td colSpan={3} />
                </tr>
              )}
            </tfoot>
          </table>
        </div>
      </div>

      {/* Painel de simulação */}
      {selecionados.length > 0 ? (
        <div className="bg-white rounded-2xl border border-blue-200 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-blue-100 bg-blue-50 flex items-center gap-2">
            <TrendingDown size={15} className="text-blue-600" />
            <h4 className="font-bold text-sm text-blue-800">
              Simulação — {selecionados.length} contrato(s) selecionado(s) · Saldo: {fmtBRL(sim?.totalSaldo ?? 0)}
            </h4>
          </div>

          <div className="p-5 space-y-5">
            {/* Inputs */}
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nova Taxa (% a.a.)</label>
                <input
                  type="number" min={0} step={0.5} value={simTaxa}
                  onChange={e => setSimTaxa(e.target.value)}
                  placeholder="ex: 8.5"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Novo Prazo (meses)</label>
                <input
                  type="number" min={1} step={6} value={simPrazo}
                  onChange={e => setSimPrazo(e.target.value)}
                  placeholder="ex: 60"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold text-center focus:outline-none focus:ring-2 focus:ring-blue-300"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Sistema de Amortização</label>
                <select
                  value={simSistema} onChange={e => setSimSistema(e.target.value as 'SAC' | 'Price')}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-blue-300 bg-white"
                >
                  <option value="SAC">SAC</option>
                  <option value="Price">Price (parcela fixa)</option>
                </select>
              </div>
            </div>

            {/* Resultado */}
            {sim?.novoParcela != null && (
              <div className="space-y-4">
                {/* Comparativo dos selecionados */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-red-600 uppercase mb-2">Situação Atual (selecionados)</p>
                    <p className="text-xl font-bold text-red-700">{fmtBRL(sim.servicoAtual)}<span className="text-sm font-normal">/ano</span></p>
                    <p className="text-sm text-red-500">{fmtBRL(sim.servicoAtual / 12)}/mês</p>
                    {receitaAnual > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {fmtN(sim.pctRecAtual, 1)}% da receita anual
                      </p>
                    )}
                  </div>
                  <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4">
                    <p className="text-xs font-bold text-emerald-600 uppercase mb-2">Após Reestruturação</p>
                    <p className="text-xl font-bold text-emerald-700">{fmtBRL(sim.novoServicoAnual!)}<span className="text-sm font-normal">/ano</span></p>
                    <p className="text-sm text-emerald-500">{fmtBRL(sim.novoServicoAnual! / 12)}/mês</p>
                    {receitaAnual > 0 && (
                      <p className="text-xs text-gray-500 mt-2">
                        {fmtN(sim.pctRecNovo, 1)}% da receita anual
                      </p>
                    )}
                  </div>
                </div>

                {/* Economia */}
                <div className={`rounded-xl p-4 flex items-center justify-between ${sim.economia >= 0 ? 'bg-emerald-50 border border-emerald-200' : 'bg-red-50 border border-red-200'}`}>
                  <div>
                    <p className={`text-sm font-bold ${sim.economia >= 0 ? 'text-emerald-800' : 'text-red-800'}`}>
                      {sim.economia >= 0 ? 'Redução no serviço anual dos contratos selecionados' : 'Aumento no serviço anual'}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Prazo: {sim.prazoSim} meses · Taxa: {fmtN(sim.taxaSim * 100, 2)}% a.a. · Sistema: {simSistema}
                    </p>
                    {sim.novoServicoAnual != null && (
                      <p className="text-xs text-gray-500 mt-0.5">
                        1ª parcela (maior no SAC): {fmtBRL(sim.novoParcela!)}
                      </p>
                    )}
                  </div>
                  <span className={`text-2xl font-bold ml-4 ${sim.economia >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                    {sim.economia >= 0 ? '-' : '+'}{fmtBRL(Math.abs(sim.economia))}/ano
                  </span>
                </div>

                {/* Impacto no total da carteira */}
                <div className="bg-gray-50 rounded-xl p-4">
                  <p className="text-xs font-bold text-gray-600 uppercase mb-3">Impacto na carteira total ({contratos.length} contratos)</p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div>
                      <p className="text-xs text-gray-500">Serviço atual (todos)</p>
                      <p className="text-base font-bold text-red-600">{fmtBRL(sim.servicoGeral)}/ano</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Após reestruturação (todos)</p>
                      <p className="text-base font-bold text-emerald-600">{fmtBRL(sim.novoServiceGeral)}/ano</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Comprometimento da receita</p>
                      <p className={`text-base font-bold ${sim.pctRecNovGeral > 35 ? 'text-red-600' : sim.pctRecNovGeral > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                        {receitaAnual > 0 ? fmtN(sim.pctRecNovGeral, 1) + '%' : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {(!simTaxa || !simPrazo) && (
              <p className="text-xs text-gray-400 text-center py-2">Informe a nova taxa e o novo prazo para ver a simulação</p>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-gray-50 border border-dashed border-gray-200 rounded-2xl p-8 text-center text-gray-400">
          <CheckCircle size={32} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm font-medium">Selecione os contratos que deseja reestruturar</p>
          <p className="text-xs mt-1">Marque um ou mais contratos na tabela acima para iniciar a simulação</p>
        </div>
      )}

      <div className="flex justify-end">
        <button
          onClick={() => { setSimTaxa(''); setSimPrazo(''); setSimSistema('SAC') }}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={12} /> Resetar simulação
        </button>
      </div>
    </div>
  )
}
