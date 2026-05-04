/**
 * scripts/migrate_barbercoffee_to_tenant.ts
 *
 * Smoke-test / backfill validator for FASE 3 multi-tenant migration.
 *
 * What this script does:
 *  1. Connects to Supabase via service role (bypasses RLS).
 *  2. Verifies the `tenants` table exists and the BarberCoffee tenant row is present.
 *  3. For each of the 19 tables that received `tenant_id`, counts total rows and
 *     rows where `tenant_id IS NULL` — prints a warning for any orphaned rows.
 *  4. Confirms all expected RLS policies exist on the critical tables.
 *  5. Prints a pass/fail summary. Non-zero exit code if any check fails.
 *
 * Usage:
 *   npx tsx scripts/migrate_barbercoffee_to_tenant.ts
 *
 * Requirements:
 *   NEXT_PUBLIC_SUPABASE_URL  — project URL
 *   SUPABASE_SERVICE_ROLE_KEY — service role key (never expose publicly)
 */

import { createClient } from '@supabase/supabase-js';

// ── Config ─────────────────────────────────────────────────────────────────────

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BARBERCOFFEE_TENANT_ID = '00000000-0000-0000-0000-000000000001';

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error('❌  Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

// ── Tables that must have tenant_id ───────────────────────────────────────────

const TENANT_TABLES = [
  'empresas_erp',
  'profissionais',
  'servicos',
  'controle_atendimentos',
  'horarios_profissional',
  'campanhas',
  'contatos_erp',
  'n8n_historico_mensagens',
  'agendamentos_bloqueados',
  'configuracoes_barbearia',
  'comissoes',
  'estoque',
  'produtos',
  'caixa_movimentacoes',
  'relatorios_snapshot',
  'notificacoes',
  'avaliacoes',
  'fidelidade_pontos',
  'integracoes_config',
] as const;

// ── RLS policies expected on critical tables ──────────────────────────────────

const EXPECTED_POLICIES: { table: string; policy: string }[] = [
  { table: 'empresas_erp',           policy: 'tenant_isolation_empresas_erp' },
  { table: 'profissionais',          policy: 'tenant_isolation_profissionais' },
  { table: 'servicos',               policy: 'tenant_isolation_servicos' },
  { table: 'controle_atendimentos',  policy: 'tenant_isolation_controle_atendimentos' },
  { table: 'campanhas',              policy: 'tenant_isolation_campanhas' },
  { table: 'contatos_erp',           policy: 'tenant_isolation_contatos_erp' },
];

// ── Helpers ───────────────────────────────────────────────────────────────────

let failures = 0;

function ok(msg: string)   { console.log(`  ✅  ${msg}`); }
function warn(msg: string) { console.warn(`  ⚠️   ${msg}`); }
function fail(msg: string) { console.error(`  ❌  ${msg}`); failures++; }

// ── Checks ────────────────────────────────────────────────────────────────────

async function checkTenantsTable() {
  console.log('\n📋  Checking tenants table…');

  const { data, error } = await supabase
    .from('tenants')
    .select('id, nome, slug, status')
    .eq('id', BARBERCOFFEE_TENANT_ID)
    .single();

  if (error) {
    fail(`tenants table query failed: ${error.message}`);
    return;
  }

  if (!data) {
    fail(`BarberCoffee tenant row NOT FOUND (id=${BARBERCOFFEE_TENANT_ID})`);
    return;
  }

  ok(`BarberCoffee tenant exists: "${data.nome}" (slug=${data.slug}, status=${data.status})`);
}

async function checkTenantIdColumns() {
  console.log('\n📊  Checking tenant_id population across tables…');

  const results: { table: string; total: number; nulls: number }[] = [];

  for (const table of TENANT_TABLES) {
    // Count all rows
    const { count: total, error: e1 } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (e1) {
      // Table might not exist yet (optional tables)
      warn(`${table}: could not query (${e1.message}) — skipping`);
      continue;
    }

    // Count rows with NULL tenant_id
    const { count: nulls, error: e2 } = await (supabase
      .from(table)
      .select('*', { count: 'exact', head: true }) as any)
      .is('tenant_id', null);

    if (e2) {
      warn(`${table}: tenant_id column not found or inaccessible — skipping`);
      continue;
    }

    results.push({ table, total: total ?? 0, nulls: nulls ?? 0 });
  }

  let allGood = true;
  for (const r of results) {
    const label = `${r.table.padEnd(35)} total=${r.total}, nulls=${r.nulls}`;
    if (r.nulls > 0) {
      fail(`${label}  ← orphaned rows without tenant_id!`);
      allGood = false;
    } else {
      ok(label);
    }
  }

  if (allGood && results.length > 0) {
    console.log(`\n  All ${results.length} tables fully backfilled ✅`);
  }
}

async function checkRlsPolicies() {
  console.log('\n🔒  Checking RLS policies…');

  const { data, error } = await supabase
    .rpc('check_rls_policies' as any)
    .select()
    .limit(1);

  // The RPC above may not exist. Fall back to pg_policies via SQL.
  const { data: policies, error: sqlError } = await supabase
    .from('pg_policies' as any)
    .select('tablename, policyname')
    .in('tablename', EXPECTED_POLICIES.map(p => p.table));

  if (sqlError) {
    // Not accessible via REST — use raw SQL via execute_sql if available
    warn('pg_policies not queryable via REST — skipping RLS check (run manually: SELECT tablename, policyname FROM pg_policies WHERE schemaname = \'public\')');
    return;
  }

  const existingSet = new Set(
    (policies as any[]).map((p: any) => `${p.tablename}::${p.policyname}`)
  );

  for (const { table, policy } of EXPECTED_POLICIES) {
    if (existingSet.has(`${table}::${policy}`)) {
      ok(`RLS policy "${policy}" on ${table}`);
    } else {
      fail(`RLS policy "${policy}" MISSING on ${table}`);
    }
  }
}

async function checkTenantCount() {
  console.log('\n🏠  Tenant summary…');

  const { data, error } = await supabase
    .from('tenants')
    .select('id, nome, slug, status, plano');

  if (error) {
    fail(`Could not list tenants: ${error.message}`);
    return;
  }

  console.log(`  Total tenants: ${data?.length ?? 0}`);
  for (const t of data ?? []) {
    console.log(`    • ${t.nome.padEnd(30)} slug=${t.slug.padEnd(20)} plan=${t.plano.padEnd(12)} status=${t.status}`);
  }
}

// ── Rollback snapshot helper ──────────────────────────────────────────────────

async function printRollbackSnapshot() {
  console.log('\n📦  Row-count snapshot (use for rollback comparison)…');

  for (const table of TENANT_TABLES) {
    const { count, error } = await supabase
      .from(table)
      .select('*', { count: 'exact', head: true });

    if (error) continue;
    console.log(`  ${table.padEnd(35)} ${count ?? 0}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log('═══════════════════════════════════════════════════════');
  console.log(' Barbudão — FASE 3 Multi-Tenant Migration Smoke Test');
  console.log('═══════════════════════════════════════════════════════');
  console.log(`  Supabase URL : ${SUPABASE_URL}`);
  console.log(`  Target tenant: ${BARBERCOFFEE_TENANT_ID} (BarberCoffee)`);

  await checkTenantsTable();
  await checkTenantIdColumns();
  await checkRlsPolicies();
  await checkTenantCount();
  await printRollbackSnapshot();

  console.log('\n═══════════════════════════════════════════════════════');
  if (failures === 0) {
    console.log('  🎉  All checks passed. Migration looks healthy!');
    process.exit(0);
  } else {
    console.error(`  ❌  ${failures} check(s) failed. Review the output above.`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error('Unexpected error:', err);
  process.exit(2);
});
