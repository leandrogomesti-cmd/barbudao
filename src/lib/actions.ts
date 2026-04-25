'use server';

import { revalidatePath } from 'next/cache';
import type { Campaign, CampaignContact, CampaignLog, CampaignStatus, CampaignSummary, Contact, ContactHistoryItem, WhatsAppInstance, UserPlanInfo, UserSettings } from './types';
import { db } from './firebase/client';
// import { collection, addDoc, query, getDocs, orderBy, Timestamp, doc, getDoc, updateDoc, deleteDoc, writeBatch, increment, where, serverTimestamp, collectionGroup, documentId, setDoc, deleteField } from 'firebase/firestore';
import { runCampaignWorker } from '@/ai/flows/run-campaign-worker';


// Chatwoot integration (replacing legacy messaging)
import { getStoreNameMap } from './store-utils';
import { getChatwootInboxStatus } from './chatwoot-client';
import { supabase } from '@/lib/supabase/client';

import { getSupabaseAdmin } from '@/lib/supabase/admin';


/**
 * Retorna uma lista de todas as campanhas lendo DIRETAMENTE DO FIRESTORE.
 * Lança um erro se a busca falhar.
 */
// Buscar campanhas do Supabase (Admin para ver tudo ou filtrar por owner)
export async function getCampaigns(ownerId?: string): Promise<CampaignSummary[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    let query = supabaseAdmin
      .from('campanhas')
      .select('*')
      .order('created_at', { ascending: false });

    // Se ownerId fornecido, filtrar. Se não, admin vê tudo (ou ajustar conforme regra de negócio)
    // Aqui mantemos a lógica original: ownerId ou null (para templates globais/z-api)
    if (ownerId) {
      query = query.or(`owner_id.eq.${ownerId},owner_id.is.null`);
    }

    const { data: campanhas, error } = await query;

    if (error) {
      console.error('[SERVER ACTION ERROR] Failed to fetch campaigns from Supabase:', error.message);
      throw new Error(error.message);
    }

    if (!campanhas || campanhas.length === 0) {
      return [];
    }

    const nameMap = await getStoreNameMap();

    // ✅ CORRIGIDO: Buscar counts reais de campanhas_envios E store_ids dinâmicos
    const campaignIds = campanhas.map((c: any) => c.id);
    const { data: envios } = await supabase
      .from('campanhas_envios')
      .select('campanha_id, status, contato_id, dynamic_fields, contatos_erp(store_id)')
      .in('campanha_id', campaignIds);

    // Contar envios, contatos únicos e LOJAS por campanha
    const statsMap: Record<string, { total: number, sent: number, failed: number, contactIds: Set<string>, storeIds: Set<string> }> = {};

    envios?.forEach((env: any) => {
      const cid = env.campanha_id;
      if (!statsMap[cid]) {
        statsMap[cid] = { total: 0, sent: 0, failed: 0, contactIds: new Set(), storeIds: new Set() };
      }
      statsMap[cid].total++;
      if (env.status === 'sent' || env.status === 'delivered') {
        statsMap[cid].sent++;
      } else if (env.status === 'failed') {
        statsMap[cid].failed++;
      }
      if (env.contato_id) {
        statsMap[cid].contactIds.add(env.contato_id);
      }

      // Resolução de Store ID: contatos_erp > dynamic_fields > null
      const storeId = env.contatos_erp?.store_id || env.dynamic_fields?.storeId;
      if (storeId) {
        statsMap[cid].storeIds.add(String(storeId));
      }
    });

    // Converter formato Supabase → Frontend
    const campaigns: CampaignSummary[] = campanhas.map((c: any) => {
      // Priorizar store_ids calculados dinamicamente, fallback para coluna (que pode estar velha)
      const computedStoreIds = statsMap[c.id]?.storeIds
        ? Array.from(statsMap[c.id].storeIds)
        : (c.store_ids || []);

      const stats = statsMap[c.id] || { total: 0, sent: 0, failed: 0, contactIds: new Set() };

      // Mapear store_ids para objetos {id, name}
      const stores = computedStoreIds.map((id: string) => ({
        id,
        name: nameMap[id] || `Loja ${id}`
      }));

      // Converter cron_schedule → scheduling object
      // Converter cron_schedule / colunas novas → scheduling object
      let scheduling = undefined;

      // Se tiver dias da semana definidos, usá-los (Lógica correta)
      if (c.dias_semana && c.dias_semana.length > 0) {
        scheduling = {
          enabled: true,
          daysOfWeek: c.dias_semana,
          startTime: c.horario_inicio ? c.horario_inicio.slice(0, 5) : '09:00',
          endTime: c.horario_fim ? c.horario_fim.slice(0, 5) : '18:00'
        };
      }
      // Fallback para agendamento legado

      return {
        id: c.id,
        name: c.nome || 'Campanha sem nome',
        status: c.status,
        stats: {
          total: stats.contactIds.size,  // ✅ Contatos únicos
          sent: stats.sent,              // ✅ Enviados
          delivered: stats.sent,
          failed: stats.failed           // ✅ Falhados
        },
        store_ids: computedStoreIds,
        stores: stores,
        scheduling: scheduling,
      };
    });

    return campaigns;

  } catch (error: any) {
    console.error("[SERVER ACTION ERROR] Failed to fetch campaigns from Supabase:", error.message);
    throw new Error(error.message);
  }
}

/**
 * Busca os dados de uma campanha específica do Supabase.
 */
