
export interface FinanceCategory {
  id: string;
  nome: string;
  tipo: 'receita' | 'despesa';   // banco usa lowercase
  ativo: boolean;
}

export interface FinanceTransaction {
  id: string;
  categoria_id?: string;
  cliente_id?: string;
  profissional_id?: string;
  descricao: string;
  valor: number;
  tipo?: 'receita' | 'despesa';  // campo adicionado na migração
  data_lancamento: string;
  forma_pagamento?: string;
  status: 'PAGO' | 'PENDENTE' | 'CANCELADO' | 'pago' | 'pendente' | 'cancelado';
  unidade?: string;
}
