/** Representa uma barbearia cliente do SaaS. */
export interface Tenant {
  id: string;
  nome: string;
  slug: string;
  responsavel_nome?: string;
  responsavel_email?: string;
  responsavel_telefone?: string;
  plano: 'basic' | 'professional' | 'enterprise';
  status: 'active' | 'suspended' | 'cancelled' | 'trial';
  config_whatsapp: Record<string, unknown>;
  config_chatwoot: Record<string, unknown>;
  config_ia: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

/** Payload para criar uma nova tenant (onboarding). */
export interface CreateTenantInput {
  // Etapa 1 — Dados da barbearia
  nome: string;
  slug: string;
  responsavel_nome: string;
  responsavel_email: string;
  responsavel_telefone?: string;
  plano?: Tenant['plano'];

  // Etapa 2 — Unidades (mínimo 1)
  unidades: Array<{
    nome_fantasia: string;
    telefone?: string;
    endereco?: string;
    bairro?: string;
    cidade?: string;
  }>;

  // Etapa 3 — Serviços base
  servicos?: Array<{
    nome: string;
    preco_venda: number;
    duracao_minutos?: number;
  }>;

  // Etapa 4 — Horários de funcionamento (padrão seg-sáb 09-20)
  horario_abertura?: string;
  horario_fechamento?: string;

  // Etapa 5 — Admin inicial
  admin_nome: string;
  admin_email: string;
  admin_senha: string;

  // Etapa 6 — Integrações (opcionais)
  config_whatsapp?: Record<string, unknown>;
  config_chatwoot?: Record<string, unknown>;
  config_ia?: Record<string, unknown>;
}

/** Resultado resumido de uma tenant para listagem. */
export interface TenantSummary {
  id: string;
  nome: string;
  slug: string;
  plano: Tenant['plano'];
  status: Tenant['status'];
  responsavel_email?: string;
  num_unidades: number;
  num_profissionais: number;
  created_at: string;
}
