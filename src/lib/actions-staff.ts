
'use server';

import { supabase } from '@/lib/supabase/client';
import { Staff, HorarioProfissional, FolgaProfissional, DIAS_SEMANA } from '@/lib/types/staff';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { StaffSchema, parseSchema } from '@/lib/schemas';
import { getFirebaseAdmin } from '@/lib/firebase/admin';


/**
 * Retorna o registro de profissional do usuário logado atualmente.
 * Usa o cookie firebase-session-token para identificar o usuário por e-mail.
 * Returns null se não autenticado ou sem registro correspondente na tabela profissionais.
 */
export async function getCurrentStaffMember(): Promise<Staff | null> {
  try {
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get('firebase-session-token')?.value;
    if (!sessionToken) return null;

    const decoded = await verifySessionToken(sessionToken);
    if (!decoded?.email) return null;

    const { data, error } = await supabase
      .from('profissionais')
      .select('*')
      .eq('email', decoded.email)
      .eq('ativo', true)
      .maybeSingle();

    if (error || !data) return null;
    return data as Staff;
  } catch {
    return null;
  }
}

export async function getStaffMembers(): Promise<Staff[]> {
  const { data, error } = await supabase
    .from('profissionais')
    .select('*')
    .eq('ativo', true)
    .order('nome', { ascending: true });

  if (error) {
    console.error('Error fetching staff:', error);
    return [];
  }

  return data as Staff[];
}

export async function createStaffMember(data: Partial<Staff>) {
  const validation = parseSchema(StaffSchema, data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { data: inserted, error } = await supabase
      .from('profissionais')
      .insert([validation.data])
      .select()
      .single();

    if (error) throw error;

    revalidatePath('/staff');
    return { success: true, data: inserted };
  } catch (error: any) {
    console.error('Error creating staff member:', error);
    return { success: false, message: error.message };
  }
}

export async function createStaffWithAuth(data: Partial<Staff> & { senha?: string }) {
  const { senha, ...staffData } = data;

  if (staffData.email && senha) {
    // 1. Criar usuário no Firebase Auth
    try {
      const { auth } = getFirebaseAdmin();
      await auth.createUser({
        email: staffData.email,
        password: senha,
        displayName: staffData.nome,
      });
    } catch (err: any) {
      const msg = err.code === 'auth/email-already-exists'
        ? 'Este e-mail já está cadastrado no Firebase.'
        : `Erro ao criar acesso: ${err.message}`;
      return { success: false, message: msg };
    }
  }

  // 2. Salvar no Supabase
  return createStaffMember(staffData);
}

export async function updateStaffMember(id: string, data: Partial<Staff>) {
  const validation = parseSchema(StaffSchema.partial(), data);
  if (!validation.success) return { success: false, message: validation.message };

  try {
    const { error } = await supabase
      .from('profissionais')
      .update(validation.data)
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/staff');
    return { success: true, message: 'Profissional atualizado com sucesso!' };
  } catch (error: any) {
    console.error('Error updating staff member:', error);
    return { success: false, message: error.message };
  }
}

export async function deleteStaffMember(id: string) {
  try {
    // GAP-02 FIX: Soft-delete para preservar histórico de atendimentos
    // Não apaga fisicamente: apenas marca como inativo
    const { error } = await supabase
      .from('profissionais')
      .update({ ativo: false })
      .eq('id', id);

    if (error) throw error;

    revalidatePath('/staff');
    return { success: true, message: 'Profissional inativado com sucesso!' };
  } catch (error: any) {
    console.error('Error soft-deleting staff member:', error);
    return { success: false, message: error.message };
  }
}

export interface CommissionReportItem {
  id: string;
  inicio_agendado: string;
  servico: string;
  preco_venda: number;
}

export interface CommissionReport {
  staffName: string;
  atendimentos: number;
  valorServicos: number;
  comissaoServico: number;
  prolabore: number;
  total: number;
  items: CommissionReportItem[];
}

