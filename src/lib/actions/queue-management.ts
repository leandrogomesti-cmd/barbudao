'use server';

import { supabase } from '@/lib/supabase/client';
import { revalidatePath } from 'next/cache';

export async function retryMission(missionId: number) {
    try {
        const { error } = await supabase
            .from('missoes_execucao')
            .update({
                status: 'pendente',
                error_detail: null, // Clear error logs if any
                data_conclusao: null // Reset completion date
            })
            .eq('id', missionId);

        if (error) throw error;

        revalidatePath('/admin/queues');
        return { success: true, message: 'Missão re-enfileirada com sucesso.' };
    } catch (error: any) {
        console.error('Error retrying mission:', error);
        return { success: false, message: error.message };
    }
}

export async function cancelMission(missionId: number) {
    try {
        const { error } = await supabase
            .from('missoes_execucao')
            .update({
                status: 'cancelado',
                data_conclusao: new Date().toISOString()
            })
            .eq('id', missionId);

        if (error) throw error;

        revalidatePath('/admin/queues');
        return { success: true, message: 'Missão cancelada com sucesso.' };
    } catch (error: any) {
        console.error('Error canceling mission:', error);
        return { success: false, message: error.message };
    }
}
