
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
const supabaseKey = typeof window === 'undefined' 
  ? (process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '')
  : (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '');

if (!supabaseUrl || !supabaseKey) {
  console.warn('[Supabase] SUPABASE_URL ou SUPABASE_KEY/SUPABASE_ANON_KEY não configurados. Verifique .env.local ou Secret Manager.');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

export async function logMessageToSupabase(sessionId: string, messageContent: string, metadata: any) {
    // Structure message as JSONB to match prompt schema description of 'message' column
    const messagePayload = {
        type: 'ai',
        content: messageContent,
        context: {
            source: metadata?.source || 'campaign_worker',
            campaignName: metadata?.campaignName || 'Campanha Automática'
        }
    };

    const { error } = await supabase
        .from('n8n_historico_mensagens')
        .insert({
            session_id: sessionId,
            message: messagePayload,
            created_at: new Date().toISOString()
        });

    if (error) {
        throw error;
    }
}

export async function createMissionInSupabase(data: {
    phone: string;
    storeId?: string;
    missionType: string;
    missionSubtype?: string;
    status: string;
    enviar_foto?: boolean;
    obs?: string;
}) {
    // 1. Buscar contato_id e store_id do contato
    const { data: contactData, error: fetchError } = await supabase
        .from('contatos_erp')
        .select('id_contato, store_id')
        .eq('telefone', data.phone)
        .single();

    if (fetchError || !contactData) {
        console.error(`[SUPABASE] Could not find contact for phone ${data.phone}`, fetchError);
        return { success: false, error: `Contato não encontrado para ${data.phone}` };
    }

    const contato_id = contactData.id_contato;
    const store_id = contactData.store_id || 'N/A';
    console.log(`[SUPABASE] Creating mission for contact_id ${contato_id} (store: ${store_id})`);

    // 2. CHECK FOR DUPLICATES REMOVED as per user request (Allow multiple missions per day)
    const statusToUse = data.status;

    // 3. Insert Mission usando NOVO SCHEMA (contato_id)
    const { data: insertedData, error } = await supabase
        .from('missoes_execucao')
        .insert({
            contato_id: contato_id,
            tipo_missao: data.missionType,
            subtipo_missao: data.missionSubtype || 'Genérico',
            status: statusToUse,
            enviar_foto: data.enviar_foto ?? false,
            obs: data.obs || '',
            data_registro: new Date().toISOString()
        })
        .select()
        .single();

    if (insertedData) {
        // Create link in 'missoes_nomes' table as requested
        const { error: linkError } = await supabase
            .from('missoes_nomes')
            .insert({
                missao_execucao_id: insertedData.id,
                nome_missao: data.missionType,
                created_at: new Date().toISOString()
            });

        if (linkError) {
            console.error('[SUPABASE] Warning: Failed to create mission name link:', linkError);
            // We do not throw/return error here to ensure the main flow continues
        }
    }

    if (error) {
        console.error('[SUPABASE] Failed to create mission:', error);
        return { success: false, error: error.message };
    }

    return { success: true, data: insertedData };
}
