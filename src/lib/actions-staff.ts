
'use server';

import { supabase } from '@/lib/supabase/client';
import {
  Staff, HorarioProfissional, FolgaProfissional, DIAS_SEMANA,
  ProfissionalServicoComissao, ServicoComissaoRow,
  CommissionReport, CommissionReportItem, CommissionReportProdutoItem,
} from '@/lib/types/staff';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { verifySessionToken } from '@/lib/auth/verify-session';
import { StaffSchema, parseSchema } from '@/lib/schemas';
import { getFirebaseAdmin } from '@/lib/firebase/admin';
import { requireRole } from '@/lib/auth/rbac';
import { AuthorizationError, type Role } from '@/lib/auth/rbac-types';

async function guardManagement() {
  try {
    await requireRole(['ADMIN', 'GERENTE'] as Role[]);
    return null;
  } catch (e) {
    if (e instanceof AuthorizationError) return { success: false as const, message: e.message };
    throw e;
  }
}


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
  const denied = await guardManagement();
  if (denied) return denied;
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
  const denied = await guardManagement();
  if (denied) return denied;
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
  const denied = await guardManagement();
  if (denied) return denied;
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
  const denied = await guardManagement();
  if (denied) return denied;
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

// ── Comissões por Serviço ───────────────────────────────────────────────────

export async function getServicosUnidadeComComissao(
  profissionalId: string,
  unidadeId: string  // nome_fantasia value (from profissional.unidade_padrao)
): Promise<ServicoComissaoRow[]> {
  // Resolve nome_fantasia → id_loja (servicos_unidades uses id_loja as unidade_id)
  const { data: empresa } = await supabase
    .from('empresas_erp')
    .select('id_loja')
    .eq('nome_fantasia', unidadeId)
    .single();

  const idLoja = empresa?.id_loja ? String(empresa.id_loja) : unidadeId;

  // Busca serviços ativos da unidade com comissão configurada para o profissional
  const { data: servUnidades, error } = await supabase
    .from('servicos_unidades')
    .select('servico_id, ativo, servicos(nome, categoria_id, categorias_servicos(nome))')
    .eq('unidade_id', idLoja)
    .eq('ativo', true)
    .order('servico_id');

  if (error || !servUnidades) return [];

  // Buscar comissões já configuradas para este profissional na unidade
  const { data: comissoes } = await supabase
    .from('profissional_servico_comissoes')
    .select('servico_id, comissao_percentual')
    .eq('profissional_id', profissionalId)
    .eq('unidade_id', unidadeId);

  const comissaoMap: Record<string, number> = {};
  for (const c of comissoes ?? []) {
    comissaoMap[c.servico_id] = Number(c.comissao_percentual);
  }

  return (servUnidades as any[]).map((su) => ({
    servico_id: su.servico_id,
    nome: su.servicos?.nome ?? '',
    ativo: su.ativo ?? true,
    categoria: su.servicos?.categorias_servicos?.nome ?? undefined,
    comissao_percentual: comissaoMap[su.servico_id] ?? 0,
  }));
}

export async function upsertProfissionalComissoes(
  profissionalId: string,
  unidadeId: string,
  comissoes: Array<{ servico_id: string; comissao_percentual: number }>
): Promise<{ success: boolean; message?: string }> {
  const denied = await guardManagement();
  if (denied) return denied;
  try {
    const rows = comissoes.map((c) => ({
      profissional_id: profissionalId,
      unidade_id: unidadeId,
      servico_id: c.servico_id,
      comissao_percentual: c.comissao_percentual,
      updated_at: new Date().toISOString(),
    }));

    const { error } = await supabase
      .from('profissional_servico_comissoes')
      .upsert(rows, { onConflict: 'profissional_id,servico_id,unidade_id' });

    if (error) throw error;
    revalidatePath('/staff');
    return { success: true };
  } catch (error: any) {
    console.error('Error upserting comissoes:', error);
    return { success: false, message: error.message };
  }
}