export async function getCampaignById(id: string): Promise<Campaign | undefined> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    const { data: campanha, error } = await supabaseAdmin
      .from('campanhas')
      .select('*')
      .eq('id', id)
      .single();

    if (error || !campanha) {
      console.error(`[DEBUG] getCampaignById FAILED: Campaign ${id} not found in Supabase.`);
      return undefined;
    }

    console.log(`[DEBUG] getCampaignById SUCCESS: Found ${id} - ${campanha.nome}`);

    // Nova Lógica de Stats: Contar da tabela real de envios para garantir consistência
    const { data: envios } = await supabaseAdmin
      .from('campanhas_envios')
      .select('status')
      .eq('campanha_id', id);

    const stats_calculated = {
      total: envios?.length || 0,
      sent: envios?.filter((e: any) => e.status === 'sent').length || 0,
      delivered: envios?.filter((e: any) => e.status === 'delivered').length || 0,
      failed: envios?.filter((e: any) => ['failed', 'error'].includes(e.status)).length || 0
    };

    const nameMap = await getStoreNameMap();
    const storeIds = campanha.store_ids || [];

    // Mapear store_ids para objetos {id, name}
    const stores = storeIds.map((id: string) => ({
      id,
      name: nameMap[id] || `Loja ${id}`
    }));

    // Converter timestamps
    const createdAtIso = campanha.created_at
      ? new Date(campanha.created_at).toISOString()
      : new Date().toISOString();

    // Construir objeto de agendamento usando os novos campos
    let scheduling = undefined;

    // Se tiver dias da semana definidos, consideramos que tem agendamento
    if (campanha.dias_semana && campanha.dias_semana.length > 0) {
      scheduling = {
        enabled: true,
        daysOfWeek: campanha.dias_semana,
        startTime: campanha.horario_inicio ? campanha.horario_inicio.slice(0, 5) : '09:00', // Remover segundos se houver
        endTime: campanha.horario_fim ? campanha.horario_fim.slice(0, 5) : '18:00'
      };
    }
    // Fallback para cron_schedule legado (apenas se não tiver os novos campos)
    else if (campanha.cron_schedule) {
      scheduling = {
        enabled: true,
        daysOfWeek: [],
        startTime: '00:00',
        endTime: '23:59'
      };
    }

    return {
      id: campanha.id,
      name: campanha.nome,
      status: campanha.status,
      messageTemplates: campanha.message_templates || [],
      createdAt: createdAtIso,
      delay: { min: campanha.min_delay || 5, max: campanha.max_delay || 10 },
      stats: stats_calculated,
      owner_id: campanha.owner_id,
      instance_name: 'WhatsApp (Chatwoot)',
      scheduling: scheduling,
      enviar_foto: campanha.enviar_foto,
      mission_type: campanha.mission_type,
      stores: stores,
      store_ids: storeIds
    };

  } catch (error: any) {
    console.error(`Falha ao buscar a campanha ${id} do Supabase:`, error);
    if (error.code) console.error(`[DEBUG] Error code: ${error.code}`);
    return undefined;
  }
}

export async function createCampaign(formData: FormData, userId: string): Promise<{ success: boolean; message: string; campaignId?: string }> {
  const name = formData.get('name') as string;
  const messageTemplates = formData.getAll('messageTemplates[]') as string[];
  const instanceId = formData.get('instanceId') as string;
  const min_delay = parseInt(formData.get('min_delay') as string, 10);
  const max_delay = parseInt(formData.get('max_delay') as string, 10);
  const contactSource = formData.get('contactSource') as 'csv' | 'list' | 'erp';
  const mission_type = formData.get('mission_type') as string;
  const mission_subtype = formData.get('sub_type') as string;
  const enviar_foto = formData.get('enviar_foto') === 'true';

  // Scheduling Extraction
  const schedulingEnabled = formData.get('schedulingEnabled') === 'true';
  let scheduling = undefined;
  if (schedulingEnabled) {
    const days = JSON.parse(formData.get('schedulingDays') as string || '[]');
    const startTime = formData.get('schedulingStartTime') as string;
    const endTime = formData.get('schedulingEndTime') as string;

    if (!startTime || !endTime || days.length === 0) {
      return { success: false, message: 'Agendamento inválido: selecione dias e horários.' };
    }
    scheduling = {
      enabled: true,
      daysOfWeek: days,
      startTime,
      endTime
    };
  }

  if (!userId) {
    return { success: false, message: 'Usuário não autenticado.' };
  }

  // Validações básicas
  if (!name || messageTemplates.length === 0 || isNaN(min_delay) || isNaN(max_delay)) {
    return { success: false, message: 'Todos os campos são obrigatórios.' };
  }
  if (messageTemplates.some(t => t.trim() === '')) {
    return { success: false, message: 'Nenhuma variação de mensagem pode estar vazia.' };
  }
  if (min_delay >= max_delay) {
    return { success: false, message: 'O intervalo mínimo deve ser menor que o intervalo máximo.' };
  }

  try {
    // Chatwoot Migration: We no longer check for Evolution/Z-API Instances.
    // ... logic ...

    console.log('[DEBUG] createCampaign - Start Trace');
    const formDataObj = Object.fromEntries(formData.entries());
    // Sanitize file object for logging
    const safeFormData = { ...formDataObj };
    if (safeFormData.contactsFile) safeFormData.contactsFile = '[FILE]';
    console.log('[DEBUG] FormData Keys:', Object.keys(safeFormData));
    console.log(`[DEBUG] contactSource: ${contactSource}`);
    console.log(`[DEBUG] instanceId: ${instanceId}`);

    let contacts: CampaignContact[] = [];

    // Processar contatos com base na fonte
    if (contactSource === 'csv') {
      console.error('[ERROR] CSV source is disabled but was requested.');
      return { success: false, message: 'Importação por CSV está desativada.' };
      /*
      console.log('[DEBUG] Processing CSV source');
      ... CSV LOGIC REMOVED/COMMENTED TO PREVENT INDEXOF ERROR ...
      */
    } else if (contactSource === 'list') {
      console.log('[DEBUG] Processing LIST source');
      const selectedContactIdsStr = formData.get('selectedContactIds') as string;

      if (!selectedContactIdsStr) {
        return { success: false, message: 'Nenhum contato da lista foi selecionado.' };
      }

      let selectedContactIds: string[] = [];
      try {
        selectedContactIds = JSON.parse(selectedContactIdsStr);
      } catch (e) {
        console.error('[DEBUG] Failed to parse selectedContactIds', e);
        return { success: false, message: 'Formato de IDs de contato inválido.' };
      }

      if (!Array.isArray(selectedContactIds) || selectedContactIds.length === 0) {
        return { success: false, message: 'Nenhum contato da lista foi selecionado.' };
      }

      console.log(`[DEBUG] IDs received: ${selectedContactIds.length}`);

      // Todos os IDs agora vêm do Supabase (formato 'erp-123')
      const erpIds = selectedContactIds
        .filter(id => id.startsWith('erp-'))
        .map(id => id.replace('erp-', '')); // Remove prefix for query

      const fetchedContacts: CampaignContact[] = [];

      // Fetch Supabase Contacts (ERP)
      if (erpIds.length > 0) {
        console.log(`[DEBUG] Fetching ${erpIds.length} ERP contacts from Supabase...`);
        const { data: supabaseData, error: supabaseError } = await supabase
          .from('contatos_erp')
          .select('id_contato, nome, telefone, store_id')
          .in('id_contato', erpIds);

        if (supabaseError) {
          console.error('[ERROR] Failed to fetch ERP contacts:', supabaseError);
          return { success: false, message: 'Erro ao buscar contatos do banco de dados.' };
        }

        if (supabaseData) {
          supabaseData.forEach((c: any) => {
            fetchedContacts.push({
              nome: c.nome,
              telefone: c.telefone,
              status: 'pending',
              dynamic_fields: {
                nome: c.nome,
                telefone: c.telefone,
                storeId: c.store_id,
                id_contato: c.id_contato
              }
            });
          });
        }
      }

      contacts = fetchedContacts;
      console.log(`[DEBUG] Total contacts resolved: ${contacts.length}`);


    } else if (contactSource === 'erp') {
      console.warn('[WARN] ERP source is deprecated. Contacts must be provided in payload or selected from list.');
      // If payload has contacts, use them (handled before?) 
      // Actually, if source is 'erp' and no contacts provided in deprecated way, we fail.
      // But preserving this block structure to avoid breaking if frontend sends it.
      contacts = [];
    }

    // ... contact resolution logic above ...
    console.log(`[DEBUG] Contacts resolved. Count: ${contacts.length}`);

    if (contacts.length === 0) {
      return { success: false, message: 'Nenhum contato válido foi encontrado para a campanha.' };
    }

    console.log('[DEBUG] Calling createCampaignCore...');
    const result = await createCampaignCore({
      name,
      messageTemplates,
      instanceId,
      min_delay,
      max_delay,
      scheduling,
      contacts,
      userId,
      mission_type,
      mission_subtype,
      enviar_foto,
    });

    if (result.success) {
      revalidatePath('/campaigns');
      revalidatePath('/kanban');
    }

    return result;

  } catch (error: any) {
    console.error('Error creating campaign:', error);
    return { success: false, message: `Falha ao criar campanha: ${error.message}` };
  }
}

