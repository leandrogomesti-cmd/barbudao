
export interface Mission {
    id: number;
    loja_id: string;        // Grouping Key (e.g., 'B500')
    telefone: string;       // Manager ID
    tipo_missao: string;    // e.g., 'auditoria_vitrine', 'auditoria_estoque'
    status: 'pendente' | 'validado';
    url_foto: string | null;
    obs: string | null;     // AI Analysis text
    data_conclusao: string; // ISO Date
    enviar_foto: boolean;
    data_registro?: string; // Often present in DB but not in prompt type, adding optional for safety
}

export interface FinancialClosing {
    id: number;
    loja_id: string;
    gerente_responsavel: string;
    valor_declarado: string; // e.g., "R$ 2.234,44"
    url_comprovante: string;
    data_registro: string;
}

export interface ChatLog {
    session_id: string; // Links to Manager Phone
    message: any;       // JSONB content
    created_at: string;
}
