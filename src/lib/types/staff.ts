
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
  // Campos financeiros (Fase 2)
  comissao_servico?: number;   // Porcentagem (ex: 50.00)
  comissao_produto?: number;   // Porcentagem (ex: 10.00)
  prolabore_fixo?: number;     // Valor fixo em R$
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
