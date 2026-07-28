import { useState, useEffect, useMemo } from 'react'
import { RefreshCw, Settings2, TrendingUp, TrendingDown, CheckCircle, AlertTriangle, Info, RotateCcw } from 'lucide-react'
import { agroApi, type AgroContrato } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })
const fmtPct = (v: number) => `${(v * 100).toFixed(2)}%`

// ── Tipos ─────────────────────────────────────────────────────────────────────
interface ContratoSim {
  id: string
  banco: string
  modalidade: string
  saldoDevedor: number    // estimativa: parcela × parcelas restantes
  valorParcela: number    // atual
  taxa: number
  parcelasRestantes: number
  // Negociadas
  novosPrazos: number     // número de parcelas novas (0 = manter)
  novaTaxa: number        // taxa renegociada (0 = manter)
  ativo: boolean          // incluir na reestruturação
}

function parcelaPrice(saldo: number, taxa: number, n: number): number {
  if (n <= 0 || saldo <= 0) return 0
  if (taxa === 0) return saldo / n
  const tm = taxa / 12
  return saldo * (tm * Math.pow(1 + tm, n)) / (Math.pow(1 + tm, n) - 1)
}

function parcelaSAC(saldo: number, taxa: number, n: number, parcNum: number): number {
  if (n <= 0 || saldo <= 0) return 0
  const amort = saldo / n
  const juros = saldo * (taxa / 12) * (1 - (parcNum - 1) / n)
  return amort + juros
}

