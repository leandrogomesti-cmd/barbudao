
'use server';

import { supabase } from '@/lib/supabase/client';
import { Appointment } from '@/lib/types/agenda';
import { revalidatePath } from 'next/cache';
import { createStockMovement } from '@/lib/actions-business';
import { STATUS_MAP } from '@/lib/constants';

export async function searchContactsForAgenda(query: string): Promise<{ nome: string; telefone: string }[]> {
  if (!query || query.length < 2) return [];
  const { data } = await supabase
    .from('contatos_erp')
    .select('nome, telefone')
    .or(`nome.ilike.%${query}%,telefone.ilike.%${query}%`)
    .or('ativo.is.null,ativo.eq.true')
    .order('nome')
    .limit(10);
  return (data ?? []) as { nome: string; telefone: string }[];
}

function normalizeAppointment(row: any): Appointment {
  const status = row.status_agendamento;
  return {
    ...row,
    status_agendamento: STATUS_MAP[status] ?? status,
  };
}

export async function getAppointments(date?: Date, storeId?: string, professionalName?: string, professionalId?: string): Promise<Appointment[]> {
  let query = supabase
    .from('controle_atendimentos')
    .select('*');

  if (date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    query = query
      .gte('inicio_agendado', startOfDay.toISOString())
      .lte('inicio_agendado', endOfDay.toISOString());
  }

  if (storeId) {
    query = query.eq('unidade', storeId);
  }

  if (professionalName && professionalId) {
    // OR: casa por nome OU por ID — tolerante a divergências de nomenclatura
    query = query.or(`profissional.eq.${professionalName},profissional_id.eq.${professionalId}`);
  } else if (professionalName) {
    query = query.eq('profissional', professionalName);
  } else if (professionalId) {
    query = query.eq('profissional_id', professionalId);
  }

  const { data, error } = await query.order('inicio_agendado', { ascending: true });

  if (error) {
    console.error('Error fetching appointments:', error);
    return [];
  }

  return (data ?? []).map(normalizeAppointment);
}

export async function getAppointment(id: string | number): Promise<Appointment | null> {
  const { data, error } = await supabase
    .from('controle_atendimentos')
    .select('*')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching appointment:', error);
    return null;
  }

  return normalizeAppointment(data);
}

// ── Bug #3: Verifica conflito de horário antes de mover ──────────────────────
async function checkTimeConflict(
  professional: string,
  newStart: string,
  newEnd: string,
  excludeId: string | number
): Promise<boolean> {
  const { data, error } = await supabase
    .from('controle_atendimentos')
    .select('id')
    .eq('profissional', professional)
    .neq('id', excludeId)
    .not('status_agendamento', 'in', '("Cancelado","cancelado","Bloqueio","Não apareceu","nao_apareceu")')
    .lt('inicio_agendado', newEnd)
    .gt('fim_agendado', newStart);

  if (error) {
    console.error('Conflict check error:', error);
    // GAP-13 FIX: fail-closed — se erro, bloqueia a operação por segurança
    return true;
  }
  return (data?.length ?? 0) > 0;
}

