import { useState, useEffect } from 'react'
import { Save, AlertTriangle, CheckCircle, Info } from 'lucide-react'
import {
  pecStorage, ManejoForrageiro, SuplementoItem,
  FORRAGEIRAS, SISTEMA_LABELS, ESTADO_PASTO_LABELS,
  calcCapacidade, calcUA, DEFAULT_MANEJO,
} from '../../services/pecuariaStorage'

const MESES = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']
const fmt1 = (n: number) => n.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })

interface Props { clientId: string }

export function TabPecuariaManejo({ clientId }: Props) {
  const [manejo, setManejo] = useState<ManejoForrageiro>({ ...DEFAULT_MANEJO })
  const [salvo, setSalvo] = useState(false)

  useEffect(() => { setManejo(pecStorage.getManejo(clientId)) }, [clientId])

  const rebanho = pecStorage.getRebanho(clientId)
  const uaAtual = calcUA(rebanho)
  const cap = calcCapacidade(manejo)

  function salvar() {
    pecStorage.saveManejo(clientId, manejo)
    setSalvo(true)
    setTimeout(() => setSalvo(false), 2000)
  }

  function setF<K extends keyof ManejoForrageiro>(k: K, v: ManejoForrageiro[K]) {
    setManejo(m => ({ ...m, [k]: v }))
  }

  function addSuplem() {
    const s: SuplementoItem = {
      id: crypto.randomUUID(), tipo: 'mineral',
      consumoGDiaCab: 50, custoKg: 4, mesesAplicacao: [0,1,2,3,4,5,6,7,8,9,10,11],
    }
    setF('suplementos', [...manejo.suplementos, s])
  }

  function updSuplem(id: string, patch: Partial<SuplementoItem>) {
    setF('suplementos', manejo.suplementos.map(s => s.id === id ? { ...s, ...patch } : s))
  }

  function remSuplem(id: string) {
    setF('suplementos', manejo.suplementos.filter(s => s.id !== id))
  }

  function toggleMes(supId: string, mes: number) {
    const sup = manejo.suplementos.find(s => s.id === supId)!
    const meses = sup.mesesAplicacao.includes(mes)
      ? sup.mesesAplicacao.filter(m => m !== mes)
      : [...sup.mesesAplicacao, mes]
    updSuplem(supId, { mesesAplicacao: meses })
  }

  const statusChuva = uaAtual === 0 ? 'sem_rebanho' : uaAtual > cap.chuva * 1.1 ? 'sobrecarregado' : uaAtual > cap.chuva ? 'atenção' : 'ok'
  const statusSeca  = uaAtual === 0 ? 'sem_rebanho' : uaAtual > cap.seca  * 1.1 ? 'sobrecarregado' : uaAtual > cap.seca  ? 'atenção' : 'ok'

  const statusColor = (s: string) => s === 'ok' ? 'text-green-600 bg-green-50 border-green-200'
    : s === 'atenção' ? 'text-amber-600 bg-amber-50 border-amber-200'
    : s === 'sobrecarregado' ? 'text-red-600 bg-red-50 border-red-200'
    : 'text-gray-500 bg-gray-50 border-gray-200'

  const forra = FORRAGEIRAS.find(f => f.value === manejo.forrageira)

  return (
    <div className="space-y-5">
      {/* Capacidade atual */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <p className="text-xs text-gray-500 font-medium">UA do Rebanho Atual</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{fmt1(uaAtual)} UA</p>
          <p className="text-xs text-gray-400">{rebanho.reduce((s,l)=>s+l.quantidade,0).toLocaleString('pt-BR')} cabeças cadastradas</p>
        </div>
        <div className={`rounded-2xl border p-4 ${statusColor(statusChuva)}`}>
          <p className="text-xs font-medium opacity-70">Capacidade — Chuva</p>
          <p className="text-2xl font-bold mt-1">{fmt1(cap.chuva)} UA</p>
          <p className="text-xs opacity-70 capitalize">{statusChuva === 'ok' ? 'Dentro da capacidade' : statusChuva === 'atenção' ? 'Próximo do limite' : statusChuva === 'sobrecarregado' ? 'SOBRECARGA — reduzir lotação' : 'Cadastre o rebanho'}</p>
        </div>
        <div className={`rounded-2xl border p-4 ${statusColor(statusSeca)}`}>
          <p className="text-xs font-medium opacity-70">Capacidade — Seca</p>
          <p className="text-2xl font-bold mt-1">{fmt1(cap.seca)} UA</p>
          <p className="text-xs opacity-70 capitalize">{statusSeca === 'ok' ? 'Dentro da capacidade' : statusSeca === 'atenção' ? 'Próximo do limite' : statusSeca === 'sobrecarregado' ? 'SOBRECARGA — reduzir lotação' : 'Cadastre o rebanho'}</p>
        </div>
      </div>

      {/* Configuração de manejo */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <h3 className="text-sm font-bold text-gray-900 mb-4">Sistema de Manejo</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="md:col-span-2">
            <label className="text-xs text-gray-500 font-medium block mb-1">Sistema Adotado</label>
            <select value={manejo.sistema}
              onChange={e => setF('sistema', e.target.value as ManejoForrageiro['sistema'])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30">
              {Object.entries(SISTEMA_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Área Total de Pastagem (ha)</label>
            <input type="number" min={0} value={manejo.areaTotal || ''}
              onChange={e => setF('areaTotal', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Forrageira Principal</label>
            <select value={manejo.forrageira}
              onChange={e => {
                const f = FORRAGEIRAS.find(ff => ff.value === e.target.value)
                setManejo(m => ({ ...m, forrageira: e.target.value, lotacaoReferencia: f?.lotacao ?? m.lotacaoReferencia }))
              }}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30">
              {FORRAGEIRAS.map(f => <option key={f.value} value={f.value}>{f.label}</option>)}
            </select>
            {forra && <p className="text-xs text-gray-400 mt-1">Referência: {forra.lotacao} UA/ha (chuva)</p>}
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Lotação Referência (UA/ha — chuva)</label>
            <input type="number" step="0.1" min={0.1} value={manejo.lotacaoReferencia}
              onChange={e => setF('lotacaoReferencia', Number(e.target.value))}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
            />
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Fator de Redução — Seca (%)</label>
            <input type="number" step="5" min={10} max={100} value={Math.round(manejo.fatorSeca * 100)}
              onChange={e => setF('fatorSeca', Number(e.target.value) / 100)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
            />
            <p className="text-xs text-gray-400 mt-1">Seca = chuva × {Math.round(manejo.fatorSeca * 100)}%</p>
          </div>
          <div>
            <label className="text-xs text-gray-500 font-medium block mb-1">Estado Atual do Pasto</label>
            <select value={manejo.estadoPasto}
              onChange={e => setF('estadoPasto', e.target.value as ManejoForrageiro['estadoPasto'])}
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30">
              {Object.entries(ESTADO_PASTO_LABELS).map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <p className="text-xs text-gray-400 mt-1">
              Fator: {manejo.estadoPasto === 'otimo' ? '100%' : manejo.estadoPasto === 'bom' ? '85%' : manejo.estadoPasto === 'degradado' ? '60%' : '40%'}
            </p>
          </div>
        </div>

        {/* Rotação */}
        {manejo.sistema === 'rotacionado' && (
          <div className="mt-5 pt-4 border-t border-gray-100">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Parâmetros de Rotação</h4>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {([
                ['numeroPiquetes', 'Nº de Piquetes', 1],
                ['areaPorPiquete', 'Área por Piquete (ha)', 0.1],
                ['diasOcupacaoChuva', 'Dias Ocupação — Chuva', 1],
                ['diasOcupacaoSeca', 'Dias Ocupação — Seca', 1],
                ['diasDescansoChuva', 'Dias Descanso — Chuva', 1],
                ['diasDescansoSeca', 'Dias Descanso — Seca', 1],
              ] as [keyof NonNullable<ManejoForrageiro['rotacao']>, string, number][]).map(([k, label, step]) => (
                <div key={k}>
                  <label className="text-xs text-gray-500 font-medium block mb-1">{label}</label>
                  <input type="number" step={step} min={0}
                    value={manejo.rotacao?.[k] ?? 0}
                    onChange={e => setManejo(m => ({ ...m, rotacao: { ...(m.rotacao ?? { numeroPiquetes:0,areaPorPiquete:0,diasOcupacaoChuva:0,diasOcupacaoSeca:0,diasDescansoChuva:0,diasDescansoSeca:0 }), [k]: Number(e.target.value) } }))}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-af-green/30"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Suplementação */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-gray-900">Suplementação / Trato</h3>
          <button onClick={addSuplem}
            className="text-xs bg-af-green text-white px-3 py-1.5 rounded-lg hover:bg-af-green/90 transition font-semibold">
            + Adicionar
          </button>
        </div>
        {manejo.suplementos.length === 0 && (
          <p className="text-xs text-gray-400 py-4 text-center">Nenhum suplemento cadastrado</p>
        )}
        {manejo.suplementos.map(s => {
          const custoMes = s.mesesAplicacao.length > 0
            ? (rebanho.reduce((acc,l)=>acc+l.quantidade,0) * (s.consumoGDiaCab / 1000) * 30 * s.custoKg).toFixed(0)
            : '0'
          return (
            <div key={s.id} className="border border-gray-100 rounded-xl p-4 mb-3">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Tipo</label>
                  <select value={s.tipo} onChange={e => updSuplem(s.id, { tipo: e.target.value as SuplementoItem['tipo'] })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none">
                    <option value="mineral">Mineral</option>
                    <option value="proteinado">Proteinado</option>
                    <option value="energetico">Energético</option>
                    <option value="racao">Ração</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Consumo (g/dia/cab)</label>
                  <input type="number" value={s.consumoGDiaCab}
                    onChange={e => updSuplem(s.id, { consumoGDiaCab: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                </div>
                <div>
                  <label className="text-xs text-gray-500 font-medium block mb-1">Custo (R$/kg)</label>
                  <input type="number" step="0.1" value={s.custoKg}
                    onChange={e => updSuplem(s.id, { custoKg: Number(e.target.value) })}
                    className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-xs focus:outline-none" />
                </div>
                <div className="flex items-end">
                  <div className="flex-1">
                    <p className="text-xs text-gray-400">Custo/mês estimado</p>
                    <p className="text-sm font-bold text-af-green">
                      {Number(custoMes).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                    </p>
                  </div>
                  <button onClick={() => remSuplem(s.id)} className="p-1.5 text-gray-300 hover:text-red-400 transition ml-2">✕</button>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-500 font-medium block mb-1.5">Meses de aplicação</label>
                <div className="flex gap-1 flex-wrap">
                  {MESES.map((m, i) => (
                    <button key={i} onClick={() => toggleMes(s.id, i)}
                      className={`px-2 py-1 rounded-lg text-xs font-semibold transition ${s.mesesAplicacao.includes(i) ? 'bg-af-green text-white' : 'bg-gray-100 text-gray-500'}`}>
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* Info UA */}
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 flex gap-3">
        <Info size={16} className="text-blue-400 mt-0.5 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>UA (Unidade Animal)</strong> = animal de 450 kg. A lotação é calculada pela forrageira, estado do pasto e fator de redução na seca.
          Um pasto degradado tem capacidade reduzida em até 60%. O fator de seca padrão para MT/MS é 50%.
        </p>
      </div>

      <div className="flex justify-end">
        <button onClick={salvar}
          className="flex items-center gap-2 bg-af-green text-white px-5 py-2.5 rounded-xl text-sm font-semibold hover:bg-af-green/90 transition">
          {salvo ? <><CheckCircle size={16} /> Salvo!</> : <><Save size={16} /> Salvar Manejo</>}
        </button>
      </div>
    </div>
  )
}
