import { useState } from 'react'
import { Building2, Calculator, Info, TrendingUp, AlertTriangle, CheckCircle } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card, StatCard } from '../components/ui/Card'

const fmtBRL  = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct  = (v: number, d = 2) => `${v.toFixed(d)}%`

// ── Taxas de referência (jun/2026) ───────────────────────────
const CDI_ANUAL    = 14.40  // % a.a.
const TJLP_MENSAL  = 0.73   // % a.m.
const TJLP_ANUAL   = 9.12   // % a.a.

// Projeções CDI (boletim Focus)
const CDI_PROJ: Record<string, number> = {
  '2026': 13.25, '2027': 11.25, '2028': 10.00, '2029': 10.00,
}

// IOF taxas (Decreto 12.499/2025 — vigente 2026)
const IOF_DIARIA_PJ   = 0.000082  // 0,0082% ao dia
const IOF_ADICIONAL_PJ = 0.0095   // 0,95% por operação
const IOF_MAX_DIAS    = 365

function calcIOF(principal: number, dias: number, isPJ: boolean): number {
  const taxa_d = IOF_DIARIA_PJ
  const taxa_f = isPJ ? IOF_ADICIONAL_PJ : 0.0038
  const diasEfetivos = Math.min(dias, IOF_MAX_DIAS)
  return principal * taxa_d * diasEfetivos + principal * taxa_f
}

function taxaMensalParaAnual(tm: number): number {
  return (Math.pow(1 + tm / 100, 12) - 1) * 100
}
function taxaAnualParaMensal(ta: number): number {
  return (Math.pow(1 + ta / 100, 1 / 12) - 1) * 100
}
function taxaComCDI(spread: number, isAnual: boolean): number {
  const cdiM = taxaAnualParaMensal(CDI_ANUAL)
  const spreadM = isAnual ? taxaAnualParaMensal(spread) : spread / 100
  const efetivaMensal = (1 + cdiM / 100) * (1 + spreadM) - 1
  return taxaMensalParaAnual(efetivaMensal * 100)
}

// ── Modalidades empresariais ──────────────────────────────────
const MODALIDADES_PJ = [
  {
    id: 'cg',      nome: 'Capital de Giro',
    taxaRef: '21,8% a 38% a.a.', taxaMin: 21.8, taxaMax: 38,
    iof: true, prazosComuns: '12 a 48 meses', garantia: 'Aval, recebíveis, imóvel',
    desc: 'Destinado ao financiamento das atividades operacionais: folha, fornecedores, impostos.',
    cor: 'bg-blue-50 border-blue-200 text-blue-700',
    fonteRecurso: 'Livre (mercado)',
    bcbRef: 'BCB Nov/2025: 21,8% (>365d) e ~38% (≤365d)',
  },
  {
    id: 'inv',     nome: 'Investimento / BNDES',
    taxaRef: '10% a 14% a.a. (TLP + spread)', taxaMin: 10, taxaMax: 14,
    iof: false, prazosComuns: '24 a 120 meses', garantia: 'Alienação do bem, imóvel, aval',
    desc: 'Para aquisição de máquinas, equipamentos, expansão de instalações e modernização.',
    cor: 'bg-green-50 border-green-200 text-green-700',
    fonteRecurso: 'BNDES (TLP)',
    bcbRef: 'TLP + spread agente = ~10–14% a.a. (2026)',
  },
  {
    id: 'recebiveis', nome: 'Antecipação de Recebíveis',
    taxaRef: '1,5% a 3% a.m. (~19,3% a.a.)', taxaMin: 19.3, taxaMax: 40,
    iof: true, prazosComuns: 'Até 180 dias', garantia: 'Duplicatas, NF-e, contratos',
    desc: 'Antecipação de notas fiscais, duplicatas e contratos a receber. Custo menor que capital de giro.',
    cor: 'bg-amber-50 border-amber-200 text-amber-700',
    fonteRecurso: 'Livre + FIDC',
    bcbRef: 'BCB Nov/2025: desconto de duplicatas 19,3% a.a.',
  },
  {
    id: 'cartoes', nome: 'Antecipação de Recebíveis de Cartões',
    taxaRef: '1% a 2,5% a.m. (CDI + spread)', taxaMin: 12.7, taxaMax: 34.5,
    iof: false, prazosComuns: '1 a 180 dias', garantia: 'Agenda de recebíveis (garantia automática)',
    desc: 'Antecipação das vendas no cartão de crédito/débito antes do prazo da credenciadora.',
    cor: 'bg-purple-50 border-purple-200 text-purple-700',
    fonteRecurso: 'Credenciadoras / bancos',
    bcbRef: 'Estoque cresceu 7,2% em Dez/2025 (BCB)',
  },
  {
    id: 'fco',     nome: 'FCO Empresarial',
    taxaRef: '~8,7% a 9,2% a.a. (TJLP + 1,5–2,8%)', taxaMin: 8.7, taxaMax: 9.2,
    iof: false, prazosComuns: '36 a 180 meses', garantia: 'Hipoteca, alienação, fiança',
    desc: 'Fundo Constitucional do Centro-Oeste. Micro e pequenas: 100% do projeto; médias: 90%; grandes: 80%.',
    cor: 'bg-teal-50 border-teal-200 text-teal-700',
    fonteRecurso: 'FCO (BB Centro-Oeste)',
    bcbRef: 'TJLP 0,73%/m = 9,12% a.a. (Jun/2026)',
  },
  {
    id: 'rotativo',nome: 'Crédito Rotativo / Conta Garantida',
    taxaRef: '3% a 5% a.m. (40–80% a.a.)', taxaMin: 40, taxaMax: 80,
    iof: true, prazosComuns: 'Uso conforme necessidade', garantia: 'Aval, limite preaprovado',
    desc: 'Limite disponível para uso imediato. Custo alto — usar apenas para necessidades de curtíssimo prazo.',
    cor: 'bg-red-50 border-red-200 text-red-700',
    fonteRecurso: 'Livre (banco)',
    bcbRef: 'Conta garantida PJ: 40–70% a.a. (estimativa mercado)',
  },
]