export interface CreateCampaignCoreInput {
  name: string;
  messageTemplates: string[];
  instanceId: string;
  min_delay: number;
  max_delay: number;
  scheduling?: {
    enabled: boolean;
    daysOfWeek: number[];
    startTime: string;
    endTime: string;
  };
  contacts: CampaignContact[];
  userId: string;
  enviar_foto?: boolean;
  mission_type?: string;
  mission_subtype?: string;
}

export async function createCampaignCore(input: CreateCampaignCoreInput): Promise<{ success: boolean; message: string; campaignId?: string }> {
  const { name, messageTemplates, instanceId, min_delay, max_delay, scheduling, contacts, userId, mission_type, mission_subtype } = input;

  // Basic Validation
  if (!name || messageTemplates.length === 0 || isNaN(min_delay) || isNaN(max_delay)) {
    return { success: false, message: 'Todos os campos são obrigatórios.' };
  }
  if (messageTemplates.some(t => t.trim() === '')) {
    return { success: false, message: 'Nenhuma variação de mensagem pode estar vazia.' };
  }
  if (min_delay >= max_delay) {
    return { success: false, message: 'O intervalo mínimo deve ser menor que o intervalo máximo.' };
  }

  try {
    const finalInstanceName = "WhatsApp (Chatwoot)";

    // Checagem de plano de assinatura (se habilitado)
    const subscriptionsEnabled = (await getUserSettings(userId))?.subscriptionsEnabled;
    if (subscriptionsEnabled) {
      const planInfo = await getUserPlan(userId);
      if (!planInfo) return { success: false, message: 'Não foi possível verificar seu plano.' };
      if (planInfo.planStatus !== 'active') return { success: false, message: `Seu plano está ${planInfo.planStatus}. Não é possível criar campanhas.` };
      if (!planInfo.hasUnlimitedSends) {
        const todaysSends = await getTodaysSendsCount(userId);
        const remainingSends = planInfo.dailySendLimit - todaysSends;
        if (contacts.length > remainingSends) {
          return { success: false, message: `Limite de envios excedido. Você tem ${remainingSends} envios restantes, mas tentou criar uma campanha com ${contacts.length} contatos.` };
        }
      }
    }

    // Calculate unique store IDs
    const rawStoreIds = contacts.map(c => c.dynamic_fields?.storeId).filter(Boolean);
    const storeIds = Array.from(new Set(rawStoreIds)) as string[];

    // Convert scheduling to cron_schedule
    let cronSchedule: string | null = null;
    let recorrente = false;

    if (scheduling && scheduling.enabled) {
      recorrente = true;
      // Converter scheduling para cron_schedule
      const [hour, minute] = scheduling.startTime.split(':').map(Number);
      const days = scheduling.daysOfWeek.length > 0
        ? scheduling.daysOfWeek.join(',')
        : '*';
      cronSchedule = `${minute} ${hour} * * ${days}`;
    }

    // Preparar dados para Supabase
    const newCampaignData = {
      nome: input.name,
      status: (recorrente ? 'scheduled' : 'draft') as CampaignStatus, // Recurring campaigns ready to run
      owner_id: userId,
      message_templates: input.messageTemplates,
      min_delay: min_delay,
      max_delay: max_delay,
      stats_total: contacts.length,
      stats_sent: 0,
      stats_failed: 0,
      stats_pending: contacts.length,
      enviar_foto: input.enviar_foto ?? false,
      mission_type: mission_type || 'Outros',
      mission_subtype: mission_subtype || null,
      recorrente: recorrente,
      cron_schedule: cronSchedule,
      dias_semana: scheduling?.enabled ? scheduling.daysOfWeek : null,
      horario_inicio: scheduling?.enabled ? scheduling.startTime : null,
      horario_fim: scheduling?.enabled ? scheduling.endTime : null,
      store_ids: storeIds,
      created_by: userId
    };

    // Inserir campanha no Supabase
    const { data: campaignData, error: campaignError } = await supabase
      .from('campanhas')
      .insert(newCampaignData)
      .select()
      .single();

    if (campaignError || !campaignData) {
      console.error('Erro ao criar campanha no Supabase:', campaignError);
      throw new Error(campaignError?.message || 'Falha ao criar campanha');
    }

    const campaignId = campaignData.id;

    // Salvar contatos em campanhas_envios
    // Se contato vier do ERP (com id_contato), usamos contato_id
    // Senão, salvamos dados em dynamic_fields (compatibilidade com Firestore)
    const enviosData = contacts.map(contact => ({
      campanha_id: campaignId,
      contato_id: contact.dynamic_fields?.id_contato || null, // Se vier do ERP
      contato_telefone: contact.telefone || contact.dynamic_fields?.telefone || '',
      status: 'pending',
      // Guardar dados do contato para referência
      dynamic_fields: {
        nome: contact.nome,
        telefone: contact.telefone,
        ...contact.dynamic_fields
      }
    }));

    // Inserir em lotes de 500
    const batchSize = 500;
    for (let i = 0; i < enviosData.length; i += batchSize) {
      const chunk = enviosData.slice(i, i + batchSize);
      const { error: enviosError } = await supabase
        .from('campanhas_envios')
        .insert(chunk);

      if (enviosError) {
        console.error('Erro ao inserir envios:', enviosError);
        // Tentar deletar campanha criada se envios falharem
        await supabase.from('campanhas').delete().eq('id', campaignId);
        throw new Error('Falha ao criar envios da campanha');
      }
    }

    return { success: true, message: `Campanha criada com ${contacts.length} contatos!`, campaignId };



  } catch (error: any) {
    console.error('Error in createCampaignCore:', error);
    throw error;
  }
}


