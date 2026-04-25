'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { getSupabaseAdmin } from '@/lib/supabase/admin'; // Use Admin Client
import { subMinutes } from 'date-fns';
import { revalidatePath } from 'next/cache';

const GuardianInputSchema = z.object({
    checkType: z.enum(['audit', 'context_check']).default('audit'),
    targetStoreId: z.string().optional(),
});

const GuardianOutputSchema = z.object({
    issues: z.array(z.object({
        type: z.string(),
        missionId: z.number(),
        severity: z.enum(['LOW', 'MEDIUM', 'HIGH']),
        description: z.string(),
        suggestedAction: z.string(),
        timestamp: z.string().optional()
    })),
    summary: z.string()
});

/**
 * The Mission Guardian: 
 * A specialized agent that audits the mission database for inconsistencies,
 * stale states, and potential "hallucinations" (ambiguous data).
 */
export const runMissionGuardian = ai.defineFlow(
    {
        name: 'runMissionGuardian',
        inputSchema: GuardianInputSchema,
        outputSchema: GuardianOutputSchema,
    },
    async ({ checkType, targetStoreId }) => {
        console.log(`[GUARDIAN] Starting audit (${checkType})...`);
        const supabaseAdmin = getSupabaseAdmin(); // Instantiate Admin Client
        const issues: any[] = [];

        // 1. CHECK FOR STALE MISSIONS (Zombie Missions)
        // Definition: Status 'pendente', 'aguardando', or 'em_andamento' for > 30 minutes.
        // O banco (Postgres) salva `data_registro` em UTC-3 nativamente mas como timestamp without time zone.
        // O servidor edge (Vercel) roda em UTC. Precisamos recuar 3 horas da data local + 30 minutos de tolerância.
        const nowBrt = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
        const staleThreshold = subMinutes(nowBrt, 30).toISOString().replace('Z', '');
        console.log(`[GUARDIAN DEBUG] Threshold (BRT): ${staleThreshold}`);

        let query = supabaseAdmin
            .from('missoes_execucao')
            .select('id, tipo_missao, data_registro, status')
            .in('status', ['pendente', 'aguardando', 'em_andamento']) // ✅ Multiple statuses
            .lt('data_registro', staleThreshold);

        // targetStoreId filtering removed - missoes_execucao doesn't have store_id column

        const { data: staleMissions, error: staleError } = await query;
        console.log(`[GUARDIAN DEBUG] Stale Missions Found: ${staleMissions?.length || 0}`);
        if (staleError) console.error('[GUARDIAN DEBUG] Query Error:', staleError);

        if (staleMissions) {
            staleMissions.forEach(m => {
                issues.push({
                    type: 'MISSÃO_ZUMBI',
                    missionId: m.id,
                    severity: 'MEDIUM',
                    description: `A missão '${m.tipo_missao}' está ${m.status} há muito tempo (desde ${new Date(m.data_registro.includes('Z') || m.data_registro.includes('+') ? m.data_registro : m.data_registro + '-03:00').toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' })}).`,
                    suggestedAction: 'Finalizar como "Não Realizado" ou contatar Gerente.',
                    timestamp: m.data_registro
                });
            });
        }

        // 2. CHECK FOR AMBIGUOUS "COMPLETED BUT PENDING"
        // Definition: Has 'url_foto' or 'data_conclusao' BUT status is still 'pendente'.
        // This happens if the AI extracted data but failed to flip the status switch.

        let ambiguousQuery = supabaseAdmin
            .from('missoes_execucao')
            .select('id, tipo_missao, status, url_foto, data_conclusao, data_registro')
            .eq('status', 'pendente')
            .not('url_foto', 'is', null); // Has photo but pending

        // targetStoreId filtering removed - missoes_execucao doesn't have store_id column

        const { data: ambiguousUnique, error: ambError } = await ambiguousQuery;

        if (ambiguousUnique) {
            ambiguousUnique.forEach(m => {
                issues.push({
                    type: 'ESTADO_AMBÍGUO',
                    missionId: m.id,
                    severity: 'HIGH',
                    description: `A missão ${m.id} tem foto/evidência mas ainda consta como PENDENTE.`,
                    suggestedAction: 'Auto-concluir missão agora.',
                    timestamp: m.data_registro
                });
            });
        }

        // FORCE SORT DESCENDING (Newest First)
        issues.sort((a, b) => {
            const tA = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tB = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tB - tA;
        });

        const summary = `Varredura Completa. ${issues.length} problemas encontrados.`;
        console.log(`[GUARDIAN] ${summary}`);

        return {
            issues,
            summary
        };
    }
);

