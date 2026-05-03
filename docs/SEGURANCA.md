# Segurança — Notas da Fase 1

## Bypass de Administrador (REMOVIDO)

Existia um botão **"Acesso Administrador"** na tela de login que gerava um custom token Firebase
para `admin@barbearia.com` **sem exigir senha**. Como o app está exposto na internet, qualquer
visitante poderia entrar como admin.

**Removido em:**
- `src/lib/auth/actions.ts` — função `createAdminCustomToken` excluída.
- `src/app/login/page.tsx` — botão e handler removidos; imports ajustados.

**Ações manuais necessárias antes do deploy:**

1. Acesse o Firebase Console → Authentication → Users.
2. Localize `admin@barbearia.com`.
3. Defina/redefina uma senha forte e comunique-a ao proprietário pelo canal seguro.
4. Confirme que o registro `profissionais` correspondente em Supabase tem `perfil_acesso = 'ADMIN'` e `email = 'admin@barbearia.com'`.

**Verificação pós-deploy:**
- A página `/login` não deve mais exibir o botão "Acesso Administrador".
- Tentar acessar `/admin/dashboard` sem login → redireciona para `/login`.
- Login com email/senha do admin funciona normalmente.

## RBAC — Controle de Acesso por Role

Ver `src/lib/auth/rbac.ts` e `src/lib/auth/rbac-types.ts`.

### Roles
- `ADMIN`: acesso total (inclui `/admin/*` e `/settings/*`).
- `GERENTE`: tudo exceto `/admin/*` e `/settings/*`.
- `RECEPCAO`: agenda, clientes, caixa básico (sem staff/serviços/estoque/financeiro).
- `PROFISSIONAL`: apenas `/agenda` e `/dashboard`.

### Camadas de proteção
1. **Middleware** (`src/middleware.ts`): exige cookie de sessão (Edge runtime).
2. **Layout `src/app/(app)/layout.tsx`**: rejeita usuários sem registro de staff ativo (redirect `/login`).
3. **Layouts de seção** (`src/app/(app)/<area>/layout.tsx`): redirect para `/agenda` se role insuficiente.
4. **Server actions sensíveis**: chamam `requireRole([...])` no início — defesa em profundidade.
5. **Sidebar**: filtra itens por role para esconder navegação proibida.

### Server actions guardadas
- `actions-finance.ts`: todas as mutações.
- `actions-staff.ts`: create/update/delete + upsertProfissionalComissoes.
- `actions-business.ts`: services/products/stock/produtos_unidade.

### Server actions ainda **NÃO** guardadas (Fase 2 — adicionar quando refatorar):
- `actions-empresas.ts`
- `actions-missions.ts`
- `actions-agenda.ts` (precisa de regra mais fina — profissional pode editar próprios atendimentos)
- `actions/dashboard.ts`, `actions/queues.ts`, `actions/reports.ts`
- `src/lib/actions.ts` (genérico — auditar)

A camada de layout já bloqueia acesso à UI dessas áreas, mas a defesa em profundidade fica para próxima fase.

## Bypass legítimo do Supabase (não removido)

`src/lib/supabase/admin.ts` usa `SUPABASE_KEY` (service_role) para operações server-side internas.
**Esse uso é legítimo** — server actions rodam server-side e não expõem a chave ao browser. Permanece ativo.

## Próximas fases
- Fase 3 (SaaS): adicionar `tenant_id` ao `getCurrentUser` e RLS no Supabase.
- Auditoria pendente: `src/lib/actions.ts` é genérico e mexe em várias tabelas — revisar caso a caso.