/**
 * Inicia ou para a execução de uma campanha.
 * Se o status for 'ativa', aciona o worker Genkit.
 */


// Função Core para atualizar campanha (usada por API e futuramente por UI)
export async function updateCampaignCore(campaignId: string, updates: Partial<CreateCampaignCoreInput>): Promise<{ success: boolean; message: string }> {
  try {
    // 1. Fetch current campaign from Supabase
    const { data: campaign, error: fetchError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', campaignId)
      .single();

    if (fetchError || !campaign) {
      return { success: false, message: 'Campanha não encontrada.' };
    }

    const currentStatus = campaign.status;
    const allowedStatuses = ['draft', 'scheduled', 'waiting_schedule', 'active', 'paused', 'stopped', 'finished', 'failed', 'completed', 'running'];

    if (!allowedStatuses.includes(currentStatus)) {
      return { success: false, message: `O status atual (${currentStatus}) não permite edição. Pause ou agende a campanha primeiro.` };
    }

    // 2. Map updates to Supabase columns
    const updateData: any = {};

    if (updates.name) updateData.nome = updates.name;
    if (updates.messageTemplates) updateData.message_templates = updates.messageTemplates;
    if (updates.min_delay !== undefined) updateData.min_delay = updates.min_delay;
    if (updates.max_delay !== undefined) updateData.max_delay = updates.max_delay;

    if (updates.scheduling) {
      if (updates.scheduling.daysOfWeek) updateData.dias_semana = updates.scheduling.daysOfWeek;
      if (updates.scheduling.startTime) updateData.horario_inicio = updates.scheduling.startTime;
      if (updates.scheduling.endTime) updateData.horario_fim = updates.scheduling.endTime;

      // Recalculate cron_schedule based on new scheduling
      const schedulingToUse = {
        daysOfWeek: updates.scheduling.daysOfWeek || campaign.dias_semana || [],
        startTime: updates.scheduling.startTime || campaign.horario_inicio || '09:00',
      };

      if (schedulingToUse.daysOfWeek.length > 0) {
        const [hour, minute] = schedulingToUse.startTime.split(':').map(Number);
        const days = schedulingToUse.daysOfWeek.join(',');
        updateData.cron_schedule = `${minute} ${hour} * * ${days}`;
      }
    }

    if (updates.mission_type) updateData.mission_type = updates.mission_type;
    if (updates.enviar_foto !== undefined) updateData.enviar_foto = updates.enviar_foto;
    if (updates.mission_subtype) updateData.mission_subtype = updates.mission_subtype;

    // Instance handling: Ignored for now as Supabase might not have instance_name column yet.
    // Future work: Add instance_name to 'campanhas' table if required by worker.

    // 3. Update Supabase
    const { error: updateError } = await supabase
      .from('campanhas')
      .update(updateData)
      .eq('id', campaignId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath('/campaigns');
    revalidatePath('/kanban');

    return { success: true, message: 'Campanha atualizada com sucesso.' };
  } catch (error: any) {
    console.error('Error updating campaign:', error);
    return { success: false, message: `Erro ao atualizar campanha: ${error.message}` };
  }
}

// ... existing updateCampaignStatus code ...


// Deleta uma campanha e todos os envios relacionados do Supabase.
export async function deleteCampaign(id: string): Promise<{ success: boolean; message: string }> {
  try {
    // Verificar se campanha está rodando
    const campaignData = await getCampaignById(id);
    const adminSupabase = getSupabaseAdmin();

    if (campaignData && ['running', 'starting', 'ativa'].includes(campaignData.status)) {
      await adminSupabase
        .from('campanhas')
        .update({ status: 'stopping' })
        .eq('id', id);
      await new Promise(resolve => setTimeout(resolve, 2000));
    }

    // Deletar campanha (CASCADE vai deletar os envios automaticamente)
    const { error: deleteError } = await adminSupabase
      .from('campanhas')
      .delete()
      .eq('id', id);

    if (deleteError) {
      throw new Error(deleteError.message);
    }

    revalidatePath('/campaigns');
    revalidatePath('/kanban');

    return { success: true, message: "Campanha deletada com sucesso." };
  } catch (error: any) {
    console.error(`Error deleting campaign ${id} from Supabase:`, error);
    return { success: false, message: `Falha ao deletar campanha: ${error.message}` };
  }
}

/**
 * Duplica uma campanha existente, copiando configurações e contatos.
 */
export async function duplicateCampaign(originalCampaignId: string): Promise<{ success: boolean; message: string; newCampaignId?: string }> {
  try {
    // 1. Fetch Original Campaign from Supabase
    const { data: originalCampaign, error: fetchError } = await supabase
      .from('campanhas')
      .select('*')
      .eq('id', originalCampaignId)
      .single();

    if (fetchError || !originalCampaign) {
      return { success: false, message: 'Campanha original não encontrada.' };
    }

    // 2. Prepare New Campaign Data
    const newCampaignData = {
      nome: `${originalCampaign.nome} (Cópia)`,
      descricao: originalCampaign.descricao,
      status: 'draft', // Start as draft
      owner_id: originalCampaign.owner_id,
      message_templates: originalCampaign.message_templates,
      min_delay: originalCampaign.min_delay,
      max_delay: originalCampaign.max_delay,
      stats_total: originalCampaign.stats_total,
      stats_sent: 0,
      stats_delivered: 0,
      stats_failed: 0,
      stats_pending: originalCampaign.stats_total,
      enviar_foto: originalCampaign.enviar_foto,
      mission_type: originalCampaign.mission_type,
      mission_subtype: originalCampaign.mission_subtype,
      recorrente: originalCampaign.recorrente,
      cron_schedule: originalCampaign.cron_schedule,
      dias_semana: originalCampaign.dias_semana,
      horario_inicio: originalCampaign.horario_inicio,
      horario_fim: originalCampaign.horario_fim,
      store_ids: originalCampaign.store_ids,
      created_by: originalCampaign.created_by
    };

    // 3. Create New Campaign
    const { data: newCampaign, error: createError } = await supabase
      .from('campanhas')
      .insert(newCampaignData)
      .select()
      .single();

    if (createError || !newCampaign) {
      console.error("Error creating duplicated campaign:", createError);
      throw new Error(createError?.message || "Falha ao criar nova campanha.");
    }

    const newCampaignId = newCampaign.id;

    // 4. Fetch Contacts from Original Campaign (Supabase)
    const { data: originalEnvios, error: contactsError } = await supabase
      .from('campanhas_envios')
      .select('contato_id, dynamic_fields')
      .eq('campanha_id', originalCampaignId);

    if (contactsError) {
      console.error("Error fetching contacts to duplicate:", contactsError);
      // We created the campaign but failed contacts. 
      // For now throw to indicate failure.
      throw new Error("Falha ao buscar contatos da campanha original.");
    }

    if (originalEnvios && originalEnvios.length > 0) {
      const newEnvios = originalEnvios.map((e: any) => ({
        campanha_id: newCampaignId,
        contato_id: e.contato_id,
        dynamic_fields: e.dynamic_fields,
        status: 'pending' // Reset status
      }));

      // Insert in batches
      const batchSize = 1000;
      for (let i = 0; i < newEnvios.length; i += batchSize) {
        const chunk = newEnvios.slice(i, i + batchSize);
        const { error: insertError } = await supabase
          .from('campanhas_envios')
          .insert(chunk);

        if (insertError) {
          console.error("Error inserting duplicated contacts:", insertError);
          throw new Error("Falha ao inserir contatos na nova campanha.");
        }
      }
    }

    revalidatePath('/campaigns');
    revalidatePath('/kanban');

    return { success: true, message: 'Campanha duplicada com sucesso!', newCampaignId };

  } catch (error: any) {
    console.error(`Error duplicating campaign ${originalCampaignId}:`, error);
    return { success: false, message: `Falha ao duplicar campanha: ${error.message}` };
  }
}

/**
 * Busca os contatos/envios de uma campanha do Supabase.
 */
export async function getCampaignContacts(id: string): Promise<CampaignContact[]> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    // Buscar envios do Supabase
    const { data: envios, error } = await supabaseAdmin
      .from('campanhas_envios')
      .select('*, contatos_erp(*)')
      .eq('campanha_id', id)
      .order('created_at');

    if (error) {
      console.error(`Error fetching contacts for campaign ${id} from Supabase:`, error);
      return [];
    }

    if (!envios || envios.length === 0) {
      return [];
    }

    // Mapear dados retornados
    return envios.map((env: any) => {
      const contato = env.contatos_erp;

      // Prioridade: Dados do contato (JOIN) > dynamic_fields > Default
      const nome = contato?.nome || env.dynamic_fields?.nome || 'Nome não disponível';
      const telefone = contato?.telefone || env.dynamic_fields?.telefone || '';

      // Combinar dynamic_fields com dados do contato para garantir storeId
      const dynamic_fields = {
        ...(env.dynamic_fields || {}),
        storeId: contato?.store_id || env.dynamic_fields?.storeId
      };

      return {
        id: env.id, // ID do envio
        nome: nome,
        telefone: telefone,
        status: env.status,
        dynamic_fields: dynamic_fields,
        contato_id: env.contato_id // Manter referência
      } as CampaignContact;
    });

  } catch (error) {
    console.error(`Error fetching contacts for campaign ${id} from Supabase:`, error);
    return [];
  }
}


