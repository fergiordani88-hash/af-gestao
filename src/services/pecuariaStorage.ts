// ── Tipos ────────────────────────────────────────────────────────────────────

export type CategoriaAnimal =
  | 'bezerro_m' | 'bezerro_f'
  | 'desmamado_m' | 'desmamado_f'
  | 'garrote' | 'novilha_recria'
  | 'boi_engorda' | 'boi_gordo'
  | 'novilha_reposicao'
  | 'vaca_prenha' | 'vaca_seca' | 'vaca_descarte'
  | 'touro'

export type SistemaManejo = 'extensivo' | 'suplementado' | 'rotacionado' | 'semiconfinamento' | 'confinamento'
export type TipoCiclo = 'cria' | 'recria' | 'engorda' | 'confinamento' | 'cria_recria' | 'recria_engorda' | 'cria_recria_engorda'

export interface LoteRebanho {
  id: string
  categoria: CategoriaAnimal
  quantidade: number
  idadeMediaMeses: number
  pesoMedioKg: number
  raca?: string
  obs?: string
}

export interface RotacaoConfig {
  numeroPiquetes: number
  areaPorPiquete: number
  diasOcupacaoChuva: number
  diasOcupacaoSeca: number
  diasDescansoChuva: number
  diasDescansoSeca: number
}

export interface SuplementoItem {
  id: string
  tipo: 'mineral' | 'proteinado' | 'energetico' | 'racao'
  consumoGDiaCab: number
  custoKg: number
  mesesAplicacao: number[]
}

export interface ManejoForrageiro {
  sistema: SistemaManejo
  areaTotal: number
  forrageira: string
  lotacaoReferencia: number
  fatorSeca: number
  estadoPasto: 'otimo' | 'bom' | 'degradado' | 'muito_degradado'
  rotacao?: RotacaoConfig
  suplementos: SuplementoItem[]
  silagem?: number
}

export interface ParametrosPecuaria {
  ciclo: TipoCiclo
  taxaPrenhez: number
  taxaNatalidade: number
  taxaMortalidadeBezerro: number
  taxaDesmame: number
  idadeDesmameMeses: number
  pesoDesmameKg: number
  pesoAbateKg: number
  rendimentoCarcaca: number
  arrobasAbate: number
  idadeAbateMeses: number
  taxaDescarteAnual: number
  diasConfinamento: number
  ganhoMedioDiario: number
  praca: string
  precoBoiGordoArroba: number
  precoBezerroCabeca: number
  precoGarroteCabeca: number
  precoVacaDescarteCabeca: number
  dataPrecos: string
}

export interface CustosPecuaria {
  vacinacaoAftosaAnoCab: number
  vacinacaoBrucelaAnoCab: number
  vermifugacaoAnoCab: number
  outrosSanidadeAnoCab: number
  manutencaoPastagemHaAno: number
  reformaPastagemHa: number
  percentualReformaAno: number
  areaArrendadaHa: number
  custoArrendamentoHaAno: number
  numFuncionarios: number
  salarioMedioMensal: number
  encargosPct: number
  combustivelMensal: number
  manutencaoEquipMensal: number
  outrosMensal: number
}

export interface ProjecaoAnoPec {
  ano: number
  rebanhoTotal: number
  uaTotal: number
  nascimentos: number
  desmamados: number
  abates: number
  descartes: number
  receitaAbate: number
  receitaDescarte: number
  receitaBezerros: number
  receitaBruta: number
  custoArrendamento: number
  custoTotal: number
  resultadoLiquido: number
  taxaDesfrute: number
}

// ── Constantes ───────────────────────────────────────────────────────────────

export const CATEGORIA_LABELS: Record<CategoriaAnimal, string> = {
  bezerro_m:         'Bezerro mamando (M)',
  bezerro_f:         'Bezerra mamando (F)',
  desmamado_m:       'Bezerro desmamado (M)',
  desmamado_f:       'Bezerra desmamada (F)',
  garrote:           'Garrote / Novilho',
  novilha_recria:    'Novilha em recria',
  boi_engorda:       'Boi em engorda',
  boi_gordo:         'Boi gordo (pronto p/ abate)',
  novilha_reposicao: 'Novilha de reposição',
  vaca_prenha:       'Vaca prenha',
  vaca_seca:         'Vaca seca',
  vaca_descarte:     'Vaca de descarte',
  touro:             'Touro',
}

