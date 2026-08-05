import { useState, useEffect } from 'react'
import { Save, CheckCircle, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  pecStorage, ParametrosPecuaria, CustosPecuaria,
  CICLO_LABELS, PRACAS_MT, DEFAULT_PARAMS, DEFAULT_CUSTOS,
  calcularProjecao, ProjecaoAnoPec,
} from '../../services/pecuariaStorage'

const R = (n: number) => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 })
const N = (n: number, dec = 1) => n.toLocaleString('pt-BR', { minimumFractionDigits: dec, maximumFractionDigits: dec })

interface Props { clientId: string }

type Secao = 'ciclo' | 'zoot' | 'precos' | 'custos'

export function TabPecuariaProjecao({ clientId }: Props) {
  const [params, setParams] = useState<ParametrosPecuaria>({ ...DEFAULT_PARAMS })
  const [custos, setCustos] = useState<CustosPecuaria>({ ...DEFAULT_CUSTOS })
  const [projecao, setProjecao] = useState<ProjecaoAnoPec[]>([])
  const [salvo, setSalvo] = useState(false)
  const [secao, setSecao] = useState<Secao>('ciclo')

  useEffect(() => {
    setParams(pecStorage.getParams(clientId))
    setCustos(pecStorage.getCustos(clientId))
  }, [clientId])

  const rebanho = pecStorage.getRebanho(clientId)
  const manejo  = pecStorage.getManejo(clientId)

  useEffect(() => {
    if (rebanho.length > 0) {
      setProjecao(calcularProjecao(rebanho, params, custos, manejo, 5))
    }
  }, [params, custos, clientId])

  function salvar() {
    pecStorage.saveParams(clientId, params)
    pecStorage.saveCustos(clientId, custos)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  function setP<K extends keyof ParametrosPecuaria>(k: K, v: ParametrosPecuaria[K]) {
    setParams(p => ({ ...p, [k]: v }))
  }
  function setC<K extends keyof CustosPecuaria>(k: K, v: CustosPecuaria[K]) {
    setCustos(c => ({ ...c, [k]: v }))
  }

  const totalCab = rebanho.reduce((s, l) => s + l.quantidade, 0)

  const numInput = (label: string, val: number, onChange: (n: number) => void, opts?: { step?: number; suffix?: string; min?: number }) => (
    <div>
      <label className="text-xs text-gray-500 font-medium block mb-1">{label}{opts?.suffix ? ` (${opts.suffix})` : ''}</label>
      <input type="number" step={opts?.step ?? 1} min={opts?.min ?? 0} value={val}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
      />
    </div>
  )

  const SECOES: { id: Secao; label: string }[] = [
    { id: 'ciclo', label: 'Ciclo Produtivo' },
    { id: 'zoot',  label: 'Parâmetros Zootécnicos' },
    { id: 'precos', label: 'Preços (Scott Consultoria)' },
    { id: 'custos', label: 'Estrutura de Custos' },
  ]

  return (
    <div className="space-y-5">
      {rebanho.length === 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 text-sm text-amber-700">
          Cadastre o rebanho na aba <strong>Rebanho</strong> antes de gerar a projeção.
        </div>
      )}

      {/* Abas de seção */}
      <div className="flex gap-1 bg-gray-100 p-1 rounded-xl overflow-x-auto">
        {SECOES.map(s => (
          <button key={s.id} onClick={() => setSecao(s.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition ${secao === s.id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}>
            {s.label}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        {/* CICLO */}
        {secao === 'ciclo' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Ciclo Produtivo</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="text-xs text-gray-500 font-medium block mb-1">Tipo de Ciclo</label>
                <select value={params.ciclo}
                  onChange={e => setP('ciclo', e.target.value as ParametrosPecuaria['ciclo'])}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30">
                  {Object.entries(CICLO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Praça de Referência</label>
                <select value={params.praca}
                  onChange={e => setP('praca', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30">
                  {PRACAS_MT.map(p => <option key={p} value={p}>{p} — MT</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1">Data dos Preços</label>
                <input type="date" value={params.dataPrecos}
                  onChange={e => setP('dataPrecos', e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
                />
              </div>
            </div>
          </div>
        )}

        {/* ZOOTÉCNICO */}
        {secao === 'zoot' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Parâmetros Zootécnicos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {numInput('Taxa de Prenhez', params.taxaPrenhez, v => setP('taxaPrenhez', v), { suffix: '%', step: 1 })}
              {numInput('Taxa de Natalidade', params.taxaNatalidade, v => setP('taxaNatalidade', v), { suffix: '%', step: 1 })}
              {numInput('Mortalidade Bezerro', params.taxaMortalidadeBezerro, v => setP('taxaMortalidadeBezerro', v), { suffix: '%', step: 0.5 })}
              {numInput('Taxa de Desmame', params.taxaDesmame, v => setP('taxaDesmame', v), { suffix: '%', step: 1 })}
              {numInput('Idade ao Desmame', params.idadeDesmameMeses, v => setP('idadeDesmameMeses', v), { suffix: 'meses' })}
              {numInput('Peso ao Desmame', params.pesoDesmameKg, v => setP('pesoDesmameKg', v), { suffix: 'kg' })}
              {numInput('Peso ao Abate', params.pesoAbateKg, v => setP('pesoAbateKg', v), { suffix: 'kg' })}
              {numInput('Rendimento de Carcaça', params.rendimentoCarcaca, v => setP('rendimentoCarcaca', v), { suffix: '%', step: 0.5 })}
              {numInput('@s ao Abate', params.arrobasAbate, v => setP('arrobasAbate', v), { suffix: '@', step: 0.5 })}
              {numInput('Idade ao Abate', params.idadeAbateMeses, v => setP('idadeAbateMeses', v), { suffix: 'meses' })}
              {numInput('Descarte Anual', params.taxaDescarteAnual, v => setP('taxaDescarteAnual', v), { suffix: '%', step: 1 })}
              {numInput('GMD Engorda', params.ganhoMedioDiario, v => setP('ganhoMedioDiario', v), { suffix: 'kg/dia', step: 0.05 })}
              {numInput('Dias de Confinamento', params.diasConfinamento, v => setP('diasConfinamento', v), { suffix: 'dias' })}
            </div>
          </div>
        )}

        {/* PREÇOS */}
        {secao === 'precos' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Preços de Mercado — {params.praca}</h3>
            <p className="text-xs text-gray-400">Fonte: Scott Consultoria / Boletim Semanal. Atualize conforme boletim.</p>
            <div className="grid grid-cols-2 md:grid-cols-2 gap-4">
              {numInput('Boi Gordo', params.precoBoiGordoArroba, v => setP('precoBoiGordoArroba', v), { suffix: 'R$/@', step: 5 })}
              {numInput('Bezerro (desmamado)', params.precoBezerroCabeca, v => setP('precoBezerroCabeca', v), { suffix: 'R$/cab', step: 50 })}
              {numInput('Garrote (12-18m)', params.precoGarroteCabeca, v => setP('precoGarroteCabeca', v), { suffix: 'R$/cab', step: 50 })}
              {numInput('Vaca de Descarte', params.precoVacaDescarteCabeca, v => setP('precoVacaDescarteCabeca', v), { suffix: 'R$/cab', step: 50 })}
            </div>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-500 mt-2">
              <strong>Referência de mercado:</strong> O boi gordo em {params.praca} é consultado no boletim semanal Scott Consultoria.
              Acesse <em>www.scottconsultoria.com.br</em> para valores atualizados.
            </div>
          </div>
        )}

        {/* CUSTOS */}
        {secao === 'custos' && (
          <div className="space-y-4">
            <h3 className="text-sm font-bold text-gray-900">Estrutura de Custos</h3>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 mt-1">Sanidade (R$/cab/ano)</p>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {numInput('Vacinação Aftosa', custos.vacinacaoAftosaAnoCab, v => setC('vacinacaoAftosaAnoCab', v))}
                {numInput('Vacinação Brucela', custos.vacinacaoBrucelaAnoCab, v => setC('vacinacaoBrucelaAnoCab', v))}
                {numInput('Vermifugação', custos.vermifugacaoAnoCab, v => setC('vermifugacaoAnoCab', v))}
                {numInput('Outros Sanidade', custos.outrosSanidadeAnoCab, v => setC('outrosSanidadeAnoCab', v))}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 mt-1">Pastagem (R$/ha/ano)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {numInput('Manutenção/ha', custos.manutencaoPastagemHaAno, v => setC('manutencaoPastagemHaAno', v), { step: 10 })}
                {numInput('Reforma/ha (custo)', custos.reformaPastagemHa, v => setC('reformaPastagemHa', v), { step: 50 })}
                {numInput('% reforma/ano', custos.percentualReformaAno, v => setC('percentualReformaAno', v), { suffix: '%', step: 1 })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 mt-1">Mão de Obra</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {numInput('Nº Funcionários', custos.numFuncionarios, v => setC('numFuncionarios', v))}
                {numInput('Salário Médio/mês', custos.salarioMedioMensal, v => setC('salarioMedioMensal', v), { step: 100 })}
                {numInput('Encargos', custos.encargosPct, v => setC('encargosPct', v), { suffix: '%', step: 1 })}
              </div>
            </div>
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2 mt-1">Despesas Operacionais (R$/mês)</p>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {numInput('Combustível', custos.combustivelMensal, v => setC('combustivelMensal', v), { step: 50 })}
                {numInput('Manutenção Equipamentos', custos.manutencaoEquipMensal, v => setC('manutencaoEquipMensal', v), { step: 50 })}
                {numInput('Outros', custos.outrosMensal, v => setC('outrosMensal', v), { step: 50 })}
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end">
        <button onClick={salvar}
          className="flex items-center gap-2 bg-af-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-af-green/90 transition">
          {salvo ? <><CheckCircle size={16}/> Salvo!</> : <><Save size={16}/> Salvar e Calcular</>}
        </button>
      </div>

      {/* Projeção */}
      {projecao.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3 border-b border-gray-100">
            <h3 className="text-sm font-bold text-gray-900">Projeção 5 Anos — {CICLO_LABELS[params.ciclo]}</h3>
            <p className="text-xs text-gray-400 mt-0.5">Rebanho base: {totalCab.toLocaleString('pt-BR')} cab • Praça: {params.praca}</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-xs text-gray-500 bg-gray-50 border-b border-gray-100">
                  <th className="text-left px-4 py-2.5 font-medium">Ano</th>
                  <th className="text-right px-4 py-2.5 font-medium">Rebanho</th>
                  <th className="text-right px-4 py-2.5 font-medium">Nascim.</th>
                  <th className="text-right px-4 py-2.5 font-medium">Abates</th>
                  <th className="text-right px-4 py-2.5 font-medium">Desfrute</th>
                  <th className="text-right px-4 py-2.5 font-medium">Rec. Bruta</th>
                  <th className="text-right px-4 py-2.5 font-medium">Custo Total</th>
                  <th className="text-right px-4 py-2.5 font-medium">Resultado</th>
                  <th className="text-right px-4 py-2.5 font-medium">Sit.</th>
                </tr>
              </thead>
              <tbody>
                {projecao.map(p => {
                  const pos = p.resultadoLiquido >= 0
                  return (
                    <tr key={p.ano} className="border-b border-gray-50 hover:bg-gray-50">
                      <td className="px-4 py-2.5 font-semibold text-gray-800">{p.ano}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.rebanhoTotal.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.nascimentos.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right font-mono">{p.abates.toLocaleString('pt-BR')}</td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{N(p.taxaDesfrute)}%</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">{R(p.receitaBruta)}</td>
                      <td className="px-4 py-2.5 text-right font-mono text-gray-700">{R(p.custoTotal)}</td>
                      <td className={`px-4 py-2.5 text-right font-mono font-semibold ${pos ? 'text-green-600' : 'text-red-600'}`}>
                        {R(p.resultadoLiquido)}
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        {pos ? <TrendingUp size={14} className="text-green-500 inline" /> : <TrendingDown size={14} className="text-red-500 inline" />}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-0 border-t border-gray-100">
            {[
              { label: 'Rec. Bruta Total 5a', val: R(projecao.reduce((s,p)=>s+p.receitaBruta,0)) },
              { label: 'Resultado Total 5a',  val: R(projecao.reduce((s,p)=>s+p.resultadoLiquido,0)) },
              { label: 'Taxa Desfrute Média', val: N(projecao.reduce((s,p)=>s+p.taxaDesfrute,0)/projecao.length) + '%' },
              { label: 'Abates Totais 5a',    val: projecao.reduce((s,p)=>s+p.abates,0).toLocaleString('pt-BR') + ' cab' },
            ].map(k => (
              <div key={k.label} className="px-4 py-3 border-r border-gray-100 last:border-r-0">
                <p className="text-xs text-gray-400">{k.label}</p>
                <p className="text-sm font-bold text-gray-900 mt-0.5">{k.val}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
