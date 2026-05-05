# N8N — Adaptações Multi-Tenant (FASE 3)

Este documento descreve as mudanças necessárias nos workflows N8N para que o **agente Bia** funcione corretamente em um ambiente SaaS multi-tenant.

> **Contexto:** Antes da FASE 3, o sistema era single-tenant (BarberCoffee hard-coded). Com a FASE 3, cada barbearia cadastrada tem seu próprio `tenant_id` (UUID). Os workflows N8N precisam propagar esse ID em toda operação de banco de dados.

---

## 1. Resumo das mudanças obrigatórias

| Área | Antes (single-tenant) | Depois (multi-tenant) |
|---|---|---|
| Webhook payload | `{ phone, message, ... }` | `{ phone, message, tenant_id, ... }` |
| `session_id` em `n8n_historico_mensagens` | `<chatwoot_conversation_id>` | `<tenant_id>:<chatwoot_conversation_id>` |
| Queries Supabase REST | Sem filtro de tenant | `tenant_id=eq.<tenant_id>` em todos os filtros |
| `salvar_agendamento_banco` | `POST /controle_atendimentos` sem `tenant_id` | `POST /controle_atendimentos` com `"tenant_id": "{{$json.tenant_id}}"` |
| `buscar_profissionais` | `GET /profissionais` | `GET /profissionais?tenant_id=eq.<tenant_id>` |
| `buscar_servicos` / `buscar_unidades` | `GET /api/v1/agent/context` | `GET /api/v1/agent/context?tenant_id=<tenant_id>` |

---

## 2. Propagação do `tenant_id` no Webhook (Workflow 01)

O Chatwoot dispara o webhook para o N8N ao receber uma mensagem. Para que o N8N saiba qual tenant está sendo atendido, o **endereço do webhook** deve ser único por tenant, **ou** o Chatwoot deve enviar o `tenant_id` no payload.

### Opção A — Webhook URL por tenant (recomendado)

Cada tenant configura seu próprio webhook Chatwoot apontando para uma URL com o `tenant_id` no path:

```
POST https://n8n.seudominio.com/webhook/<tenant_id>/chatwoot
```

No nó **Webhook** do N8N, capture `tenant_id` do path:

```
{{ $request.params.tenantId }}
```

Configure uma **Webhook Node** separada por tenant, ou use um único webhook com path dinâmico mapeado para uma variável.

### Opção B — Campo extra no payload Chatwoot

Configure o Chatwoot para enviar um campo customizado `tenant_id` no corpo do webhook. No N8N, acesse via:

```
{{ $json.tenant_id }}
```

---

## 3. `session_id` em `n8n_historico_mensagens`

**Por que mudar:** Com múltiplos tenants, `conversation_id` do Chatwoot pode colidir entre tenants (ambos podem ter a conversa ID 42, por exemplo).

### Formato antigo
```
session_id = "42"   // apenas o conversation_id
```

### Formato novo
```
session_id = "00000000-0000-0000-0000-000000000001:42"
           = "<tenant_id>:<chatwoot_conversation_id>"
```

### Como implementar no N8N

No nó que grava/lê `n8n_historico_mensagens`, construa o `session_id` com uma expressão:

```javascript
// Expression para session_id
{{ $json.tenant_id + ":" + $json.conversation.id }}
```

**Migrations necessárias:** Nenhuma — o campo `session_id` é `TEXT`, aceita o novo formato. Os registros antigos (single-tenant) podem ser migrados com:

```sql
UPDATE n8n_historico_mensagens
SET session_id = '00000000-0000-0000-0000-000000000001:' || session_id
WHERE session_id NOT LIKE '%-%-%-%-%:%';
```

---

## 4. Queries Supabase REST — adicionar filtro `tenant_id`

Todos os nós HTTP que acessam Supabase diretamente via REST devem incluir o filtro de tenant na query string.

### `buscar_profissionais`

```
GET {{ $env.SUPABASE_URL }}/rest/v1/profissionais
  ?select=id,nome,especialidades,ativo
  &ativo=eq.true
  &tenant_id=eq.{{ $json.tenant_id }}
```

### `salvar_agendamento_banco`

Body JSON deve incluir `tenant_id`:

```json
{
  "tenant_id": "{{ $json.tenant_id }}",
  "id_contato_erp": "{{ $json.contact_id }}",
  "id_profissional": "{{ $json.staff_id }}",
  "id_servico": "{{ $json.service_id }}",
  "inicio_agendado": "{{ $json.start_time }}",
  "fim_agendado": "{{ $json.end_time }}",
  "id_evento_google": "{{ $json.google_event_id }}",
  "status_agendamento": "Agendado"
}
```

### `cancelar_agendamento_banco` / `atualizar_agendamento_banco`

Adicione sempre o filtro duplo para garantir isolamento:

```
PATCH {{ $env.SUPABASE_URL }}/rest/v1/controle_atendimentos
  ?id_evento_google=eq.{{ $json.google_event_id }}
  &tenant_id=eq.{{ $json.tenant_id }}
```

---

## 5. Endpoint `/api/v1/agent/context`

