'use server';

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { supabase, createMissionInSupabase, logMessageToSupabase } from '@/lib/supabase/client';
import { CAMPAIGN_DICTIONARY } from '@/lib/config/campaigns';
import { sendWhatsAppMessage as chatwootSendMessage } from '@/lib/chatwoot-client';
import { revalidatePath } from 'next/cache';

// Helper Logging Function
async function logToCampaign(campaignId: string, message: string, level: string = 'info') {
  try {
    await supabase.from('campanhas_logs').insert({
      campanha_id: campaignId,
      message: message,
      level: level.toUpperCase(),
      created_at: new Date().toISOString()
    });
  } catch (e) {
    console.error("Failed to log to campaign:", e);
  }
}

const CampaignWorkerInputSchema = z.object({
  campaignId: z.string().describe('The ID of the campaign to run.'),
  ignoreSchedule: z.boolean().optional().default(false).describe('Whether to ignore the schedule check.')
});

export type CampaignWorkerInput = z.infer<typeof CampaignWorkerInputSchema>;

export async function runCampaignWorker(campaignId: string, ignoreSchedule = false) {
  console.log(`[WORKER ENTRY] runCampaignWorker called for campaign ${campaignId} (ignoreSchedule: ${ignoreSchedule})`);
  runCampaignWorkerFlow({ campaignId, ignoreSchedule });
}

function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function sendWhatsappMessage(phone: string, message: string, contactName: string) {
  try {
    const result = await chatwootSendMessage(phone, contactName || "Contato", message);
    if (!result.success) {
      throw new Error(result.message || "Erro desconhecido no Chatwoot");
    }
    return { success: true, message: "Mensagem enviada via Chatwoot.", data: result };
  } catch (e: any) {
    return { success: false, message: e.message };
  }
}

