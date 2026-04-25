
'use server';

import { supabase } from '../supabase/client';
import { Mission, FinancialClosing } from '../types/database';
import { unstable_noStore as noStore } from 'next/cache';
import { startOfDay, addHours, endOfDay } from 'date-fns';

export async function getDashboardKPIs(filters?: { storeId?: string, date?: Date }) {
    noStore();
    try {
        const queryDate = filters?.date || new Date();
        const start = startOfDay(queryDate);
        const end = addHours(endOfDay(queryDate), 4);

        // Appointments Query
        let missionsQuery = supabase
            .from('controle_atendimentos')
            .select('*', { count: 'exact' })
            .gte('inicio_agendado', start.toISOString())
            .lte('inicio_agendado', end.toISOString());

        // Financials Query
        let financialsQuery = supabase
            .from('lancamentos_financeiros')
            .select('valor', { count: 'exact' })
            .gte('data_lancamento', start.toISOString())
            .lte('data_lancamento', end.toISOString());

        if (filters?.storeId && filters.storeId !== 'all') {
            missionsQuery = missionsQuery.eq('unidade', filters.storeId);
            financialsQuery = financialsQuery.eq('unidade', filters.storeId);
        }

        const { data: missionsData, count: totalMissions, error: missionsError } = await missionsQuery;
        const { data: financials, error: financialsError } = await financialsQuery;

        if (missionsError) console.error("Missions KPI Error:", missionsError);
        if (financialsError) console.error("Financials KPI Error:", financialsError);

        // Normaliza status snake_case do N8N
        const STATUS_NORM: Record<string, string> = {
          'aguardando_confirmacao': 'Aguardando Confirmação',
          'confirmado': 'Confirmado',
          'cancelado': 'Cancelado',
          'finalizado': 'Finalizado',
          'nao_apareceu': 'Não apareceu',
        };
        const normalize = (s: string) => STATUS_NORM[s] ?? s;

        // Calculate Financial Value
        let totalFinancialValue = 0;
        financials?.forEach((f: any) => {
            const raw = f.valor;
            if (raw) {
                if (typeof raw === 'number') {
                    totalFinancialValue += raw;
                } else if (typeof raw === 'string') {
                    const numericString = raw.replace(/[^\d,]/g, '').replace(',', '.');
                    totalFinancialValue += parseFloat(numericString) || 0;
                }
            }
        });

        // Calculate Services vs Others (Formerly compliance)
        const auditMissionsCount = missionsData?.filter((m: any) =>
            normalize(m.status_agendamento) === 'Finalizado'
        ).length || 0;

        // Calculate Pending Appointments
        const pendingMissionsCount = missionsData?.filter((m: any) =>
            normalize(m.status_agendamento) === 'Aguardando Confirmação' || normalize(m.status_agendamento) === 'Confirmado'
        ).length || 0;

        return {
            totalMissions: totalMissions || 0,
            totalFinancialValue,
            complianceRate: auditMissionsCount,
            pendingMissions: pendingMissionsCount
        };
    } catch (error) {
        console.error("Error fetching KPIs:", error);
        return { totalMissions: 0, totalFinancialValue: 0, complianceRate: 0, pendingMissions: 0 };
    }
}


export interface MissionItem {
    id: number;
    lojaId: string;
    telefone: string;
    tipoMissao: string;
    status: string;
    urlFoto: string | null;
    obs: string | null;
    dataRegistro: string;
    dataConclusao: string | null;
}

export interface FinancialClosingItem {
    id: number;
    lojaId: string;
    gerenteResponsavel: string;
    telefone: string;
    valorDeclarado: number | null;
    urlComprovante: string | null;
    dataRegistro: string | null;
}