export async function getCampaignLogs(campaignId: string): Promise<CampaignLog[]> {
  try {
    const { data: logs, error } = await supabase
      .from('campanhas_logs')
      .select('*')
      .eq('campanha_id', campaignId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`Error fetching logs for campaign ${campaignId} from Supabase:`, error);
      return [];
    }

    if (!logs) return [];

    return logs.map((log: any) => ({
      timestamp: log.created_at || new Date().toISOString(),
      message: log.message,
      level: (log.level || 'info').toLowerCase(), // Normalize to lowercase for frontend icons
    }));

  } catch (error) {
    console.error(`Error fetching logs for campaign ${campaignId}:`, error);
    return [];
  }
}


export async function addNoteToContact(
  campaignId: string,
  contactPhone: string,
  note: string,
  authorEmail?: string,
): Promise<{ success: boolean; message: string; noteId?: string }> {

  // TODO: Implement Supabase 'contact_notes' table if this feature is needed.
  console.warn('[addNoteToContact] Feature temporarily disabled during Firestore -> Supabase migration.');

  return { success: true, message: "Nota salva (simulação - migração pendente).", noteId: "temp-id" };
}

export async function getContactHistory(
  campaignId: string,
  contactPhone: string
): Promise<ContactHistoryItem[]> {
  // TODO: Implement Supabase 'contact_notes' table if this feature is needed.
  console.warn('[getContactHistory] Feature temporarily disabled during Firestore -> Supabase migration.');
  return [];
}