export async function getCommissionReport(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<CommissionReport | null> {
  try {
    // 1. Get staff and rates
    const { data: staff, error: staffError } = await supabase
      .from('profissionais')
      .select('nome, comissao_servico, prolabore_fixo')
      .eq('id', staffId)
      .single();

    if (staffError || !staff) return null;

    // 2. Get finalized appointments in period via FK (join com servicos para preço)
    const { data: appts, error: apptError } = await supabase
      .from('controle_atendimentos')
      .select('id, inicio_agendado, servico, servicos(preco_venda)')
      .eq('profissional_id', staffId)
      .eq('status_agendamento', 'Finalizado')
      .gte('inicio_agendado', startDate)
      .lte('inicio_agendado', endDate)
      .order('inicio_agendado', { ascending: false });

    if (apptError) throw apptError;

    // 3. Calcular valores usando preço do join (sem N queries adicionais)
    const items: CommissionReportItem[] = [];
    let valorServicos = 0;

    for (const appt of appts ?? []) {
      const preco = (appt.servicos as any)?.preco_venda ?? 0;
      valorServicos += preco;
      items.push({
        id: String(appt.id),
        inicio_agendado: appt.inicio_agendado,
        servico: appt.servico ?? '',
        preco_venda: preco,
      });
    }

    const taxa = (staff.comissao_servico ?? 0) / 100;
    const comissaoServico = valorServicos * taxa;
    const prolabore = staff.prolabore_fixo ?? 0;

    return {
      staffName: staff.nome,
      atendimentos: items.length,
      valorServicos,
      comissaoServico,
      prolabore,
      total: comissaoServico + prolabore,
      items,
    };
  } catch (error: any) {
    console.error('Error fetching commission report:', error);
    return null;
  }
}

// ── Horários de funcionamento ───────────────────────────────────────────────

// DIAS_SEMANA movido para types/staff.ts (use server não permite exportar objetos)

export async function getHorarios(profissionalId: string): Promise<HorarioProfissional[]> {
  const { data, error } = await supabase
    .from('horarios_profissional')
    .select('*')
    .eq('profissional_id', profissionalId)
    .order('dia_semana', { ascending: true });

  if (error) {
    console.error('Error fetching horarios:', error);
    return [];
  }
  return data as HorarioProfissional[];
}

export async function upsertHorario(horario: {
  profissional_id: string;
  dia_semana: number;
  hora_inicio: string;
  hora_fim: string;
  ativo: boolean;
}) {
  try {
    const { error } = await supabase
      .from('horarios_profissional')
      .upsert(horario, { onConflict: 'profissional_id,dia_semana' });

    if (error) throw error;
    revalidatePath('/staff');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function upsertHorariosBatch(
  profissionalId: string,
  horarios: { dia_semana: number; hora_inicio: string; hora_fim: string; ativo: boolean }[]
) {
  try {
    const rows = horarios.map(h => ({
      profissional_id: profissionalId,
      ...h,
    }));

    const { error } = await supabase
      .from('horarios_profissional')
      .upsert(rows, { onConflict: 'profissional_id,dia_semana' });

    if (error) throw error;
    revalidatePath('/staff');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Folgas ──────────────────────────────────────────────────────────────────

export async function getFolgas(profissionalId: string): Promise<FolgaProfissional[]> {
  const { data, error } = await supabase
    .from('folgas_profissional')
    .select('*')
    .eq('profissional_id', profissionalId)
    .gte('data', new Date().toISOString().split('T')[0])
    .order('data', { ascending: true });

  if (error) {
    console.error('Error fetching folgas:', error);
    return [];
  }
  return data as FolgaProfissional[];
}

export async function createFolga(folga: {
  profissional_id: string;
  data: string;
  motivo?: string;
}) {
  try {
    const { error } = await supabase
      .from('folgas_profissional')
      .upsert(folga, { onConflict: 'profissional_id,data' });

    if (error) throw error;
    revalidatePath('/staff');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

export async function deleteFolga(id: string) {
  try {
    const { error } = await supabase
      .from('folgas_profissional')
      .delete()
      .eq('id', id);

    if (error) throw error;
    revalidatePath('/staff');
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.message };
  }
}

// ── Verificação de disponibilidade ──────────────────────────────────────────

export async function checkDisponibilidade(
  profissionalId: string,
  dataHora: string
): Promise<{ disponivel: boolean; motivo?: string }> {
  const dt = new Date(dataHora);
  const diaSemana = dt.getDay(); // 0=Dom...6=Sab
  const hora = dt.toTimeString().slice(0, 5); // "HH:MM"
  const dataStr = dataHora.split('T')[0]; // "YYYY-MM-DD"

  // 1. Verificar folga
  const { data: folga } = await supabase
    .from('folgas_profissional')
    .select('id, motivo')
    .eq('profissional_id', profissionalId)
    .eq('data', dataStr)
    .maybeSingle();

  if (folga) {
    return { disponivel: false, motivo: `Folga: ${folga.motivo || 'sem motivo'}` };
  }

  // 2. Verificar horário de expediente
  // Se o profissional não tem horários configurados, permite (agenda manual sempre funciona)
  const { data: anySchedule } = await supabase
    .from('horarios_profissional')
    .select('id')
    .eq('profissional_id', profissionalId)
    .limit(1);

  if (!anySchedule || anySchedule.length === 0) {
    return { disponivel: true }; // Sem horários cadastrados → sem restrição
  }

  const { data: horario } = await supabase
    .from('horarios_profissional')
    .select('hora_inicio, hora_fim, ativo')
    .eq('profissional_id', profissionalId)
    .eq('dia_semana', diaSemana)
    .maybeSingle();

  if (!horario || !horario.ativo) {
    return { disponivel: false, motivo: `Não trabalha ${DIAS_SEMANA[diaSemana]}` };
  }

  if (hora < horario.hora_inicio || hora >= horario.hora_fim) {
    return { disponivel: false, motivo: `Fora do expediente (${horario.hora_inicio}-${horario.hora_fim})` };
  }

  return { disponivel: true };
}