export async function getMissions(filters?: { storeId?: string, date?: Date }, limit = 100): Promise<MissionItem[]> {
    noStore();
    try {
        const queryDate = filters?.date || undefined;
        let query = supabase
            .from('controle_atendimentos')
            .select('*')
            .order('inicio_agendado', { ascending: false })
            .limit(limit);

        if (queryDate) {
            const startOfDayDate = new Date(queryDate);
            startOfDayDate.setHours(0, 0, 0, 0);
            query = query.gte('inicio_agendado', startOfDayDate.toISOString());
        }

        if (filters?.storeId && filters.storeId !== 'all') {
            query = query.eq('unidade', filters.storeId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((m: any) => ({
            id: m.id,
            lojaId: m.unidade,
            telefone: m.telefone,
            tipoMissao: m.servico,
            status: m.status_agendamento,
            urlFoto: null,
            obs: m.observacoes || m.notas,
            dataRegistro: m.inicio_agendado,
            dataConclusao: m.fim_agendado
        }));

    } catch (error) {
        console.error("Error fetching missions:", error);
        return [];
    }
}

export async function getFinancialClosings(filters?: { storeId?: string, date?: Date }, limit = 50): Promise<FinancialClosingItem[]> {
    noStore();
    try {
        const queryDate = filters?.date || undefined;
        let query = supabase
            .from('lancamentos_financeiros')
            .select('*')
            .order('data_lancamento', { ascending: false })
            .limit(limit);

        if (queryDate) {
            const startOfDayDate = new Date(queryDate);
            startOfDayDate.setHours(0, 0, 0, 0);
            query = query.gte('data_lancamento', startOfDayDate.toISOString());
        }

        if (filters?.storeId && filters.storeId !== 'all') {
            query = query.eq('unidade', filters.storeId);
        }

        const { data, error } = await query;
        if (error) throw error;

        return (data || []).map((f: any) => ({
            id: f.id,
            lojaId: f.unidade || 'Principal',
            gerenteResponsavel: f.descricao || 'Lançamento',
            telefone: '-',
            valorDeclarado: f.valor,
            urlComprovante: null,
            dataRegistro: f.data_lancamento
        }));

    } catch (error) {
        console.error("Error fetching financial closings:", error);
        return [];
    }
}

export async function getMissionContext(phone: string, missionDate: Date) {
    noStore();
    try {
        // Window: -15 min to +15 min
        const windowStart = new Date(missionDate.getTime() - 15 * 60000).toISOString();
        const windowEnd = new Date(missionDate.getTime() + 15 * 60000).toISOString();

        const { data, error } = await supabase
            .from('n8n_historico_mensagens')
            .select('*')
            .eq('session_id', phone)
            .gte('created_at', windowStart)
            .lte('created_at', windowEnd)
            .order('created_at', { ascending: true });

        if (error) throw error;

        // Map to match simpler component expectation
        return (data || []).map((msg: any) => ({
            sessionId: msg.session_id,
            message: msg.message,
            createdAt: msg.created_at
        }));

    } catch (error) {
        console.error("Error fetching chat context:", error);
        return [];
    }
}

export interface ConversationItem {
    sessionId: string;
    lastMessage: string;
    lastMessageAt: string;
    totalMessages?: number;
}

export async function getRecentConversations(limit = 50): Promise<ConversationItem[]> {
    noStore();
    try {
        const { data, error } = await supabase
            .from('n8n_historico_mensagens')
            .select('session_id, message, created_at')
            .order('created_at', { ascending: false })
            .limit(limit * 10); // Fetch more to ensure distinct sessions

        if (error) throw error;

        const sessionsMap = new Map<string, ConversationItem>();

        for (const msg of data || []) {
            if (!sessionsMap.has(msg.session_id)) {
                let content = "";
                try {
                    const parsed = typeof msg.message === 'string' ? JSON.parse(msg.message) : msg.message;
                    content = parsed?.content || JSON.stringify(parsed);
                } catch (e) {
                    content = "Mensagem ilegível";
                }

                sessionsMap.set(msg.session_id, {
                    sessionId: msg.session_id,
                    lastMessage: String(content).substring(0, 100),
                    lastMessageAt: msg.created_at,
                    totalMessages: 1
                });
            }
            if (sessionsMap.size >= limit) break;
        }

        return Array.from(sessionsMap.values());

    } catch (error) {
        console.error("Error fetching recent conversations:", error);
        return [];
    }
}