export async function getTodaysSendsCount(ownerId: string): Promise<number> {
  if (!ownerId) return 0;
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const startOfToday = today.toISOString();
    const startOfTomorrow = tomorrow.toISOString();

    // 1. Get User's Campaigns First
    const { data: userCampaigns, error: campaignError } = await supabase
      .from('campanhas')
      .select('id')
      .eq('owner_id', ownerId);

    if (campaignError || !userCampaigns || userCampaigns.length === 0) {
      return 0;
    }

    const campaignIds = userCampaigns.map(c => c.id);

    // 2. Count 'sent' messages in those campaigns for today
    const { count, error: countError } = await supabase
      .from('campanhas_envios')
      .select('*', { count: 'exact', head: true })
      .in('campanha_id', campaignIds)
      .eq('status', 'sent')
      .gte('sent_at', startOfToday)
      .lt('sent_at', startOfTomorrow);

    if (countError) {
      console.error("Error fetching today's sends count (Supabase):", countError);
      return 0;
    }

    return count || 0;

  } catch (error) {
    console.error("Error fetching today's sends count for user:", error);
    return 0; // Return 0 on error to avoid blocking user actions
  }
}

// User plan management
export async function getInstances(_userId: string): Promise<WhatsAppInstance[]> {
  'use server';

  const chatwootStatus = await getChatwootInboxStatus();

  if (!chatwootStatus) return [];

  const statusMap: Record<string, 'open' | 'closed' | 'connecting'> = {
    connected:    'open',
    disconnected: 'closed',
  };

  return [{
    id: String(chatwootStatus.id),
    name: chatwootStatus.name,
    status: statusMap[chatwootStatus.status] ?? 'close',
    qrcode: chatwootStatus.qr_code,
    ownerId: _userId,
    createdAt: new Date().toISOString(),
  }];
}



export async function getUserPlan(userId: string): Promise<UserPlanInfo | null> {
  // STUB: Firestore Removed. Returning PRO plan for all users during migration.
  return {
    planId: 'pro',
    planStatus: 'active',
    dailySendLimit: 999999,
    hasUnlimitedSends: true,
  };
}

export async function getUserSettings(userId: string): Promise<UserSettings | null> {
  // STUB: Firestore Removed. Returning default settings.
  return { subscriptionsEnabled: false };
}

export async function updateUserSubscriptionSetting(userId: string, enabled: boolean): Promise<{ success: boolean; message: string }> {
  // STUB: Firestore Removed.
  console.warn(`[updateUserSubscriptionSetting] Feature disabled. User ${userId} tried to set enabled=${enabled}`);
  return { success: true, message: `Sistema de assinaturas ${enabled ? 'ativado' : 'desativado'} (Simulação durante migração).` };
}


// Contacts Management
export async function getContacts(ownerId: string): Promise<Contact[]> {
  console.log('[getContacts] Called with ownerId:', ownerId);
  if (!ownerId) {
    console.log('[getContacts] No ownerId provided, returning empty array');
    return [];
  }

  try {
    console.log('[getContacts] Fetching contacts from Supabase contatos_erp...');

    const { data, error } = await supabase
      .from('contatos_erp')
      .select('id_contato, nome, telefone, role, email, aceita_marketing, store_id')
      .order('nome', { ascending: true });

    if (error) {
      console.error('[getContacts] Supabase error:', error);
      return [];
    }

    if (!data || data.length === 0) {
      console.log('[getContacts] No contacts found in contatos_erp');
      return [];
    }

    // Buscar mapa de nomes de lojas
    const storeNameMap = await getStoreNameMap();

    const contacts = data.map((contact: any) => {
      const storeId = contact.store_id;
      const storeName = storeId ? (storeNameMap[storeId] || `Loja ${storeId}`) : undefined;

      return {
        id: `erp-${contact.id_contato}`,
        ownerId: ownerId,
        name: contact.nome,
        phone: contact.telefone || '',
        email: contact.email || '',
        role: contact.role || '',
        aceita_marketing: contact.aceita_marketing ?? true,
        createdAt: new Date().toISOString(),
        source: 'erp' as const,
        storeIds: storeId ? [String(storeId)] : [],
        storeNames: storeName ? [storeName] : [],
      };
    });

    console.log(`[getContacts] Fetched ${contacts.length} contacts from Supabase`);
    return contacts;

  } catch (error: any) {
    console.error("[getContacts] Error in getContacts:", error);
    return [];
  }
}

// Telefone canônico: somente dígitos (E.164 sem +). Aceita formatos brasileiros variados.
function normalizePhone(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/\D/g, '');
}