type TipoTaxa = 'anual' | 'mensal'
type TipoCorrecao = 'prefixada' | 'cdi' | 'tjlp'

function SimuladorPJ() {
  const [modal,      setModal]      = useState(MODALIDADES_PJ[0].id)
  const [valor,      setValor]      = useState('500000')
  const [taxa,       setTaxa]       = useState('22')
  const [tipoTaxa,   setTipoTaxa]   = useState<TipoTaxa>('anual')
  const [prazo,      setPrazo]      = useState('24')
  const [correcao,   setCorrecao]   = useState<TipoCorrecao>('prefixada')
  const [spread,     setSpread]     = useState('3')
  const [receita,    setReceita]    = useState('200000')
  const [isPJ,       setIsPJ]       = useState(true)

  const modalInfo = MODALIDADES_PJ.find(m => m.id === modal)!
  const principal = Number(valor.replace(/\D/g, '')) || 0
  const prazoNum  = Number(prazo) || 12
  const receitaM  = Number(receita.replace(/\D/g, '')) || 1

  // Taxa efetiva anual
  let taxaEfAA: number
  if (correcao === 'cdi') {
    taxaEfAA = taxaComCDI(Number(spread), false)
  } else if (correcao === 'tjlp') {
    taxaEfAA = TJLP_ANUAL + Number(spread)
  } else {
    taxaEfAA = tipoTaxa === 'mensal' ? taxaMensalParaAnual(Number(taxa)) : Number(taxa)
  }
  const taxaEfAM = taxaAnualParaMensal(taxaEfAA)

  // PMT (Price)
  const r    = taxaEfAM / 100
  const pmt  = r > 0 ? principal * (r * Math.pow(1 + r, prazoNum)) / (Math.pow(1 + r, prazoNum) - 1) : principal / prazoNum
  const totalPago  = pmt * prazoNum
  const totalJuros = totalPago - principal

  // IOF
  const iofValor  = modalInfo.iof ? calcIOF(principal, prazoNum * 30, isPJ) : 0
  const custoTotal = totalPago + iofValor

  const comprometimento = (pmt / receitaM) * 100
  const ok = comprometimento <= 30

  // CET aproximado (taxa que remunera principal + IOF no prazo)
  const totalCom  = pmt * prazoNum + iofValor
  const cetMensal = r > 0 ? r * (1 + iofValor / principal) : 0  // aprox
  const cetAnual  = taxaMensalParaAnual(cetMensal * 100)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-5">
      {/* Seleção de modalidade */}
      <div>
        <p className={lbl}>Modalidade de Crédito</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {MODALIDADES_PJ.map(m => (
            <button key={m.id} onClick={() => setModal(m.id)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${modal === m.id ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
              <p className={`text-xs font-bold mb-0.5 ${modal === m.id ? 'text-blue-700' : 'text-gray-700'}`}>{m.nome}</p>
              <p className="text-xs text-gray-500">{m.taxaRef}</p>
            </button>
          ))}
        </div>
        {modalInfo && (
          <div className={`mt-2 p-3 rounded-xl border text-xs ${modalInfo.cor}`}>
            <strong>Característica:</strong> {modalInfo.desc} <span className="opacity-70">· Fonte: {modalInfo.bcbRef}</span>
          </div>
        )}
      </div>

      {/* Parâmetros */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calculator size={16} /> Parâmetros da Operação</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div><label className={lbl}>Valor da Operação (R$)</label><input className={inp} value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div><label className={lbl}>Prazo (meses)</label><input type="number" className={inp} value={prazo} onChange={e => setPrazo(e.target.value)} /></div>
          <div><label className={lbl}>Receita Mensal (R$)</label><input className={inp} value={receita} onChange={e => setReceita(e.target.value)} /></div>
          <div>
            <label className={lbl}>Tipo de Pessoa</label>
            <div className="flex gap-2">
              <button onClick={() => setIsPJ(true)}  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${isPJ ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}>PJ</button>
              <button onClick={() => setIsPJ(false)} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${!isPJ ? 'bg-blue-600 text-white border-blue-600' : 'bg-white border-gray-200 text-gray-600'}`}>PF</button>
            </div>
          </div>
        </div>

        {/* Tipo de taxa */}
        <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="col-span-2">
            <label className={lbl}>Tipo de Correção</label>
            <div className="flex gap-2">
              {(['prefixada', 'cdi', 'tjlp'] as TipoCorrecao[]).map(c => (
                <button key={c} onClick={() => setCorrecao(c)}
                  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${correcao === c ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {c === 'prefixada' ? 'Prefixada' : c === 'cdi' ? `CDI (${fmtPct(CDI_ANUAL, 1)} a.a.)` : `TJLP (${fmtPct(TJLP_ANUAL, 2)} a.a.)`}
                </button>
              ))}
            </div>
          </div>

          {correcao === 'prefixada' ? (
            <>
              <div>
                <label className={lbl}>Taxa</label>
                <input type="number" step="0.1" className={inp} value={taxa} onChange={e => setTaxa(e.target.value)} />
              </div>
              <div>
                <label className={lbl}>Base da Taxa</label>
                <div className="flex gap-2">
                  <button onClick={() => setTipoTaxa('anual')}  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${tipoTaxa === 'anual' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>% a.a.</button>
                  <button onClick={() => setTipoTaxa('mensal')} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${tipoTaxa === 'mensal' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>% a.m.</button>
                </div>
              </div>
            </>
          ) : (
            <div className="col-span-2">
              <label className={lbl}>Spread sobre {correcao.toUpperCase()} (% a.a.)</label>
              <input type="number" step="0.1" className={inp} value={spread} onChange={e => setSpread(e.target.value)} placeholder="Ex: 3.5" />
              <p className="text-xs text-gray-400 mt-1">Taxa efetiva: {fmtPct(taxaEfAA, 2)} a.a. ({fmtPct(taxaEfAM, 3)} a.m.)</p>
            </div>
          )}
        </div>
      </Card>

      {/* Resultado */}
      {principal > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Resultado da Simulação</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: 'Parcela Mensal', value: fmtBRL(pmt), highlight: true },
              { label: 'Total Pago (s/ IOF)', value: fmtBRL(totalPago) },
              { label: 'Total de Juros', value: fmtBRL(totalJuros) },
              { label: 'Comprometimento', value: fmtPct(comprometimento, 1) },
            ].map(k => (
              <div key={k.label} className={`p-3 rounded-xl ${k.highlight ? 'bg-blue-600 text-white' : 'bg-gray-50'}`}>
                <p className={`text-xs ${k.highlight ? 'text-white/70' : 'text-gray-500'}`}>{k.label}</p>
                <p className={`text-lg font-bold ${k.highlight ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* IOF */}
          <div className={`p-4 rounded-xl border mb-4 ${modalInfo.iof ? 'bg-amber-50 border-amber-200' : 'bg-emerald-50 border-emerald-200'}`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-gray-800">
                  {modalInfo.iof ? '⚠️ IOF incide nesta operação' : '✅ Operação isenta de IOF'}
                </p>
                <p className="text-xs text-gray-600 mt-0.5">
                  {modalInfo.iof
                    ? `${isPJ ? 'PJ' : 'PF'}: 0,0082%/dia × ${Math.min(prazoNum * 30, 365)} dias + ${isPJ ? '0,95%' : '0,38%'} fixo`
                    : `${modalInfo.nome} — operação não sujeita ao IOF conforme legislação vigente`
                  }
                </p>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">{fmtBRL(iofValor)}</p>
                {iofValor > 0 && <p className="text-xs text-gray-500">= {fmtPct((iofValor / principal) * 100, 2)} do principal</p>}
              </div>
            </div>
            {iofValor > 0 && (
              <div className="mt-3 pt-3 border-t border-amber-200 grid grid-cols-2 gap-3 text-xs">
                <div><span className="text-gray-500">Custo total com IOF:</span> <strong>{fmtBRL(custoTotal)}</strong></div>
                <div><span className="text-gray-500">CET estimado:</span> <strong>{fmtPct(cetAnual, 2)} a.a.</strong></div>
              </div>
            )}
          </div>

          {/* Taxa convertida */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-xs">
            <div><span className="text-gray-400">Taxa a.a. efetiva</span><br /><strong>{fmtPct(taxaEfAA, 3)}% a.a.</strong></div>
            <div><span className="text-gray-400">Taxa a.m. efetiva</span><br /><strong>{fmtPct(taxaEfAM, 4)}% a.m.</strong></div>
            <div><span className="text-gray-400">Garantia recomendada</span><br /><strong>{modalInfo.garantia}</strong></div>
            <div><span className="text-gray-400">Fonte dos recursos</span><br /><strong>{modalInfo.fonteRecurso}</strong></div>
          </div>

          {/* Capacidade */}
          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {ok
              ? `Comprometimento adequado: ${fmtPct(comprometimento, 1)} da receita mensal — abaixo do limite de 30%`
              : `Atenção: comprometimento de ${fmtPct(comprometimento, 1)} — acima do limite recomendado de 30%`
            }
          </div>
        </Card>
      )}

      {/* Projeção CDI */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Projeção CDI / Selic — Boletim Focus</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { ano: 'Atual (Jun/26)', selic: 14.50, cdi: CDI_ANUAL },
            ...Object.entries(CDI_PROJ).map(([ano, selic]) => ({ ano: `Fim ${ano}`, selic, cdi: selic - 0.10 }))
          ].map(({ ano, selic, cdi }) => (
            <div key={ano} className="bg-gray-50 rounded-xl p-3 text-center">
              <p className="text-xs text-gray-500">{ano}</p>
              <p className="text-sm font-bold text-gray-900">Selic {fmtPct(selic, 2)}</p>
              <p className="text-xs text-blue-600 font-medium">CDI ≈ {fmtPct(cdi, 2)}</p>
            </div>
          ))}
        </div>
        <p className="text-xs text-gray-400 mt-2">Fonte: Boletim Focus / BCB (maio/2026)</p>
      </Card>
    </div>
  )
}

export function CreditoEmpresarial() {
  return (
    <AppLayout title="Crédito Empresarial" subtitle="Capital de giro · Investimento · Recebíveis · FCO · BNDES · IOF calculado">
      <div className="mb-5 flex items-center gap-3">
        <div className="p-2.5 bg-blue-50 rounded-xl"><Building2 size={20} className="text-blue-600" /></div>
        <div>
          <h2 className="font-bold text-gray-900">Estruturação de Crédito Empresarial</h2>
          <p className="text-xs text-gray-500">Todas as modalidades PJ — taxa mensal ou anual, com e sem correção CDI/TJLP, IOF calculado</p>
        </div>
      </div>
      <SimuladorPJ />
    </AppLayout>
  )
}