/**
 * Server Action to bulk-resolve Zombie Missions.
 * Updates all stale pending missions to 'cancelado'.
 * @param missionIds - Optional array of specific mission IDs to cancel (must be zombie missions)
 * @param storeId - Optional store filter
 */
export async function resolveZombieMissions(missionIds?: number[], storeId?: string) {
    console.log('[GUARDIAN] Executing Zombie Wipe...', { missionIds, storeId });
    const supabaseAdmin = getSupabaseAdmin();
    const nowBrt = new Date(new Date().getTime() - 3 * 60 * 60 * 1000);
    const staleThreshold = subMinutes(nowBrt, 30).toISOString().replace('Z', '');
    const autoObs = '\n[AUTO] Cancelado automaticamente pelo sistema (Guardião) por inatividade.';

    let query = supabaseAdmin
        .from('missoes_execucao')
        .update({
            status: 'cancelado',
            obs: autoObs
        })
        .eq('status', 'pendente')
        .lt('data_registro', staleThreshold);

    // If specific mission IDs provided, filter by those
    if (missionIds && missionIds.length > 0) {
        query = query.in('id', missionIds);
    }

    // storeId filtering removed - missoes_execucao doesn't have store_id column

    const { error, count } = await query.select();

    if (error) {
        console.error('[GUARDIAN] Wipe failed:', error);
        throw new Error('Falha ao cancelar missões.');
    }

    revalidatePath('/admin/guardian');
    return { success: true, count };
}

/**
 * Server Action to backup Mission Database to Firebase Storage.
 */
export async function backupDatabase() {
    console.log('[GUARDIAN] Starting Database Backup...');
    const supabaseAdmin = getSupabaseAdmin();

    // 1. Fetch all data from missoes_execucao
    // We limit to 5000 for safety or paginate if needed. For now, full dump.
    const { data, error } = await supabaseAdmin
        .from('missoes_execucao')
        .select('*')
        .order('data_registro', { ascending: false });

    if (error) {
        throw new Error(`Backup failed fetch: ${error.message}`);
    }

    if (!data || data.length === 0) {
        return { success: false, message: 'No data to backup.' };
    }

    // 2. Prepare JSON content
    const backupContent = JSON.stringify(data, null, 2);
    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `backups/missoes_execucao_${dateStr}.json`;

    // 3. Upload to Firebase Storage using Admin SDK
    try {
        // Dynamic import to avoid edge runtime issues if any (though this is 'use server' node environment)
        const { getFirebaseAdmin } = await import('@/lib/firebase/admin');
        const { storage } = getFirebaseAdmin();
        const bucket = storage.bucket('ronaldo-amanae.firebasestorage.app');
        const file = bucket.file(fileName);

        await file.save(backupContent, {
            contentType: 'application/json',
            metadata: {
                created: new Date().toISOString(),
                rowCount: data.length
            }
        });

        console.log(`[GUARDIAN] Backup saved to ${fileName}`);
        return { success: true, fileName, count: data.length };

    } catch (e: any) {
        console.error('[GUARDIAN] Storage Upload Failed:', e);
        throw new Error(`Upload failed: ${e.message}`);
    }
}

/**
 * Calculates average response time for today.
 * Logic: Average time between an AI message and the next User message.
 */
