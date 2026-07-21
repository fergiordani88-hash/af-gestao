import { useState, useRef } from 'react'
import { Upload, FileText, CheckSquare, Square, AlertCircle, CheckCircle2, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { agroApi } from '../../services/agroApi'
import { Card } from '../../components/ui/Card'

const fmtBRL = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', minimumFractionDigits: 0, maximumFractionDigits: 0 })

interface PatrimonioItem {
  categoria: string; descricao: string; identificacao?: string
  valorAvaliado: number; possuiOnus: boolean; tipoOnus?: string
  credor?: string; valorOnus?: number; obs?: string
  _sel: boolean
}
interface ProducaoItem {
  safra: string; cultura: string; area: number; produtividade: number
  cotacao: number; custoPorHa: number; areaArrendada: number; custoArrendHa: number
  _sel: boolean
}
interface ParseResult {
  nomeProdutor?: string; cpf?: string; cidade?: string; estado?: string; telefone?: string
  patrimonio: PatrimonioItem[]
  producao: ProducaoItem[]
}

const CAT_COLORS: Record<string, string> = {
  'Máquinas': 'bg-blue-50 text-blue-700 border-blue-200',
  'Equipamentos': 'bg-cyan-50 text-cyan-700 border-cyan-200',
  'Veículos': 'bg-purple-50 text-purple-700 border-purple-200',
  'Imóveis rurais': 'bg-green-50 text-green-700 border-green-200',
  'Imóveis urbanos': 'bg-amber-50 text-amber-700 border-amber-200',
  'Outros': 'bg-gray-50 text-gray-700 border-gray-200',
}

export function TabImportacao({ clientId }: { clientId: string }) {
  const [step, setStep] = useState<'upload' | 'preview' | 'done'>('upload')
  const [loading, setLoading] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const [result, setResult] = useState<ParseResult | null>(null)
  const [doneResult, setDoneResult] = useState<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [fileName, setFileName] = useState<string | null>(null)
  const [openSection, setOpenSection] = useState<'patrimonio' | 'producao' | null>('patrimonio')
  const fileRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File) => {
    setFileName(file.name)
    setError(null)
    setLoading(true)
    try {
      const form = new FormData()
      form.append('pdf', file)
      const res = await agroApi.cadastroImport.preview(form)
      const data: ParseResult = {
        ...res,
        patrimonio: (res.patrimonio ?? []).map((p: any) => ({ ...p, _sel: true })),
        producao:   (res.producao   ?? []).map((p: any) => ({ ...p, _sel: true })),
      }
      setResult(data)
      setStep('preview')
    } catch (e: any) {
      setError(e.message ?? 'Erro ao processar PDF')
    } finally {
      setLoading(false)
    }
  }

  const togglePat = (i: number) => setResult(r => {
    if (!r) return r
    const patrimonio = [...r.patrimonio]
    patrimonio[i] = { ...patrimonio[i], _sel: !patrimonio[i]._sel }
    return { ...r, patrimonio }
  })

  const toggleProd = (i: number) => setResult(r => {
    if (!r) return r
    const producao = [...r.producao]
    producao[i] = { ...producao[i], _sel: !producao[i]._sel }
    return { ...r, producao }
  })

  const toggleAllPat  = (v: boolean) => setResult(r => r ? ({ ...r, patrimonio: r.patrimonio.map(p => ({ ...p, _sel: v })) }) : r)
  const toggleAllProd = (v: boolean) => setResult(r => r ? ({ ...r, producao:   r.producao.map(p => ({ ...p, _sel: v })) }) : r)

  const handleConfirm = async () => {
    if (!result) return
    setConfirming(true)
    try {
      const patrimonio = result.patrimonio.filter(p => p._sel).map(({ _sel, ...p }) => p)
      const producao   = result.producao.filter(p => p._sel).map(({ _sel, ...p }) => p)
      const res = await agroApi.cadastroImport.confirm({ clientId, patrimonio, producao })
      setDoneResult(res)
      setStep('done')
    } catch (e: any) {
      setError(e.message ?? 'Erro ao confirmar importação')
    } finally {
      setConfirming(false)
    }
  }

  if (step === 'done' && doneResult) {
    return (
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <CheckCircle2 size={56} className="text-emerald-500" />
        <h2 className="text-xl font-bold text-gray-900">Importação concluída!</h2>
        <div className="grid grid-cols-2 gap-4 mt-4">
          {[
            { label: 'Bens patrimoniais importados', value: doneResult.patrimonioImportado, ok: true },
            { label: 'Registros de produção importados', value: doneResult.producaoImportada, ok: true },
            { label: 'Erros patrimônio', value: doneResult.patrimonioErros, ok: false },
            { label: 'Erros produção', value: doneResult.producaoErros, ok: false },
          ].map(k => (
            <div key={k.label} className={`border rounded-xl p-4 text-center ${k.ok ? 'bg-emerald-50 border-emerald-200' : k.value > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className="text-2xl font-bold text-gray-900">{k.value}</p>
              <p className="text-xs text-gray-500 mt-1">{k.label}</p>
            </div>
          ))}
        </div>
        <p className="text-sm text-gray-500 mt-4">Acesse as abas Patrimônio e Produção para verificar os dados importados.</p>
        <button onClick={() => { setStep('upload'); setResult(null); setDoneResult(null); setFileName(null) }}
          className="mt-2 px-5 py-2 bg-af-green text-white rounded-xl text-sm font-semibold hover:bg-af-green/90">
          Nova importação
        </button>
      </div>
    )
  }

  if (step === 'preview' && result) {
    const selPat  = result.patrimonio.filter(p => p._sel).length
    const selProd = result.producao.filter(p => p._sel).length
    const allPat  = result.patrimonio.every(p => p._sel)
    const allProd = result.producao.every(p => p._sel)

    const patPorCat = Array.from(new Set(result.patrimonio.map(p => p.categoria)))

    return (
      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h2 className="font-bold text-gray-900">Prévia da Importação</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Arquivo: <span className="font-medium">{fileName}</span>
              {result.nomeProdutor && <> · Produtor: <span className="font-medium">{result.nomeProdutor}</span></>}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => { setStep('upload'); setResult(null); setFileName(null) }}
              className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-600 hover:bg-gray-50">
              Cancelar
            </button>
            <button onClick={handleConfirm} disabled={confirming || (selPat + selProd === 0)}
              className="flex items-center gap-2 bg-af-green hover:bg-af-green/90 disabled:opacity-50 text-white text-sm font-semibold rounded-xl px-5 py-2">
              {confirming ? <><Loader2 size={14} className="animate-spin" /> Importando...</> : `Importar selecionados (${selPat + selProd})`}
            </button>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
            <AlertCircle size={16} /> {error}
          </div>
        )}

        {/* Resumo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Bens patrimoniais', value: result.patrimonio.length, sel: selPat, color: 'text-orange-700 bg-orange-50 border-orange-200' },
            { label: 'Registros produção', value: result.producao.length, sel: selProd, color: 'text-emerald-700 bg-emerald-50 border-emerald-200' },
          ].map(k => (
            <div key={k.label} className={`border rounded-xl p-4 ${k.color}`}>
              <p className="text-xs text-gray-500 mb-1">{k.label} encontrados</p>
              <p className="text-2xl font-bold">{k.value}</p>
              <p className="text-xs mt-1">{k.sel} selecionados para importar</p>
            </div>
          ))}
          {result.nomeProdutor && (
            <div className="col-span-2 border rounded-xl p-4 bg-blue-50 border-blue-200">
              <p className="text-xs text-gray-500 mb-1">Produtor identificado</p>
              <p className="text-sm font-bold text-blue-800">{result.nomeProdutor}</p>
              {result.cidade && <p className="text-xs text-blue-600">{result.cidade}/{result.estado} · CPF: {result.cpf}</p>}
            </div>
          )}
        </div>

        {/* Patrimônio */}
        {result.patrimonio.length > 0 && (
          <Card>
            <button onClick={() => setOpenSection(openSection === 'patrimonio' ? null : 'patrimonio')}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">Patrimônio</span>
                <span className="text-xs bg-orange-100 text-orange-700 rounded-full px-2 py-0.5">{result.patrimonio.length} itens</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{selPat} selecionados</span>
                <button onClick={e => { e.stopPropagation(); toggleAllPat(!allPat) }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2 py-1">
                  {allPat ? <CheckSquare size={12} /> : <Square size={12} />} {allPat ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                {openSection === 'patrimonio' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
            {openSection === 'patrimonio' && (
              <div className="divide-y divide-gray-50">
                {patPorCat.map(cat => (
                  <div key={cat}>
                    <div className="px-4 py-2 bg-gray-50 text-xs font-bold text-gray-500 uppercase">{cat}</div>
                    {result.patrimonio.filter(p => p.categoria === cat).map((p, idx) => {
                      const globalIdx = result.patrimonio.indexOf(p)
                      return (
                        <div key={idx} className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50/50 ${!p._sel ? 'opacity-50' : ''}`}>
                          <button onClick={() => togglePat(globalIdx)} className="mt-0.5 shrink-0">
                            {p._sel ? <CheckSquare size={16} className="text-af-green" /> : <Square size={16} className="text-gray-400" />}
                          </button>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-medium text-sm text-gray-900">{p.descricao}</span>
                              <span className={`text-xs px-1.5 py-0.5 rounded border ${CAT_COLORS[p.categoria] ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>{p.categoria}</span>
                              {p.possuiOnus && <span className="text-xs px-1.5 py-0.5 rounded border bg-red-50 text-red-700 border-red-200">Alienado</span>}
                            </div>
                            <div className="flex gap-4 mt-1 text-xs text-gray-500 flex-wrap">
                              {p.identificacao && <span>{p.identificacao}</span>}
                              {p.obs && <span>{p.obs}</span>}
                              {p.possuiOnus && p.valorOnus && <span className="text-red-500">Ônus: {fmtBRL(p.valorOnus)}</span>}
                            </div>
                          </div>
                          <span className="font-bold text-gray-900 text-sm shrink-0">{fmtBRL(p.valorAvaliado)}</span>
                        </div>
                      )
                    })}
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}

        {/* Produção */}
        {result.producao.length > 0 && (
          <Card>
            <button onClick={() => setOpenSection(openSection === 'producao' ? null : 'producao')}
              className="w-full flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50/50">
              <div className="flex items-center gap-3">
                <span className="font-semibold text-gray-900">Produção / Renda</span>
                <span className="text-xs bg-emerald-100 text-emerald-700 rounded-full px-2 py-0.5">{result.producao.length} safras</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-gray-500">{selProd} selecionados</span>
                <button onClick={e => { e.stopPropagation(); toggleAllProd(!allProd) }}
                  className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 border border-blue-200 rounded-lg px-2 py-1">
                  {allProd ? <CheckSquare size={12} /> : <Square size={12} />} {allProd ? 'Desmarcar todos' : 'Selecionar todos'}
                </button>
                {openSection === 'producao' ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
              </div>
            </button>
            {openSection === 'producao' && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-50 border-b">
                    <tr>
                      <th className="px-3 py-2 w-8"></th>
                      {['Safra', 'Cultura', 'Área (ha)', 'Produt. (sc/ha)', 'Cotação (R$/sc)', 'Custo/ha', 'Área Arrend.', 'Custo Arrend/ha'].map(h => (
                        <th key={h} className="px-3 py-2 text-left font-semibold text-gray-500 uppercase whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {result.producao.map((p, i) => (
                      <tr key={i} className={`hover:bg-gray-50/50 ${!p._sel ? 'opacity-50' : ''}`}>
                        <td className="px-3 py-2.5">
                          <button onClick={() => toggleProd(i)}>
                            {p._sel ? <CheckSquare size={14} className="text-af-green" /> : <Square size={14} className="text-gray-400" />}
                          </button>
                        </td>
                        <td className="px-3 py-2.5 font-medium text-gray-900">{p.safra}</td>
                        <td className="px-3 py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${p.cultura === 'Soja' ? 'bg-yellow-100 text-yellow-800' : 'bg-orange-100 text-orange-800'}`}>{p.cultura}</span>
                        </td>
                        <td className="px-3 py-2.5">{p.area.toLocaleString('pt-BR', { maximumFractionDigits: 2 })}</td>
                        <td className="px-3 py-2.5 text-emerald-700 font-semibold">{p.produtividade.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}</td>
                        <td className="px-3 py-2.5">{fmtBRL(p.cotacao)}</td>
                        <td className="px-3 py-2.5 text-red-600">{fmtBRL(p.custoPorHa)}</td>
                        <td className="px-3 py-2.5">{p.areaArrendada > 0 ? p.areaArrendada.toLocaleString('pt-BR') : '—'}</td>
                        <td className="px-3 py-2.5">{p.custoArrendHa > 0 ? fmtBRL(p.custoArrendHa) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        )}
      </div>
    )
  }

  // Step: upload
  return (
    <div className="space-y-5">
      <div>
        <h2 className="font-bold text-gray-900">Importar Cadastro Bancário</h2>
        <p className="text-xs text-gray-500 mt-0.5">Faça upload de um PDF de cadastro (Sicredi, Banco do Brasil, etc.) para pré-preencher patrimônio e produção automaticamente com IA</p>
      </div>

      <div
        onClick={() => fileRef.current?.click()}
        onDragOver={e => e.preventDefault()}
        onDrop={e => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
        className="border-2 border-dashed border-gray-300 rounded-2xl p-16 flex flex-col items-center justify-center cursor-pointer hover:border-af-green hover:bg-af-green/5 transition-colors group"
      >
        {loading ? (
          <>
            <Loader2 size={40} className="text-af-green animate-spin mb-4" />
            <p className="font-semibold text-gray-700">Processando PDF com IA...</p>
            <p className="text-sm text-gray-400 mt-1">Isso pode levar alguns segundos</p>
          </>
        ) : (
          <>
            <Upload size={40} className="text-gray-300 group-hover:text-af-green mb-4 transition-colors" />
            <p className="font-semibold text-gray-700">Arraste o PDF aqui ou clique para selecionar</p>
            <p className="text-sm text-gray-400 mt-1">Formatos aceitos: PDF · Tamanho máximo: 20 MB</p>
          </>
        )}
      </div>

      <input ref={fileRef} type="file" accept=".pdf" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f) }} />

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 flex items-center gap-2 text-red-700 text-sm">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <Card className="p-5">
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <FileText size={16} className="text-af-green" /> O que será importado automaticamente
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
          <div>
            <p className="font-semibold text-gray-800 mb-2">🏗️ Patrimônio</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Imóveis rurais (fazendas, sítios, chácaras)</li>
              <li>✅ Benfeitorias (aviários, barracões, casas, poços)</li>
              <li>✅ Máquinas (tratores, colheitadeiras, plantadeiras)</li>
              <li>✅ Equipamentos (plataformas, distribuidores, pulverizadores)</li>
              <li>✅ Veículos (caminhões, automóveis, semi-reboques)</li>
              <li>✅ Status de ônus / alienação identificado automaticamente</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-800 mb-2">🌾 Produção</p>
            <ul className="space-y-1 text-xs">
              <li>✅ Área plantada por cultura e safra</li>
              <li>✅ Produtividade (sc/ha)</li>
              <li>✅ Cotação (R$/sc)</li>
              <li>✅ Custo de produção por hectare</li>
              <li>✅ Renda efetiva e renda prevista</li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-4 border-t pt-3">
          Compatível com: Sicredi · Banco do Brasil · Bradesco Agro · outros cadastros bancários rurais
        </p>
      </Card>
    </div>
  )
}