const runCampaignWorkerFlow = ai.defineFlow(
  {
    name: 'runCampaignWorkerFlow',
    inputSchema: CampaignWorkerInputSchema,
    outputSchema: z.void(),
  },
  async ({ campaignId, ignoreSchedule }) => {
    console.log(`[WORKER FLOW] Started for ${campaignId}`);
    await logToCampaign(campaignId, 'Iniciando execução da campanha...', 'INFO');

    try {
      // 1. Fetch Campaign from Supabase
      const { data: campaign, error: campaignError } = await supabase
        .from('campanhas')
        .select('*')
        .eq('id', campaignId)
        .single();

      if (campaignError || !campaign) {
        console.error("Campaign not found in Supabase:", campaignError);
        await logToCampaign(campaignId, 'Erro fatal: Campanha não encontrada.', 'ERROR');
        return;
      }

      // Update Status to Running
      await supabase.from('campanhas').update({ status: 'running' }).eq('id', campaignId);

      const min_delay = campaign.min_delay || 15;
      const max_delay = campaign.max_delay || 45;
      const messageTemplates = campaign.message_templates || ['Olá {nome}, mensagem de teste.'];
      const instanceName = campaign.instance_name || '';

      // 2. Fetch Pending Contacts
      const { data: envios, error: enviosError } = await supabase
        .from('campanhas_envios')
        .select(`
          id,
          status,
          contato_id,
          dynamic_fields,
          contatos_erp (
            id_contato,
            nome,
            telefone,
            store_id
          )
        `)
        .eq('campanha_id', campaignId)
        .in('status', ['pending', 'failed']);

      if (enviosError) {
        console.error("Error fetching envios:", enviosError);
        await logToCampaign(campaignId, 'Erro ao buscar contatos pendentes: ' + enviosError.message, 'ERROR');
        await supabase.from('campanhas').update({ status: 'failed' }).eq('id', campaignId);
        return;
      }

      if (!envios || envios.length === 0) {
        console.log("No pending contacts found. Completing campaign.");
        await logToCampaign(campaignId, 'Nenhum contato pendente encontrado. Campanha concluída.', 'INFO');
        if (campaign.recorrente) {
          await supabase.from('campanhas').update({ status: 'scheduled' }).eq('id', campaignId);
          await logToCampaign(campaignId, 'Campanha recorrente reagendada para a próxima execução.', 'INFO');
        } else {
          await supabase.from('campanhas').update({ status: 'completed' }).eq('id', campaignId);
        }
        return;
      }

      console.log(`Found ${envios.length} contacts to process.`);
      await logToCampaign(campaignId, `Encontrados ${envios.length} contatos pendentes. Iniciando envio...`, 'INFO');

      for (let i = 0; i < envios.length; i++) {
        const envio = envios[i];

        // Re-check campaign status (Stop logic)
        const { data: currentCamp } = await supabase.from('campanhas').select('status').eq('id', campaignId).single();
        if (currentCamp?.status === 'stopping' || currentCamp?.status === 'stopped' || currentCamp?.status === 'pausada') {
          console.log("Campaign stopped/paused. Exiting worker.");
          await logToCampaign(campaignId, 'Campanha pausada ou parada pelo usuário.', 'WARNING');
          await supabase.from('campanhas').update({ status: 'stopped' }).eq('id', campaignId);
          return;
        }

        // Handle nested contact data — fallback to dynamic_fields when ERP join is unavailable
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const erpData: any = envio.contatos_erp;
        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const dynFields: any = (envio as any).dynamic_fields;

        /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
        const contactData: any = erpData || (dynFields ? {
          nome: dynFields.nome,
          telefone: dynFields.telefone,
          store_id: dynFields.storeId,
        } : null);

        if (!contactData) {
          console.warn(`Envio ${envio.id} has no contact data. Skipping.`);
          await supabase.from('campanhas_envios').update({ status: 'failed', error_message: 'Contact data missing' }).eq('id', envio.id);
          continue;
        }

        const contactName = contactData.nome || 'N/A';
        const contactPhone = contactData.telefone || '';
        let cleanPhone = String(contactPhone).replace(/\D/g, '');
        if (cleanPhone.length >= 10 && !cleanPhone.startsWith('55')) {
          cleanPhone = '55' + cleanPhone;
        }

        console.log(`Processing: ${contactName} (${cleanPhone})`);

        // Prepare Message
        const template = messageTemplates[Math.floor(Math.random() * messageTemplates.length)];
        let finalMessage = template;

        // Replace {nome}
        const firstName = contactName.split(' ')[0] || 'Cliente';
        finalMessage = finalMessage.replace(/{nome}/g, firstName);

        // Replace dynamic fields
        if (contactData.dynamic_fields) {
          for (const key in contactData.dynamic_fields) {
            const val = contactData.dynamic_fields[key];
            finalMessage = finalMessage.replace(new RegExp(`{${key}}`, 'g'), val || '');
          }
        }

        // Send Message
        const result = await sendWhatsappMessage(cleanPhone, finalMessage, contactName);

        if (result.success) {
          await supabase.from('campanhas_envios').update({ status: 'sent', updated_at: new Date().toISOString() }).eq('id', envio.id);
          await logToCampaign(campaignId, `Mensagem enviada para ${contactName}`, 'SUCCESS');
        } else {
          console.error(`Failed to send to ${cleanPhone}: ${result.message}`);
          await logToCampaign(campaignId, `Falha ao enviar para ${contactName}: ${result.message}`, 'ERROR');
          await supabase.from('campanhas_envios').update({ status: 'failed', error_message: result.message }).eq('id', envio.id);
        }

        // Delay
        if (i < envios.length - 1) {
          const delay = Math.floor(Math.random() * (max_delay - min_delay + 1) + min_delay);
          await logToCampaign(campaignId, `Aguardando ${delay}s para próximo envio...`, 'INFO');
          await sleep(delay * 1000);
        }

        // AUTO-CREATE MISSION
        try {
          // Use original phone from DB to ensure match
          const missionPhone = contactData.telefone;
          await logToCampaign(campaignId, `Criando missão para ${contactName}...`, 'INFO');

          const missionResult = await createMissionInSupabase({
            phone: missionPhone,
            missionType: campaign.mission_type || 'Outros',
            missionSubtype: campaign.mission_subtype,
            status: 'pendente',
            enviar_foto: campaign.enviar_foto,
            obs: `[AUTO] Iniciada pela campanha ${campaign.nome}`
          });

          if (!missionResult.success) {
            await logToCampaign(campaignId, `Erro ao criar missão: ${missionResult.error}`, 'WARNING');
          } else {
            await logToCampaign(campaignId, `Missão criada com sucesso (ID: ${missionResult.data.id})`, 'SUCCESS');

            // LINK MISSION TO SHIPMENT RECORD
            // This is critical for the UI to show the 'Ver Missão' button and for n8n to know the context.
            await supabase.from('campanhas_envios')
              .update({ mission_id: missionResult.data.id })
              .eq('id', envio.id);
          }

          // LOG MESSAGE TO N8N HISTORY (Context for Bot)
          try {
            await logMessageToSupabase(
              cleanPhone, // usa o telefone limpo (com ou sem 55? n8n usa 55+DDD+Numero)
              finalMessage,
              {
                source: 'campaign_worker',
                campaignId: campaignId,
                campaignName: campaign.nome,
                missionId: missionResult.success ? missionResult.data.id : null
              }
            );
            await logToCampaign(campaignId, `Mensagem registrada no histórico n8n para ${contactName}`, 'INFO');
          } catch (histError: any) {
            console.error("Failed to log message to n8n history:", histError);
            await logToCampaign(campaignId, `AVISO: Falha ao registrar mensagem no histórico n8n: ${histError.message}`, 'WARNING');
            // Não falha o worker por isso, mas registra o problema
          }

        } catch (err: any) {
          console.error("Failed to auto-create mission:", err);
          await logToCampaign(campaignId, `Exceção ao criar missão: ${err.message}`, 'ERROR');
        }
      }

      if (campaign.recorrente) {
        await supabase.from('campanhas').update({ status: 'scheduled' }).eq('id', campaignId);
        console.log("Campaign finished (recurring). Reset to scheduled.");
        await logToCampaign(campaignId, 'Execução da campanha recorrente finalizada. Reagendada.', 'SUCCESS');
      } else {
        await supabase.from('campanhas').update({ status: 'completed' }).eq('id', campaignId);
        console.log("Campaign finished.");
        await logToCampaign(campaignId, 'Execução da campanha finalizada com sucesso!', 'SUCCESS');
      }

    } catch (e: any) {
      console.error("Critical worker error:", e);
      await logToCampaign(campaignId, `Erro crítico na execução: ${e.message}`, 'ERROR');
      await supabase.from('campanhas').update({ status: 'failed' }).eq('id', campaignId);
    }
  }
);
