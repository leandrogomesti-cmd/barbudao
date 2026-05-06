'use server';

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { requireRole, getSessionEmail } from '@/lib/auth/rbac';
import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import type { Tenant, TenantSummary, CreateTenantInput } from '@/lib/types/tenant';
import { BARBERCOFFEE_TENANT_ID } from '@/lib/auth/rbac-types';

/** Nome do cookie que indica qual tenant o super_admin está operando. */
const SA_TENANT_COOKIE = 'sa_tenant';

const adminClient = () => getSupabaseAdmin();

// ─── Listagem ─────────────────────────────────────────────────────────────────

/** Lista todas as tenants com contadores (apenas super_admin). */
export async function listTenants(): Promise<TenantSummary[]> {
  await requireRole(['super_admin']);

  const supabase = adminClient();
  const { data: tenants, error } = await supabase
    .from('tenants')
    .select('id, nome, slug, plano, status, responsavel_email, created_at')
    .order('created_at', { ascending: false });

  if (error) { console.error('[tenants] listTenants:', error); return []; }

  // Busca contadores em paralelo
  const summaries = await Promise.all(
    (tenants ?? []).map(async (t) => {
      const [{ count: numUnidades }, { count: numProfissionais }] = await Promise.all([
        supabase.from('empresas_erp').select('id_loja', { count: 'exact', head: true }).eq('tenant_id', t.id),
        supabase.from('profissionais').select('id', { count: 'exact', head: true }).eq('tenant_id', t.id).eq('ativo', true),
      ]);
      return {
        id: t.id,
        nome: t.nome,
        slug: t.slug,
        plano: t.plano as Tenant['plano'],
        status: t.status as Tenant['status'],
        responsavel_email: t.responsavel_email ?? undefined,
        num_unidades: numUnidades ?? 0,
        num_profissionais: numProfissionais ?? 0,
        created_at: t.created_at,
      } satisfies TenantSummary;
    })
  );

  return summaries;
}

/** Busca uma tenant pelo ID (super_admin ou admin da própria tenant). */
export async function getTenantById(id: string): Promise<Tenant | null> {
  const user = await requireRole(['super_admin', 'ADMIN', 'GERENTE']);
  if (user.role !== 'super_admin' && user.tenant_id !== id) {
    throw new Error('Acesso negado à tenant solicitada.');
  }

  const { data, error } = await adminClient()
    .from('tenants')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error || !data) return null;
  return data as Tenant;
}

// ─── Mutações ─────────────────────────────────────────────────────────────────

/** Atualiza dados básicos de uma tenant (super_admin ou ADMIN da própria). */
export async function updateTenant(
  id: string,
  patch: Partial<Pick<Tenant, 'nome' | 'responsavel_nome' | 'responsavel_email' | 'responsavel_telefone' | 'plano' | 'status' | 'config_whatsapp' | 'config_chatwoot' | 'config_ia'>>
): Promise<{ success: boolean; message: string }> {
  const user = await requireRole(['super_admin', 'ADMIN']);
  if (user.role !== 'super_admin' && user.tenant_id !== id) {
    return { success: false, message: 'Acesso negado à tenant solicitada.' };
  }

  const { error } = await adminClient()
    .from('tenants')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', id);

  if (error) return { success: false, message: error.message };
  revalidatePath('/super-admin/barbearias');
  revalidatePath(`/super-admin/barbearias/${id}`);
  return { success: true, message: 'Tenant atualizada.' };
}

