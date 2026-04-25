'use server';

import { supabase } from '../supabase/client';
import type { ReportQueueItem, MissionExecution } from '../types';

export async function getReportsQueue(limit: number = 50): Promise<ReportQueueItem[]> {
    try {
        const { data, error } = await supabase
            .from('fila_processamento_relatorios')
            .select('*')
            .order('data_solicitacao', { ascending: false })
            .limit(limit);

        if (error) {
            console.error('Error fetching reports queue:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getReportsQueue:', error);
        return [];
    }
}

export async function getMissionsHistory(
    limit: number = 50,
    statusFilter?: string
): Promise<MissionExecution[]> {
    try {
        let query = supabase
            .from('missoes_execucao')
            .select('*')
            .order('data_registro', { ascending: false })
            .limit(limit);

        if (statusFilter && statusFilter !== 'all') {
            query = query.eq('status', statusFilter);
        }

        const { data, error } = await query;

        if (error) {
            console.error('Error fetching missions history:', error);
            return [];
        }

        return data || [];
    } catch (error) {
        console.error('Error in getMissionsHistory:', error);
        return [];
    }
}
