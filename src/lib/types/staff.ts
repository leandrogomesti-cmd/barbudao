
export interface Staff {
  id: string;
  nome: string;
  apelido?: string;
  telefone?: string;
  email?: string;
  cpf?: string;
  funcao?: string;
  unidade_padrao?: string;
  perfil_acesso?: 'ADMIN' | 'GERENTE' | 'PROFISSIONAL' | 'RECEPCAO';
  possui_agenda: boolean;
  ativo: boolean;
  criado_em: string;
  comissao_servico?: number;   // Fallback global (porcentagem)
  comissao_produto?: number;   // Fallback global (porcentagem)
  prolabore_fixo?: number;     // Valor fixo em R$
  /** UUID da tenant à qual este profissional pertence. */
  tenant_id?: string;
}

export interface ProfissionalServicoComissao {
  id?: string;
  profissional_id: string;
  servico_id: string;
  unidade_id: string;
  comissao_percentual: number;
  servico?: { nome: string; ativo: boolean; categoria_id?: string; };
  categoria?: { nome: string; };
}

export interface ServicoComissaoRow {
  servico_id: string;
  nome: string;
  ativo: boolean;
  categoria?: string;
  comissao_percentual: number; // 0 se não configurado
}

export interface CommissionReportItem {
  id: string;
  inicio_agendado: string;
  nome_cliente?: string;
  servico: string;
  preco_venda: number;
  forma_pagamento?: string;
  comissao_percentual: number;
  valor_comissao: number;
}

export interface CommissionReportProdutoItem {
  produto: string;
  quantidade: number;
  valor_total: number;
  comissao_percentual: number;
  valor_comissao: number;
  data_venda: string;
  nome_cliente?: string;
}

export interface CommissionReport {
  staffId: string;
  staffName: string;
  atendimentos: number;
  valorServicos: number;
  comissaoServico: number;
  valorProdutos: number;
  comissaoProduto: number;
  prolabore: number;
  total: number;
  items: CommissionReportItem[];
  produtoItems: CommissionReportProdutoItem[];
}

export const DIAS_SEMANA = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

export interface HorarioProfissional {
  id: string;
  profissional_id: string;
  dia_semana: number; // 0=Dom, 1=Seg...6=Sab
  hora_inicio: string; // "09:00"
  hora_fim: string;    // "18:00"
  ativo: boolean;
}

export interface FolgaProfissional {
  id: string;
  profissional_id: string;
  data: string; // "2026-04-10"
  motivo?: string;
}
