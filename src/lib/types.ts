

export type CampaignStatus = 'ativa' | 'pausada' | 'concluída' | 'rascunho' | 'pending' | 'running' | 'stopping' | 'stopped' | 'failed' | 'completed' | 'inactive' | 'finished' | 'starting' | 'archived' | 'waiting_schedule' | 'scheduled';

export interface CampaignLog {
  timestamp: string;
  message: string;
  level: 'INFO' | 'SUCCESS' | 'ERROR' | 'WARNING';
}

export interface CampaignStats {
  total: number;
  sent: number;
  delivered: number;
  failed: number;
  processed?: number;
  invalid_number?: number;
}
export interface Campaign {
  id: string;
  name: string;
  status: CampaignStatus;
  messageTemplates: string[];
  createdAt: string;
  delay: {
    min: number;
    max: number;
  };
  stats: CampaignStats;
  owner_id: string;
  instance_name: string;
  scheduling?: {
    enabled: boolean;
    daysOfWeek: number[]; // 0-6 (Sunday-Saturday)
    startTime: string; // "HH:mm"
    endTime: string; // "HH:mm"
  };
  tags?: string[];
  last_finished_at?: string; // ISO String timestamp for daily recurrence check
  mission_type?: string;
  mission_subtype?: string; // New field
  enviar_foto?: boolean; // Added field
  store_ids?: string[]; // Legacy: IDs das lojas únicas
  stores?: { id: string; name: string }[]; // New: Objects with ID and Name
}

export interface CampaignSummary {
  id: string;
  name: string;
  status: CampaignStatus;
  stats: CampaignStats;
  store_ids?: string[];
  stores?: { id: string; name: string }[];
  scheduling?: {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
}


export interface CampaignContact {
  id?: string;
  nome: string;
  telefone: string;
  status: 'pending' | 'sent' | 'failed';
  dynamic_fields?: { [key: string]: string };
  mission_id?: number | null; // Track created mission to avoid duplicates
}

export interface ContactHistoryItem {
  id: string;
  type: 'note' | 'sent' | 'failed' | 'info';
  content: string;
  author?: string;
  timestamp: string;
}

export interface WhatsAppInstance {
  id: string; // Internal ID or Chatwoot Inbox ID
  name: string; // Instance or Inbox Name
  status?: 'open' | 'closed' | 'connecting';
  qrcode?: string;
  ownerId: string;
  createdAt: string;
}

export interface Plan {
  id: string;
  name: string;
  price: string;
  period: string;
  description: string;
  dailySends: string;
  features: string[];
}

export interface UserPlanInfo {
  planId: string;
  planStatus: 'active' | 'inactive' | 'pending_payment';
  dailySendLimit: number;
  hasUnlimitedSends: boolean;
}

export interface UserSettings {
  subscriptionsEnabled: boolean;
}

export interface TrelloCard {
  id: string;
  name: string;
  desc: string;
  due: string | null;
  labels: TrelloLabel[];
}

export interface TrelloLabel {
  id: string;
  name: string;
  color: string;
}

export interface Contact {
  id?: string;
  ownerId: string;
  name: string;
  phone: string;
  email?: string;
  role?: string;
  aceita_marketing?: boolean;
  createdAt?: string;
  source?: 'local' | 'erp';
  storeIds?: string[]; // IDs das lojas associadas
  storeNames?: string[]; // Nomes das lojas (preenchido no backend)
}

// Queue Monitoring Types
export interface ReportQueueItem {
  id: number;
  telefone: string;
  nome_usuario: string;
  data_inicio: string; // Date
  data_fim: string; // Date
  status: 'PENDENTE' | 'PROCESSANDO' | 'CONCLUIDO' | 'ERRO';
  data_solicitacao: string; // Timestamp
}

export interface MissionExecution {
  id: number;
  contato_i: string; // Novo schema: FK para contatos_erp
  tipo_missao: string;
  status: 'pendente' | 'validado' | 'concluido' | 'erro' | 'cancelado';
  obs: string | null;
  url_foto: string | null;
  data_registro: string; // Timestamp
  data_conclusao: string | null; // Timestamp
  enviar_foto: boolean | null;
  loja_id?: string;
  telefone?: string;
}
