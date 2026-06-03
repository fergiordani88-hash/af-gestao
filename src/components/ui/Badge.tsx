import { clsx } from 'clsx'

type Variant = 'lead' | 'proposta' | 'negociacao' | 'ativo' | 'inativo' |
               'agro' | 'comercio' | 'servicos' | 'industria' |
               'imediata' | 'alta' | 'media' | 'baixa' |
               'nao_iniciado' | 'em_andamento' | 'concluido' | 'pendente' | 'reavaliar' |
               'saudavel' | 'atencao' | 'critico' | 'reestruturacao'

const variantMap: Record<Variant, string> = {
  lead:          'bg-gray-100 text-gray-700',
  proposta:      'bg-blue-100 text-blue-700',
  negociacao:    'bg-amber-100 text-amber-700',
  ativo:         'bg-emerald-100 text-emerald-700',
  inativo:       'bg-red-100 text-red-600',
  agro:          'bg-green-100 text-green-800',
  comercio:      'bg-blue-100 text-blue-800',
  servicos:      'bg-purple-100 text-purple-800',
  industria:     'bg-orange-100 text-orange-800',
  imediata:      'bg-red-100 text-red-700',
  alta:          'bg-orange-100 text-orange-700',
  media:         'bg-amber-100 text-amber-700',
  baixa:         'bg-gray-100 text-gray-600',
  nao_iniciado:  'bg-gray-100 text-gray-600',
  em_andamento:  'bg-blue-100 text-blue-700',
  concluido:     'bg-emerald-100 text-emerald-700',
  pendente:      'bg-amber-100 text-amber-700',
  reavaliar:     'bg-red-100 text-red-600',
  saudavel:      'bg-emerald-100 text-emerald-800',
  atencao:       'bg-amber-100 text-amber-800',
  critico:       'bg-orange-100 text-orange-800',
  reestruturacao:'bg-red-100 text-red-800',
}

const labelMap: Record<Variant, string> = {
  lead: 'Lead', proposta: 'Proposta', negociacao: 'Negociação',
  ativo: 'Ativo', inativo: 'Inativo',
  agro: 'Agro', comercio: 'Comércio', servicos: 'Serviços', industria: 'Indústria',
  imediata: 'Imediata', alta: 'Alta', media: 'Média', baixa: 'Baixa',
  nao_iniciado: 'Não iniciado', em_andamento: 'Em andamento',
  concluido: 'Concluído', pendente: 'Pendente', reavaliar: 'Reavaliar',
  saudavel: 'Saudável', atencao: 'Atenção', critico: 'Crítico', reestruturacao: 'Reestruturação',
}

export function Badge({ variant }: { variant: Variant }) {
  return (
    <span className={clsx('px-2 py-0.5 rounded-full text-xs font-medium', variantMap[variant])}>
      {labelMap[variant]}
    </span>
  )
}