/** Suspende uma tenant (super_admin only). */
export async function suspendTenant(id: string): Promise<{ success: boolean; message: string }> {
  await requireRole(['super_admin']);
  const { error } = await adminClient()
    .from('tenants')
    .update({ status: 'suspended', updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) return { success: false, message: error.message };
  revalidatePath('/super-admin/barbearias');
  return { success: true, message: 'Tenant suspensa.' };
}

// ─── Criação (onboarding) ──────────────────────────────────────────────────────

/**
 * Cria uma nova tenant com todas as entidades relacionadas em uma operação atômica.
 * Pode ser chamada por super_admin ou pelo wizard de onboarding público.
 */
export async function createTenant(
  input: CreateTenantInput
): Promise<{ success: boolean; message: string; tenantId?: string; loginUrl?: string }> {
  const supabase = adminClient();

  try {
    // 1. Valida slug único
    const { data: existing } = await supabase
      .from('tenants')
      .select('id')
      .eq('slug', input.slug)
      .maybeSingle();
    if (existing) return { success: false, message: `Slug "${input.slug}" já está em uso.` };

    // 2. Cria tenant
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        nome: input.nome,
        slug: input.slug,
        responsavel_nome: input.responsavel_nome,
        responsavel_email: input.responsavel_email,
        responsavel_telefone: input.responsavel_telefone ?? null,
        plano: input.plano ?? 'basic',
        status: 'active',
        config_whatsapp: input.config_whatsapp ?? {},
        config_chatwoot: input.config_chatwoot ?? {},
        config_ia: input.config_ia ?? {},
      })
      .select('id')
      .single();
    if (tenantErr || !tenant) throw new Error(tenantErr?.message ?? 'Falha ao criar tenant.');

    const tenantId: string = tenant.id;

    // 3. Cria unidades
    // id_loja é NOT NULL na tabela — gera um ID único baseado em timestamp + índice
    const baseId = Date.now();
    const unidadesPayload = input.unidades.map((u, i) => ({
      id_loja: String(baseId + i),
      nome_fantasia: u.nome_fantasia,
      razao_social: u.nome_fantasia,
      telefone: u.telefone ?? null,
      endereco: u.endereco ?? null,
      bairro: u.bairro ?? null,
      cidade: u.cidade ?? null,
      ativo: true,
      tenant_id: tenantId,
    }));
    const { data: unidades, error: uniErr } = await supabase
      .from('empresas_erp')
      .insert(unidadesPayload)
      .select('id_loja, nome_fantasia');
    if (uniErr) throw new Error(`Unidades: ${uniErr.message}`);

    const primeiraUnidade = unidades?.[0];

    // 4. Cria serviços base (se fornecidos)
    if (input.servicos && input.servicos.length > 0) {
      const servicosPayload = input.servicos.map(s => ({
        nome: s.nome,
        preco_venda: s.preco_venda,
        duracao_minutos: s.duracao_minutos ?? 30,
        ativo: true,
        tenant_id: tenantId,
      }));
      const { error: svcErr } = await supabase.from('servicos').insert(servicosPayload);
      if (svcErr) console.warn('[createTenant] Serviços:', svcErr.message);
    }

    // 5. Cria horários de funcionamento padrão (seg–sáb)
    if (primeiraUnidade) {
      const diasUteis = [1, 2, 3, 4, 5, 6]; // 0=dom, 6=sáb
      const horariosPayload = diasUteis.map(dia => ({
        profissional_id: null, // horários da unidade
        dia_semana: dia,
        hora_inicio: input.horario_abertura ?? '09:00',
        hora_fim: input.horario_fechamento ?? '20:00',
        tenant_id: tenantId,
      }));
      const { error: horErr } = await supabase.from('horarios_profissional').insert(horariosPayload);
      if (horErr) console.warn('[createTenant] Horários:', horErr.message);
    }

    // 6. Cria profissional admin
    const { error: profErr } = await supabase.from('profissionais').insert({
      nome: input.admin_nome,
      email: input.admin_email,
      perfil_acesso: 'ADMIN',
      possui_agenda: false,
      ativo: true,
      unidade_padrao: primeiraUnidade?.nome_fantasia ?? null,
      tenant_id: tenantId,
      criado_em: new Date().toISOString(),
    });
    if (profErr) throw new Error(`Profissional admin: ${profErr.message}`);

    revalidatePath('/super-admin/barbearias');

    return {
      success: true,
      message: `Tenant "${input.nome}" criada com sucesso!`,
      tenantId,
      loginUrl: `/login?tenant=${input.slug}`,
    };
  } catch (err: any) {
    console.error('[createTenant] Erro:', err);
    return { success: false, message: err.message ?? 'Erro desconhecido ao criar tenant.' };
  }
}

// ─── Impersonação de tenant pelo super_admin ──────────────────────────────────

/**
 * Super-admin "entra" em uma tenant como ADMIN.
 * Cria (ou reativa) um registro em profissionais para o e-mail do super_admin
 * dentro dessa tenant e define o cookie 'sa_tenant'.
 * Após isso, getCurrentUser() retorna a identidade ADMIN dentro da tenant.
 */
export async function switchToTenant(tenantId: string): Promise<void> {
  const user = await requireRole(['super_admin']);

  const supabase = adminClient();

  // Valida que a tenant existe
  const { data: tenant, error: tErr } = await supabase
    .from('tenants')
    .select('id, nome')
    .eq('id', tenantId)
    .single();
  if (tErr || !tenant) throw new Error('Tenant não encontrada.');

  // Cria ou reativa profissional ADMIN para este e-mail na tenant
  const { data: existing } = await supabase
    .from('profissionais')
    .select('id')
    .eq('email', user.email)
    .eq('tenant_id', tenantId)
    .maybeSingle();

  if (existing) {
    await supabase
      .from('profissionais')
      .update({ ativo: true, perfil_acesso: 'ADMIN' })
      .eq('id', existing.id);
  } else {
    // Deriva um nome legível a partir do e-mail
    const nome = user.email
      .split('@')[0]
      .replace(/[._-]/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());

    await supabase.from('profissionais').insert({
      nome,
      email: user.email,
      perfil_acesso: 'ADMIN',
      possui_agenda: false,
      ativo: true,
      tenant_id: tenantId,
      criado_em: new Date().toISOString(),
    });
  }

  // Seta cookie de contexto (8 h)
  const cookieStore = await cookies();
  cookieStore.set(SA_TENANT_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 8,
  });

  redirect('/agenda');
}

/**
 * Encerra o modo de impersonação de tenant do super_admin.
 * Limpa o cookie 'sa_tenant' e redireciona para o painel super-admin.
 */
export async function exitTenantMode(): Promise<void> {
  const email = await getSessionEmail();
  if (!email) redirect('/login');

  const cookieStore = await cookies();
  cookieStore.delete(SA_TENANT_COOKIE);

  redirect('/super-admin/barbearias');
}