export const CATEGORIA_GRUPO: Record<CategoriaAnimal, string> = {
  bezerro_m: 'Cria', bezerro_f: 'Cria',
  desmamado_m: 'Recria', desmamado_f: 'Recria',
  garrote: 'Recria', novilha_recria: 'Recria',
  boi_engorda: 'Engorda', boi_gordo: 'Engorda',
  novilha_reposicao: 'Reprodução',
  vaca_prenha: 'Reprodução', vaca_seca: 'Reprodução', vaca_descarte: 'Reprodução',
  touro: 'Reprodução',
}

export const UA_EQUIV: Record<CategoriaAnimal, number> = {
  bezerro_m: 0.20, bezerro_f: 0.18,
  desmamado_m: 0.40, desmamado_f: 0.35,
  garrote: 0.67, novilha_recria: 0.55,
  boi_engorda: 0.85, boi_gordo: 1.07,
  novilha_reposicao: 0.55,
  vaca_prenha: 0.93, vaca_seca: 0.89, vaca_descarte: 0.80,
  touro: 1.33,
}

export const FORRAGEIRAS = [
  { value: 'marandu',     label: 'Braquiária Marandu',          lotacao: 1.2 },
  { value: 'piata',       label: 'Braquiária Piatã',            lotacao: 1.3 },
  { value: 'xaraes',     label: 'Braquiária Xaraés (Toledo)',   lotacao: 1.4 },
  { value: 'ruziziensis', label: 'Braquiária Ruziziensis',      lotacao: 2.0 },
  { value: 'tanzania',    label: 'Panicum Tanzânia',             lotacao: 3.0 },
  { value: 'mombaca',    label: 'Panicum Mombaça',              lotacao: 3.5 },
  { value: 'andropogon',  label: 'Andropogon gayanus',          lotacao: 0.8 },
  { value: 'outra',       label: 'Outra / Mista',               lotacao: 1.0 },
]

export const PRACAS_MT = [
  'Cuiabá', 'Rondonópolis', 'Sinop', 'Alta Floresta',
  'Tangará da Serra', 'Cáceres', 'Sorriso', 'Primavera do Leste',
  'Nova Mutum', 'Lucas do Rio Verde', 'Campo Novo do Parecis',
]

export const CICLO_LABELS: Record<TipoCiclo, string> = {
  cria:               'Cria (vende bezerros desmamados)',
  recria:             'Recria (compra bezerro, vende garrote)',
  engorda:            'Engorda a pasto (compra garrote, vende boi gordo)',
  confinamento:       'Confinamento (engorda intensiva)',
  cria_recria:        'Cria + Recria',
  recria_engorda:     'Recria + Engorda',
  cria_recria_engorda:'Ciclo Completo (Cria + Recria + Engorda)',
}

export const ESTADO_PASTO_LABELS = {
  otimo: 'Ótimo', bom: 'Bom', degradado: 'Degradado', muito_degradado: 'Muito degradado',
}

export const SISTEMA_LABELS: Record<SistemaManejo, string> = {
  extensivo:        '100% Pastagem extensiva',
  suplementado:     'Pastagem + Suplementação (trato)',
  rotacionado:      'Pasto rotacionado (piquetes)',
  semiconfinamento: 'Semiconfinamento (pasto + ração)',
  confinamento:     'Confinamento total',
}

// ── Defaults ─────────────────────────────────────────────────────────────────

export const DEFAULT_PARAMS: ParametrosPecuaria = {
  ciclo: 'cria_recria_engorda',
  taxaPrenhez: 78, taxaNatalidade: 75, taxaMortalidadeBezerro: 4,
  taxaDesmame: 72, idadeDesmameMeses: 7, pesoDesmameKg: 190,
  pesoAbateKg: 490, rendimentoCarcaca: 53, arrobasAbate: 17,
  idadeAbateMeses: 36, taxaDescarteAnual: 12,
  diasConfinamento: 100, ganhoMedioDiario: 1.3,
  praca: 'Rondonópolis',
  precoBoiGordoArroba: 320, precoBezerroCabeca: 2200,
  precoGarroteCabeca: 3500, precoVacaDescarteCabeca: 2800,
  dataPrecos: new Date().toISOString().slice(0, 10),
}

