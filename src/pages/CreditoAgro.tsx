import { useState } from 'react'
import { Sprout, Calculator, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import { AppLayout } from '../components/Layout/AppLayout'
import { Card } from '../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 2, maximumFractionDigits: 2 })
const fmtPct = (v: number, d = 2) => `${v.toFixed(d)}%`

const CDI_ANUAL = 14.40
function taxaAnualParaMensal(ta: number) { return (Math.pow(1 + ta / 100, 1 / 12) - 1) * 100 }
function taxaMensalParaAnual(tm: number) { return (Math.pow(1 + tm / 100, 12) - 1) * 100 }

// ── Modalidades rurais (MCR BACEN / Plano Safra 2025/26) ──────
const MODALIDADES_AGRO = [
  // ── PRONAF ──────────────────────────────────────────────────
  { id: 'pronaf_a', cat: 'PRONAF', nome: 'Pronaf — Grupo B',
    taxa: 0.5, isento_iof: true, prazoMax: 24, limitePor: 'R$ 5.000/safra',
    finalidade: 'Custeio básico agricultores de menor renda',
    elegibilidade: 'Renda familiar ≤ R$ 40 mil/ano; DAP/CAF ativo',
    cor: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    fonte: 'Plano Safra 2025/26' },
  { id: 'pronaf_b', cat: 'PRONAF', nome: 'Pronaf — Custeio Agrícola',
    taxa: 6.0, isento_iof: true, prazoMax: 24, limitePor: 'R$ 250 mil/safra',
    finalidade: 'Insumos, sementes, serviços',
    elegibilidade: 'Renda bruta familiar ≤ R$ 500 mil/ano; DAP/CAF ativo',
    cor: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    fonte: 'Plano Safra 2025/26' },
  { id: 'pronaf_inv', cat: 'PRONAF', nome: 'Pronaf — Investimento',
    taxa: 5.0, isento_iof: true, prazoMax: 120, limitePor: 'Variável por linha',
    finalidade: 'Máquinas, equipamentos, infraestrutura, armazenagem',
    elegibilidade: 'Mesmos critérios do custeio',
    cor: 'bg-emerald-50 border-emerald-300 text-emerald-800',
    fonte: 'Plano Safra 2025/26' },
  // ── PRONAMP ──────────────────────────────────────────────────
  { id: 'pronamp', cat: 'PRONAMP', nome: 'Pronamp — Médio Produtor',
    taxa: 10.0, isento_iof: true, prazoMax: 36, limitePor: 'R$ 1,5 mi/safra',
    finalidade: 'Custeio e investimento agropecuário',
    elegibilidade: 'Renda bruta ≤ R$ 3,5 mi/ano; recursos controlados (equalização)',
    cor: 'bg-blue-50 border-blue-300 text-blue-800',
    fonte: 'Plano Safra 2025/26 (+2 p.p. vs. 2024/25)' },
  // ── CUSTEIO CONTROLADO ───────────────────────────────────────
  { id: 'custeio_ctrl', cat: 'Custeio Controlado', nome: 'Custeio — Recursos Controlados',
    taxa: 14.0, isento_iof: true, prazoMax: 24, limitePor: 'Variável por IF',
    finalidade: 'Custeio de lavouras com recursos do CMN',
    elegibilidade: 'Produtor rural; vinculado à produção; não elegível ao Pronamp/Pronaf',
    cor: 'bg-amber-50 border-amber-300 text-amber-800',
    fonte: 'Plano Safra 2025/26 (subiu 2 p.p. vs. 24/25)' },
  // ── CUSTEIO RECURSOS LIVRES ──────────────────────────────────
  { id: 'custeio_livre', cat: 'Recursos Livres das IFs', nome: 'Custeio — Recursos Livres',
    taxa: 18.0, isento_iof: false, prazoMax: 24, limitePor: 'Conforme IF',
    finalidade: 'Custeio com recursos próprios dos bancos',
    elegibilidade: 'Qualquer produtor; IOF incide normalmente',
    cor: 'bg-orange-50 border-orange-300 text-orange-800',
    fonte: 'Selic + spread ~16–22% a.a. (estimativa mercado 2026)' },
  // ── MODERFROTA ───────────────────────────────────────────────
  { id: 'moderfrota', cat: 'Investimento', nome: 'Moderfrota — Máquinas e Implementos',
    taxa: 13.5, isento_iof: true, prazoMax: 120, limitePor: 'Variável por equipamento',
    finalidade: 'Colheitadeiras, tratores, plantadeiras, pulverizadores, implementos',
    elegibilidade: 'Produtores rurais e cooperativas; BNDES (repasse via bancos)',
    cor: 'bg-indigo-50 border-indigo-300 text-indigo-800',
    fonte: 'Plano Safra 2025/26 (+5 p.p. vs. 24/25; maior taxa histórica)' },
  // ── ABC+ / INOVAGRO ──────────────────────────────────────────
  { id: 'abc', cat: 'Investimento', nome: 'ABC+ / Inovagro — Tecnologia',
    taxa: 8.0, isento_iof: true, prazoMax: 180, limitePor: 'R$ 5 mi por produtor',
    finalidade: 'Baixo carbono, integração lavoura-pecuária, irrigação, precision farming',
    elegibilidade: 'Produtores rurais; BNDES ou MCR/BACEN',
    cor: 'bg-green-50 border-green-300 text-green-800',
    fonte: 'Plano Safra 2025/26' },
  // ── CPR ──────────────────────────────────────────────────────
  { id: 'cpr', cat: 'CPR', nome: 'CPR Financeira — Antecipação de Safra',
    taxa: 0, isento_iof: true, prazoMax: 60, limitePor: 'Conforme produção',
    finalidade: 'Antecipação de receita com produção futura como garantia',
    elegibilidade: 'Emissão por produtor; registrado em câmara (B3/Cerc)',
    cor: 'bg-purple-50 border-purple-300 text-purple-800',
    fonte: 'Isenta de IOF para MPMEs (Decreto 12.499/2025)' },
  // ── FCO RURAL ────────────────────────────────────────────────
  { id: 'fco_rural', cat: 'Fundos Constitucionais', nome: 'FCO Rural (Centro-Oeste)',
    taxa: 9.0, isento_iof: true, prazoMax: 120, limitePor: 'Variável por programa',
    finalidade: 'Investimento rural no Centro-Oeste; pequeno produtor com redução',
    elegibilidade: 'Produtor rural no Centro-Oeste; BB como agente',
    cor: 'bg-teal-50 border-teal-300 text-teal-800',
    fonte: 'FCO — Banco do Brasil (isento IOF)' },
]

type TipoTaxa = 'anual' | 'mensal'
type Periodicidade = 'mensal' | 'semestral' | 'anual'

function SimuladorAgro() {
  const [modal,         setModal]         = useState('pronamp')
  const [valor,         setValor]         = useState('1500000')
  const [taxa,          setTaxa]          = useState('')
  const [tipoTaxa,      setTipoTaxa]      = useState<TipoTaxa>('anual')
  const [prazo,         setPrazo]         = useState('24')
  const [carencia,      setCarencia]      = useState('6')
  const [periodicidade, setPeriodicidade] = useState<Periodicidade>('mensal')
  const [receita,       setReceita]       = useState('3000000')
  const [catFiltro,     setCatFiltro]     = useState('Todos')

  const modalInfo = MODALIDADES_AGRO.find(m => m.id === modal)!
  const taxaUsada = taxa !== '' ? Number(taxa) : modalInfo.taxa
  const principal = Number(valor.replace(/\D/g, '')) || 0
  const prazoNum  = Number(prazo) || 12
  const carenciaNum = Number(carencia) || 0
  const receitaA  = Number(receita.replace(/\D/g, '')) || 1

  const taxaEfAA = tipoTaxa === 'mensal' ? taxaMensalParaAnual(taxaUsada) : taxaUsada
  const taxaEfAM = taxaAnualParaMensal(taxaEfAA)

  const prazoAmortizacao = prazoNum - carenciaNum

  // Taxa e número de parcelas conforme periodicidade
  const fatores = periodicidade === 'mensal' ? 1 : periodicidade === 'semestral' ? 6 : 12
  const taxaPerPeriodo = Math.pow(1 + taxaEfAM / 100, fatores) - 1
  const nParcelas = prazoAmortizacao > 0 ? Math.max(1, Math.round(prazoAmortizacao / fatores)) : 0

  const r   = taxaPerPeriodo
  const pmt = nParcelas > 0
    ? (r > 0 ? principal * (r * Math.pow(1 + r, nParcelas)) / (Math.pow(1 + r, nParcelas) - 1) : principal / nParcelas)
    : 0
  const totalPago  = pmt * nParcelas
  const totalJuros = totalPago - principal
  // Normaliza para base anual: pmt / fatores = equivalente mensal × 12
  const pmtMensalEq = pmt / fatores
  const comprometimento = receitaA > 0 ? (pmtMensalEq * 12 / receitaA) * 100 : 0
  const ok = comprometimento <= 25

  const cats = ['Todos', ...Array.from(new Set(MODALIDADES_AGRO.map(m => m.cat)))]
  const filtradas = catFiltro === 'Todos' ? MODALIDADES_AGRO : MODALIDADES_AGRO.filter(m => m.cat === catFiltro)

  const inp = 'w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-200'
  const lbl = 'text-xs font-semibold text-gray-600 mb-1 block'

  return (
    <div className="space-y-5">
      {/* Filtro por categoria */}
      <div className="flex gap-2 flex-wrap">
        {cats.map(c => (
          <button key={c} onClick={() => setCatFiltro(c)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${catFiltro === c ? 'bg-af-green text-white border-af-green' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}>
            {c}
          </button>
        ))}
      </div>

      {/* Seleção de modalidade */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {filtradas.map(m => (
          <button key={m.id} onClick={() => { setModal(m.id); setTaxa('') }}
            className={`text-left p-3 rounded-xl border-2 transition-all ${modal === m.id ? 'border-af-green bg-af-green-pale' : 'border-gray-100 hover:border-gray-200 bg-gray-50'}`}>
            <div className="flex items-start justify-between mb-1">
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${m.cor}`}>{m.cat}</span>
              {m.isento_iof && <span className="text-xs text-emerald-600 font-medium">Isento IOF</span>}
            </div>
            <p className={`text-sm font-bold mt-1 ${modal === m.id ? 'text-af-green' : 'text-gray-800'}`}>{m.nome}</p>
            <p className="text-xs text-gray-500 mt-0.5">
              {m.taxa > 0 ? `${fmtPct(m.taxa, 1)} a.a.` : 'Preço de mercado'} · Até {m.prazoMax}m
            </p>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{m.limitePor}</p>
          </button>
        ))}
      </div>

      {/* Info da modalidade selecionada */}
      {modalInfo && (
        <div className={`p-4 rounded-xl border ${modalInfo.cor}`}>
          <div className="flex items-start gap-3">
            <Info size={16} className="shrink-0 mt-0.5" />
            <div className="text-xs space-y-1">
              <p><strong>Finalidade:</strong> {modalInfo.finalidade}</p>
              <p><strong>Elegibilidade:</strong> {modalInfo.elegibilidade}</p>
              <p className="opacity-70"><strong>Fonte:</strong> {modalInfo.fonte}</p>
            </div>
          </div>
        </div>
      )}

      {/* Parâmetros */}
      <Card className="p-5">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2"><Calculator size={16} /> Parâmetros</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div><label className={lbl}>Valor da Operação (R$)</label><input className={inp} value={valor} onChange={e => setValor(e.target.value)} /></div>
          <div><label className={lbl}>Prazo total (meses)</label><input type="number" className={inp} value={prazo} onChange={e => setPrazo(e.target.value)} /></div>
          <div><label className={lbl}>Carência (meses)</label><input type="number" className={inp} value={carencia} onChange={e => setCarencia(e.target.value)} /></div>
          <div className="col-span-2 md:col-span-3">
            <label className={lbl}>Periodicidade das Parcelas</label>
            <div className="flex gap-2">
              {(['mensal','semestral','anual'] as Periodicidade[]).map(p => (
                <button key={p} onClick={() => setPeriodicidade(p)}
                  className={`px-4 py-2 rounded-xl text-xs font-semibold border ${periodicidade === p ? 'bg-af-green text-white border-af-green' : 'bg-white border-gray-200 text-gray-600'}`}>
                  {p === 'mensal' ? 'Mensal' : p === 'semestral' ? 'Semestral' : 'Anual'}
                </button>
              ))}
              <span className="self-center text-xs text-gray-400 ml-1">
                {periodicidade !== 'mensal' && nParcelas > 0 && `→ ${nParcelas} parcela${nParcelas > 1 ? 's' : ''} ${periodicidade === 'semestral' ? 'semestrais' : 'anuais'}`}
              </span>
            </div>
          </div>
          <div>
            <label className={lbl}>Taxa (deixe em branco = padrão da linha)</label>
            <input type="number" step="0.1" className={inp} value={taxa} onChange={e => setTaxa(e.target.value)}
              placeholder={`Padrão: ${fmtPct(modalInfo?.taxa ?? 0, 1)}% a.a.`} />
          </div>
          <div>
            <label className={lbl}>Base da Taxa</label>
            <div className="flex gap-2">
              <button onClick={() => setTipoTaxa('anual')}  className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${tipoTaxa === 'anual' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>% a.a.</button>
              <button onClick={() => setTipoTaxa('mensal')} className={`flex-1 py-2 rounded-xl text-xs font-semibold border ${tipoTaxa === 'mensal' ? 'bg-gray-800 text-white border-gray-800' : 'bg-white border-gray-200 text-gray-600'}`}>% a.m.</button>
            </div>
          </div>
          <div><label className={lbl}>Receita Bruta Anual (R$)</label><input className={inp} value={receita} onChange={e => setReceita(e.target.value)} /></div>
        </div>
      </Card>

      {/* Resultado */}
      {principal > 0 && (
        <Card className="p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Resultado</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            {[
              { label: `Parcela ${periodicidade.charAt(0).toUpperCase() + periodicidade.slice(1)} (${nParcelas}x)`, value: fmtBRL(pmt), highlight: true },
              { label: 'Total Pago', value: fmtBRL(totalPago) },
              { label: 'Total de Juros', value: fmtBRL(totalJuros) },
              { label: 'Prazo amortização', value: `${prazoAmortizacao} meses` },
            ].map(k => (
              <div key={k.label} className={`p-3 rounded-xl ${k.highlight ? 'bg-af-green text-white' : 'bg-gray-50'}`}>
                <p className={`text-xs ${k.highlight ? 'text-white/70' : 'text-gray-500'}`}>{k.label}</p>
                <p className={`text-lg font-bold ${k.highlight ? 'text-white' : 'text-gray-900'}`}>{k.value}</p>
              </div>
            ))}
          </div>

          {/* IOF */}
          <div className={`p-3 rounded-xl border mb-4 ${modalInfo.isento_iof ? 'bg-emerald-50 border-emerald-200' : 'bg-amber-50 border-amber-200'}`}>
            <p className={`text-sm font-bold ${modalInfo.isento_iof ? 'text-emerald-800' : 'text-amber-800'}`}>
              {modalInfo.isento_iof ? '✅ Operação isenta de IOF' : '⚠️ IOF incide nesta operação'}
            </p>
            <p className={`text-xs mt-0.5 ${modalInfo.isento_iof ? 'text-emerald-600' : 'text-amber-700'}`}>
              {modalInfo.isento_iof
                ? 'Crédito rural com recursos controlados ou CPR — isenção prevista no Decreto 6.306/2007'
                : `IOF estimado: ${fmtBRL(principal * 0.000082 * Math.min(prazoNum * 30, 365) + principal * 0.0038)}`
              }
            </p>
          </div>

          {/* Taxas convertidas */}
          <div className="bg-gray-50 rounded-xl p-3 mb-4 grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
            <div><span className="text-gray-400">Taxa efetiva a.a.</span><br /><strong>{fmtPct(taxaEfAA, 3)}%</strong></div>
            <div><span className="text-gray-400">Taxa efetiva a.m.</span><br /><strong>{fmtPct(taxaEfAM, 4)}%</strong></div>
            <div><span className="text-gray-400">Comprometimento receita</span><br /><strong className={comprometimento > 25 ? 'text-red-600' : 'text-emerald-700'}>{fmtPct(comprometimento, 1)}% da receita anual</strong></div>
          </div>

          <div className={`flex items-center gap-2 p-3 rounded-xl text-sm ${ok ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700'}`}>
            {ok ? <CheckCircle size={15} /> : <AlertTriangle size={15} />}
            {ok
              ? `Comprometimento adequado: ${fmtPct(comprometimento, 1)} da receita anual — abaixo do limite recomendado de 25%`
              : `Atenção: parcelas anuais comprometem ${fmtPct(comprometimento, 1)} da receita — risco de pressão no caixa da safra`
            }
          </div>
        </Card>
      )}

      {/* Tabela comparativa de linhas */}
      <Card>
        <div className="px-4 py-3 border-b font-semibold text-sm text-gray-700">Comparativo das Linhas do Plano Safra 2025/26</div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 border-b">
                {['Modalidade','Categoria','Taxa (% a.a.)','IOF','Prazo máx.','Limite','Elegibilidade','Fonte'].map(h => (
                  <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {MODALIDADES_AGRO.map(m => (
                <tr key={m.id} className={`hover:bg-gray-50/50 cursor-pointer ${modal === m.id ? 'bg-af-green-pale' : ''}`}
                  onClick={() => { setModal(m.id); setTaxa(''); setCatFiltro('Todos') }}>
                  <td className="px-3 py-2.5 font-medium text-gray-900">{m.nome}</td>
                  <td className="px-3 py-2.5"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${m.cor}`}>{m.cat}</span></td>
                  <td className={`px-3 py-2.5 font-bold ${m.taxa <= 8 ? 'text-emerald-700' : m.taxa <= 12 ? 'text-amber-700' : 'text-red-600'}`}>
                    {m.taxa > 0 ? fmtPct(m.taxa, 1) : 'Mercado'}
                  </td>
                  <td className="px-3 py-2.5">{m.isento_iof ? <span className="text-emerald-600 font-medium">Isento</span> : <span className="text-amber-600">Incide</span>}</td>
                  <td className="px-3 py-2.5">{m.prazoMax}m</td>
                  <td className="px-3 py-2.5 text-gray-600">{m.limitePor}</td>
                  <td className="px-3 py-2.5 text-gray-500 max-w-xs truncate">{m.elegibilidade}</td>
                  <td className="px-3 py-2.5 text-gray-400 whitespace-nowrap">{m.fonte}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

export function CreditoAgro() {
  return (
    <AppLayout title="Crédito Rural" subtitle="MCR BACEN · Plano Safra 2025/26 · Pronaf · Pronamp · Moderfrota · CPR · IOF calculado">
      <div className="mb-5 flex items-center gap-3">
        <div className="p-2.5 bg-af-green-pale rounded-xl"><Sprout size={20} className="text-af-green" /></div>
        <div>
          <h2 className="font-bold text-gray-900">Estruturação de Crédito Rural</h2>
          <p className="text-xs text-gray-500">Linhas do Plano Safra 2025/26 conforme MCR BACEN — taxa mensal ou anual, IOF calculado, isenções aplicadas</p>
        </div>
      </div>
      <CreditoAgro_ />
    </AppLayout>
  )
}

function CreditoAgro_() { return <SimuladorAgro /> }
