
export type FormaPagamento = 'Dinheiro' | 'PIX' | 'Cartão de Débito' | 'Cartão de Crédito' | 'Outro';

export interface Appointment {
  id: string | number;
  telefone?: string;
  nome_cliente: string;
  servico: string;
  profissional: string;
  inicio_agendado: string;
  fim_agendado: string;
  status_agendamento: 'Aguardando Confirmação' | 'Confirmado' | 'Finalizado' | 'Cancelado' | 'Em atendimento' | 'Não apareceu' | 'Bloqueio' | 'Fila de Espera';
  unidade?: string;
  id_evento_google?: string;
  forma_pagamento?: FormaPagamento;
  // Campos N8N/Chatwoot
  id_conversa_chatwoot?: number;
  ultima_interacao_em?: string;
  lembrete_enviado_em?: string;
  followup_enviado_em?: string;
  // IDs para relacionamento futuro
  profissional_id?: string;
  servico_id?: string;
  cliente_id?: string;
}
