import { AppLayout } from '../../components/Layout/AppLayout'
import { TabDashboard }   from './TabDashboard'
import { TabEmpresa }     from './TabEmpresa'
import { TabLancamentos } from './TabLancamentos'
import { TabContratos }   from './TabContratos'
import { TabDespesas }    from './TabDespesas'
import { TabReceitas }    from './TabReceitas'
import { TabFluxoDiario } from './TabFluxoDiario'
import { TabFluxoMensal } from './TabFluxoMensal'
import { TabFluxoAnual }  from './TabFluxoAnual'

type PayTab = 'dashboard' | 'empresa' | 'lancamentos' | 'contratos' | 'despesas' | 'receitas' | 'diario' | 'mensal' | 'anual'

const TAB_META: Record<PayTab, { title: string; subtitle: string }> = {
  dashboard:    { title: 'Pay — Dashboard',           subtitle: 'Visão geral financeira do mês atual' },
  empresa:      { title: 'Minha Empresa',              subtitle: 'Cadastro e dados da empresa' },
  lancamentos:  { title: 'Contas a Pagar e Receber',  subtitle: 'Registro e controle de lançamentos financeiros' },
  contratos:    { title: 'Cronograma de Contratos',   subtitle: 'Contratos recorrentes de receita e despesa' },
  despesas:     { title: 'Análise de Despesas',        subtitle: 'Evolução e distribuição das despesas por categoria' },
  receitas:     { title: 'Análise de Receitas',        subtitle: 'Evolução e distribuição das fontes de receita' },
  diario:       { title: 'Fluxo Diário',              subtitle: 'Calendário de lançamentos dia a dia' },
  mensal:       { title: 'Fluxo Mensal',              subtitle: 'Resultado mês a mês e saldo acumulado' },
  anual:        { title: 'Visão Anual',               subtitle: 'Comparativo entre anos e tendências' },
}

export function PayPage({ tab }: { tab: PayTab }) {
  const meta = TAB_META[tab]
  return (
    <AppLayout title={meta.title} subtitle={meta.subtitle}>
      {tab === 'dashboard'   && <TabDashboard />}
      {tab === 'empresa'     && <TabEmpresa />}
      {tab === 'lancamentos' && <TabLancamentos />}
      {tab === 'contratos'   && <TabContratos />}
      {tab === 'despesas'    && <TabDespesas />}
      {tab === 'receitas'    && <TabReceitas />}
      {tab === 'diario'      && <TabFluxoDiario />}
      {tab === 'mensal'      && <TabFluxoMensal />}
      {tab === 'anual'       && <TabFluxoAnual />}
    </AppLayout>
  )
}