export const DEFAULT_MANEJO: ManejoForrageiro = {
  sistema: 'extensivo', areaTotal: 0,
  forrageira: 'marandu', lotacaoReferencia: 1.2,
  fatorSeca: 0.5, estadoPasto: 'bom', suplementos: [],
}

export const DEFAULT_CUSTOS: CustosPecuaria = {
  vacinacaoAftosaAnoCab: 12, vacinacaoBrucelaAnoCab: 4,
  vermifugacaoAnoCab: 8, outrosSanidadeAnoCab: 6,
  manutencaoPastagemHaAno: 80, reformaPastagemHa: 1200, percentualReformaAno: 5,
  areaArrendadaHa: 0, custoArrendamentoHaAno: 0,
  numFuncionarios: 1, salarioMedioMensal: 2400, encargosPct: 33,
  combustivelMensal: 800, manutencaoEquipMensal: 400, outrosMensal: 300,
}

// ── localStorage CRUD ────────────────────────────────────────────────────────

const K = {
  rebanho: (cid: string) => `pec-rebanho-v1-${cid}`,
  manejo:  (cid: string) => `pec-manejo-v1-${cid}`,
  params:  (cid: string) => `pec-params-v1-${cid}`,
  custos:  (cid: string) => `pec-custos-v1-${cid}`,
}

function ls<T>(key: string, def: T): T {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : def } catch { return def }
}
function save(key: string, val: unknown) {
  localStorage.setItem(key, JSON.stringify(val))
}

export const pecStorage = {
  getRebanho:  (cid: string) => ls<LoteRebanho[]>(K.rebanho(cid), []),
  saveRebanho: (cid: string, d: LoteRebanho[]) => save(K.rebanho(cid), d),
  getManejo:   (cid: string) => ls<ManejoForrageiro>(K.manejo(cid), { ...DEFAULT_MANEJO }),
  saveManejo:  (cid: string, d: ManejoForrageiro) => save(K.manejo(cid), d),
  getParams:   (cid: string) => ls<ParametrosPecuaria>(K.params(cid), { ...DEFAULT_PARAMS }),
  saveParams:  (cid: string, d: ParametrosPecuaria) => save(K.params(cid), d),
  getCustos:   (cid: string) => ls<CustosPecuaria>(K.custos(cid), { ...DEFAULT_CUSTOS }),
  saveCustos:  (cid: string, d: CustosPecuaria) => save(K.custos(cid), d),
}

// ── Cálculo de UA ────────────────────────────────────────────────────────────

export function calcUA(rebanho: LoteRebanho[]): number {
  return rebanho.reduce((s, l) => s + l.quantidade * (UA_EQUIV[l.categoria] ?? 1), 0)
}

export function calcCapacidade(manejo: ManejoForrageiro): { chuva: number; seca: number } {
  const base = manejo.areaTotal * manejo.lotacaoReferencia
  const fatorPasto = manejo.estadoPasto === 'otimo' ? 1 : manejo.estadoPasto === 'bom' ? 0.85 : manejo.estadoPasto === 'degradado' ? 0.60 : 0.40
  const cap = base * fatorPasto
  return { chuva: cap, seca: cap * manejo.fatorSeca }
}

// ── Motor de projeção ────────────────────────────────────────────────────────

