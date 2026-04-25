# Supabase — Barbearia Del Pierro

## Projeto correto

| Campo | Valor |
|---|---|
| **Project ref** | `qtfmjdcheidhdmdnmjle` |
| **Project URL** | `https://qtfmjdcheidhdmdnmjle.supabase.co` |
| **Dashboard** | https://supabase.com/dashboard/project/qtfmjdcheidhdmdnmjle |

> ⚠️ Existe outro projeto Supabase na mesma conta (`ihmhfyiediwevtxfghpi`) que pertence a **outro cliente**. Nunca apontar este app para aquele projeto.

---

## Variáveis de ambiente

| Variável | Onde usar | O que é |
|---|---|---|
| `SUPABASE_URL` | Build + Runtime | Project URL acima |
| `SUPABASE_KEY` | Build + Runtime | Chave `service_role` — bypassa RLS, nunca expor no frontend |
| `SUPABASE_ANON_KEY` | Build + Runtime | Chave `anon` — sujeita às políticas RLS |
| `DATABASE_URL` | Local apenas | String de conexão direta ao Postgres (para rodar migrations) |

Formato do `DATABASE_URL`:
```
postgresql://postgres:[SENHA]@db.qtfmjdcheidhdmdnmjle.supabase.co:5432/postgres
```
Senha em: **Dashboard → Settings → Database → Connection string**.

---

## Firebase App Hosting

As variáveis são gerenciadas em:
**Firebase Console → App Hosting → barbearia → Environment variables**

O `apphosting.yaml` apenas declara quais variáveis existem — os valores ficam no painel do Firebase.

---

## Rodar migrations

Use o script com `DATABASE_URL` configurado no `.env.local`:

```bash
node scripts/run-migration.mjs docs/migrations/<arquivo>.sql
```

## Migrations aplicadas

| Arquivo | Descrição | Status |
|---|---|---|
| `schema_completo.sql` | Schema completo (20 tabelas), idempotente | ✓ Aplicado |
| `add_chatwoot_fields.sql` | `id_conversa_chatwoot` e `ultima_interacao_em` | ✓ Aplicado |
| `movimentacoes_estoque.sql` | Tabela `movimentacoes_estoque` | ✓ Aplicado |
| `add_lembrete_followup_fields.sql` | `lembrete_enviado_em` e `followup_enviado_em` | ✓ Aplicado |
| `add_profissional_servico_ids.sql` | FK `profissional_id` e `servico_id` | ✓ Aplicado |
| `add_horarios_folgas.sql` | Horários e folgas por profissional | ✓ Aplicado |
| `add_contatos_erp_marketing.sql` | `email`, `role`, `aceita_marketing` em `contatos_erp` | ✓ Aplicado |