// ── Componente ────────────────────────────────────────────────────────────────
export function TabReestruturacao({ clientId }: { clientId: string }) {
  const [loading, setLoading]     = useState(true)
  const [contratos, setContratos] = useState<ContratoSim[]>([])
  const [receitaAnual, setReceitaAnual] = useState(0)

  useEffect(() => {
    if (!clientId) return
    setLoading(true)
    Promise.all([
      agroApi.contratos.list(clientId),
      agroApi.producao.list(clientId),
    ]).then(([conts, prods]) => {
      const sims: ContratoSim[] = (conts as AgroContrato[]).map(c => {
        const restantes = Math.max(1, c.totalParcelas - c.parcelaAtual + 1)
        const saldo     = c.valorParcela * restantes
        const taxaAa = c.taxa < 1 ? c.taxa : c.taxa / 100
        return {
          id:               c.id ?? Math.random().toString(),
          banco:            c.banco,
          modalidade:       c.modalidade,
          saldoDevedor:     saldo,
          valorParcela:     c.valorParcela,
          taxa:             taxaAa,
          parcelasRestantes: restantes,
          novosPrazos:      0,
          novaTaxa:         0,
          ativo:            true,
        }
      })
      setContratos(sims)

      // Receita anual base (última safra)
      const anos: Record<number, number> = {}
      for (const p of prods) {
        const ano = parseInt(p.safra.split('/')[0]) + 1
        anos[ano] = (anos[ano] ?? 0) + p.area * p.produtividade * p.cotacao
      }
      const anosOrdenados = Object.keys(anos).map(Number).sort((a, b) => b - a)
      setReceitaAnual(anos[anosOrdenados[0]] ?? 0)
    }).finally(() => setLoading(false))
  }, [clientId])

  const update = (id: string, field: keyof ContratoSim, val: any) => {
    setContratos(prev => prev.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  // ── Cálculos: antes vs depois ──────────────────────────────────────────────
  const { antes, depois } = useMemo(() => {
    const ativos = contratos.filter(c => c.ativo)
    const inativos = contratos.filter(c => !c.ativo)

    const servicoAnualAntes = contratos.reduce((s, c) => {
      const parcMensal = c.valorParcela
      return s + parcMensal * 12
    }, 0)

    const servicoAnualDepois = ativos.reduce((s, c) => {
      const prazo = c.novosPrazos > 0 ? c.novosPrazos : c.parcelasRestantes
      const taxa  = c.novaTaxa > 0 ? (c.novaTaxa < 1 ? c.novaTaxa : c.novaTaxa / 100) : c.taxa
      const parc  = parcelaPrice(c.saldoDevedor, taxa, prazo)
      return s + parc * 12
    }, 0) + inativos.reduce((s, c) => s + c.valorParcela * 12, 0)

    const saldoTotal = contratos.reduce((s, c) => s + c.saldoDevedor, 0)

    const economiaMensal  = (servicoAnualAntes - servicoAnualDepois) / 12
    const economiaAnual   = servicoAnualAntes - servicoAnualDepois
    const capPagAntes  = receitaAnual > 0 ? receitaAnual / servicoAnualAntes  : Infinity
    const capPagDepois = receitaAnual > 0 ? receitaAnual / servicoAnualDepois : Infinity
    const pctReceitaAntes  = receitaAnual > 0 ? servicoAnualAntes  / receitaAnual * 100 : 0
    const pctReceitaDepois = receitaAnual > 0 ? servicoAnualDepois / receitaAnual * 100 : 0

    return {
      antes:  { servicoAnual: servicoAnualAntes,  capPag: capPagAntes,  pctReceita: pctReceitaAntes  },
      depois: { servicoAnual: servicoAnualDepois, capPag: capPagDepois, pctReceita: pctReceitaDepois,
                economiaMensal, economiaAnual, saldoTotal },
    }
  }, [contratos, receitaAnual])

  const inp = 'w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-blue-300'

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

  const reduzServico = depois.economiaAnual > 0

  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Simulador de Reestruturação de Passivo</h2>
        <p className="text-xs text-gray-500 mt-0.5">
          Simule a renegociação de prazos e taxas — compare serviço da dívida antes e depois
        </p>
      </div>

      {/* Comparativo Antes × Depois */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Antes */}
        <div className="bg-red-50 border border-red-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-red-600 uppercase mb-3">Situação Atual</p>
          <p className="text-2xl font-bold text-red-700">{fmtBRL(antes.servicoAnual)}/ano</p>
          <p className="text-sm text-red-500 mb-4">{fmtBRL(antes.servicoAnual / 12)}/mês</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Comprom. da receita</span>
              <span className={`font-semibold ${antes.pctReceita > 35 ? 'text-red-600' : antes.pctReceita > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {antes.pctReceita.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Capacidade de pagamento</span>
              <span className={`font-semibold ${antes.capPag > 1.5 ? 'text-emerald-600' : antes.capPag > 1 ? 'text-amber-600' : 'text-red-600'}`}>
                {isFinite(antes.capPag) ? `${antes.capPag.toFixed(2)}x` : '∞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Saldo devedor total</span>
              <span className="font-semibold text-gray-700">{fmtBRL(depois.saldoTotal)}</span>
            </div>
          </div>
        </div>

        {/* Depois */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-5">
          <p className="text-xs font-bold text-emerald-600 uppercase mb-3">Após Reestruturação</p>
          <p className="text-2xl font-bold text-emerald-700">{fmtBRL(depois.servicoAnual)}/ano</p>
          <p className="text-sm text-emerald-500 mb-4">{fmtBRL(depois.servicoAnual / 12)}/mês</p>
          <div className="space-y-2 text-xs">
            <div className="flex justify-between">
              <span className="text-gray-500">Comprom. da receita</span>
              <span className={`font-semibold ${depois.pctReceita > 35 ? 'text-red-600' : depois.pctReceita > 20 ? 'text-amber-600' : 'text-emerald-600'}`}>
                {depois.pctReceita.toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Capacidade de pagamento</span>
              <span className={`font-semibold ${depois.capPag > 1.5 ? 'text-emerald-600' : depois.capPag > 1 ? 'text-amber-600' : 'text-red-600'}`}>
                {isFinite(depois.capPag) ? `${depois.capPag.toFixed(2)}x` : '∞'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Economia anual</span>
              <span className={`font-bold text-lg ${reduzServico ? 'text-emerald-700' : 'text-red-600'}`}>
                {reduzServico ? '+' : ''}{fmtBRL(depois.economiaAnual)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Impacto visual */}
      {reduzServico && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl px-5 py-4 flex items-center gap-4">
          <CheckCircle size={24} className="text-blue-600 shrink-0" />
          <div>
            <p className="text-sm font-bold text-blue-800">
              A reestruturação libera {fmtBRL(depois.economiaMensal)}/mês de caixa operacional
            </p>
            <p className="text-xs text-blue-600 mt-0.5">
              Equivalente a {receitaAnual > 0 ? `${(depois.economiaAnual / receitaAnual * 100).toFixed(1)}% da receita anual — ` : ''}pode ser reinvestido em custeio ou reserva financeira.
            </p>
          </div>
        </div>
      )}

      {/* Tabela de contratos com simulação */}
      <Card>
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <h4 className="font-semibold text-sm text-gray-900">Contratos — Ajuste Prazo e Taxa</h4>
          <div className="flex items-center gap-1 text-xs text-gray-400">
            <Info size={11} />
            Deixe 0 para manter o valor atual
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['', 'Banco', 'Modalidade', 'Saldo Estimado', 'Parcela Atual', 'Taxa Atual', 'Parc. Restantes', 'Novo Prazo (meses)', 'Nova Taxa (% a.a.)', 'Nova Parcela', 'Economia/ano'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap text-xs">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {contratos.map(c => {
                const prazo  = c.novosPrazos > 0 ? c.novosPrazos : c.parcelasRestantes
                const taxa   = c.novaTaxa > 0 ? (c.novaTaxa < 1 ? c.novaTaxa : c.novaTaxa / 100) : c.taxa
                const novaParcela = parcelaPrice(c.saldoDevedor, taxa, prazo)
                const economia = (c.valorParcela - novaParcela) * 12

                return (
                  <tr key={c.id} className={`hover:bg-gray-50/50 ${!c.ativo ? 'opacity-50' : ''}`}>
                    <td className="px-3 py-2">
                      <input type="checkbox" checked={c.ativo} onChange={e => update(c.id, 'ativo', e.target.checked)} className="rounded" />
                    </td>
                    <td className="px-3 py-2 font-medium text-gray-900 whitespace-nowrap">{c.banco}</td>
                    <td className="px-3 py-2 text-gray-600 whitespace-nowrap">{c.modalidade}</td>
                    <td className="px-3 py-2 font-semibold">{fmtBRL(c.saldoDevedor)}</td>
                    <td className="px-3 py-2 text-red-500">{fmtBRL(c.valorParcela)}</td>
                    <td className="px-3 py-2 text-gray-600">{fmtPct(c.taxa)}</td>
                    <td className="px-3 py-2 text-gray-600">{c.parcelasRestantes}</td>
                    <td className="px-1 py-1 w-28">
                      <input type="number" min={0} step={6} value={c.novosPrazos || ''}
                        onChange={e => update(c.id, 'novosPrazos', +e.target.value)}
                        className={inp} placeholder={String(c.parcelasRestantes)} />
                    </td>
                    <td className="px-1 py-1 w-28">
                      <input type="number" min={0} step={0.5} value={c.novaTaxa || ''}
                        onChange={e => update(c.id, 'novaTaxa', +e.target.value)}
                        className={inp} placeholder={`${(c.taxa * 100).toFixed(2)}`} />
                    </td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${novaParcela <= c.valorParcela ? 'text-emerald-700' : 'text-red-600'}`}>
                      {fmtBRL(novaParcela)}
                    </td>
                    <td className={`px-3 py-2 font-semibold whitespace-nowrap ${economia >= 0 ? 'text-emerald-700' : 'text-red-500'}`}>
                      {economia >= 0 ? '+' : ''}{fmtBRL(economia)}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <div className="flex justify-end">
        <button
          onClick={() => setContratos(prev => prev.map(c => ({ ...c, novosPrazos: 0, novaTaxa: 0 })))}
          className="flex items-center gap-1.5 text-xs text-gray-500 border border-gray-200 px-3 py-2 rounded-lg hover:bg-gray-50"
        >
          <RotateCcw size={12} /> Resetar simulação
        </button>
      </div>
    </div>
  )
}