export function calcularProjecao(
  rebanho: LoteRebanho[],
  params: ParametrosPecuaria,
  custos: CustosPecuaria,
  manejo: ManejoForrageiro,
  anos = 5,
): ProjecaoAnoPec[] {
  const anoBase = new Date().getFullYear()
  const resultado: ProjecaoAnoPec[] = []

  // Estado inicial do rebanho
  let vacas = rebanho.filter(l => ['vaca_prenha', 'vaca_seca', 'novilha_reposicao'].includes(l.categoria))
    .reduce((s, l) => s + l.quantidade, 0)
  let touros = rebanho.filter(l => l.categoria === 'touro').reduce((s, l) => s + l.quantidade, 0)
  let emRecria = rebanho.filter(l => ['desmamado_m', 'garrote', 'novilha_recria', 'boi_engorda'].includes(l.categoria))
    .reduce((s, l) => s + l.quantidade, 0)
  let prontoAbate = rebanho.filter(l => l.categoria === 'boi_gordo').reduce((s, l) => s + l.quantidade, 0)

  const { taxaPrenhez, taxaNatalidade, taxaMortalidadeBezerro, taxaDesmame,
          taxaDescarteAnual, arrobasAbate, precoBoiGordoArroba,
          precoBezerroCabeca, precoVacaDescarteCabeca, ciclo } = params

  const ehCria    = ['cria', 'cria_recria', 'cria_recria_engorda'].includes(ciclo)
  const ehEngorda = ['engorda', 'confinamento', 'recria_engorda', 'cria_recria_engorda'].includes(ciclo)
  const ehSoCria  = ciclo === 'cria'

  for (let i = 0; i < anos; i++) {
    const ano = anoBase + i

    // CRIA
    const nascimentos = ehCria ? Math.round(vacas * taxaPrenhez / 100 * taxaNatalidade / 100) : 0
    const desmamados  = nascimentos > 0
      ? Math.round(nascimentos * (1 - taxaMortalidadeBezerro / 100) * taxaDesmame / 100)
      : 0
    const machos  = Math.round(desmamados * 0.5)
    const femeas  = desmamados - machos

    // DESCARTE / REPOSIÇÃO
    const descartes  = Math.round(vacas * taxaDescarteAnual / 100)
    const reposicao  = Math.min(femeas, descartes)
    const bezeirasVendidas = femeas - reposicao
    vacas = Math.max(0, vacas - descartes + reposicao)

    // ABATE: ano 0 usa boi_gordo já existente; anos seguintes = pipeline
    const abates = i === 0 ? prontoAbate : (ehEngorda ? Math.round(emRecria * 0.85) : 0)
    emRecria = ehSoCria ? 0 : machos + (ehEngorda && i > 0 ? Math.round(emRecria * 0.15) : 0)
    if (i === 0) prontoAbate = 0

    // RECEITA
    const receitaAbate    = abates * arrobasAbate * precoBoiGordoArroba
    const receitaDescarte = descartes * precoVacaDescarteCabeca
    const receitaBezerros = ehSoCria
      ? machos * precoBezerroCabeca + bezeirasVendidas * precoBezerroCabeca * 0.8
      : bezeirasVendidas * precoBezerroCabeca * 0.8
    const receitaBruta = receitaAbate + receitaDescarte + receitaBezerros

    // CUSTO
    const rebanhoTotal = vacas + touros + emRecria + abates
    const sanidadeCab = custos.vacinacaoAftosaAnoCab + custos.vacinacaoBrucelaAnoCab +
      custos.vermifugacaoAnoCab + custos.outrosSanidadeAnoCab
    const custoSanidade    = rebanhoTotal * sanidadeCab
    const custoPastagem    = manejo.areaTotal * (custos.manutencaoPastagemHaAno + custos.reformaPastagemHa * (custos.percentualReformaAno / 100))
    const custoMO          = custos.numFuncionarios * custos.salarioMedioMensal * 12 * (1 + custos.encargosPct / 100)
    const custoOutros      = (custos.combustivelMensal + custos.manutencaoEquipMensal + custos.outrosMensal) * 12
    const custoSuplem      = manejo.suplementos.reduce((s, sup) => {
      const meses = sup.mesesAplicacao.length || 6
      return s + rebanhoTotal * (sup.consumoGDiaCab / 1000) * 30 * meses * sup.custoKg
    }, 0)
    const custoArrendamento = custos.areaArrendadaHa * custos.custoArrendamentoHaAno
    const custoTotal = custoSanidade + custoPastagem + custoMO + custoOutros + custoSuplem + custoArrendamento

    const uaTotal = calcUA(rebanho) // simplificado — usa rebanho inicial como proxy da UA média
    const taxaDesfrute = rebanhoTotal > 0 ? ((abates + descartes) / rebanhoTotal) * 100 : 0

    resultado.push({
      ano, rebanhoTotal, uaTotal: Math.round(uaTotal * 10) / 10,
      nascimentos, desmamados, abates, descartes,
      receitaAbate, receitaDescarte, receitaBezerros, receitaBruta,
      custoArrendamento, custoTotal, resultadoLiquido: receitaBruta - custoTotal,
      taxaDesfrute: Math.round(taxaDesfrute * 10) / 10,
    })
  }
  return resultado
}