// ── Relatório de Comissões ──────────────────────────────────────────────────

async function buildCommissionReportForStaff(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<CommissionReport | null> {
  const { data: staff, error: staffError } = await supabase
    .from('profissionais')
    .select('nome, comissao_servico, prolabore_fixo, unidade_padrao')
    .eq('id', staffId)
    .single();

  if (staffError || !staff) return null;

  // Atendimentos finalizados no período
  // Seleciona tanto 'unidade' (coluna real do app) quanto 'unidade_id' (coluna legada/n8n)
  const { data: appts, error: apptError } = await supabase
    .from('controle_atendimentos')
    .select('id, inicio_agendado, servico, servico_id, unidade, unidade_id, nome_cliente, forma_pagamento, valor_cobrado')
    .eq('profissional_id', staffId)
    .eq('status_agendamento', 'Finalizado')
    .gte('inicio_agendado', startDate)
    .lte('inicio_agendado', endDate)
    .order('inicio_agendado', { ascending: false });

  if (apptError) throw apptError;

  // Buscar preços de serviços para usar como fallback quando valor_cobrado é null
  const servicoIdsComPrecoNulo = [...new Set(
    (appts ?? [])
      .filter(a => a.valor_cobrado == null && a.servico_id)
      .map(a => a.servico_id as string)
  )];
  const precoPorServico: Record<string, number> = {};
  if (servicoIdsComPrecoNulo.length > 0) {
    const { data: servicos } = await supabase
      .from('servicos')
      .select('id, preco_venda')
      .in('id', servicoIdsComPrecoNulo);
    for (const s of servicos ?? []) {
      if (s.preco_venda) precoPorServico[s.id] = Number(s.preco_venda);
    }
  }

  // Buscar comissões configuradas para este profissional (todas as unidades)
  const { data: comissoes } = await supabase
    .from('profissional_servico_comissoes')
    .select('servico_id, unidade_id, comissao_percentual')
    .eq('profissional_id', staffId);

  // Mapa: "servico_id:unidade_id" → percentual (unidade_id geralmente é nome_fantasia)
  // Também construímos um índice "qualquer unidade" por servico_id como último recurso
  // antes de cair no comissao_servico global do profissional.
  const comissaoMap: Record<string, number> = {};
  const comissaoPorServico: Record<string, number[]> = {};
  for (const c of comissoes ?? []) {
    const pct = Number(c.comissao_percentual);
    if (!Number.isFinite(pct)) continue;
    comissaoMap[`${c.servico_id}:${c.unidade_id}`] = pct;
    (comissaoPorServico[c.servico_id] ??= []).push(pct);
  }
  const unidadePadrao = staff.unidade_padrao ?? '';
  const comissaoGlobal = Number(staff.comissao_servico ?? 0);

  const items: CommissionReportItem[] = [];
  let valorServicos = 0;
  let comissaoServico = 0;

  for (const appt of appts ?? []) {
    // Usa valor_cobrado registrado; se nulo, usa preço de tabela do serviço como estimativa
    const precoBruto = appt.valor_cobrado != null
      ? Number(appt.valor_cobrado)
      : (appt.servico_id ? (precoPorServico[appt.servico_id] ?? 0) : 0);
    const preco = Number.isFinite(precoBruto) ? precoBruto : 0;
    // Usa 'unidade' (coluna app) ou 'unidade_id' (legado/n8n) ou unidade_padrao como fallback
    const unidadeAtendimento = (appt as any).unidade ?? appt.unidade_id ?? unidadePadrao;
    const servicoId = appt.servico_id;

    // Prioridade do percentual (alinhada ao plano de correção):
    // 1. override exato servico_id + unidade do atendimento
    // 2. override servico_id + unidade_padrao do profissional
    // 3. qualquer override do servico_id (média, se houver várias unidades)
    // 4. comissao_servico global do profissional
    // 5. zero (com warn)
    let pct = 0;
    let fonte = 'zero';
    if (servicoId && comissaoMap[`${servicoId}:${unidadeAtendimento}`] !== undefined) {
      pct = comissaoMap[`${servicoId}:${unidadeAtendimento}`];
      fonte = 'override_unidade_atendimento';
    } else if (servicoId && comissaoMap[`${servicoId}:${unidadePadrao}`] !== undefined) {
      pct = comissaoMap[`${servicoId}:${unidadePadrao}`];
      fonte = 'override_unidade_padrao';
    } else if (servicoId && comissaoPorServico[servicoId]?.length) {
      const arr = comissaoPorServico[servicoId];
      pct = arr.reduce((a, b) => a + b, 0) / arr.length;
      fonte = 'override_qualquer_unidade';
    } else if (Number.isFinite(comissaoGlobal) && comissaoGlobal > 0) {
      pct = comissaoGlobal;
      fonte = 'global_profissional';
    }

    if (pct === 0 || preco === 0) {
      console.warn(
        `[COMISSAO] Atendimento ${appt.id} resultou em comissão zerada — pct=${pct} preco=${preco} ` +
          `servicoId=${servicoId} unidadeAtendimento=${unidadeAtendimento} fonte=${fonte}`
      );
    }

    const valorComissao = preco * (pct / 100);
    valorServicos += preco;
    comissaoServico += valorComissao;

    items.push({
      id: String(appt.id),
      inicio_agendado: appt.inicio_agendado,
      nome_cliente: appt.nome_cliente ?? undefined,
      servico: appt.servico ?? '',
      preco_venda: preco,
      forma_pagamento: appt.forma_pagamento ?? undefined,
      comissao_percentual: pct,
      valor_comissao: valorComissao,
    });
  }

  // Vendas de produtos no período
  const { data: vendas } = await supabase
    .from('vendas_produtos')
    .select('*, produto:produtos(nome)')
    .eq('profissional_id', staffId)
    .gte('data_venda', startDate)
    .lte('data_venda', endDate)
    .order('data_venda', { ascending: false });

  const produtoItems: CommissionReportProdutoItem[] = [];
  let valorProdutos = 0;
  let comissaoProduto = 0;

  for (const v of vendas ?? []) {
    const total = Number(v.preco_unitario) * Number(v.quantidade);
    const pct = Number(v.comissao_percentual_aplicada);
    const valorCom = total * (pct / 100);

    valorProdutos += total;
    comissaoProduto += valorCom;

    produtoItems.push({
      produto: (v.produto as any)?.nome ?? v.produto_id,
      quantidade: Number(v.quantidade),
      valor_total: total,
      comissao_percentual: pct,
      valor_comissao: valorCom,
      data_venda: v.data_venda,
      nome_cliente: v.nome_cliente ?? undefined,
    });
  }

  const prolabore = Number(staff.prolabore_fixo ?? 0);

  return {
    staffId,
    staffName: staff.nome,
    atendimentos: items.length,
    valorServicos,
    comissaoServico,
    valorProdutos,
    comissaoProduto,
    prolabore,
    total: comissaoServico + comissaoProduto + prolabore,
    items,
    produtoItems,
  };
}

export async function getCommissionReport(
  staffId: string,
  startDate: string,
  endDate: string
): Promise<CommissionReport[]> {
  try {
    if (staffId === 'all') {
      // Buscar todos os profissionais ativos com agenda
      const { data: allStaff } = await supabase
        .from('profissionais')
        .select('id')
        .eq('ativo', true)
        .eq('possui_agenda', true);

      const reports = await Promise.all(
        (allStaff ?? []).map((s) => buildCommissionReportForStaff(s.id, startDate, endDate))
      );
      return reports.filter((r): r is CommissionReport => r !== null && r.atendimentos > 0);
    }

    const report = await buildCommissionReportForStaff(staffId, startDate, endDate);
    return report ? [report] : [];
  } catch (error: any) {
    console.error('Error fetching commission report:', error);
    return [];
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
