// Status de agendamento: mapa de snake_case (N8N) para o padrão do app
export const STATUS_MAP: Record<string, string> = {
  'aguardando_confirmacao': 'Aguardando Confirmação',
  'confirmado':             'Confirmado',
  'cancelado':              'Cancelado',
  'finalizado':             'Finalizado',
  'em_atendimento':         'Em atendimento',
  'nao_apareceu':           'Não apareceu',
};

export const VALID_STATUSES = Object.values(STATUS_MAP);

export function normalizeStatus(status: string): string {
  return STATUS_MAP[status] ?? status;
}
