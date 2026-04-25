'use server';

import { supabase } from '@/lib/supabase/client';
import { MissionExecution } from '@/lib/types';
import { revalidatePath } from 'next/cache';

function createClient() { return supabase; }

const PAGE_SIZE = 50;

export async function getMissions(
    filters?: { status?: string; date?: Date },
    page = 1,
): Promise<{ data: MissionExecution[]; total: number; page: number; pageSize: number }> {
    const supabase = createClient();
    const from = (page - 1) * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    let query = supabase
        .from('missoes_execucao')
        .select('*', { count: 'exact' })
        .order('data_registro', { ascending: false })
        .range(from, to);

    if (filters?.status && filters.status !== 'all') {
        query = query.eq('status', filters.status);
    }

    const { data, error, count } = await query;

    if (error) {
        console.error('Error fetching missions:', error);
        return { data: [], total: 0, page, pageSize: PAGE_SIZE };
    }

    return { data: (data ?? []) as MissionExecution[], total: count ?? 0, page, pageSize: PAGE_SIZE };
}

export async function createMission(input: {
    tipo_missao: string;
    loja_id?: string;
    telefone?: string;
    enviar_foto?: boolean;
    obs?: string;
}): Promise<{ success: boolean; message: string; id?: number }> {
    try {
        if (!input.tipo_missao?.trim()) {
            return { success: false, message: 'Tipo de missão é obrigatório.' };
        }

        const supabase = createClient();
        const { data, error } = await supabase
            .from('missoes_execucao')
            .insert({
                tipo_missao: input.tipo_missao.trim(),
                loja_id: input.loja_id || null,
                telefone: input.telefone || null,
                enviar_foto: input.enviar_foto ?? false,
                obs: input.obs || null,
                status: 'pendente',
                data_registro: new Date().toISOString(),
            })
            .select('id')
            .single();

        if (error) throw error;

        revalidatePath('/missions');
        return { success: true, message: 'Missão criada com sucesso.', id: data.id };
    } catch (error: any) {
        console.error('Error creating mission:', error);
        return { success: false, message: `Erro ao criar missão: ${error.message}` };
    }
}

export async function updateMissionStatus(
    id: number,
    status: string,
    feedback?: string,
): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = createClient();

        const updateData: any = { status };
        if (feedback) updateData.obs = feedback;
        if (status === 'validado' || status === 'concluido') {
            updateData.data_conclusao = new Date().toISOString();
        }

        const { error } = await supabase
            .from('missoes_execucao')
            .update(updateData)
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/missions');
        return { success: true, message: 'Status atualizado com sucesso.' };
    } catch (error: any) {
        console.error('Error updating mission status:', error);
        return { success: false, message: `Erro ao atualizar: ${error.message}` };
    }
}

export async function deleteMission(id: number): Promise<{ success: boolean; message: string }> {
    try {
        const supabase = createClient();

        // Protege missões já validadas
        const { data: mission, error: fetchError } = await supabase
            .from('missoes_execucao')
            .select('status')
            .eq('id', id)
            .single();

        if (fetchError) throw fetchError;

        if (mission?.status === 'validado') {
            return { success: false, message: 'Missões já aprovadas não podem ser excluídas.' };
        }

        const { error } = await supabase
            .from('missoes_execucao')
            .delete()
            .eq('id', id);

        if (error) throw error;

        revalidatePath('/missions');
        return { success: true, message: 'Missão excluída com sucesso.' };
    } catch (error: any) {
        console.error('Error deleting mission:', error);
        return { success: false, message: `Erro ao excluir: ${error.message}` };
    }
}
