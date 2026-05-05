'use server';

/**
 * Supabase Tenant-Aware Client
 * ─────────────────────────────────────────────────────────────────────────────
 * Padrão de uso em server actions:
 *
 *   import { tenantQuery } from '@/lib/supabase/tenant-client';
 *   import { getCurrentUser } from '@/lib/auth/rbac';
 *
 *   const user = await requireRole(['ADMIN', 'GERENTE']);
 *   const q = tenantQuery(user.tenant_id);
 *
 *   const { data } = await q('profissionais')
 *     .select('*')
 *     .eq('ativo', true);
 *
 * NOTA: O service role key (usado em server actions) BYPASSA RLS por design.
 * O filtro `.eq('tenant_id', tenantId)` é aplicado explicitamente para garantir
 * isolamento correto mesmo sem RLS. O RLS ativo serve de rede de segurança para
 * acessos diretos ao banco (dashboard, scripts, etc.).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { getSupabaseAdmin } from '@/lib/supabase/admin';
import { BARBERCOFFEE_TENANT_ID } from '@/lib/auth/rbac-types';

/**
 * Retorna um builder de query que injeta automaticamente
 * `.eq('tenant_id', tenantId)` em toda query de SELECT.
 *
 * Para super_admin (tenantId = undefined), retorna queries sem filtro de tenant.
 */
export function tenantQuery(tenantId: string | undefined) {
  const client = getSupabaseAdmin();

  return function query(table: string) {
    const base = client.from(table);
    if (!tenantId) return base; // super_admin vê tudo
    // Retorna um proxy com tenant_id pré-aplicado em select/update/delete
    return {
      select: (columns = '*') => base.select(columns).eq('tenant_id', tenantId),
      insert: (values: object | object[]) => {
        const rows = Array.isArray(values) ? values : [values];
        const withTenant = rows.map(r => ({ ...r, tenant_id: tenantId }));
        return base.insert(withTenant);
      },
      update: (values: object) => base.update(values).eq('tenant_id', tenantId),
      delete: () => base.delete().eq('tenant_id', tenantId),
      upsert: (values: object | object[]) => {
        const rows = Array.isArray(values) ? values : [values];
        const withTenant = rows.map(r => ({ ...r, tenant_id: tenantId }));
        return base.upsert(withTenant);
      },
    } as const;
  };
}

/**
 * Ativa o contexto de tenant para uma sessão Postgres (para RLS via `app_tenant_id()`).
 * Chame antes de queries que precisam respeitar RLS com role não-service.
 */
export async function setTenantContext(tenantId: string): Promise<void> {
  const client = getSupabaseAdmin();
  await client.rpc('set_config', {
    setting_name: 'app.tenant_id',
    new_value: tenantId,
    is_local: true,
  } as never);
}

/**
 * Garante que um `tenant_id` é válido e existe na tabela `tenants`.
 * Lança Error se não encontrado.
 */
export async function assertTenantExists(tenantId: string): Promise<void> {
  const client = getSupabaseAdmin();
  const { data, error } = await client
    .from('tenants')
    .select('id')
    .eq('id', tenantId)
    .maybeSingle();
  if (error || !data) throw new Error(`Tenant ${tenantId} não encontrado.`);
}

/** Conveniência: tenant_id do BarberCoffee (legado). */
export { BARBERCOFFEE_TENANT_ID };