export async function createContact(contact: Omit<Contact, 'id' | 'createdAt'>): Promise<{ success: boolean; message: string; contactId?: string }> {
  try {
    const normalizedPhone = normalizePhone(contact.phone);

    if (!normalizedPhone) {
      return { success: false, message: 'Telefone é obrigatório.' };
    }

    // Verificar duplicado por telefone (já normalizado em ambos os lados via comparação direta)
    const { data: existing } = await supabase
      .from('contatos_erp')
      .select('id_contato, nome')
      .eq('telefone', normalizedPhone)
      .maybeSingle();

    if (existing) {
      return { success: false, message: `Telefone já cadastrado para "${existing.nome}".`, contactId: existing.id_contato?.toString() };
    }

    // Mapear campos do frontend para Supabase
    const newContact = {
      nome: contact.name,
      telefone: normalizedPhone,
      role: contact.role || '',
      email: contact.email || null,
      aceita_marketing: contact.aceita_marketing ?? true,
      store_id: contact.storeIds && contact.storeIds.length > 0 ? contact.storeIds[0] : null,
    };

    const { data, error } = await supabase
      .from('contatos_erp')
      .insert(newContact)
      .select()
      .single();

    if (error) {
      console.error('Erro ao criar contato no Supabase:', error);
      throw new Error(error.message);
    }

    revalidatePath('/contacts');
    return { success: true, message: 'Contato criado com sucesso.', contactId: data?.id_contato?.toString() };
  } catch (error: any) {
    return { success: false, message: `Failed to create contact: ${error.message}` };
  }
}

export async function deleteContact(id: string): Promise<{ success: boolean; message: string }> {
  try {
    // O ID vem como 'erp-123', extrair o número
    const erpId = id.startsWith('erp-') ? id.substring(4) : id;

    // GAP-09 FIX: bloqueia delete se houver atendimentos ou envios de campanha
    // referenciando o contato. Match por telefone (chave de fato no app).
    const { data: contato } = await supabase
      .from('contatos_erp')
      .select('telefone')
      .eq('id_contato', erpId)
      .maybeSingle();

    if (contato?.telefone) {
      const { count: histCount } = await supabase
        .from('controle_atendimentos')
        .select('id', { count: 'exact', head: true })
        .eq('telefone', contato.telefone);

      if ((histCount ?? 0) > 0) {
        return {
          success: false,
          message: `Contato possui ${histCount} atendimento(s) no histórico. Não pode ser excluído.`
        };
      }
    }

    const { count: envCount } = await supabase
      .from('campanhas_envios')
      .select('id', { count: 'exact', head: true })
      .eq('contato_id', erpId);

    if ((envCount ?? 0) > 0) {
      return {
        success: false,
        message: `Contato participa de ${envCount} envio(s) de campanha. Remova-o das campanhas antes.`
      };
    }

    const { error } = await supabase
      .from('contatos_erp')
      .delete()
      .eq('id_contato', erpId);

    if (error) {
      console.error('Erro ao deletar contato do Supabase:', error);
      throw new Error(error.message);
    }

    revalidatePath('/contacts');
    return { success: true, message: "Contato deletado com sucesso." };
  } catch (error: any) {
    return { success: false, message: `Falha ao deletar contato: ${error.message}` };
  }
}

export async function updateContact(id: string, data: Partial<Contact>): Promise<{ success: boolean; message: string }> {
  try {
    const erpId = id.startsWith('erp-') ? id.substring(4) : id;

    const updates: any = {};
    if (data.name !== undefined) updates.nome = data.name;
    if (data.phone !== undefined) updates.telefone = normalizePhone(data.phone);
    if (data.role !== undefined) updates.role = data.role;
    if (data.email !== undefined) updates.email = data.email || null;
    if (data.aceita_marketing !== undefined) updates.aceita_marketing = data.aceita_marketing;
    if (data.storeIds && data.storeIds.length > 0) updates.store_id = data.storeIds[0];

    const { error } = await supabase
      .from('contatos_erp')
      .update(updates)
      .eq('id_contato', erpId);

    if (error) {
      console.error('Erro ao atualizar contato no Supabase:', error);
      throw new Error(error.message);
    }

    revalidatePath('/contacts');
    return { success: true, message: "Contato atualizado com sucesso." };
  } catch (error: any) {
    return { success: false, message: `Falha ao atualizar contato: ${error.message}` };
  }
}

export async function removeContactFromCampaign(campaignId: string, contactId: string): Promise<{ success: boolean; message: string }> {
  try {
    // Delete from Supabase (campanhas_envios)
    // contactId matches id in campanhas_envios table (as mapped in getCampaignContacts)
    // Use Admin Client to bypass RLS
    const adminSupabase = getSupabaseAdmin();
    const { error } = await adminSupabase
      .from('campanhas_envios')
      .delete()
      .eq('id', contactId);

    if (error) {
      throw new Error(error.message);
    }

    // Stats update is handled by counting rows or trigger, client will refresh
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Contato removido da campanha com sucesso." };
  } catch (error: any) {
    console.error('Error removing contact from campaign:', error);
    return { success: false, message: `Falha ao remover contato: ${error.message}` };
  }
}

export async function addContactToCampaign(campaignId: string, contact: { nome: string, telefone: string }): Promise<{ success: boolean; message: string; contactId?: string }> {
  try {
    // 1. Check if contact exists in contatos_erp or create
    let contactId: string;
    const normalizedPhone = normalizePhone(contact.telefone);

    const { data: existing } = await supabase
      .from('contatos_erp')
      .select('id_contato')
      .eq('telefone', normalizedPhone)
      .limit(1)
      .maybeSingle(); // Use maybeSingle to avoid error if not found

    if (existing) {
      contactId = existing.id_contato;
    } else {
      // Create new contact
      const { data: newContact, error: createError } = await supabase
        .from('contatos_erp')
        .insert({
          nome: contact.nome,
          telefone: normalizedPhone,
          role: 'TACTICAL' // Default role
        })
        .select('id_contato')
        .single();

      if (createError) throw new Error(`Falha ao criar contato: ${createError.message}`);
      contactId = newContact.id_contato;
    }

    // 2. Add to campanhas_envios
    const { data: envio, error: linkError } = await supabase
      .from('campanhas_envios')
      .insert({
        campanha_id: campaignId,
        contato_id: contactId,
        status: 'pending'
      })
      .select('id')
      .single();

    if (linkError) {
      // Handle duplicate key error (if unique constraint exists on campaign_id + contact_id)
      if (linkError.code === '23505') {
        return { success: false, message: "Este contato já está na campanha." };
      }
      throw new Error(linkError.message);
    }

    // Stats update handled by client refresh
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: "Contato adicionado à campanha com sucesso.", contactId: envio.id };

  } catch (error: any) {
    console.error('Error adding contact to campaign:', error);
    return { success: false, message: `Falha ao adicionar contato: ${error.message}` };
  }
}