O endpoint já foi atualizado para aceitar e exigir `tenant_id` via query param ou header.

```
GET /api/v1/agent/context?tenant_id=<uuid>
Header: x-api-key: <APP_API_KEY>
```

Resposta inclui apenas dados do tenant informado:

```json
{
  "tenant_id": "...",
  "servicos": [...],
  "profissionais": [...],
  "unidades": [...]
}
```

---

## 6. Workflows 02 (Lembrete) e 03 (Follow-up)

Esses workflows usam conexão Postgres direta. As queries devem incluir filtro `tenant_id`:

### Workflow 02 — Lembrete

```sql
SELECT ca.*, p.nome AS profissional_nome, co.telefone, co.nome AS cliente_nome,
       t.config_whatsapp->>'numero' AS whatsapp_number
FROM controle_atendimentos ca
JOIN profissionais p ON p.id = ca.id_profissional
JOIN contatos_erp co ON co.id = ca.id_contato_erp
JOIN tenants t ON t.id = ca.tenant_id
WHERE ca.inicio_agendado BETWEEN NOW() + INTERVAL '60 minutes' AND NOW() + INTERVAL '70 minutes'
  AND ca.lembrete_enviado_em IS NULL
  AND ca.status_agendamento NOT IN ('Cancelado', 'Faltou')
  AND t.status = 'active';   -- só tenants ativos recebem lembretes
```

### Workflow 03 — Follow-up

```sql
SELECT ca.*, co.telefone, co.nome AS cliente_nome,
       t.config_whatsapp->>'numero' AS whatsapp_number
FROM controle_atendimentos ca
JOIN contatos_erp co ON co.id = ca.id_contato_erp
JOIN tenants t ON t.id = ca.tenant_id
WHERE ca.status_agendamento = 'Finalizado'
  AND ca.followup_enviado_em IS NULL
  AND ca.fim_agendado < NOW() - INTERVAL '2 hours'
  AND t.status = 'active';
```

**Nota:** O número WhatsApp agora vem do `tenants.config_whatsapp->>'numero'` de cada tenant, não de variável de ambiente hardcoded.

---

## 7. Variáveis de ambiente N8N — adições

| Variável | Descrição |
|---|---|
| `SUPABASE_URL` | URL do projeto Supabase (já existia) |
| `SUPABASE_SERVICE_KEY` | Service role key (já existia) |
| `APP_API_KEY` | Chave `x-api-key` para endpoints do app (já existia) |
| `DEFAULT_TENANT_ID` | `00000000-0000-0000-0000-000000000001` — fallback para BarberCoffee durante transição |

---

## 8. Checklist de migração por workflow

### Workflow 01 — Agente Bia (principal)

- [ ] Nó Webhook: capturar `tenant_id` do path ou payload
- [ ] Nó Set inicial: mapear `tenant_id` para variável global do workflow
- [ ] `buscar_profissionais`: adicionar `&tenant_id=eq.{{ $vars.tenant_id }}`
- [ ] `buscar_servicos`: adicionar `?tenant_id={{ $vars.tenant_id }}`
- [ ] `buscar_unidades`: adicionar `?tenant_id={{ $vars.tenant_id }}`
- [ ] `salvar_agendamento_banco`: adicionar campo `tenant_id` no body
- [ ] `cancelar_agendamento_banco`: adicionar filtro `&tenant_id=eq.{{ $vars.tenant_id }}`
- [ ] `atualizar_agendamento_banco`: adicionar filtro `&tenant_id=eq.{{ $vars.tenant_id }}`
- [ ] `n8n_historico_mensagens` (read/write): mudar `session_id` para `<tenant_id>:<conv_id>`
- [ ] `desabilitar_marketing`: adicionar header ou query `tenant_id`

### Workflow 02 — Lembrete 1h

- [ ] Atualizar query SQL para incluir `JOIN tenants` e filtro `t.status = 'active'`
- [ ] Usar `t.config_whatsapp->>'numero'` como número de destino

### Workflow 03 — Follow-up

- [ ] Atualizar query SQL para incluir `JOIN tenants` e filtro `t.status = 'active'`
- [ ] Usar `t.config_whatsapp->>'numero'` como número de destino

---

## 9. Chatwoot — configuração por tenant

Cada tenant deve ter sua própria **Inbox** no Chatwoot, com o webhook apontando para a URL correta do N8N.

| Campo Chatwoot | Valor |
|---|---|
| Inbox name | `<nome da barbearia>` |
| Channel | WhatsApp (via Evolution API ou similar) |
| Webhook URL | `https://n8n.seudominio.com/webhook/<tenant_id>/chatwoot` |

---

## 10. Backward compatibility — BarberCoffee

Durante a transição, o BarberCoffee existente continua funcionando sem alterações nos workflows, desde que:

1. A coluna `tenant_id` em todas as tabelas está preenchida com `00000000-0000-0000-0000-000000000001` (garantido pelo backfill da FASE 3).
2. O webhook do Chatwoot do BarberCoffee seja atualizado para incluir o `tenant_id` na URL ou payload.

Para validar o backfill, execute:

```bash
npx tsx scripts/migrate_barbercoffee_to_tenant.ts
```