export async function updateAppointmentTime(
  id: string | number,
  startTime: string,
  endTime: string,
  professional?: string,
  // GAP-03 FIX: Campo opcional para atualizar status junto com a movimentação
  statusOverride?: string
) {
  try {
    // Verificar conflito de horário se profissional foi fornecido e não é waitlist
    if (professional && professional !== '') {
      const hasConflict = await checkTimeConflict(professional, startTime, endTime, id);
      if (hasConflict) {
        return {
          success: false,
          message: `${professional} já tem um agendamento neste horário.`
        };
      }
    }

    const updateData: any = {
      inicio_agendado: startTime,
      fim_agendado: endTime
    };

    if (professional !== undefined) {
      updateData.profissional = professional;
      if (professional && professional !== '') {
        const { data: profData } = await supabase
          .from('profissionais')
          .select('id')
          .ilike('nome', professional)
          .maybeSingle();
        if (profData?.id) updateData.profissional_id = profData.id;
      } else {
        updateData.profissional_id = null;
      }
    }

    // GAP-03 FIX: Atualizar status junto para evitar race condition de 2 writes
    if (statusOverride !== undefined) {
      updateData.status_agendamento = statusOverride;
    } else if (professional === '') {
      // Mover para fila de espera: zerar profissional + setar status automaticamente
      updateData.status_agendamento = 'Fila de Espera';
    }

    const { error } = await supabase
      .from('controle_atendimentos')
      .update(updateData)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/agenda');

    // N8N Webhook trigger for time/status updates via UI Drag & Drop
    if (process.env.N8N_WEBHOOK_STATUS_URL) {
      fetch(process.env.N8N_WEBHOOK_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'time_changed', appointment_id: id, updates: updateData })
      }).catch(err => console.error('Error triggering N8N status webhook:', err));
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Fix #10 helper: Atualiza apenas o status ─────────────────────────────────
export async function updateAppointmentStatus(id: string | number, status: string) {
  try {
    const { error } = await supabase
      .from('controle_atendimentos')
      .update({ status_agendamento: status })
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/agenda');

    // N8N Webhook trigger for status updates
    if (process.env.N8N_WEBHOOK_STATUS_URL) {
      fetch(process.env.N8N_WEBHOOK_STATUS_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ event: 'status_changed', appointment_id: id, new_status: status })
      }).catch(err => console.error('Error triggering N8N status webhook:', err));
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createBlock(startTime: string, endTime: string, professional: string, reason: string = 'Bloqueio') {
  try {
    // GAP-09 FIX: Verificar conflito de horário antes de criar bloqueio
    // Para bloqueios, usamos um ID fictício '-1' que nunca existirá
    const hasConflict = await checkTimeConflict(professional, startTime, endTime, -1);
    if (hasConflict) {
      return {
        success: false,
        message: `${professional} já tem um agendamento neste horário. Não é possível criar o bloqueio.`
      };
    }

    const { error } = await supabase
      .from('controle_atendimentos')
      .insert({
        inicio_agendado: startTime,
        fim_agendado: endTime,
        profissional: professional,
        status_agendamento: 'Bloqueio',
        nome_cliente: reason,
        servico: 'Indisponível',
      });

    if (error) throw error;
    revalidatePath('/agenda');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Gap #5: Hard delete com proteção de agendamentos históricos ──────────────
export async function deleteAppointment(id: string | number) {
  try {
    // Buscar status antes de deletar
    const { data: appt } = await supabase
      .from('controle_atendimentos')
      .select('status_agendamento, inicio_agendado')
      .eq('id', id)
      .single();

    if (appt?.status_agendamento === 'Finalizado') {
      return {
        success: false,
        message: 'Agendamentos finalizados não podem ser excluídos para preservar o histórico.'
      };
    }

    const { error } = await supabase
      .from('controle_atendimentos')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/agenda');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Gap #9: Finalizar atendimento com baixa de estoque ───────────────────────
export async function finalizeAppointment(id: string | number, paymentMethod: string, valor?: number, profissionalNome?: string) {
  try {
    // 1. Buscar o agendamento para pegar o serviço
    const { data: appt, error: apptError } = await supabase
      .from('controle_atendimentos')
      .select('id, servico, status_agendamento, nome_cliente, unidade')
      .eq('id', id)
      .single();

    if (apptError || !appt) throw new Error('Agendamento não encontrado.');
    const normalizedStatus = STATUS_MAP[appt.status_agendamento] ?? appt.status_agendamento;
    if (normalizedStatus === 'Finalizado') {
      return { success: false, message: 'Agendamento já finalizado.' };
    }

    // 2. Buscar o serviço pelo nome (case-insensitive via ilike para compatibilidade N8N)
    const { data: service } = await supabase
      .from('servicos')
      .select('id')
      .ilike('nome', appt.servico)
      .maybeSingle();

    if (service?.id) {
      // 3. Buscar insumos do serviço
      const { data: insumos } = await supabase
        .from('servico_insumos')
        .select('produto_id, quantidade_gasta')
        .eq('servico_id', service.id);

      // 4. Decrementar estoque de cada insumo e registrar movimentação
      if (insumos && insumos.length > 0) {
        for (const insumo of insumos) {
          await createStockMovement({
            produto_id: insumo.produto_id,
            tipo: 'consumo',
            quantidade: insumo.quantidade_gasta,
            referencia: `Atendimento #${id}`,
          });
        }
      }
    }

    // Preparar dados para update
    const updateData: any = {
      status_agendamento: 'Finalizado',
      forma_pagamento: paymentMethod
    };

    if (profissionalNome && profissionalNome !== '' && profissionalNome !== 'Indiferente') {
      updateData.profissional = profissionalNome;
      // Resolve professional ID
      const { data: profData } = await supabase
        .from('profissionais')
        .select('id')
        .ilike('nome', profissionalNome)
        .maybeSingle();
      if (profData?.id) {
        updateData.profissional_id = profData.id;
      }
    }

    // 5. Marcar como Finalizado e registrar forma de pagamento
    const { error: updateError } = await supabase
      .from('controle_atendimentos')
      .update(updateData)
      .eq('id', id);

    if (updateError) throw updateError;

    // 6. Lançar receita no financeiro se valor fornecido
    if (valor && valor > 0) {
      const { data: cat } = await supabase
        .from('categorias_financeiras')
        .select('id')
        .eq('tipo', 'receita')
        .ilike('nome', '%servi%')
        .maybeSingle();

      await supabase.from('lancamentos_financeiros').insert({
        descricao: `${appt.servico} — ${appt.nome_cliente}`,
        valor,
        forma_pagamento: paymentMethod,
        data_lancamento: new Date().toISOString(),
        status: 'PAGO',
        categoria_id: cat?.id ?? null,
        unidade: appt.unidade ?? null,
      });
      revalidatePath('/finance');
    }

    revalidatePath('/agenda');
    revalidatePath('/inventory');
    return { success: true, message: 'Atendimento finalizado e estoque atualizado.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Resolve profissional_id e servico_id pelo nome (case-insensitive) ───────
async function resolveIds(profissionalNome?: string, servicoNome?: string) {
  let profissional_id: string | null = null;
  let servico_id: string | null = null;

  if (profissionalNome && profissionalNome !== '' && profissionalNome !== 'Indiferente') {
    const { data } = await supabase
      .from('profissionais')
      .select('id')
      .ilike('nome', profissionalNome)
      .maybeSingle();
    if (data?.id) profissional_id = data.id;
  }

  if (servicoNome && servicoNome !== '' && servicoNome !== 'Indisponível') {
    const { data } = await supabase
      .from('servicos')
      .select('id')
      .ilike('nome', servicoNome)
      .maybeSingle();
    if (data?.id) servico_id = data.id;
  }

  return { profissional_id, servico_id };
}

// ── Criar novo agendamento com suporte à fila de espera ─────────────────────
export async function createAppointment(data: {
  nome_cliente: string;
  telefone?: string;
  servico: string;
  profissional?: string;
  inicio_agendado: string;
  fim_agendado: string;
  unidade?: string;
}) {
  try {
    let status = 'Fila de Espera';
    
    // Verificar conflito de horário e disponibilidade se profissional for escolhido
    if (data.profissional && data.profissional !== '') {
      status = 'Confirmado';

      // Verificar disponibilidade (horário de expediente + folgas)
      const { data: prof } = await supabase
        .from('profissionais')
        .select('id')
        .ilike('nome', data.profissional)
        .maybeSingle();

      if (prof?.id) {
        const { checkDisponibilidade } = await import('@/lib/actions-staff');
        const disp = await checkDisponibilidade(prof.id, data.inicio_agendado);
        if (!disp.disponivel) {
          return { success: false, message: `${data.profissional}: ${disp.motivo}` };
        }
      }

      const hasConflict = await checkTimeConflict(data.profissional, data.inicio_agendado, data.fim_agendado, -1);
      if (hasConflict) {
        return {
          success: false,
          message: `${data.profissional} já tem um agendamento neste horário.`
        };
      }
    }

    // Resolver IDs de profissional e serviço
    const ids = await resolveIds(data.profissional, data.servico);

    const { error } = await supabase
      .from('controle_atendimentos')
      .insert({
        nome_cliente: data.nome_cliente,
        telefone: data.telefone || null,
        servico: data.servico,
        profissional: data.profissional || '',
        inicio_agendado: data.inicio_agendado,
        fim_agendado: data.fim_agendado,
        status_agendamento: status,
        unidade: data.unidade || null,
        ...ids,
      });

    if (error) throw error;
    
    revalidatePath('/agenda');
    return { success: true, message: status === 'Fila de Espera' ? 'Adicionado à Fila de Espera.' : 'Agendamento confirmado.' };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function createQuickContact(nome: string, telefone: string, ownerId: string): Promise<{ success: boolean; message: string; contact?: { nome: string; telefone: string } }> {
  try {
    if (!nome.trim()) {
      return { success: false, message: 'Nome é obrigatório.' };
    }

    // Normalize phone (remove non-digits)
    const normalizedPhone = telefone.replace(/\D/g, '');

    // Check for existing contact by phone (if provided)
    if (normalizedPhone) {
      const { data: existing } = await supabase
        .from('contatos_erp')
        .select('nome')
        .eq('telefone', normalizedPhone)
        .maybeSingle();

      if (existing) {
        return { success: false, message: `Telefone já cadastrado para "${existing.nome}".` };
      }
    }

    // Create the contact
    const { data, error } = await supabase
      .from('contatos_erp')
      .insert({
        nome: nome.trim(),
        telefone: normalizedPhone || null,
        ativo: true,
      })
      .select('nome, telefone')
      .single();

    if (error) throw error;

    revalidatePath('/agenda');
    return {
      success: true,
      message: 'Cliente criado com sucesso.',
      contact: data
    };
  } catch (error: any) {
    return { success: false, message: `Erro ao criar cliente: ${error.message}` };
  }
}