export async function addBatchContactsToCampaign(campaignId: string, contacts: { nome: string, telefone: string, storeId?: string }[]): Promise<{ success: boolean; message: string }> {
  try {
    // Supabase logic: Iterate and process
    let addedCount = 0;

    await Promise.all(contacts.map(async (contact) => {
      try {
        // 1. Find or Create Contact in ERP
        let contactId: string;
        const normalizedPhone = normalizePhone(contact.telefone);

        const { data: existing } = await supabase
          .from('contatos_erp')
          .select('id_contato')
          .eq('telefone', normalizedPhone)
          .limit(1)
          .maybeSingle();

        if (existing) {
          contactId = existing.id_contato;
        } else {
          const { data: newContact, error: createError } = await supabase
            .from('contatos_erp')
            .insert({
              nome: contact.nome,
              telefone: normalizedPhone,
              store_id: contact.storeId || 'sistema',
              role: 'TACTICAL'
            })
            .select('id_contato')
            .single();

          if (createError) {
            console.error(`Skipping contact generation for ${contact.nome}:`, createError);
            return;
          }
          contactId = newContact.id_contato;
        }

        // 2. Link to Campaign
        const { error: linkError } = await supabase
          .from('campanhas_envios')
          .insert({
            campanha_id: campaignId,
            contato_id: contactId,
            status: 'pending'
          });

        if (!linkError) {
          addedCount++;
        } else if (linkError.code !== '23505') { // Ignore duplicates
          console.error(`Failed to link contact ${contactId}:`, linkError);
        }

      } catch (innerError) {
        console.error(`Error processing contact ${contact.nome}:`, innerError);
      }
    }));
    revalidatePath(`/campaigns/${campaignId}`);
    return { success: true, message: `${contacts.length} contatos adicionados com sucesso.` };
  } catch (error: any) {
    console.error('Error adding batch contacts to campaign:', error);
    return { success: false, message: `Falha ao adicionar contatos: ${error.message}` };
  }
}

export async function updateCampaignStoreIds(campaignId: string, storeIds: string[]): Promise<{ success: boolean; message: string }> {
  try {
    const nameMap = await getStoreNameMap();
    const stores = storeIds.map(id => ({
      id,
      name: nameMap[id] || `Loja ${id}`
    }));

    // UPDATE SUPABASE
    const { error: updateError } = await supabase
      .from('campanhas')
      .update({
        store_ids: storeIds,
        // stores: stores // Stores object array is not stored in DB, only IDs. Frontend re-hydrates.
      })
      .eq('id', campaignId);

    if (updateError) {
      throw new Error(updateError.message);
    }

    revalidatePath(`/campaigns/${campaignId}`);
    revalidatePath('/campaigns');

    return { success: true, message: "Lojas da campanha atualizadas com sucesso." };
  } catch (error: any) {
    console.error("Error updating campaign store IDs:", error);
    return { success: false, message: `Erro ao atualizar lojas: ${error.message}` };
  }
}

export async function updateCampaignStatus(id: string, status: CampaignStatus, ignoreSchedule = false, resetContacts = false): Promise<{ success: boolean; message: string }> {
  try {
    // Translate UI status (PT) to DB status (EN) if needed
    const statusMap: Record<string, string> = {
      'ativa': 'running',
      'pausada': 'stopped',
      'concluída': 'completed',
      'finalizada': 'completed',
      'rascunho': 'draft', // assuming draft
      'agendada': 'scheduled', // assuming scheduled
    };

    // If status is in map, use mapped value. Otherwise use original (e.g. 'running', 'stopped')
    // Fallback: If original status causes error, we might need to adjust map.
    // Based on worker code, 'running', 'stopped', 'completed', 'waiting_schedule' are valid.
    /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
    let dbStatus = (statusMap[status as any] || status);

    const updates: any = { status: dbStatus };

    // LOGIC TO HANDLE RECURRING CAMPAIGNS ACTIVATION
    // If activating a campaign (running), checks if it is recurring.
    // If recurring AND NOT ignoring schedule, it should be set to 'scheduled' instead of 'running'
    // to wait for the cron job.
    if (dbStatus === 'running' && !ignoreSchedule) {
      const { data: currentCampaign, error: fetchError } = await supabase
        .from('campanhas')
        .select('recorrente, cron_schedule')
        .eq('id', id)
        .single();

      if (!fetchError && currentCampaign) {
        // If recurring, we set to 'scheduled' instead of 'running'
        if (currentCampaign.recorrente) {
          console.log(`[Campaign ${id}] is recurring. Setting to 'scheduled' instead of 'running'.`);
          dbStatus = 'scheduled';
          updates.status = 'scheduled';
        }
      }
    }

    // If resetting contacts (Restart Campaign)
    if (resetContacts) {
      const { error: resetError } = await supabase
        .from('campanhas_envios')
        .update({ status: 'pending' })
        .eq('campanha_id', id);

      if (resetError) {
        console.error("Error resetting contacts:", resetError);
        throw new Error("Falha ao resetar contatos da campanha.");
      }
    }

    const { error } = await supabase
      .from('campanhas')
      .update(updates)
      .eq('id', id);

    if (error) {
      throw new Error(error.message);
    }

    // If status is 'running' (was 'ativa'), we trigger the worker
    if (dbStatus === 'running') {
      // Fire and forget worker
      // NOW PASSING ignoreSchedule to respect user intent (or Lack thereof for scheduled campaigns)
      runCampaignWorker(id, ignoreSchedule).catch(err => console.error("Worker start failed", err));
    }

    revalidatePath('/kanban');
    return { success: true, message: `Status da campanha atualizado para '${status}' com sucesso.` };
  } catch (error: any) {
    console.error(`Error updating campaign status in Supabase for campaign ${id}:`, error);
    return { success: false, message: `Falha ao atualizar status da campanha: ${error.message}` };
  }
}