async function calculateAverageResponseTime(): Promise<string> {
    try {
        const supabaseAdmin = getSupabaseAdmin();
        const today = new Date();
        today.setHours(0, 0, 0, 0);

        // Fetch recent messages
        const { data: messages } = await supabaseAdmin
            .from('n8n_historico_mensagens')
            .select('message, created_at, session_id')
            .gte('created_at', today.toISOString())
            .order('session_id', { ascending: true })
            .order('created_at', { ascending: true });

        if (!messages || messages.length === 0) return "Sem dados hoje";

        let totalTimeMs = 0;
        let pairCount = 0;

        // Group by Session
        const sessions: Record<string, any[]> = {};
        messages.forEach(m => {
            if (!sessions[m.session_id]) sessions[m.session_id] = [];
            sessions[m.session_id].push(m);
        });

        Object.values(sessions).forEach(sessionMsgs => {
            for (let i = 0; i < sessionMsgs.length - 1; i++) {
                const current = sessionMsgs[i];
                const next = sessionMsgs[i + 1];

                // Check if Current is AI and Next is User (assuming message structure or analyzing content types)
                // The current supabase client structure for logMessageToSupabase saves { type: 'ai' } in message column JSON
                // verifying...
                let isCurrentAI = false;
                let isNextUser = false;

                try {
                    const cContent = typeof current.message === 'string' ? JSON.parse(current.message) : current.message;
                    const nContent = typeof next.message === 'string' ? JSON.parse(next.message) : next.message;

                    isCurrentAI = cContent.type === 'ai';
                    // If it's not AI, we assume it's user or we check logic. 
                    // Usually user messages come from N8N webhook which might check format.
                    // For now, let's assume if type != ai, it's user.
                    isNextUser = nContent.type !== 'ai';
                } catch (e) { continue; }

                if (isCurrentAI && isNextUser) {
                    const diff = new Date(next.created_at).getTime() - new Date(current.created_at).getTime();
                    // Filter out huge gaps (> 2 hours) which might be idle sessions
                    if (diff < 7200000) {
                        totalTimeMs += diff;
                        pairCount++;
                    }
                }
            }
        });

        if (pairCount === 0) return "N/A";
        const avgMinutes = Math.round((totalTimeMs / pairCount) / 60000);
        return `${avgMinutes} min`;

    } catch (e) {
        console.error("Error calculating response time:", e);
        return "Erro calc.";
    }
}

/**
 * Server Action to Send Guardian Report via WhatsApp
 */
export async function sendGuardianReport(targetPhone: string) {
    try {
        console.log(`[GUARDIAN] Generating Report for ${targetPhone}...`);

        // 1. Gather Data
        const { getDashboardKPIs } = await import('@/lib/actions/dashboard');
        const kpis = await getDashboardKPIs();
        const avgResponse = await calculateAverageResponseTime();

        // 2. Generate Smart Analysis using Genkit
        const prompt = `
            Você é o Guardião Operacional da Cafeteria. Gere um resumo executivo curto e direto para o grupo de gestão.
            Use emojis. Fale em tom profissional mas ágil.
            
            Dados:
            - Data: ${new Date().toLocaleDateString('pt-BR')}
            - Total Missões Hoje: ${kpis.totalMissions}
            - Pendentes: ${kpis.pendingMissions}
            - Taxa de Conformidade (Auditorias): ${kpis.complianceRate} (Absolute Count)
            - Financeiro Declarado: ${kpis.totalFinancialValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            - Tempo Médio de Resposta dos Gerentes: ${avgResponse}

            Destaque anomalias se houver (muitas pendentes ou tempo de resposta alto).
            Finalize com uma frase de status geral (Operação Saudável / Atenção Requerida).
        `;

        const { text } = await ai.generate({
            prompt: prompt,
            model: 'googleai/gemini-1.5-flash',
            config: { temperature: 0.7 }
        });

        // 3. Send via Chatwoot
        const { sendWhatsAppMessage } = await import('@/lib/chatwoot-client');
        const result = await sendWhatsAppMessage(targetPhone, "Admin", text);

        if (!result.success) {
            throw new Error(`Chatwoot Error: ${result.message}`);
        }

        return { success: true };

    } catch (error: any) {
        console.error('[GUARDIAN] Report Failed:', error);
        return { success: false, message: error.message };
    }
}
